import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [appRoles, setAppRoles] = useState<any[]>([]);

  const fetchAppRoles = async () => {
    try {
      const { data, error } = await supabase.from("app_roles").select("*");
      if (error) throw error;
      if (data) setAppRoles(data);
    } catch (e) {
      console.error("Error fetching app_roles:", e);
    }
  };

  const fetchProfile = async (currentUser: User) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .single();
    
    if (!error && data) {
      setProfile(data as Profile);
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
    // Load existing roles and session on mount
    const initialize = async () => {
      await fetchAppRoles();
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        await fetchProfile(currentSession.user);
      }
      setIsLoading(false);
    };

    initialize();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setProfile(null);
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

    // 1. Check granular permissions on user profile metadata
    if (profile.permissions?.[perm]) return true;

    // 2. Check role-based permissions from synchronised app_roles table
    const roleDef = appRoles.find((r: any) => r.id === profile.role);
    if (roleDef && Array.isArray(roleDef.permissions) && roleDef.permissions.includes(perm)) {
      return true;
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
