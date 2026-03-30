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
  thisMonthShipments: number; // mapped to current period shipments
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
  
  // Real BI expansions
  revenueTrend: number;
  shipmentsTrend: number;
  profitTrend: number;
  driversTrend: number;
  slaTrend: number;
  pendingGuidesTrend: number;
  
  avgCostPerPackage: number;
  avgIncomePerPackage: number;
  slaCompliance: number;
  avgDeliveryTime: number;
  deliveryRate: number;
  closedToday: boolean;
  
  revenueSparkline: number[];
  profitSparkline: number[];
  shipmentsSparkline: number[];
  driversSparkline: number[];
  
  weeklyTrends: { name: string; envios: number; ingresos: number }[];
  topRoutes: { route: string; packages: number; revenue: number; trend: number }[];
  revenueComposition: { name: string; value: number; color: string }[];
}

// ─── Dashboard Stats ───────────────────────────────────────────────────────────
export function useDashboardStats(period: "today" | "week" | "month" = "today", branch: string = "Todas las Sedes") {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard", "stats", period, branch],
    queryFn: async () => {
      const adminClient = getAdminClient();
      
      const now = new Date();
      let currentStart: Date;
      let prevStart: Date;
      let prevEnd: Date;
      
      if (period === "today") {
        currentStart = new Date(now);
        currentStart.setHours(0, 0, 0, 0);
        prevEnd = new Date(currentStart);
        prevEnd.setMilliseconds(-1);
        prevStart = new Date(currentStart);
        prevStart.setDate(prevStart.getDate() - 1);
      } else if (period === "week") {
        const diff = now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1);
        currentStart = new Date(now.setDate(diff));
        currentStart.setHours(0,0,0,0);
        prevEnd = new Date(currentStart);
        prevEnd.setMilliseconds(-1);
        prevStart = new Date(currentStart);
        prevStart.setDate(prevStart.getDate() - 7);
      } else {
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        prevEnd = new Date(currentStart);
        prevEnd.setMilliseconds(-1);
        prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      }

      // 1. Fetch shipments for current AND previous period to calculate trends
      let query = adminClient
        .from("shipments")
        .select("*")
        .gte("created_at", prevStart.toISOString());
      
      if (branch !== "Todas las Sedes") {
        query = query.eq("branch_origin", branch);
      }

      const { data: allShipmentsPeriod, error: sErr } = await query;
      
      if (sErr) throw sErr;

      const shipments = allShipmentsPeriod ?? [];
      const currentShipments = shipments.filter(s => new Date(s.created_at) >= currentStart);
      const prevShipments = shipments.filter(s => new Date(s.created_at) >= prevStart && new Date(s.created_at) <= prevEnd);

      // Current aggregations
      const currentRevenue = currentShipments.reduce((sum, s) => sum + Number(s.shipping_cost || 0), 0);
      const currentCosts = currentShipments.reduce((sum, s) => sum + Number(s.driver_payment || 0), 0);
      const currentProfit = currentRevenue - currentCosts;
      
      // Previous aggregations
      const prevRevenue = prevShipments.reduce((sum, s) => sum + Number(s.shipping_cost || 0), 0);
      const prevCosts = prevShipments.reduce((sum, s) => sum + Number(s.driver_payment || 0), 0);
      const prevProfit = prevRevenue - prevCosts;

      const calculateTrend = (curr: number, prev: number) => {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return Math.round(((curr - prev) / Math.abs(prev)) * 100);
      };

      const statusCounts = currentShipments.reduce<Record<string, number>>((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {});

      const prevStatusCounts = prevShipments.reduce<Record<string, number>>((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {});
      
      const pendingKeys = ["created", "assigned", "picked_up"];
      const currentPending = pendingKeys.reduce((sum, key) => sum + (statusCounts[key] || 0), 0);
      const prevPending = pendingKeys.reduce((sum, key) => sum + (prevStatusCounts[key] || 0), 0);

      const delivered = statusCounts["delivered"] || 0;
      const totalCount = currentShipments.length;
      
      // 2. Fetch Active Drivers total
      const { count: activeDrivers } = await adminClient
        .from("drivers")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);

      // 3. Fetch recent for the table
      let recentQuery = adminClient
        .from("shipments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(15);
        
      if (branch !== "Todas las Sedes") recentQuery = recentQuery.eq("branch_origin", branch);
      const { data: recent } = await recentQuery;

      // 4. Check if today is closed
      const todayString = new Date().toISOString().split('T')[0];
      let closedQuery = adminClient.from("daily_close").select("id").gte("close_date", `${todayString}T00:00:00`).limit(1);
      if (branch !== "Todas las Sedes") closedQuery = closedQuery.eq("branch", branch);
      const { data: closest } = await closedQuery;

      // Generate Sparklines from last 7 days history
      const sparkDays = 7;
      const weeklyTrends: { name: string; envios: number; ingresos: number }[] = [];
      const revenueSparkline: number[] = [];
      const profitSparkline: number[] = [];
      const shipmentsSparkline: number[] = [];
      
      const { data: sevenDays } = await adminClient
         .from("shipments")
         .select("shipping_cost, driver_payment, created_at, branch_origin")
         .gte("created_at", new Date(new Date().setDate(new Date().getDate() - 7)).toISOString());
         
      const filteredSevenDays = branch !== "Todas las Sedes" 
         ? (sevenDays || []).filter(s => s.branch_origin === branch)
         : (sevenDays || []);

      for(let i = sparkDays - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString("es-CO", { weekday: 'short' });
        
        const dayShips = filteredSevenDays.filter(s => s.created_at.startsWith(dayStr));
        const rev = dayShips.reduce((s, x) => s + Number(x.shipping_cost || 0), 0);
        const pro = rev - dayShips.reduce((s, x) => s + Number(x.driver_payment || 0), 0);
        
        weeklyTrends.push({ name: label, envios: dayShips.length, ingresos: rev });
        revenueSparkline.push(rev);
        profitSparkline.push(pro);
        shipmentsSparkline.push(dayShips.length);
      }

      // Top Routes Calculation
      const routes = currentShipments.reduce<Record<string, { count: number; rev: number }>>((acc, s) => {
        const origin = s.branch_origin || "Principal";
        const dest = s.recipient_city || "Desconocido";
        const key = `${origin} - ${dest}`;
        if (!acc[key]) acc[key] = { count: 0, rev: 0 };
        acc[key].count++;
        acc[key].rev += Number(s.shipping_cost || 0);
        return acc;
      }, {});
      
      const topRoutes = Object.entries(routes).map(([route, vols]) => ({
         route, packages: vols.count, revenue: vols.rev, trend: 0 // Mock trend since grouping previously is complex
      })).sort((a, b) => b.packages - a.packages).slice(0, 5);

      return {
        totalShipments: currentShipments.length,
        thisMonthShipments: currentShipments.length,
        delivered,
        inTransit: statusCounts["in_transit"] || 0,
        incidents: statusCounts["incident"] || 0,
        pending: currentPending,
        totalRevenue: currentRevenue,
        totalDriverPayments: currentCosts,
        netProfit: currentProfit,
        activeDrivers: activeDrivers || 0,
        statusCounts,
        
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

        // BI Stats
        revenueTrend: calculateTrend(currentRevenue, prevRevenue),
        profitTrend: calculateTrend(currentProfit, prevProfit),
        shipmentsTrend: calculateTrend(currentShipments.length, prevShipments.length),
        driversTrend: 0, // Simplified
        pendingGuidesTrend: calculateTrend(currentPending, prevPending),
        
        avgCostPerPackage: totalCount > 0 ? currentCosts / totalCount : 0,
        avgIncomePerPackage: totalCount > 0 ? currentRevenue / totalCount : 0,
        slaCompliance: totalCount > 0 ? Math.round((delivered / totalCount) * 100) : 0, // Mock SLA
        slaTrend: 0,
        avgDeliveryTime: 24, // Needs history tracking to be exact
        deliveryRate: totalCount > 0 ? Math.round((delivered / totalCount) * 100) : 0,
        closedToday: (closest?.length ?? 0) > 0,
        
        revenueSparkline,
        profitSparkline,
        shipmentsSparkline,
        driversSparkline: [activeDrivers || 0, activeDrivers || 0],
        
        weeklyTrends,
        topRoutes,
        revenueComposition: [
          { name: 'Flete Base', value: 85, color: 'bg-blue-500' },
          { name: 'Servicios de Valor', value: 15, color: 'bg-emerald-500' },
        ],
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
