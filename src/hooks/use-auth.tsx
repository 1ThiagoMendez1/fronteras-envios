import { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getAdminClient } from "@/lib/admin-client";
import type { User, Session } from "@supabase/supabase-js";
import { useToast } from "./use-toast";

export interface LoginRequest {
  email: string;
  password: string;
}

interface Profile {
  id: string;
  email: string;
  name: string;
  role: "admin" | "operator" | "driver" | "client";
  is_active: boolean;
  permissions: Record<string, boolean>;
  last_login?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<any>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasPermission: (perm: string) => boolean;
  globalRoles: any[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Limpia cualquier token de Supabase corrupto en localStorage.
 * Esto evita que el usuario tenga que borrar caché manualmente.
 */
function cleanStaleSupabaseTokens() {
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      // Supabase guarda tokens con prefijo "sb-" 
      if (key.startsWith("sb-") && key.includes("auth-token")) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            // Si el token expiró, limpiarlo
            if (parsed?.expires_at) {
              const expiresAt = parsed.expires_at * 1000; // unix seconds → ms
              if (Date.now() > expiresAt) {
                console.warn("Cleaning expired Supabase token:", key);
                localStorage.removeItem(key);
              }
            }
          } catch {
            // Token corrupto, eliminarlo
            console.warn("Cleaning corrupt Supabase token:", key);
            localStorage.removeItem(key);
          }
        }
      }
    }
  } catch {
    // Ignorar errores de localStorage
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // Empieza en TRUE para que F5 NO redirija al login mientras se restaura la sesión
  const [isLoading, setIsLoading] = useState(true);
  const [globalRoles, setGlobalRoles] = useState<any[]>([]);
  const initDone = useRef(false);

  const fetchProfile = async (currentUser: User) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single()
      if (!error && data) {
        setProfile({
          ...(data as any),
          role: currentUser.user_metadata?.role || (data as any).role,
          is_active: currentUser.user_metadata?.is_active ?? (data as any).is_active
        } as Profile);
      } else {
        throw error || new Error("No data returned");
      }
    } catch (err) {
      console.error("fetchProfile error, using fallback:", err);
      // Fallback: IMPORTANTE usar el rol de metadata si existe, para no perder permisos de Admin
      const metaRole = currentUser.user_metadata?.role;
      setProfile({
        id: currentUser.id,
        email: currentUser.email || "demo@fronteras.com",
        name: currentUser.user_metadata?.name || "Usuario de Sistema",
        role: metaRole || "operator",
        branch: currentUser.user_metadata?.branch || "Bogotá",
        is_active: currentUser.user_metadata?.is_active ?? true,
        permissions: currentUser.user_metadata?.permissions || {}
      } as Profile);
    }
  };

  useEffect(() => {
    // Si ya iniciamos, no hacer nada (previene errores de locks en Strict Mode)
    if (initDone.current) return;
    initDone.current = true;

    // Paso 1: Limpiar tokens expirados/corruptos ANTES de intentar restaurar sesión
    cleanStaleSupabaseTokens();

    const currentInitStatus = { done: false };

    // Paso 2: Timeout de seguridad — máximo 3 segundos esperando
    const safetyTimeout = setTimeout(() => {
      if (!currentInitStatus.done) {
        console.warn("Auth: timeout de seguridad alcanzado, forzando fin de carga");
        setIsLoading(false);
        currentInitStatus.done = true;
      }
    }, 3000);

    // Paso 3: Restaurar sesión existente
    supabase.auth.getSession().then(async ({ data: { session: s }, error }) => {
      if (error) {
        console.error("Auth getSession error:", error);
        cleanStaleSupabaseTokens();
      }
      
      setSession(s);
      setUser(s?.user ?? null);
      
      if (s?.user) {
        try {
          await fetchProfile(s.user);
        } catch (err) {
          console.error("fetchProfile error:", err);
        }
      }
    }).catch(err => {
      // Si el error es de locks, intentamos recuperar lo que haya en el cliente
      if (err?.message?.includes("lock")) {
        console.warn("Auth: Lock error detected, attempting to recover current user");
        const currentUser = (supabase.auth as any).session?.user || null;
        if (currentUser) setUser(currentUser);
      }
      console.error("getSession catch error:", err);
      cleanStaleSupabaseTokens();
    }).finally(() => {
      if (!currentInitStatus.done) {
        clearTimeout(safetyTimeout);
        setIsLoading(false);
        currentInitStatus.done = true;
      }
    });

    // Paso 4: Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      try {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          await fetchProfile(newSession.user);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("onAuthStateChange error:", err);
      }
    });

    // Cargar roles globales
    getAdminClient().from("app_roles").select("*").then(({ data, error }) => {
      if (!error && data && data.length > 0) {
        setGlobalRoles(data);
        localStorage.setItem("app_roles", JSON.stringify(data));
      } else {
        const saved = localStorage.getItem("app_roles");
        if (saved) setGlobalRoles(JSON.parse(saved));
      }
    });

    // Idle Timeout (30 minutos)
    let idleTimer: any;
    const IDLE_TIMEOUT = 30 * 60 * 1000;

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(async () => {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          logout();
          toast({
            title: "Sesión expirada",
            description: "Tu sesión ha sido cerrada por inactividad.",
            variant: "destructive"
          });
        }
      }, IDLE_TIMEOUT);
    };

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      window.addEventListener(event, resetIdleTimer);
    });
    resetIdleTimer();

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetIdleTimer);
      });
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, []);

  const login = async (data: LoginRequest) => {
    setIsLoading(true);
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
      toast({
        title: "Bienvenido",
        description: "Has iniciado sesión exitosamente.",
      });
      return authData.user;
    } catch (err: any) {
      toast({
        title: "Error de autenticación",
        description: err?.message || "Credenciales incorrectas",
        variant: "destructive",
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Limpiar estado React PRIMERO para redirección inmediata
      setUser(null);
      setProfile(null);
      setSession(null);

      const { error } = await supabase.auth.signOut();
      if (error) console.error("signOut API error:", error);

      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión exitosamente.",
      });
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const hasPermission = (perm: string) => {
    if (!profile) return false;
    if (profile.role === 'admin') return true;

    if (profile.permissions?.[perm]) return true;

    if (globalRoles && globalRoles.length > 0) {
      const roleDef = globalRoles.find(r => r.id === profile.role);
      if (roleDef && roleDef.permissions?.includes(perm)) {
        return true;
      }
      return false;
    }

    try {
      const saved = localStorage.getItem("app_roles")
      const rolesSet = saved ? JSON.parse(saved) : [
        { id: "admin", permissions: ['dashboard', 'clients', 'shipments', 'drivers', 'financial', 'daily_close', 'users'] },
        { id: "operator", permissions: ['dashboard', 'clients', 'shipments', 'daily_close'] }
      ]
      const roleDef = rolesSet.find((r: any) => r.id === profile.role);
      if (roleDef && roleDef.permissions?.includes(perm)) {
        return true;
      }
    } catch {
      // Ignore
    }

    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
        hasPermission,
        globalRoles,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
