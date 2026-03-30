import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import { useToast } from "./use-toast";

const SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

function getAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}


// ─── Default option lists (editable from the UI — stored in localStorage) ─────
export const DEFAULT_TIPO_CLIENTE_OPTIONS   = ["NATURAL", "JURIDICA"];
export const DEFAULT_TIPO_IDENTIFICACION_OPTIONS = ["CC", "NIT"];
export const DEFAULT_RESPONSABLE_IVA_OPTIONS = ["SI", "NO"];
export const DEFAULT_REGIMEN_OPTIONS         = ["ORDINARIO"];
export const DEFAULT_CATEGORIA_OPTIONS       = ["CLIENTE", "CONTABILIDAD"];

// ─── Client Interface ─────────────────────────────────────────────────────────
export interface Client {
  id: number;
  tipoCliente:        string | null;
  tipoIdentificacion: string | null;
  document:           string;
  name:               string;
  apellido:           string | null;
  razonSocial:        string | null;
  responsableIva:     string | null;
  regimen:            string | null;
  categoria:          string | null;
  email:              string | null;
  phone:              string;
  departamento:       string | null;
  city:               string;
  address:            string;
  totalShipments: number;
}

export type ClientInput = Omit<Client, "id" | "totalShipments">;

function mapRow(c: Record<string, unknown>): Client {
  return {
    id:                      Number(c.id),
    tipoCliente:             (c.tipo_cliente as string)        ?? null,
    tipoIdentificacion:      (c.tipo_identificacion as string) ?? null,
    document:                c.document as string,
    name:                    c.name as string,
    apellido:                (c.apellido as string)            ?? null,
    razonSocial:             (c.razon_social as string)        ?? null,
    responsableIva:          (c.responsable_iva as string)     ?? null,
    regimen:                 (c.regimen as string)             ?? null,
    categoria:               (c.categoria as string)           ?? null,
    email:                   (c.email as string)               ?? null,
    phone:                   c.phone as string,
    departamento:            (c.departamento as string)        ?? null,
    city:                    c.city as string,
    address:                 c.address as string,
    totalShipments:          Number(c.total_shipments || 0),
  };
}

function toDbRow(d: ClientInput) {
  return {
    tipo_cliente:        d.tipoCliente,
    tipo_identificacion: d.tipoIdentificacion,
    document:            d.document,
    name:                d.name,
    apellido:            d.apellido            ?? null,
    razon_social:        d.razonSocial         ?? null,
    responsable_iva:     d.responsableIva,
    regimen:             d.regimen,
    categoria:           d.categoria,
    email:               d.email               ?? null,
    phone:               d.phone,
    departamento:        d.departamento        ?? null,
    city:                d.city,
    address:             d.address,
  };
}

// ─── useClients ───────────────────────────────────────────────────────────────
export function useClients() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await getAdminClient()
        .from("clients")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapRow);
    },
  });

  const getClientByDocument = (document: string) =>
    clients.find((c) => c.document === document) ?? null;

  // Upsert (create or update by document)
  const upsertClientMutation = useMutation({
    mutationFn: async (d: ClientInput) => {
      const { data, error } = await getAdminClient()
        .from("clients")
        .upsert(toDbRow(d), { onConflict: "document", ignoreDuplicates: false })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Éxito", description: "Cliente guardado correctamente" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Update by id
  const updateClientMutation = useMutation({
    mutationFn: async ({ id, ...d }: ClientInput & { id: number }) => {
      const { data, error } = await getAdminClient()
        .from("clients")
        .update(toDbRow(d))
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Éxito", description: "Cliente actualizado correctamente" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Delete by id
  const deleteClientMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await getAdminClient()
        .from("clients")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Cliente eliminado", description: "El cliente fue eliminado correctamente" });
    },
    onError: (err: Error) => {
      toast({ title: "Error al eliminar", description: err.message, variant: "destructive" });
    },
  });

  // Bulk insert
  const bulkInsertMutation = useMutation({
    mutationFn: async (rows: ClientInput[]) => {
      const { error } = await getAdminClient()
        .from("clients")
        .upsert(rows.map(toDbRow), { onConflict: "document", ignoreDuplicates: false });
      if (error) throw error;
    },
    onSuccess: (_, rows) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Importación exitosa", description: `${rows.length} clientes importados` });
    },
    onError: (err: Error) => {
      toast({ title: "Error en importación", description: err.message, variant: "destructive" });
    },
  });

  return {
    clients,
    isLoading,
    getClientByDocument,
    upsertClient:    (d: ClientInput)                      => upsertClientMutation.mutateAsync(d),
    updateClient:    (d: ClientInput & { id: number })     => updateClientMutation.mutateAsync(d),
    deleteClient:    (id: number)                          => deleteClientMutation.mutateAsync(id),
    bulkInsert:      (rows: ClientInput[])                 => bulkInsertMutation.mutateAsync(rows),
    isDeleting:      deleteClientMutation.isPending,
    isSaving:        upsertClientMutation.isPending || updateClientMutation.isPending,
    isBulkLoading:   bulkInsertMutation.isPending,
  };
}
