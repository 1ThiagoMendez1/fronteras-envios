import { useQuery } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";

const FORCE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function getAdminClient() {
  return createClient(SUPABASE_URL, FORCE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

interface ListShipmentsOptions {
  status?: string;
  search?: string;
  senderDocument?: string;
  page?: number;
  pageSize?: number;
}

export function useListShipments(options: ListShipmentsOptions = {}) {
  const { status, search, senderDocument, page = 1, pageSize = 50 } = options;

  return useQuery({
    queryKey: ["shipments", { status, search, senderDocument, page }],
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
      const { data, error } = await adminClient
        .from("shipments")
        .select("*, shipment_history(id, status, notes, created_at)")
        .eq("guide_number", guideNumber)
        .single();

      if (error) throw error;
      return mapShipment(data);
    },
    enabled: !!guideNumber,
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
    recipientName: row.recipient_name,
    recipientPhone: row.recipient_phone,
    recipientAddress: row.recipient_address,
    recipientCity: row.recipient_city,
    weight: Number(row.weight || 0),
    declaredValue: Number(row.declared_value || 0),
    shippingCost: Number(row.shipping_cost || 0),
    driverPayment: Number(row.driver_payment || 0),
    observations: row.observations,
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
    history: (row.shipment_history ?? []).map((h: any) => ({
      id: h.id,
      status: h.status,
      notes: h.notes,
      changedBy: h.changed_by,
      createdAt: h.created_at
    })),
  };
}
