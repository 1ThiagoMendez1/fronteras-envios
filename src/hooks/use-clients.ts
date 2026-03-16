import { useState } from 'react';

export interface Client {
  id: number;
  document: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  totalShipmentsThisMonth: number;
}

// Initial mock data
let mockClients: Client[] = [
  { id: 1, document: "900123456", name: "Empresa A", phone: "3001234567", city: "Bogota", address: "Calle Principal 123", totalShipmentsThisMonth: 12 },
  { id: 2, document: "1020304050", name: "Juan Perez", phone: "3109876543", city: "Medellin", address: "Carrera 45 #67-89", totalShipmentsThisMonth: 3 },
  { id: 3, document: "800987654", name: "Comercializadora del Valle", phone: "3151122334", city: "Cali", address: "Avenida 3N #45-12", totalShipmentsThisMonth: 1 },
];

export function useClients() {
  const [clients, setClients] = useState<Client[]>(mockClients);

  const getClientByDocument = (document: string) => {
    return clients.find(c => c.document === document) || null;
  };

  const upsertClient = (clientData: Omit<Client, 'id' | 'totalShipmentsThisMonth'>) => {
    const existing = clients.find(c => c.document === clientData.document);
    if (existing) {
      // Update existing
      const updated = { ...existing, ...clientData, totalShipmentsThisMonth: existing.totalShipmentsThisMonth + 1 };
      mockClients = mockClients.map(c => c.id === existing.id ? updated : c);
      setClients([...mockClients]);
      return updated;
    } else {
      // Create new
      const newClient = {
        ...clientData,
        id: Math.max(0, ...clients.map(c => c.id)) + 1,
        totalShipmentsThisMonth: 1
      };
      mockClients = [...mockClients, newClient];
      setClients([...mockClients]);
      return newClient;
    }
  };

  return {
    clients,
    getClientByDocument,
    upsertClient
  };
}
