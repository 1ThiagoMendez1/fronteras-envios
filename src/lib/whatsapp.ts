import React from "react";
import { toast } from "@/hooks/use-toast";

// El sistema de envío por Evolution API ha sido desactivado temporalmente para evitar bloqueos.
// Ahora se generarán enlaces para que el envío se realice de forma manual por el usuario.

export function getWhatsAppUrl(phone: string, text: string) {
  // Limpiar el teléfono para dejar solo números
  let cleanPhone = phone.replace(/[^\d]/g, '');
  
  // Asignar prefijo de Colombia por defecto si el número tiene 10 dígitos (estándar celular Col)
  if (cleanPhone.length === 10 && !cleanPhone.startsWith('57')) {
    cleanPhone = '57' + cleanPhone;
  }

  // Usar api.whatsapp.com en lugar de wa.me ayuda a mantener emojis sin romperse.
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
}

export async function sendWhatsAppMessage(phone: string, text: string) {
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
    console.error("No se pudo abrir WhatsApp:", error);
    return false;
  }
}

export function handleWhatsAppMultiple(notifications: { label: string, phone: string, text: string }[]) {
  if (notifications.length === 0) return;

  // Mostramos un Toast persistente con botones para CADA notificación.
  const elements = notifications.map((n, i) => 
    React.createElement('a', {
      key: i,
      href: getWhatsAppUrl(n.phone, n.text),
      target: '_blank',
      rel: 'noopener noreferrer',
      className: 'bg-green-600 text-white px-3 py-2 rounded shadow text-center font-bold flex-1 w-full mt-2 hover:bg-green-700 block'
    }, `Enviar a ${n.label}`)
  );

  toast({
    title: "Notificaciones Listas",
    description: React.createElement('div', { className: 'flex flex-col gap-2 mt-2 w-full' },
      React.createElement('p', { className: 'text-sm opacity-90' }, "Da clic para abrir el chat (el segundo suele ser bloqueado por Chrome):"),
      ...elements
    ),
    duration: 20000, // 20 segundos
  });

  // Intentamos abrir el primero automáticamente por comodidad
  setTimeout(() => {
    sendWhatsAppMessage(notifications[0].phone, notifications[0].text);
  }, 500);
}
