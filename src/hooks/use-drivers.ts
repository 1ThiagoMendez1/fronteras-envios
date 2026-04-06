import { useQuery } from "@tanstack/react-query";
import { getAdminClient } from "@/lib/admin-client";

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
