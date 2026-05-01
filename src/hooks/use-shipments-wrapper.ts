import { useQueryClient, useMutation } from "@tanstack/react-query";
import { getAdminClient } from "@/lib/admin-client";
import { useToast } from "./use-toast";
import { handleWhatsAppMultiple, getHumanizedGreeting, getShipmentTemplateConfig, getDriverAssignedTemplateConfig } from "@/lib/whatsapp";

// ─── Helper: Guardar cliente si no existe ─────────────────────────────────────
// Si el documento lleva guión (ej: 900123456-1) es NIT → JURIDICA
// Si no tiene guión es CC → NATURAL (persona natural)
// Usa UPSERT atómico por "document" para evitar problemas de secuencia de ID
async function ensureClientExists(doc: string, name: string, phone: string, address: string, city: string) {
  if (!doc || !doc.trim()) return; // nada que guardar

  const adminClient = getAdminClient();
  const isNit = doc.includes("-");
  const tipoCliente = isNit ? "JURIDICA" : "NATURAL";
  const tipoIdentificacion = isNit ? "NIT" : "CC";

  try {
    const row = {
      document:            doc.trim(),
      name:                name?.trim() || "SIN NOMBRE",
      phone:               phone?.trim() || "0000000",
      address:             address?.trim() || "",
      city:                city?.trim() || "Bogotá",
      tipo_cliente:        tipoCliente,
      tipo_identificacion: tipoIdentificacion,
      razon_social:        isNit ? (name?.trim() || null) : null,
      apellido:            null as string | null,
      responsable_iva:     null as string | null,
      regimen:             null as string | null,
      categoria:           "CLIENTE" as string | null,
      email:               null as string | null,
      departamento:        null as string | null,
    };

    // Upsert atómico: si el documento ya existe → actualiza; si no → inserta.
    // Esto evita el problema de la secuencia de ID (SERIAL) desincronizada.
    const { error } = await adminClient
      .from("clients")
      .upsert(row, { onConflict: "document", ignoreDuplicates: false });

    if (error) {
      console.error("[ensureClientExists] Error en upsert de cliente:", JSON.stringify(error));
      console.error("[ensureClientExists] Datos enviados:", JSON.stringify(row));
    } else {
      console.log("[ensureClientExists] Cliente guardado exitosamente:", doc.trim(), tipoCliente, tipoIdentificacion);
    }
  } catch (err) {
    console.error("[ensureClientExists] Error inesperado al guardar cliente:", err);
  }
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
        cashOnDelivery?: number;
        observations?: string;
        packageContents?: string;
        driverId?: number;
        branchOrigin?: string;
      };
    }) => {
      const { data: d } = payload;
      const adminClient = getAdminClient();
      // ─── Guardar remitente y destinatario como clientes si no existen ───
      if (d.senderDocument) {
        await ensureClientExists(d.senderDocument, d.senderName, d.senderPhone, d.senderAddress, d.senderCity);
      }
      if (d.recipientDocument) {
        await ensureClientExists(d.recipientDocument, d.recipientName, d.recipientPhone, d.recipientAddress, d.recipientCity);
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
          cash_on_delivery: d.cashOnDelivery ?? 0,
          observations: d.observations ?? null,
          package_contents: d.packageContents ?? null,
          driver_id: d.driverId ?? null,
          branch_origin: d.branchOrigin ?? "Bogotá",
          status: d.driverId ? "in_transit" : "created",
        })
        .select()
        .single();

      if (error) throw error;

      await adminClient.from("shipment_history").insert({
        shipment_id: result.id,
        status: "created",
        notes: "Guía generada automáticamente",
      });

      if (d.driverId) {
        await adminClient.from("shipment_history").insert([
          { shipment_id: result.id, status: "assigned", notes: "Conductor asignado automáticamente al crear" },
          { shipment_id: result.id, status: "picked_up", notes: "Paquete recogido automáticamente" },
          { shipment_id: result.id, status: "in_transit", notes: "En tránsito automáticamente" }
        ]);
      }

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
      queryClient.invalidateQueries({ queryKey: ["clients"] });
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
            `${getHumanizedGreeting(shipment.sender_name)}\n\n` +
            `✅ *GUÍA REGISTRADA EXITOSAMENTE*\n\n` +
            `📋 *Número de Guía:* ${numGuia}\n` +
            `📅 *Fecha y hora de ingreso:* ${fecha}\n\n` +
            `👤 *Remitente:* ${shipment.sender_name}\n` +
            `📦 *Destinatario:* ${shipment.recipient_name}\n\n` +
            `🔍 *RASTREA TU ENVÍO EN TIEMPO REAL*\n` +
            `👉 ${trackingUrl}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `*NIT: 901999613*\n` +
            `_Fronteras Express — Más que rápido, siempre a tiempo_ ✨`;

            const notifications = [
              { 
                label: "Remitente", 
                phone: shipment.sender_phone, 
                text: messageText, 
                template: getShipmentTemplateConfig(shipment, shipment.sender_name) 
              }
            ];

            // También notificar al destinatario si tiene teléfono
            if (shipment.recipient_phone && shipment.recipient_phone !== shipment.sender_phone) {
              const recipientMessage =
                `🚚 *FRONTERAS EXPRESS*\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `${getHumanizedGreeting(shipment.recipient_name)}\n\n` +
                `📦 *Tienes un paquete en camino*\n\n` +
                `Te informamos que *${shipment.sender_name}* te ha enviado un paquete.\n\n` +
                `📋 *Guía:* ${numGuia}\n\n` +
                `🔍 *Rastrea tu paquete aquí:*\n` +
                `👉 ${trackingUrl}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `*NIT: 901999613*\n` +
                `_Fronteras Express — Más que rápido, siempre a tiempo_ ✨`;

              notifications.push({ 
                label: "Destinatario", 
                phone: shipment.recipient_phone, 
                text: recipientMessage,
                template: getShipmentTemplateConfig(shipment, shipment.recipient_name)
              });
            }

            handleWhatsAppMultiple(notifications);
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

      // ─── Obtener datos originales ANTES de actualizar ───
      const { data: original } = await adminClient
        .from("shipments")
        .select("*")
        .eq("id", id)
        .single();

      // ─── Guardar remitente y destinatario como clientes si no existen ───
      if (d.senderDocument) {
        await ensureClientExists(d.senderDocument, d.senderName, d.senderPhone, d.senderAddress, d.senderCity);
      }
      if (d.recipientDocument) {
        await ensureClientExists(d.recipientDocument, d.recipientName, d.recipientPhone, d.recipientAddress, d.recipientCity);
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
          payment_method: d.paymentMethod !== undefined ? d.paymentMethod : original?.payment_method ?? 'Efectivo',
          weight: d.weight,
          quantity: d.quantity,
          declared_value: d.declaredValue,
          shipping_cost: d.shippingCost,
          driver_payment: d.driverPayment,
          cash_on_delivery: d.cashOnDelivery,
          observations: d.observations,
          package_contents: d.packageContents,
          driver_id: d.driverId ?? null,
          branch_origin: d.branchOrigin,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // ─── Detectar cambios entre datos originales y nuevos ───
      const changes: string[] = [];
      if (original) {
        const fieldMap: Record<string, { label: string; oldKey: string; format?: (v: any) => string }> = {
          senderName:      { label: "Nombre remitente", oldKey: "sender_name" },
          senderPhone:     { label: "Teléfono remitente", oldKey: "sender_phone" },
          senderAddress:   { label: "Dirección remitente", oldKey: "sender_address" },
          senderCity:      { label: "Ciudad origen", oldKey: "sender_city" },
          recipientName:   { label: "Nombre destinatario", oldKey: "recipient_name" },
          recipientPhone:  { label: "Teléfono destinatario", oldKey: "recipient_phone" },
          recipientAddress:{ label: "Dirección destinatario", oldKey: "recipient_address" },
          recipientCity:   { label: "Ciudad destino", oldKey: "recipient_city" },
          weight:          { label: "Peso", oldKey: "weight", format: (v) => `${v} kg` },
          quantity:        { label: "Cantidad", oldKey: "quantity", format: (v) => `${v} pieza(s)` },
          declaredValue:   { label: "Valor declarado", oldKey: "declared_value", format: (v) => `$${Number(v).toLocaleString("es-CO")}` },
          shippingCost:    { label: "Costo flete", oldKey: "shipping_cost", format: (v) => `$${Number(v).toLocaleString("es-CO")}` },
          cashOnDelivery:  { label: "Pago contra entrega", oldKey: "cash_on_delivery", format: (v) => `$${Number(v).toLocaleString("es-CO")}` },
          paymentMethod:   { label: "Método de pago", oldKey: "payment_method" },
          observations:    { label: "Observaciones", oldKey: "observations" },
          packageContents: { label: "Contenido", oldKey: "package_contents" },
          branchOrigin:    { label: "Sede origen", oldKey: "branch_origin" },
        };

        for (const [newKey, cfg] of Object.entries(fieldMap)) {
          const oldVal = original[cfg.oldKey];
          const newVal = d[newKey];
          // Comparar como strings para uniformidad
          const oldStr = String(oldVal ?? "").trim();
          const newStr = String(newVal ?? "").trim();
          if (oldStr !== newStr && (oldStr || newStr)) {
            const fmt = cfg.format || ((v: any) => String(v ?? "—"));
            changes.push(`• *${cfg.label}:* ${fmt(oldVal)} → ${fmt(newVal)}`);
          }
        }
      }
      // ─── Actualizar el registro financiero asociado si existe ───
      if (d.shippingCost !== undefined) {
        const { data: movement } = await adminClient
          .from("financial_movements")
          .select("id")
          .eq("reference_type", "shipment")
          .eq("reference_id", id)
          .single();

        if (movement) {
          await adminClient.from("financial_movements").update({
            amount: d.shippingCost,
            branch: d.branchOrigin, 
          }).eq("id", movement.id);
        } else if (d.shippingCost > 0 && result) {
          // Crearlo si no existía
          await adminClient.from("financial_movements").insert({
            type: 'income',
            category: 'shipping',
            amount: d.shippingCost,
            description: `Ingreso por Guía ${result.guide_number}`,
            recorded_by: 'Sistema',
            movement_date: new Date().toISOString(),
            reference_type: 'shipment',
            reference_id: id,
            branch: d.branchOrigin ?? "Bogotá"
          });
        }
      }

      return { result, changes, original };
    },
    onSuccess: async ({ result, changes }) => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["shipments", id] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["financial"] });
      toast({ title: "Éxito", description: "Envío actualizado correctamente" });

      // ─── Notificación WhatsApp con las modificaciones ───
      if (changes && changes.length > 0 && result) {
        try {
          const numGuia = result.guide_number || String(result.id);
          const trackingUrl = `https://www.fronterasexpress.com/?guide=${numGuia}`;
          const fecha = new Date().toLocaleDateString("es-CO", {
            year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
          });

          const messageText =
            `🚚 *FRONTERAS EXPRESS*\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `${getHumanizedGreeting(result.sender_name)}\n\n` +
            `✏️ *ENVÍO MODIFICADO*\n\n` +
            `📋 *Guía:* ${numGuia}\n` +
            `📅 *Fecha de modificación:* ${fecha}\n\n` +
            `👤 *Remitente:* ${result.sender_name}\n` +
            `📦 *Destinatario:* ${result.recipient_name}\n\n` +
            `🔍 *Rastrea tu envío aquí:*\n` +
            `👉 ${trackingUrl}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `*NIT: 901999613*\n` +
            `_Fronteras Express — Más que rápido, siempre a tiempo_ ✨`;

          const notifications = [];
          if (result.sender_phone) notifications.push({ label: "Remitente", phone: result.sender_phone, text: messageText });
          if (result.recipient_phone && result.recipient_phone !== result.sender_phone) notifications.push({ label: "Destinatario", phone: result.recipient_phone, text: messageText });
          
          handleWhatsAppMultiple(notifications);
        } catch (err) {
          console.error("Error enviando WhatsApp al modificar envío:", err);
        }
      }
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
    onSuccess: async (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["shipments", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: "Estado Actualizado", description: "El estado del envío ha cambiado" });

      if (payload.status === "delivered") {
        try {
          const adminClient = getAdminClient();
          const { data: shipment } = await adminClient
            .from("shipments")
            .select("*")
            .eq("id", id)
            .single();

          if (shipment) {
            const numGuia = shipment.guide_number || String(shipment.id);
            const trackingUrl = `https://www.fronterasexpress.com/?guide=${numGuia}`;

            const messageText = 
              `🚚 *FRONTERAS EXPRESS*\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `${getHumanizedGreeting(shipment.recipient_name)}\n\n` +
              `🥳 *¡TU PAQUETE HA SIDO ENTREGADO!*\n\n` +
              `Nos complace informarte que tu paquete con guía *${numGuia}* ha sido entregado exitosamente.\n\n` +
              `👤 *Remitente:* ${shipment.sender_name}\n` +
              `📦 *Destinatario:* ${shipment.recipient_name}\n\n` +
              `🙏 *¡Gracias por confiar en Fronteras Express!*\n` +
              `Puedes revisar los detalles aquí:\n` +
              `👉 ${trackingUrl}\n\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `*NIT: 901999613*\n` +
              `_Fronteras Express — Más que rápido, siempre a tiempo_ ✨`;

            const notifications = [];
            if (shipment.recipient_phone) notifications.push({ label: "Destinatario", phone: shipment.recipient_phone, text: messageText });
            if (shipment.sender_phone && shipment.sender_phone !== shipment.recipient_phone) {
              const senderMessageText = 
                `🚚 *FRONTERAS EXPRESS*\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `${getHumanizedGreeting(shipment.sender_name)}\n\n` +
                `🥳 *¡PAQUETE ENTREGADO EXITOSAMENTE!*\n\n` +
                `El paquete que enviaste a *${shipment.recipient_name}* (Guía: *${numGuia}*) ha sido entregado.\n\n` +
                `🙏 *¡Gracias por confiar en nosotros!*\n` +
                `Consulta el estado de la guía aquí:\n` +
                `👉 ${trackingUrl}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `*NIT: 901999613*\n` +
                `_Fronteras Express — Más que rápido, siempre a tiempo_ ✨`;
              notifications.push({ label: "Remitente", phone: shipment.sender_phone, text: senderMessageText });
            }
            handleWhatsAppMultiple(notifications);
          }
        } catch (err) {
          console.error("Error enviando WhatsApp al marcar como entregado:", err);
        }
      }
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Error al cambiar estado", variant: "destructive" });
    },
  });
}

// ─── Collect Cash On Delivery ─────────────────────────────────────────────────
export function useCollectCashOnDeliveryMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const adminClient = getAdminClient();
      const { error } = await adminClient
        .from("shipments")
        .update({ is_cash_on_delivery_collected: true })
        .eq("id", id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["shipments", id] });
      // Invalidate the alerts cache
      queryClient.invalidateQueries({ queryKey: ["shipments", "pendingCashOnDelivery"] });
      toast({ title: "Recaudo Exitoso", description: "El pago contra entrega ha sido marcado como recibido." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Error al registrar el recaudo", variant: "destructive" });
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
          status: "in_transit",
          driver_signature: payload.driverSignature || null
        })
        .eq("id", id);
      if (error) throw error;

      await adminClient.from("shipment_history").insert([
        { shipment_id: id, status: "assigned", notes: "Conductor asignado" },
        { shipment_id: id, status: "picked_up", notes: "Paquete recogido automáticamente" },
        { shipment_id: id, status: "in_transit", notes: "En tránsito automáticamente" }
      ]);
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
          const driver = finalShipment.drivers as any;
          const numGuia = finalShipment.guide_number || String(finalShipment.id);
          const trackingUrl = `https://www.fronterasexpress.com/?guide=${numGuia}`;
          
          const messageText = 
            `🚚 *ACTUALIZACIÓN DE ENVÍO - FRONTERAS EXPRESS*\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `${getHumanizedGreeting(finalShipment.sender_name)}\n\n` +
            `Tu paquete con guía *${numGuia}* ha sido asignado a un transportador.\n\n` +
            `👤 *Remitente:* ${finalShipment.sender_name}\n` +
            `📦 *Destinatario:* ${finalShipment.recipient_name}\n\n` +
            `🔍 *RASTREA TU ENVÍO EN TIEMPO REAL*\n` +
            `👉 ${trackingUrl}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `*NIT: 901999613*\n` +
            `_Fronteras Express — Más que rápido, siempre a tiempo_ ✨`;

          const notifications = [];
          if (finalShipment.sender_phone) {
            notifications.push({ 
              label: "Remitente", 
              phone: finalShipment.sender_phone, 
              text: messageText,
              template: getDriverAssignedTemplateConfig(finalShipment, finalShipment.sender_name)
            });
          }
          if (finalShipment.recipient_phone && finalShipment.recipient_phone !== finalShipment.sender_phone) {
            notifications.push({ 
              label: "Destinatario", 
              phone: finalShipment.recipient_phone, 
              text: messageText,
              template: getDriverAssignedTemplateConfig(finalShipment, finalShipment.recipient_name)
            });
          }
          handleWhatsAppMultiple(notifications);
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

// ─── Delete Shipment ──────────────────────────────────────────────────────────
export function useDeleteShipmentMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const adminClient = getAdminClient();
      
      // Eliminar registros relacionados para evitar errores de llave foránea
      await adminClient.from("financial_movements").delete().eq("reference_type", "shipment").eq("reference_id", id);
      await adminClient.from("shipment_history").delete().eq("shipment_id", id);
      
      const { error } = await adminClient.from("shipments").delete().eq("id", id);
      if (error) throw error;
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["financial"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Éxito", description: "Envío eliminado correctamente" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Error al eliminar envío", variant: "destructive" });
    },
  });
}
