import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "./use-toast";

export function useCreateDailyCloseMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: any) => {
      await new Promise(r => setTimeout(r, 500));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-close"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/summary"] });
      toast({ title: "Cierre Exitoso", description: "El cierre del día se ha generado correctamente." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "No se pudo realizar el cierre", variant: "destructive" });
    }
  });
}
