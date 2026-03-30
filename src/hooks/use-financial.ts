import { useQuery } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";

const FORCE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function getAdminClient() {
  return createClient(SUPABASE_URL, FORCE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

// ─── Financial Summary ────────────────────────────────────────────────────────
export function useFinancialSummary(options: {
  startDate?: string;
  endDate?: string;
} = {}, branch: string = "Todas las Sedes") {
  return useQuery({
    queryKey: ["financial", "summary", options, branch],
    queryFn: async () => {
      const adminClient = getAdminClient();
      let query = adminClient
        .from("shipments")
        .select("shipping_cost, driver_payment, status, created_at, branch_origin, recipient_city");

      if (options.startDate) query = query.gte("created_at", options.startDate);
      if (options.endDate) query = query.lte("created_at", options.endDate);
      if (branch !== "Todas las Sedes") query = query.eq("branch_origin", branch);

      const { data: shipments, error: sErr } = await query;
      if (sErr) throw sErr;

      let mQuery = adminClient
        .from("financial_movements")
        .select("*")
        .order("movement_date", { ascending: false });
      if (branch !== "Todas las Sedes") mQuery = mQuery.eq("branch", branch);

      const { data: movements, error: mErr } = await mQuery;
      if (mErr) throw mErr;

      let cQuery = adminClient
        .from("daily_close")
        .select("*")
        .order("close_date", { ascending: false });
      if (branch !== "Todas las Sedes") cQuery = cQuery.eq("branch", branch);

      const { data: closes, error: cErr } = await cQuery;
      if (cErr) throw cErr;

      const all = shipments ?? [];
      const delivered = all.filter((s) => s.status === "delivered");

      const totalRevenue = all.reduce((sum, s) => sum + Number(s.shipping_cost || 0), 0);
      const totalDriverPayments = all.reduce((sum, s) => sum + Number(s.driver_payment || 0), 0);
      const netProfit = totalRevenue - totalDriverPayments;

      // Additional expenses from financial_movements
      const totalExpenses = (movements ?? [])
        .filter((m) => m.type === "expense")
        .reduce((sum, m) => sum + Number(m.amount || 0), 0);
      const additionalIncome = (movements ?? [])
        .filter((m) => m.type === "income")
        .reduce((sum, m) => sum + Number(m.amount || 0), 0);

      // BI Aggregations
      const profitabilityByCity = Object.entries(
        all.reduce<Record<string, { revenue: number; costs: number }>>((acc, s) => {
          const city = s.recipient_city || "Desconocido";
          if (!acc[city]) acc[city] = { revenue: 0, costs: 0 };
          acc[city].revenue += s.shipping_cost || 0;
          acc[city].costs += s.driver_payment || 0;
          return acc;
        }, {})
      ).map(([city, vals]) => ({
        city,
        revenue: vals.revenue,
        costs: vals.costs,
        margin: vals.revenue > 0 ? Math.round(((vals.revenue - vals.costs) / vals.revenue) * 100) : 0,
      })).sort((a, b) => b.revenue - a.revenue);

      const segmentAnalysis = Object.entries(
        all.reduce<Record<string, { revenue: number; costs: number }>>((acc, s) => {
          const segment = s.branch_origin || "Principal";
          if (!acc[segment]) acc[segment] = { revenue: 0, costs: 0 };
          acc[segment].revenue += s.shipping_cost || 0;
          acc[segment].costs += s.driver_payment || 0;
          return acc;
        }, {})
      ).map(([segment, vals]) => ({
        segment,
        revenue: vals.revenue,
        costs: vals.costs,
        margin: vals.revenue > 0 ? Math.round(((vals.revenue - vals.costs) / vals.revenue) * 100) : 0,
      }));

      // Daily trends for chart (last 7 days)
      const dailyData = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().split("T")[0];
        const dayShipments = all.filter(s => s.created_at.startsWith(dateStr));
        const revenue = dayShipments.reduce((sum, s) => sum + (s.shipping_cost || 0), 0);
        const costs = dayShipments.reduce((sum, s) => sum + (s.driver_payment || 0), 0);
        return {
          date: d.toISOString(),
          revenue,
          netProfit: revenue - costs,
        };
      });

      return {
        totalRevenue,
        totalDriverPayments,
        netProfit,
        totalShipments: all.length,
        deliveredShipments: delivered.length,
        totalExpenses,
        additionalIncome,
        finalProfit: netProfit + additionalIncome - totalExpenses,
        profitabilityByCity,
        segmentAnalysis,
        dailyData,
        pendingCollections: all.filter((s:any) => s.status !== "delivered").reduce((sum:number, s:any) => sum + Number(s.shipping_cost || 0), 0),
        pendingPayments: all.filter((s:any) => s.status !== "delivered").reduce((sum:number, s:any) => sum + Number(s.driver_payment || 0), 0),
        auditIssuesCount: all.filter((s:any) => s.status === "delivered" && (Number(s.driver_payment) === 0 || Number(s.shipping_cost) === 0)).length,
        movements: (movements ?? []).map(m => ({
          id: m.id,
          type: m.type,
          category: m.category,
          amount: m.amount,
          description: m.description,
          recordedBy: m.recorded_by,
          movementDate: m.movement_date,
          createdAt: m.created_at,
          evidenceUrl: m.evidence_url,
          guideNumber: m.reference_type === 'shipment' ? `GUIA-${m.reference_id}` : null
        })),
        dailyCloses: (closes ?? []).map(c => ({
          id: c.id,
          closeDate: c.close_date,
          branch: c.branch,
          totalShipments: Number(c.total_shipments || 0),
          totalRevenue: Number(c.total_revenue || 0),
          totalDriverPayments: Number(c.total_driver_payments || 0),
          netProfit: Number(c.net_profit || 0),
          totalNetProfit: Number(c.net_profit || 0), // Added for frontend compatibility
          cashCollected: Number(c.cash_collected || 0),
          notes: c.notes,
          closedBy: c.closed_by || "Sistema",
          createdAt: c.created_at,
          deliveredCount: Number(c.total_shipments || 0), // Fallback for real metrics
          incidentCount: 0,
          avgDeliveryTime: 24,
          otherCosts: 0
        })),
      };
    },
    staleTime: 1000 * 60 * 2,
  });
}

// ─── Transactions List ────────────────────────────────────────────────────────
export function useFinancialMovements(options: {
  type?: "income" | "expense";
  startDate?: string;
  endDate?: string;
} = {}, branch: string = "Todas las Sedes") {
  return useQuery({
    queryKey: ["financial", "movements", options, branch],
    queryFn: async () => {
      const adminClient = getAdminClient();
      let query = adminClient
        .from("financial_movements")
        .select("*")
        .order("movement_date", { ascending: false });

      if (options.type) query = query.eq("type", options.type);
      if (options.startDate) query = query.gte("movement_date", options.startDate);
      if (options.endDate) query = query.lte("movement_date", options.endDate);
      if (branch !== "Todas las Sedes") query = query.eq("branch", branch);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(m => ({
        id: m.id,
        type: m.type,
        category: m.category,
        amount: Number(m.amount || 0),
        description: m.description,
        recordedBy: m.recorded_by,
        movementDate: m.movement_date,
        createdAt: m.created_at,
        evidenceUrl: m.evidence_url,
        guideNumber: m.reference_type === 'shipment' ? `GUIA-${m.reference_id}` : null
      }));
    },
  });
}

// ─── Daily Close List ─────────────────────────────────────────────────────────
export function useDailyCloseList(branch: string = "Todas las Sedes") {
  return useQuery({
    queryKey: ["daily-close", branch],
    queryFn: async () => {
      const adminClient = getAdminClient();
      let query = adminClient
        .from("daily_close")
        .select("*")
        .order("close_date", { ascending: false });
      
      if (branch !== "Todas las Sedes") {
        query = query.eq("branch", branch);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(c => ({
        id: c.id,
        closeDate: c.close_date,
        branch: c.branch,
        totalShipments: Number(c.total_shipments || 0),
        totalRevenue: Number(c.total_revenue || 0),
        totalDriverPayments: Number(c.total_driver_payments || 0),
        netProfit: Number(c.net_profit || 0),
        totalNetProfit: Number(c.net_profit || 0), // Added for frontend compatibility
        cashCollected: Number(c.cash_collected || 0),
        notes: c.notes,
        closedBy: c.closed_by || "Sistema",
        createdAt: c.created_at,
        deliveredCount: Number(c.total_shipments || 0),
        incidentCount: 0,
        avgDeliveryTime: 24,
        otherCosts: 0
      }));
    },
  });
}

export function useDailyCloseShipments(date: string, branch: string = "Todas las Sedes") {
  return useQuery({
    queryKey: ["daily-close-shipments", date, branch],
    queryFn: async () => {
      const adminClient = getAdminClient();
      const startDate = `${date.split('T')[0]}T00:00:00-05:00`;
      const endDate = `${date.split('T')[0]}T23:59:59-05:00`;

      let query = adminClient
        .from("shipments")
        .select("*")
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false });

      if (branch !== "Todas las Sedes") {
        query = query.eq("branch_origin", branch);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data ?? []).map((s: any) => ({
        id: s.id,
        guideNumber: s.guide_number,
        senderName: s.sender_name,
        recipientName: s.recipient_name,
        recipientCity: s.recipient_city,
        shippingCost: Number(s.shipping_cost || 0),
        driverPayment: Number(s.driver_payment || 0),
        profit: Number(s.shipping_cost || 0) - Number(s.driver_payment || 0),
        status: s.status,
        createdAt: s.created_at
      }));
    },
    enabled: !!date,
  });
}

export function useUnclosedDays(branch: string = "Todas las Sedes") {
  return useQuery({
    queryKey: ["unclosed-days", branch],
    queryFn: async () => {
      const adminClient = getAdminClient();
      let sQuery = adminClient.from("shipments").select("created_at");
      if (branch !== "Todas las Sedes") sQuery = sQuery.eq("branch_origin", branch);
      const { data: shipments, error: sErr } = await sQuery;
      if (sErr) throw sErr;
      
      let cQuery = adminClient.from("daily_close").select("close_date, branch");
      if (branch !== "Todas las Sedes") cQuery = cQuery.eq("branch", branch);
      const { data: closes, error: cErr } = await cQuery;
      if (cErr) throw cErr;

      const shipmentDays = Array.from(new Set(
        (shipments || []).map((s: any) => s.created_at.split('T')[0])
      ));
      
      const today = new Date().toISOString().split('T')[0];
      
      const unclosed = shipmentDays.filter(day => {
         const hasClose = closes?.some((c: any) => c.close_date && c.close_date.startsWith(day));
         return !hasClose && day < today;
      }).sort((a,b) => b.localeCompare(a));
      
      return unclosed;
    }
  });
}
