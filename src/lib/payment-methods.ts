// Keep stored identifiers unchanged; both names represent the original Nequi behavior.
export function isTransferPayment(method: string | null | undefined): boolean {
  return method === "Nequi" || method === "Transferencia"
}

export function paymentMethodLabel(method: string | null | undefined): string {
  return isTransferPayment(method) ? "Transferencia" : method || "Efectivo"
}
