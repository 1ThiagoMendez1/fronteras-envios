import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import { useToast } from "./use-toast";

const FORCE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function getAdminClient() {
  return createClient(SUPABASE_URL, FORCE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

// ─── Clients List ─────────────────────────────────────────────────────────────
export interface Client {
  id: number;
  document: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  email?: string;
  totalShipmentsThisMonth: number;
}

export function useClients() {
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const adminClient = getAdminClient();
      const { data, error } = await adminClient
        .from("clients")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((c) => ({
        id: c.id,
        document: c.document,
        name: c.name,
        phone: c.phone,
        city: c.city,
        address: c.address,
        email: c.email,
        totalShipmentsThisMonth: Number(c.total_shipments || 0),
      }));
    },
  });

  const getClientByDocument = (document: string) => {
    return clients.find((c) => c.document === document) ?? null;
  };

  const upsertClientMutation = useMutation({
    mutationFn: async (
      clientData: { document: string; name: string; phone: string; city: string; address: string; email?: string }
    ) => {
      const adminClient = getAdminClient();
      const { data, error } = await adminClient
        .from("clients")
        .upsert(
          {
            document: clientData.document,
            name: clientData.name,
            phone: clientData.phone,
            city: clientData.city,
            address: clientData.address,
            email: clientData.email ?? null,
          },
          { onConflict: "document", ignoreDuplicates: false }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (err: Error) => {
      console.error("upsertClient error:", err);
    },
  });

  const upsertClient = (clientData: {
    document: string;
    name: string;
    phone: string;
    city: string;
    address: string;
    email?: string;
  }) => {
    return upsertClientMutation.mutateAsync(clientData);
  };

  return {
    clients,
    isLoading,
    getClientByDocument,
    upsertClient,
  };
}

// ─── Create/Update/Delete Client mutations ────────────────────────────────────
export function useCreateClientMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      document: string;
      name: string;
      phone: string;
      city: string;
      address: string;
      email?: string;
    }) => {
      const adminClient = getAdminClient();
      const { data: result, error } = await adminClient
        .from("clients")
        .insert({
          document: data.document,
          name: data.name,
          phone: data.phone,
          city: data.city,
          address: data.address,
          email: data.email ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Éxito", description: "Cliente registrado correctamente" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message || "Error al registrar cliente", variant: "destructive" });
    },
  });
}

export function useUpdateClientMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name?: string; phone?: string; city?: string; address?: string }) => {
      const adminClient = getAdminClient();
      const { data: result, error } = await adminClient
        .from("clients")
        .update({
          name: data.name,
          phone: data.phone,
          city: data.city,
          address: data.address,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Éxito", description: "Cliente actualizado correctamente" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}
