import { useQuery } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";

const FORCE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function getAdminClient() {
  return createClient(SUPABASE_URL, FORCE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export function useListDrivers(options: { onlyActive?: boolean } = {}) {
  return useQuery({
    queryKey: ["drivers", options],
    queryFn: async () => {
      const adminClient = getAdminClient();
      let query = adminClient
        .from("drivers")
        .select("*")
        .order("name", { ascending: true });

      if (options.onlyActive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        phone: d.phone,
        email: d.email,
        company: d.company,
        vehicleType: d.vehicle_type,
        city: d.city,
        ratePerDelivery: Number(d.rate_per_delivery || 0),
        isActive: d.is_active,
        createdAt: d.created_at,
      }));
    },
  });
}

export function useGetDriver(id: number) {
  return useQuery({
    queryKey: ["drivers", id],
    queryFn: async () => {
      const adminClient = getAdminClient();
      const { data, error } = await adminClient
        .from("drivers")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
