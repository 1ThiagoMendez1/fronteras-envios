// Keep the stored Nequi identifier: backend and historical accounting use it.
export function paymentMethodLabel(method: string | null | undefined): string {
  return method === "Nequi" ? "Transferencia" : method || "Efectivo"
}
