import { useQueryClient, useMutation } from "@tanstack/react-query";
import { getAdminClient } from "@/lib/admin-client";
import { useToast } from "./use-toast";

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
        recipientDocument?: string;
        recipientName: string;
        recipientPhone: string;
        recipientAddress: string;
        recipientCity: string;
        paymentMethod?: string;
        weight?: number;
        quantity?: number;
        declaredValue?: number;
        shippingCost?: number;
        driverPayment?: number;
        observations?: string;
        packageContents?: string;
        driverId?: number;
        branchOrigin?: string;
      };
    }) => {
      const { data: d } = payload;
      const adminClient = getAdminClient();
      // ─── UPSERT Clients (if they don't exist) ───
      if (d.senderDocument) {
        await adminClient.from("clients").upsert({
          document: d.senderDocument,
          name: d.senderName,
          phone: d.senderPhone,
          address: d.senderAddress,
          city: d.senderCity
        }, { onConflict: "document", ignoreDuplicates: true });
      }

      if (d.recipientDocument) {
        await adminClient.from("clients").upsert({
          document: d.recipientDocument,
          name: d.recipientName,
          phone: d.recipientPhone,
          address: d.recipientAddress,
          city: d.recipientCity
        }, { onConflict: "document", ignoreDuplicates: true });
      }

      const { data: result, error } = await adminClient
        .from("shipments")
        .insert({
          sender_document: d.senderDocument ?? null,
          sender_name: d.senderName,
          sender_phone: d.senderPhone,
          sender_address: d.senderAddress,
          sender_city: d.senderCity,
          recipient_document: d.recipientDocument ?? null,
          recipient_name: d.recipientName,
          recipient_phone: d.recipientPhone,
          recipient_address: d.recipientAddress,
          recipient_city: d.recipientCity,
          payment_method: d.paymentMethod ?? 'Efectivo',
          weight: d.weight ?? 1,
          quantity: d.quantity ?? 1,
          declared_value: d.declaredValue ?? 0,
          shipping_cost: d.shippingCost ?? 0,
          driver_payment: d.driverPayment ?? 0,
          observations: d.observations ?? null,
          package_contents: d.packageContents ?? null,
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
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["financial"] });
      toast({ title: "Éxito", description: "Envío creado correctamente" });

      // Notificación WhatsApp al remitente con la guía generada
      try {
        const adminClient = getAdminClient();
        const { data: shipment } = await adminClient
          .from("shipments")
          .select("*, drivers(name, phone)")
          .eq("id", result.id)
          .single();

        if (shipment && shipment.sender_phone) {
          const numGuia = shipment.guide_number || String(shipment.id);
          const trackingUrl = `https://www.fronterasexpress.com/?guide=${numGuia}`;
          const fecha = new Date(shipment.created_at).toLocaleDateString("es-CO", {
            year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
          });

          const messageText =
            `🚚 *FRONTERAS EXPRESS*\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `✅ *GUÍA REGISTRADA EXITOSAMENTE*\n\n` +
            `📋 *Número de Guía:* ${numGuia}\n` +
            `📅 *Fecha:* ${fecha}\n\n` +
            `👤 *REMITENTE*\n` +
            `• Nombre: ${shipment.sender_name}\n` +
            `• Teléfono: ${shipment.sender_phone}\n` +
            `• Ciudad: ${shipment.sender_city}\n` +
            `• Dirección: ${shipment.sender_address}\n\n` +
            `📦 *DESTINATARIO*\n` +
            `• Nombre: ${shipment.recipient_name}\n` +
            `• Teléfono: ${shipment.recipient_phone}\n` +
            `• Ciudad: ${shipment.recipient_city}\n` +
            `• Dirección: ${shipment.recipient_address}\n\n` +
            `💰 *DETALLE DEL ENVÍO*\n` +
            `• Peso: ${shipment.weight || 1} kg\n` +
            `• Cantidad: ${shipment.quantity || 1} pieza(s)\n` +
            `• Valor declarado: $${Number(shipment.declared_value || 0).toLocaleString("es-CO")}\n` +
            `• Costo del flete: *$${Number(shipment.shipping_cost || 0).toLocaleString("es-CO")}*\n` +
            `• Método de pago: ${shipment.payment_method || "Efectivo"}\n` +
            (shipment.observations ? `• Observaciones: ${shipment.observations}\n` : ``) +
            (shipment.package_contents ? `• Contenido: ${shipment.package_contents}\n` : ``) +
            `\n` +
            `🔍 *RASTREA TU ENVÍO EN TIEMPO REAL*\n` +
            `👉 ${trackingUrl}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `_Fronteras Express — Más que rápido, siempre a tiempo_ ✨`;

          const { sendWhatsAppMessage } = await import("@/lib/whatsapp");
          await sendWhatsAppMessage(shipment.sender_phone, messageText);

          // También notificar al destinatario si tiene teléfono
          if (shipment.recipient_phone && shipment.recipient_phone !== shipment.sender_phone) {
            const recipientMessage =
              `🚚 *FRONTERAS EXPRESS*\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `📦 *Tienes un paquete en camino*\n\n` +
              `Hola *${shipment.recipient_name}*, te informamos que *${shipment.sender_name}* te ha enviado un paquete.\n\n` +
              `📋 *Guía:* ${numGuia}\n` +
              `📍 *Desde:* ${shipment.sender_city}\n` +
              `📍 *Hacia:* ${shipment.recipient_city}\n` +
              `🏠 *Dirección de entrega:* ${shipment.recipient_address}\n\n` +
              `🔍 *Rastrea tu paquete aquí:*\n` +
              `👉 ${trackingUrl}\n\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `_Fronteras Express — Más que rápido, siempre a tiempo_ ✨`;

            await sendWhatsAppMessage(shipment.recipient_phone, recipientMessage);
          }
        }
      } catch (err) {
        console.error("Error enviando notificación WhatsApp al crear guía:", err);
      }
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
      // ─── UPSERT Clients (if they don't exist) ───
      if (d.senderDocument) {
        await adminClient.from("clients").upsert({
          document: d.senderDocument,
          name: d.senderName,
          phone: d.senderPhone,
          address: d.senderAddress,
          city: d.senderCity
        }, { onConflict: "document", ignoreDuplicates: true });
      }

      if (d.recipientDocument) {
        await adminClient.from("clients").upsert({
          document: d.recipientDocument,
          name: d.recipientName,
          phone: d.recipientPhone,
          address: d.recipientAddress,
          city: d.recipientCity
        }, { onConflict: "document", ignoreDuplicates: true });
      }

      const { data: result, error } = await adminClient
        .from("shipments")
        .update({
          sender_document: d.senderDocument,
          sender_name: d.senderName,
          sender_phone: d.senderPhone,
          sender_address: d.senderAddress,
          sender_city: d.senderCity,
          recipient_document: d.recipientDocument,
          recipient_name: d.recipientName,
          recipient_phone: d.recipientPhone,
          recipient_address: d.recipientAddress,
          recipient_city: d.recipientCity,
          payment_method: d.paymentMethod,
          weight: d.weight,
          quantity: d.quantity,
          declared_value: d.declaredValue,
          shipping_cost: d.shippingCost,
          driver_payment: d.driverPayment,
          observations: d.observations,
          package_contents: d.packageContents,
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
    onSuccess: async (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["shipments", id] });
      toast({ title: "Conductor Asignado", description: "Se ha asignado el conductor al envío" });

      try {
        const adminClient = getAdminClient();
        const { data: shipment } = await adminClient
          .from("shipments")
          .select("*, drivers!fk_shipments_drivers(name, phone, company, vehicle_type)")
          .eq("id", id)
          .single();

        // Fallback or attempt to fetch if relation name is strict
        let finalShipment = shipment;
        if (!finalShipment || !finalShipment.drivers) {
          const res = await adminClient.from("shipments").select("*, drivers(name, phone, company, vehicle_type)").eq("id", id).single();
          if (res.data) finalShipment = res.data;
        }

        if (finalShipment && finalShipment.drivers && payload.driverId) {
          const { sendWhatsAppMessage } = await import("@/lib/whatsapp");
          const driver = finalShipment.drivers as any;
          const numGuia = finalShipment.guide_number || String(finalShipment.id);
          const trackingUrl = `https://www.fronterasexpress.com/?guide=${numGuia}`;
          
          const vehicleMap: Record<string, string> = {
            'motorcycle': 'Motocicleta',
            'car': 'Automóvil',
            'van': 'Furgoneta',
            'truck': 'Camión'
          };
          const vehicle = vehicleMap[driver.vehicle_type] || driver.vehicle_type;

          const messageText = 
            `🚚 *ACTUALIZACIÓN DE ENVÍO - FRONTERAS EXPRESS*\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `Tu paquete con guía *${numGuia}* ha sido asignado a un transportador y está próximo a ser recogido/entregado.\n\n` +
            `👤 *DATOS DEL TRANSPORTADOR*\n` +
            `• Nombre: ${driver.name}\n` +
            `• Teléfono: ${driver.phone}\n` +
            (driver.company ? `• Empresa: ${driver.company}\n` : '') +
            `• Vehículo: ${vehicle}\n\n` +
            `🔍 *RASTREA TU ENVÍO EN TIEMPO REAL*\n` +
            `👉 ${trackingUrl}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `_Fronteras Express — Más que rápido, siempre a tiempo_ ✨`;

          if (finalShipment.sender_phone) {
            await sendWhatsAppMessage(finalShipment.sender_phone, messageText);
          }
          if (finalShipment.recipient_phone && finalShipment.recipient_phone !== finalShipment.sender_phone) {
            await sendWhatsAppMessage(finalShipment.recipient_phone, messageText);
          }
        }
      } catch (err) {
        console.error("Error enviando WhatsApp al asignar conductor:", err);
      }
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
