import { createContext, useContext, useState, useEffect } from "react";
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [globalRoles, setGlobalRoles] = useState<any[]>([]);

  const fetchProfile = async (currentUser: User) => {
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
    } else if (error) {
      // Fallback usando los metadatos reales guardados en la creación de Auth
      setProfile({
        id: currentUser.id,
        email: currentUser.email || "demo@fronteras.com", 
        name: currentUser.user_metadata?.name || "Usuario de Sistema",
        role: currentUser.user_metadata?.role || "operator", 
        branch: currentUser.user_metadata?.branch || "Bogotá",
        is_active: currentUser.user_metadata?.is_active ?? true,
        permissions: currentUser.user_metadata?.permissions || {}
      } as Profile);
    }
  };

  useEffect(() => {
    // Load existing session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user);
      }
      setIsLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    // Cargar roles globales de la BD usando cliente administrativo (Alta Seguridad)
    getAdminClient().from("app_roles").select("*").then(({ data, error }) => {
      if (!error && data && data.length > 0) {
        setGlobalRoles(data);
        localStorage.setItem("app_roles", JSON.stringify(data));
      } else {
        const saved = localStorage.getItem("app_roles");
        if (saved) setGlobalRoles(JSON.parse(saved));
      }
    });

    return () => subscription.unsubscribe();
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
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión exitosamente.",
      });
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      setIsLoading(false);
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
      return false; // Bloquea si explícitamente no lo tiene
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
