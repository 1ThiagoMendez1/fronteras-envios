const RAW_EVOLUTION_URL = (import.meta.env.VITE_EVOLUTION_API_URL || "") as string;
const EVOLUTION_INSTANCE = import.meta.env.VITE_EVOLUTION_INSTANCE;
const EVOLUTION_API_KEY = import.meta.env.VITE_EVOLUTION_API_KEY;

// Limpia rutas de panel (/manager, /dashboard, /api, etc.) dejando solo el origen base
function sanitizeBaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Quitar cualquier path y dejar solo origin (protocolo + host + puerto)
    return parsed.origin;
  } catch {
    return url.replace(/\/(manager|dashboard|api|panel)\/?.*$/, "").replace(/\/$/, "");
  }
}

const EVOLUTION_URL = sanitizeBaseUrl(RAW_EVOLUTION_URL);

export async function sendWhatsAppMessage(phone: string, text: string) {
  if (!EVOLUTION_URL || !EVOLUTION_INSTANCE || !EVOLUTION_API_KEY) {
    console.warn("Evolution API no está configurada. Revisa tus variables de entorno (.env).");
    return false;
  }

  // Limpiar el teléfono para dejar solo números
  let cleanPhone = phone.replace(/[^\d]/g, '');
  
  // Asignar prefijo de Colombia por defecto si el número tiene 10 dígitos (estándar celular Col)
  if (cleanPhone.length === 10 && !cleanPhone.startsWith('57')) {
    cleanPhone = '57' + cleanPhone;
  }

  const payload = {
    number: cleanPhone,
    options: {
      delay: 1200,
      presence: "composing",
      linkPreview: false
    },
    textMessage: {
      text: text
    }
  };

  try {
    const res = await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Error en Evolution API:", err);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Excepción al contactar Evolution API:", error);
    return false;
  }
}
