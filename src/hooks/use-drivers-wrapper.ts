import { useQueryClient, useMutation } from "@tanstack/react-query";
import { getAdminClient } from "@/lib/admin-client";
import { useToast } from "./use-toast";

export function useCreateDriverMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: {
      data: {
        name: string;
        phone: string;
        email?: string;
        company?: string;
        vehicleType: string;
        city: string;
        ratePerDelivery?: number;
      };
    }) => {
      const d = payload.data;
      const adminClient = getAdminClient();
      const { data, error } = await adminClient
        .from("drivers")
        .insert({
          name: d.name,
          phone: d.phone,
          email: d.email ?? null,
          company: d.company ?? null,
          vehicle_type: d.vehicleType as 'motorcycle' | 'car' | 'van' | 'truck',
          city: d.city,
          rate_per_delivery: d.ratePerDelivery ?? 0,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      toast({ title: "Éxito", description: "Conductor registrado correctamente" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Error al registrar conductor", variant: "destructive" });
    },
  });
}

export function useUpdateDriverMutation(id: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: {
      data: {
        name?: string;
        phone?: string;
        email?: string;
        company?: string;
        vehicleType?: 'motorcycle' | 'car' | 'van' | 'truck';
        city?: string;
        ratePerDelivery?: number;
        isActive?: boolean;
      };
    }) => {
      const d = payload.data;
      const adminClient = getAdminClient();
      const { data, error } = await adminClient
        .from("drivers")
        .update({
          name: d.name,
          phone: d.phone,
          email: d.email,
          company: d.company,
          vehicle_type: d.vehicleType,
          city: d.city,
          rate_per_delivery: d.ratePerDelivery,
          is_active: d.isActive,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      queryClient.invalidateQueries({ queryKey: ["drivers", id] });
      toast({ title: "Éxito", description: "Conductor actualizado correctamente" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Error al actualizar conductor", variant: "destructive" });
    },
  });
}

export function useDeleteDriverMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      // Soft delete: set inactive instead of hard delete
      const adminClient = getAdminClient();
      const { error } = await adminClient
        .from("drivers")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      toast({ title: "Éxito", description: "Conductor desactivado correctamente" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Error al desactivar conductor", variant: "destructive" });
    },
  });
}
