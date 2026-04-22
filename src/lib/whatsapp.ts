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

  // Generar un sufijo aleatorio para evitar bloqueo por spam
  const randomRef = Math.random().toString(36).substring(2, 6).toUpperCase();
  const antiSpamText = `${text}\n\n[Ref: ${randomRef}]`;

  // Usar api.whatsapp.com en lugar de wa.me ayuda a mantener emojis sin romperse.
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(antiSpamText)}`;
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
