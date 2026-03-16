import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "./use-toast";

export function useCreateDriverMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: any) => {
      await new Promise(r => setTimeout(r, 500));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      toast({ title: "Éxito", description: "Conductor registrado correctamente" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Error al registrar conductor", variant: "destructive" });
    }
  });
}

export function useUpdateDriverMutation(id: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: any) => {
      await new Promise(r => setTimeout(r, 500));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      queryClient.invalidateQueries({ queryKey: [`/api/drivers/${id}`] });
      toast({ title: "Éxito", description: "Conductor actualizado correctamente" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Error al actualizar conductor", variant: "destructive" });
    }
  });
}

export function useDeleteDriverMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (id: number) => {
      await new Promise(r => setTimeout(r, 500));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      toast({ title: "Éxito", description: "Conductor eliminado correctamente" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Error al eliminar conductor", variant: "destructive" });
    }
  });
}
