import { useQueryClient, useMutation } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import { useToast } from "./use-toast";

const FORCE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function getAdminClient() {
  return createClient(SUPABASE_URL, FORCE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

// ─── Create Shipment ──────────────────────────────────────────────────────────
export function useCreateShipmentMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: {
      data: {
        senderDocument?: string;
        senderName: string;
        senderPhone: string;
        senderAddress: string;
        senderCity: string;
        recipientName: string;
        recipientPhone: string;
        recipientAddress: string;
        recipientCity: string;
        paymentMethod?: string;
        weight?: number;
        declaredValue?: number;
        shippingCost?: number;
        driverPayment?: number;
        observations?: string;
        driverId?: number;
        branchOrigin?: string;
      };
    }) => {
      const { data: d } = payload;
      const adminClient = getAdminClient();
      const { data: result, error } = await adminClient
        .from("shipments")
        .insert({
          sender_document: d.senderDocument ?? null,
          sender_name: d.senderName,
          sender_phone: d.senderPhone,
          sender_address: d.senderAddress,
          sender_city: d.senderCity,
          recipient_name: d.recipientName,
          recipient_phone: d.recipientPhone,
          recipient_address: d.recipientAddress,
          recipient_city: d.recipientCity,
          payment_method: d.paymentMethod ?? 'Efectivo',
          weight: d.weight ?? 1,
          declared_value: d.declaredValue ?? 0,
          shipping_cost: d.shippingCost ?? 0,
          driver_payment: d.driverPayment ?? 0,
          observations: d.observations ?? null,
          driver_id: d.driverId ?? null,
          branch_origin: d.branchOrigin ?? "Bogotá",
          status: d.driverId ? "assigned" : "created",
        })
        .select()
        .single();

      if (error) throw error;

      // Note: Initial 'created' log is handled by the trigger in 001_initial_schema
      // But we can be explicit if we want custom notes:
      await adminClient.from("shipment_history").insert({
        shipment_id: result.id,
        status: "created",
        notes: "Guía generada automáticamente",
      });

      // Increment client's shipment count atomically
      if (d.senderDocument) {
        await adminClient.rpc("increment_client_shipments", {
          p_document: d.senderDocument,
        });
      }

      // ─── Automatic Financial Movement ───
      // If shippingCost > 0, record as income
      if (d.shippingCost && d.shippingCost > 0) {
        await adminClient.from("financial_movements").insert({
          type: 'income',
          category: 'shipping',
          amount: d.shippingCost,
          description: `Ingreso por Guía ${result.guide_number}`,
          recorded_by: 'Sistema',
          movement_date: new Date().toISOString(),
          reference_type: 'shipment',
          reference_id: result.id,
          branch: d.branchOrigin ?? "Bogotá"
        });
      }

      return { id: result.id, guideNumber: result.guide_number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["financial"] });
      toast({ title: "Éxito", description: "Envío creado correctamente" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Error al crear envío", variant: "destructive" });
    },
  });
}

// ─── Update Shipment ──────────────────────────────────────────────────────────
export function useUpdateShipmentMutation(id: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: { data: Record<string, any> }) => {
      const d = payload.data;
      const adminClient = getAdminClient();
      const { data: result, error } = await adminClient
        .from("shipments")
        .update({
          sender_document: d.senderDocument,
          sender_name: d.senderName,
          sender_phone: d.senderPhone,
          sender_address: d.senderAddress,
          sender_city: d.senderCity,
          recipient_name: d.recipientName,
          recipient_phone: d.recipientPhone,
          recipient_address: d.recipientAddress,
          recipient_city: d.recipientCity,
          payment_method: d.paymentMethod,
          weight: d.weight,
          declared_value: d.declaredValue,
          shipping_cost: d.shippingCost,
          driver_payment: d.driverPayment,
          observations: d.observations,
          driver_id: d.driverId ?? null,
          branch_origin: d.branchOrigin,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["shipments", id] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["financial"] });
      toast({ title: "Éxito", description: "Envío actualizado correctamente" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Error al actualizar envío", variant: "destructive" });
    },
  });
}

// ─── Update Shipment Status ───────────────────────────────────────────────────
export function useUpdateShipmentStatusMutation(id: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: { status: string; notes?: string }) => {
      const adminClient = getAdminClient();
      const { error } = await adminClient.rpc("update_shipment_status", {
        p_shipment_id: id,
        p_new_status: payload.status,
        p_notes: payload.notes ?? null,
      });
      if (error) throw error;
      return { status: payload.status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["shipments", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: "Estado Actualizado", description: "El estado del envío ha cambiado" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Error al cambiar estado", variant: "destructive" });
    },
  });
}

// ─── Assign Driver ────────────────────────────────────────────────────────────
export function useAssignDriverMutation(id: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: { driverId: number; driverSignature?: string | null }) => {
      const adminClient = getAdminClient();
      const { error } = await adminClient
        .from("shipments")
        .update({ 
          driver_id: payload.driverId, 
          status: "assigned",
          driver_signature: payload.driverSignature || null
        })
        .eq("id", id);
      if (error) throw error;

      await adminClient.from("shipment_history").insert({
        shipment_id: id,
        status: "assigned",
        notes: "Conductor asignado",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["shipments", id] });
      toast({ title: "Conductor Asignado", description: "Se ha asignado el conductor al envío" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Error al asignar conductor", variant: "destructive" });
    },
  });
}

// ─── Add Chat Message ──────────────────────────────────────────────────────────
export function useAddShipmentChatMutation(id: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: { mensajes: any[] }) => {
      const adminClient = getAdminClient();
      const { data: result, error } = await adminClient
        .from("shipments")
        .update({ comentarios: payload.mensajes })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["shipments", id] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Error al enviar mensaje", variant: "destructive" });
    },
  });
}
