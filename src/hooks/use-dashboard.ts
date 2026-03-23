import { useQuery } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";

const FORCE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function getAdminClient() {
  return createClient(SUPABASE_URL, FORCE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

interface DashboardShipment {
  id: number;
  guideNumber: string;
  senderName: string;
  recipientName: string;
  recipientCity: string;
  shippingCost: number;
  driverPayment: number;
  status: string;
  createdAt: string;
  branchOrigin: string;
}

export interface DashboardStats {
  totalShipments: number;
  thisMonthShipments: number;
  delivered: number;
  inTransit: number;
  incidents: number;
  pending: number;
  totalRevenue: number;
  totalDriverPayments: number;
  netProfit: number;
  activeDrivers: number;
  recentShipments: DashboardShipment[];
  statusCounts: Record<string, number>;
}

// ─── Dashboard Stats ───────────────────────────────────────────────────────────
export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      const adminClient = getAdminClient();
      // Fetch shipment counts grouped by status
      const { data: shipments, error: sErr } = await adminClient
        .from("shipments")
        .select("status, shipping_cost, driver_payment, created_at");
      
      if (sErr) throw sErr;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const allShipments = shipments ?? [];
      const thisMonth = allShipments.filter(
        (s) => new Date(s.created_at) >= startOfMonth
      );

      const statusCounts = allShipments.reduce<Record<string, number>>(
        (acc, s) => {
          acc[s.status] = (acc[s.status] || 0) + 1;
          return acc;
        },
        {}
      );

      const totalRevenue = thisMonth.reduce(
        (sum, s) => sum + Number(s.shipping_cost || 0),
        0
      );
      const totalDriverPayments = thisMonth.reduce(
        (sum, s) => sum + Number(s.driver_payment || 0),
        0
      );

      // Recent shipments (last 10)
      const { data: recent, error: rErr } = await adminClient
        .from("shipments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (rErr) throw rErr;

      // Active drivers count
      const { count: activeDrivers } = await adminClient
        .from("drivers")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);

      return {
        totalShipments: allShipments.length,
        thisMonthShipments: thisMonth.length,
        delivered: statusCounts["delivered"] || 0,
        inTransit: statusCounts["in_transit"] || 0,
        incidents: statusCounts["incident"] || 0,
        pending:
          (statusCounts["created"] || 0) +
          (statusCounts["assigned"] || 0) +
          (statusCounts["picked_up"] || 0),
        totalRevenue,
        totalDriverPayments,
        netProfit: totalRevenue - totalDriverPayments,
        activeDrivers: activeDrivers ?? 0,
        recentShipments: (recent ?? []).map((s) => ({
          id: s.id,
          guideNumber: s.guide_number,
          senderName: s.sender_name,
          recipientName: s.recipient_name,
          recipientCity: s.recipient_city,
          shippingCost: Number(s.shipping_cost || 0),
          driverPayment: Number(s.driver_payment || 0),
          status: s.status,
          createdAt: s.created_at,
          branchOrigin: s.branch_origin,
        })),
        statusCounts,
      };
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// ─── Revenue by month (last 6 months) ────────────────────────────────────────
export function useRevenueChart() {
  return useQuery({
    queryKey: ["dashboard", "revenue-chart"],
    queryFn: async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const adminClient = getAdminClient();
      const { data, error } = await adminClient
        .from("shipments")
        .select("shipping_cost, driver_payment, created_at")
        .gte("created_at", sixMonthsAgo.toISOString());
 
      if (error) throw error;

      // Group by month
      const monthly: Record<
        string,
        { revenue: number; cost: number; profit: number; name: string }
      > = {};
      (data ?? []).forEach((s) => {
        const d = new Date(s.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const name = d.toLocaleString("es-CO", { month: "short", year: "2-digit" });
        if (!monthly[key]) {
          monthly[key] = { revenue: 0, cost: 0, profit: 0, name };
        }
        monthly[key].revenue += Number(s.shipping_cost || 0);
        monthly[key].cost += Number(s.driver_payment || 0);
        monthly[key].profit +=
          Number(s.shipping_cost || 0) - Number(s.driver_payment || 0);
      });

      return Object.entries(monthly)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, v]) => v);
    },
    staleTime: 1000 * 60 * 5,
  });
}
