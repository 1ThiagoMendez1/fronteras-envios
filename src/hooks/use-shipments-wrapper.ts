import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "./use-toast";

// Wrappers for generated mutations to handle automatic cache invalidation
export function useCreateShipmentMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: any) => {
      await new Promise(r => setTimeout(r, 500));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Éxito", description: "Envío creado correctamente" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Error al crear envío", variant: "destructive" });
    }
  });
}

export function useUpdateShipmentMutation(id: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: any) => {
      await new Promise(r => setTimeout(r, 500));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
      queryClient.invalidateQueries({ queryKey: [`/api/shipments/${id}`] });
      toast({ title: "Éxito", description: "Envío actualizado correctamente" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Error al actualizar envío", variant: "destructive" });
    }
  });
}

export function useUpdateShipmentStatusMutation(id: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: any) => {
      await new Promise(r => setTimeout(r, 500));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
      queryClient.invalidateQueries({ queryKey: [`/api/shipments/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/shipments/${id}/history`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Estado Actualizado", description: "El estado del envío ha cambiado" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Error al cambiar estado", variant: "destructive" });
    }
  });
}

export function useAssignDriverMutation(id: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: any) => {
      await new Promise(r => setTimeout(r, 500));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
      queryClient.invalidateQueries({ queryKey: [`/api/shipments/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/shipments/${id}/history`] });
      toast({ title: "Conductor Asignado", description: "Se ha asignado el conductor al envío" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Error al asignar conductor", variant: "destructive" });
    }
  });
}
