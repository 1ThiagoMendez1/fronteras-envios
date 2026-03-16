import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'created': return 'bg-gray-100 text-gray-800 border-gray-200'
    case 'assigned': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'picked_up': return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'in_transit': return 'bg-indigo-100 text-indigo-800 border-indigo-200'
    case 'out_for_delivery': return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'delivered': return 'bg-green-100 text-green-800 border-green-200'
    case 'incident': return 'bg-red-100 text-red-800 border-red-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export function getStatusLabel(status: string) {
  switch (status) {
    case 'created': return 'Creado'
    case 'assigned': return 'Asignado'
    case 'picked_up': return 'Recogido'
    case 'in_transit': return 'En Tránsito'
    case 'out_for_delivery': return 'En Entrega'
    case 'delivered': return 'Entregado'
    case 'incident': return 'Incidencia'
    default: return status
  }
}
