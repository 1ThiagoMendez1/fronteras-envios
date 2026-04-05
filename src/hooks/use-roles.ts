import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { useToast } from "./use-toast"
import type { Database } from "@/lib/database.types"

export type AppRole = Database['public']['Tables']['app_roles']['Row']

export function useRoles() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: roles, isLoading } = useQuery<AppRole[]>({
    queryKey: ["app_roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_roles")
        .select("*")
        .order('name')
      
      if (error) throw error
      return data as AppRole[]
    }
  })

  const updateRoleMutation = useMutation({
    mutationFn: async (role: Partial<AppRole> & { id: string }) => {
      const { error } = await (supabase
        .from("app_roles" as any) as any)
        .update({
          name: role.name,
          description: role.description,
          permissions: role.permissions
        })
        .eq("id", role.id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_roles"] })
      toast({ 
        title: "Rol actualizado", 
        description: "Los cambios han sido guardados en la base de datos correctamente." 
      })
    },
    onError: (error: any) => {
      toast({ 
        title: "Error al actualizar", 
        description: error.message, 
        variant: "destructive" 
      })
    }
  })

  const createRoleMutation = useMutation({
    mutationFn: async (role: any) => {
      const { error } = await (supabase
        .from("app_roles" as any) as any)
        .insert(role)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_roles"] })
      toast({ title: "Rol creado", description: "El nuevo rol ha sido registrado exitosamente." })
    },
    onError: (error: any) => {
      toast({ 
        title: "Error al crear", 
        description: error.message, 
        variant: "destructive" 
      })
    }
  })

  return {
    roles,
    isLoading,
    updateRole: updateRoleMutation.mutateAsync,
    createRole: createRoleMutation.mutateAsync,
    isUpdating: updateRoleMutation.isPending
  }
}
