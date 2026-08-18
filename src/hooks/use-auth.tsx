import { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { decodeJwtPayload } from "@/lib/jwt";
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
  branch: string;
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

/**
 * Extrae el perfil del usuario a partir de los claims del JWT.
 * Si el hook SQL está activo, lee app_role, app_is_active, etc.
 * Si no, hace fallback a user_metadata.
 */
function buildProfileFromSession(currentUser: User, session: Session): Profile {
  const token = session.access_token;
  const claims = decodeJwtPayload(token);

  // Claims personalizados inyectados por custom_access_token_hook
  const hasCustomClaims = claims && 'app_role' in claims;

  const role = hasCustomClaims
    ? (claims.app_role as Profile["role"])
    : (currentUser.user_metadata?.role || "operator");

  const is_active = hasCustomClaims
    ? (claims.app_is_active ?? true)
    : (currentUser.user_metadata?.is_active ?? true);

  const branch = hasCustomClaims
    ? (claims.app_branch || "Bogotá")
    : (currentUser.user_metadata?.branch || "Bogotá");

  const permissions = hasCustomClaims
    ? (claims.app_permissions || {})
    : (currentUser.user_metadata?.permissions || {});

  if (hasCustomClaims) {
    console.info("✅ JWT claims activos — rol leído del token:", role);
  } else {
    console.info("⚠️ JWT claims no detectados — usando user_metadata fallback:", role);
  }

  return {
    id: currentUser.id,
    email: currentUser.email || "demo@fronteras.com",
    name: currentUser.user_metadata?.name || "Usuario de Sistema",
    role: role as Profile["role"],
    is_active,
    branch,
    permissions,
  };
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
        // Construir perfil directamente desde JWT — sin query a DB
        const prof = buildProfileFromSession(s.user, s);
        setProfile(prof);
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
          // Construir perfil desde JWT — sin query a DB
          const prof = buildProfileFromSession(newSession.user, newSession);
          setProfile(prof);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("onAuthStateChange error:", err);
      }
    });

    // Cargar roles globales (para hasPermission)
    supabase.from("app_roles").select("*").then(({ data, error: rolesError }) => {
      if (!rolesError && data && data.length > 0) {
        setGlobalRoles(data);
        localStorage.setItem("app_roles", JSON.stringify(data));
      } else {
        const saved = localStorage.getItem("app_roles");
        if (saved) setGlobalRoles(JSON.parse(saved));
      }
    });

    // Idle Timeout (2 horas)
    let idleTimer: any;
    const IDLE_TIMEOUT = 120 * 60 * 1000;

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
