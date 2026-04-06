import { useQueryClient, useMutation } from "@tanstack/react-query";
import { getAdminClient } from "@/lib/admin-client";
import { useToast } from "./use-toast";

export function useCreateDailyCloseMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: {
      closeDate: string;
      branch: string;
      totalShipments: number;
      totalRevenue: number;
      totalDriverPayments: number;
      netProfit: number;
      cashCollected: number;
      notes?: string;
    }) => {
      const adminClient = getAdminClient();
      const { data, error } = await adminClient
        .from("daily_close")
        .upsert(
          {
            close_date: payload.closeDate,
            branch: payload.branch,
            total_shipments: payload.totalShipments,
            total_revenue: payload.totalRevenue,
            total_driver_payments: payload.totalDriverPayments,
            net_profit: payload.netProfit,
            cash_collected: payload.cashCollected,
            notes: payload.notes ?? null,
          },
          { onConflict: "close_date,branch" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-close"] });
      queryClient.invalidateQueries({ queryKey: ["financial"] });
      toast({ title: "Cierre Exitoso", description: "El cierre del día se ha generado correctamente." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "No se pudo realizar el cierre", variant: "destructive" });
    },
  });
}

export function useCreateFinancialMovementMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: {
      type: "income" | "expense";
      category: string;
      amount: number;
      description: string;
      referenceId?: number;
      referenceType?: string;
      evidenceUrl?: string;
      movementDate?: string;
      branch?: string;
    }) => {
      const adminClient = getAdminClient();
      const { data, error } = await adminClient
        .from("financial_movements")
        .insert({
          type: payload.type,
          category: payload.category,
          amount: payload.amount,
          description: payload.description,
          reference_id: payload.referenceId ?? null,
          reference_type: payload.referenceType ?? null,
          evidence_url: payload.evidenceUrl ?? null,
          branch: payload.branch ?? 'Bogotá',
          movement_date: payload.movementDate ?? new Date().toISOString().split("T")[0],
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial"] });
      toast({ title: "Movimiento registrado", description: "El movimiento financiero se guardó correctamente." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "No se pudo registrar el movimiento", variant: "destructive" });
    },
  });
}
