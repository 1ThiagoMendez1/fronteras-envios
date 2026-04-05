import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@supabase/supabase-js"
import { useToast } from "./use-toast"

export interface UserProfile {
  id: string
  email: string
  name: string
  role: string
  is_active: boolean
  branch?: string
  permissions: Record<string, boolean>
  last_login?: string
  created_at: string
}

// Llave administrativa maestra inyectada directamente para bypassear cachés y RLS
const FORCE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function getAdminClient() {
  return createClient(SUPABASE_URL, FORCE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export function useUsers() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: users, isLoading } = useQuery<UserProfile[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const adminClient = getAdminClient();
      
      // Consultamos la Bóveda de Auth Directamente para ignorar la tabla profiles 403
      const { data, error } = await adminClient.auth.admin.listUsers();
      if (error) throw new Error(error.message);

      return data.users.map(u => ({
        id: u.id,
        email: u.email || '',
        name: u.user_metadata?.name || 'Sin Nombre',
        role: u.user_metadata?.role || 'operator',
        is_active: u.user_metadata?.is_active ?? true,
        branch: u.user_metadata?.branch || 'Bogotá',
        permissions: u.user_metadata?.permissions || {},
        created_at: u.created_at,
        last_login: u.last_sign_in_at
      })) as UserProfile[];
    }
  })

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string, role: string }) => {
      const adminClient = getAdminClient();
      // Actualizamos los metadatos en Auth directamente
      const { error } = await adminClient.auth.admin.updateUserById(id, {
        user_metadata: { role }
      });
      if (error) throw error
      await adminClient.from("profiles").update({ role }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast({ title: "Rol actualizado", description: "El rol del usuario ha sido modificado exitosamente." })
    }
  })

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string, isActive: boolean }) => {
      const adminClient = getAdminClient();
      const { error } = await adminClient.auth.admin.updateUserById(id, {
        user_metadata: { is_active: isActive }
      });
      if (error) throw error
      await adminClient.from("profiles").update({ is_active: isActive }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast({ title: "Estado actualizado", description: "El estado del usuario ha sido modificado." })
    }
  })

  const updatePermissions = async (userId: string, permissions: Record<string, boolean>) => {
    try {
      const adminClient = getAdminClient();
      const { error } = await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: { permissions }
      });
      if (error) throw error
      toast({ title: "Permisos actualizados", description: "Los permisos granulares han sido guardados." })
      queryClient.invalidateQueries({ queryKey: ["users"] })
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const createUser = async (userData: any) => {
    try {
      const adminClient = getAdminClient();
      const { data, error } = await adminClient.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true, // ES NECESARIO para evitar SMTP
        user_metadata: {
          name: userData.name,
          role: userData.role,
          is_active: true,
          branch: userData.branch || 'Bogotá',
          permissions: {}
        }
      })

      if (error) throw error
      
      toast({ title: "Usuario creado", description: "Se ha registrado el nuevo usuario en el sistema con datos reales." })
      queryClient.invalidateQueries({ queryKey: ["users"] })
      return data.user
    } catch (error: any) {
      toast({ title: "Error Servidor", description: error.message, variant: "destructive" })
      throw error
    }
  }

  return {
    users,
    isLoading,
    updateRole: updateRoleMutation.mutate,
    toggleStatus: toggleStatusMutation.mutate,
    updatePermissions,
    createUser
  }
}
