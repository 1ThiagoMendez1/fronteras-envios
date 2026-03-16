import { createContext, useContext, useState } from "react";
import { useToast } from "./use-toast";

// Simple dummy interfaces
export interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

export interface LoginRequest {
  email?: string;
  password?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (data: LoginRequest) => {
    setIsLoading(true);
    try {
      // Dummy login delay
      await new Promise(resolve => setTimeout(resolve, 800));
      setUser({
        id: "1",
        email: data.email || "demo@example.com",
        name: "Demo User",
        role: data.role || "admin",
      });
      toast({
        title: "Bienvenido",
        description: "Has iniciado sesión exitosamente.",
      });
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
      await new Promise(resolve => setTimeout(resolve, 400));
      setUser(null);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
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
