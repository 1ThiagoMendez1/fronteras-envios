import { useQuery } from "@tanstack/react-query";
import { getAdminClient } from "@/lib/admin-client";

interface ListShipmentsOptions {
  status?: string;
  search?: string;
  senderDocument?: string;
  branch?: string;
  page?: number;
  pageSize?: number;
}

export function useListShipments(options: ListShipmentsOptions = {}) {
  const { status, search, senderDocument, branch, page = 1, pageSize = 50 } = options;

  return useQuery({
    queryKey: ["shipments", { status, search, senderDocument, branch, page }],
    queryFn: async () => {
      const adminClient = getAdminClient();
      let query = adminClient
        .from("shipments")
        .select("*, drivers(name, vehicle_type, city)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      if (search) {
        query = query.or(
          `guide_number.ilike.%${search}%,sender_name.ilike.%${search}%,recipient_name.ilike.%${search}%`
        );
      }

      if (branch && branch !== "all") {
        query = query.eq("branch_origin", branch);
      }

      if (senderDocument) {
        query = query.eq("sender_document", senderDocument);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      // Map snake_case DB columns → camelCase for the UI
      const shipments = (data ?? []).map(mapShipment);
      return { shipments, total: count ?? 0 };
    },
  });
}

export function useGetShipment(id: number | string) {
  return useQuery({
    queryKey: ["shipments", id],
    queryFn: async () => {
      const adminClient = getAdminClient();
      const { data, error } = await adminClient
        .from("shipments")
        .select("*, drivers(id, name, vehicle_type, city, phone), shipment_history(id, status, notes, changed_by, created_at)")
        .eq("id", Number(id))
        .single();

      if (error) throw error;
      return mapShipment(data);
    },
    enabled: !!id,
  });
}

export function useGetShipmentByGuide(guideNumber: string) {
  return useQuery({
    queryKey: ["shipments", "guide", guideNumber],
    queryFn: async () => {
      const adminClient = getAdminClient();

      // 1. Fetch shipment (without join to avoid 406 if relation is not cached)
      const { data, error } = await adminClient
        .from("shipments")
        .select("*")
        .eq("guide_number", guideNumber)
        .single();

      if (error) throw error;

      // 2. Fetch history separately (graceful — won't fail the whole query)
      let historyData: any[] = [];
      try {
        const { data: history } = await adminClient
          .from("shipment_history")
          .select("id, status, notes, changed_by, created_at")
          .eq("shipment_id", data.id)
          .order("created_at", { ascending: true });
        historyData = history ?? [];
      } catch {
        // shipment_history table might not exist yet — that's ok
      }

      return mapShipment({ ...data, shipment_history: historyData });
    },
    enabled: !!guideNumber,
    retry: 1,
  });
}

// Map DB row (snake_case) → UI shape (camelCase)
function mapShipment(row: any) {
  if (!row) return row;
  return {
    id: row.id,
    guideNumber: row.guide_number,
    senderDocument: row.sender_document,
    senderName: row.sender_name,
    senderPhone: row.sender_phone,
    senderAddress: row.sender_address,
    senderCity: row.sender_city,
    recipientDocument: row.recipient_document,
    recipientName: row.recipient_name,
    recipientPhone: row.recipient_phone,
    recipientAddress: row.recipient_address,
    recipientCity: row.recipient_city,
    paymentMethod: row.payment_method || 'Efectivo',
    weight: Number(row.weight || 0),
    quantity: Number(row.quantity || 1),
    declaredValue: Number(row.declared_value || 0),
    shippingCost: Number(row.shipping_cost || 0),
    driverPayment: Number(row.driver_payment || 0),
    cashOnDelivery: Number(row.cash_on_delivery || 0),
    isCashOnDeliveryCollected: Boolean(row.is_cash_on_delivery_collected),
    observations: row.observations,
    packageContents: row.package_contents,
    status: row.status,
    driverId: row.driver_id,
    driverSignature: row.driver_signature,
    branchOrigin: row.branch_origin,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    driver: row.drivers ? {
      id: row.drivers.id,
      name: row.drivers.name,
      vehicleType: row.drivers.vehicle_type,
      city: row.drivers.city,
      phone: row.drivers.phone
    } : null,
    comentarios: row.comentarios ? (typeof row.comentarios === "string" ? JSON.parse(row.comentarios) : row.comentarios) : [],
    history: deduplicateHistory(row.shipment_history ?? []).map((h: any) => ({
      id: h.id || h.id_temp, // use original id mapped
      status: h.status,
      notes: h.notes,
      changedBy: h.changed_by,
      createdAt: h.created_at
    })),
  };
}

function deduplicateHistory(history: any[]) {
  if (!history || history.length === 0) return [];
  const sorted = [...history].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const result: any[] = [];
  
  for (const h of sorted) {
    const last = result[result.length - 1];
    if (last && last.status === h.status) {
      if (!last.notes && h.notes) {
        last.notes = h.notes;
      } else if (last.notes && h.notes && last.notes !== h.notes) {
        last.notes += " / " + h.notes;
      }
      // Keep the newest timestamp for the same status event
      last.created_at = h.created_at;
    } else {
      result.push({ ...h });
    }
  }
  return result;
}

export function usePendingCashOnDeliveryShipments(branch?: string) {
  return useQuery({
    queryKey: ["shipments", "pendingCashOnDelivery", branch],
    queryFn: async () => {
      const adminClient = getAdminClient();
      let query = adminClient
        .from("shipments")
        .select("*")
        .gt("cash_on_delivery", 0)
        .eq("is_cash_on_delivery_collected", false);

      if (branch) {
        query = query.eq("branch_origin", branch);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(mapShipment);
    },
    // Only refetch occasionally to not span the DB too much, or use standard stale time
    staleTime: 5 * 60 * 1000, 
  });
}
