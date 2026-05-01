import React from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

// El sistema de envío por Evolution API ha sido desactivado temporalmente para evitar bloqueos.
// Ahora se utiliza la WhatsApp Cloud API (Oficial) como método principal y enlaces manuales como respaldo.


export interface WhatsAppTemplateConfig {
  name: string;
  languageCode?: string;
  parameters: string[];
}

export function getWhatsAppUrl(phone: string, text: string) {
  // Limpiar el teléfono para dejar solo números
  let cleanPhone = phone.replace(/[^\d]/g, '');
  
  // Asignar prefijo de Colombia por defecto si el número tiene 10 dígitos (estándar celular Col)
  if (cleanPhone.length === 10 && !cleanPhone.startsWith('57')) {
    cleanPhone = '57' + cleanPhone;
  }

  // Generar un sufijo aleatorio para evitar bloqueo por spam
  const randomRef = Math.random().toString(36).substring(2, 6).toUpperCase();
  const antiSpamText = `${text}\n\n[Ref: ${randomRef}]`;

  // Usar api.whatsapp.com en lugar de wa.me ayuda a mantener emojis sin romperse.
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(antiSpamText)}`;
}

export async function sendWhatsAppMessage(phone: string, text: string) {
  // Intentar envío automático vía Cloud API primero
  const success = await sendWhatsAppCloudMessage(phone, text);
  
  if (success) return true;

  // Si falla el envío automático (CORS, Token inválido, ventana 24h cerrada), fallback al manual
  const waUrl = getWhatsAppUrl(phone, text);
  try {
    const a = document.createElement('a');
    a.href = waUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch (error) {
    console.error("No se pudo abrir WhatsApp manual:", error);
    return false;
  }
}

export async function sendWhatsAppCloudMessage(phone: string, text: string) {
  let cleanPhone = phone.replace(/[^\d]/g, '');
  if (cleanPhone.length === 10 && !cleanPhone.startsWith('57')) {
    cleanPhone = '57' + cleanPhone;
  }

  try {
    // Llamamos a la función RPC que creamos en Supabase
    // Esto evita bloqueos de CORS y mantiene el Token seguro en el servidor
    // @ts-ignore
    const { data, error } = await supabase.rpc('send_whatsapp_sql', {
      phone: cleanPhone,
      message: text
    });

    if (error) {
      console.error("Error RPC WhatsApp:", error);
      return false;
    }

    // El resultado de Meta viene dentro de la respuesta del RPC
    if (data && (data as any).error) {
      console.error("Error desde Meta (vía RPC):", (data as any).error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error al invocar RPC de WhatsApp:", error);
    return false;
  }
}

/**
 * Envía un mensaje basado en plantilla vía WhatsApp Cloud API (Meta).
 * NOTA: Requiere que crees otra función RPC en Supabase llamada 'send_whatsapp_template_sql'
 * con parámetros: phone (text), template_name (text), params (jsonb)
 */
export async function sendWhatsAppCloudTemplate(phone: string, config: WhatsAppTemplateConfig) {
  let cleanPhone = phone.replace(/[^\d]/g, '');
  if (cleanPhone.length === 10 && !cleanPhone.startsWith('57')) {
    cleanPhone = '57' + cleanPhone;
  }

  try {
    // @ts-ignore
    const { data, error } = await supabase.rpc('send_whatsapp_template_sql', {
      phone: cleanPhone,
      template_name: config.name,
      params: config.parameters,
      lang: config.languageCode || "es_CO"
    });

    if (error) {
      console.error("Error RPC WhatsApp Template:", error);
      return false;
    }

    // El resultado de Meta viene dentro de la respuesta del RPC
    if (data && (data as any).error) {
      console.error("⚠️ ERROR DE META (Oficial):", (data as any).error.message);
      console.error("Detalles:", (data as any).error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error al invocar RPC de WhatsApp Template:", error);
    return false;
  }
}

export async function handleWhatsAppMultiple(notifications: { label: string, phone: string, text: string, template?: WhatsAppTemplateConfig }[]) {
  if (notifications.length === 0) return;

  // Mostramos un Toast persistente con botones para CADA notificación.
  const elements = notifications.map((n, i) => 
    React.createElement('a', {
      key: i,
      href: getWhatsAppUrl(n.phone, n.text),
      target: '_blank',
      rel: 'noopener noreferrer',
      className: 'bg-green-600 text-white px-3 py-2 rounded shadow text-center font-bold flex-1 w-full mt-2 hover:bg-green-700 block'
    }, `Re-enviar Manual a ${n.label}`)
  );

  toast({
    title: "Notificaciones WhatsApp",
    description: React.createElement('div', { className: 'flex flex-col gap-2 mt-2 w-full' },
      React.createElement('p', { className: 'text-sm opacity-90' }, "Intentando envío automático vía API oficial..."),
      React.createElement('p', { className: 'text-xs opacity-70 italic' }, "Si no se envía solo, usa los botones manuales:"),
      ...elements
    ),
    duration: 20000,
  });

  // Intentamos enviar todos automáticamente vía Cloud API (si falla, no pasa nada, quedan los botones)
  for (const n of notifications) {
    let sent = false;
    if (n.template) {
      sent = await sendWhatsAppCloudTemplate(n.phone, n.template);
    } else {
      sent = await sendWhatsAppCloudMessage(n.phone, n.text);
    }

    if (sent) {
      console.log(`Mensaje enviado exitosamente a ${n.label} vía API`);
    } else {
      console.warn(`No se pudo enviar automáticamente a ${n.label}, se requiere acción manual.`);
    }
  }
}

/**
 * Mapea un envío a los parámetros de la plantilla 'guia_generada'
 */
export function getShipmentTemplateConfig(shipment: any, overrideName?: string): WhatsAppTemplateConfig {
  const fecha = new Date(shipment.created_at).toLocaleDateString("es-CO", {
    year: "numeric", month: "2-digit", day: "2-digit"
  }) + ", " + new Date(shipment.created_at).toLocaleTimeString("es-CO", {
    hour: "2-digit", minute: "2-digit", hour12: true
  });

  const fleteFmt = new Intl.NumberFormat("es-CO", { 
    style: "currency", 
    currency: "COP", 
    maximumFractionDigits: 0 
  }).format(shipment.shipping_cost || 0);

  return {
    name: "guia_generada",
    languageCode: "es_CO",
    parameters: [
      overrideName || shipment.sender_name || "Cliente",  // {{1}} Hola [Nombre]
      fecha,                                             // {{2}} Fecha y hora
      shipment.guide_number || String(shipment.id),      // {{3}} Guía
      shipment.sender_city || "Ciudad",                  // {{4}} Origen
      shipment.recipient_city || "Ciudad",               // {{5}} Destino
      shipment.payment_method || "Efectivo",             // {{6}} Método de pago
      fleteFmt,                                          // {{7}} Costo flete
      shipment.package_contents || "Mercancía"           // {{8}} Dice contener
    ]
  };
}

/**
 * Mapea la asignación de conductor a los parámetros de la plantilla 'conductor_asignado'
 */
export function getDriverAssignedTemplateConfig(shipment: any, overrideName?: string): WhatsAppTemplateConfig {
  const fecha = new Date().toLocaleDateString("es-CO", {
    year: "numeric", month: "2-digit", day: "2-digit"
  }) + ", " + new Date().toLocaleTimeString("es-CO", {
    hour: "2-digit", minute: "2-digit", hour12: true
  });

  const driver = shipment.drivers || {};
  const vehicleTypeMap: Record<string, string> = {
    'motorcycle': 'Motocicleta',
    'car': 'Automóvil',
    'van': 'Furgoneta',
    'truck': 'Camión',
    'bus': 'Bus'
  };
  const vehicle = vehicleTypeMap[driver.vehicle_type] || driver.vehicle_type || "Vehículo";
  const vehicleData = driver.company ? `${vehicle} - ${driver.company}` : vehicle;

  return {
    name: "conductor_asignado",
    languageCode: "es_CO",
    parameters: [
      overrideName || shipment.sender_name || "Cliente", // {{1}} Nombre del cliente
      shipment.guide_number || String(shipment.id),      // {{2}} Guía
      fecha,                                             // {{3}} Fecha y hora de asignación
      driver.name || "Conductor",                        // {{4}} Nombre conductor
      driver.phone || "No registrado",                   // {{5}} Teléfono conductor
      vehicleData,                                       // {{6}} Datos vehículo
      shipment.observations || "Ninguna"                 // {{7}} Observaciones
    ]
  };
}

export function getHumanizedGreeting(name?: string): string {
  const now = new Date();
  const hour = now.getHours();
  
  // Calcular la semana del año
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const day = Math.floor(diff / oneDay);
  const week = Math.floor(day / 7);

  let timeOfDay: "morning" | "afternoon" | "night" = "morning";
  if (hour >= 12 && hour < 18) {
    timeOfDay = "afternoon";
  } else if (hour >= 18) {
    timeOfDay = "night";
  }

  // Extraer el primer nombre si está disponible para hacerlo más cercano
  const firstName = name ? name.trim().split(" ")[0] : "";
  const namePart = firstName ? ` ${firstName}` : "";

  // Diferentes variaciones que cambiarán dependiendo de la semana del año
  const variations = [
    {
      morning: `¡Hola${namePart}! Muy buenos días ☀️. Esperamos que estés teniendo un excelente inicio de día.`,
      afternoon: `¡Hola${namePart}! Muy buenas tardes 🌤️. Esperamos que tu día vaya de maravilla.`,
      night: `¡Hola${namePart}! Muy buenas noches 🌙. Esperamos que hayas tenido un gran día.`
    },
    {
      morning: `¡Qué tal${namePart}! Buenos días 🌅. Te deseamos una jornada llena de éxitos.`,
      afternoon: `¡Qué tal${namePart}! Buenas tardes ☕. Deseamos que estés pasando una excelente tarde.`,
      night: `¡Qué tal${namePart}! Buenas noches 🌠. Que tengas un merecido descanso.`
    },
    {
      morning: `¡Saludos cordiales${namePart}! Buenos días 🌞. Arrancamos este día con la mejor energía para ti.`,
      afternoon: `¡Saludos cordiales${namePart}! Buenas tardes 🤝. Aquí estamos siempre listos para servirte.`,
      night: `¡Saludos cordiales${namePart}! Buenas noches 🌃. Esperamos que descanses muy bien.`
    },
    {
      morning: `¡Excelente día${namePart}! Muy buenos días 🌼. Nos alegra mucho saludarte hoy.`,
      afternoon: `¡Excelente tarde${namePart}! Muy buenas tardes ✨. Un gusto enorme contactarte en este momento.`,
      night: `¡Excelente noche${namePart}! Muy buenas noches 💫. Un verdadero placer saludarte a esta hora.`
    }
  ];

  return variations[week % variations.length][timeOfDay];
}
