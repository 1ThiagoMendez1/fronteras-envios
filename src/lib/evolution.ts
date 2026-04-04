// src/lib/evolution.ts

/**
 * Función genérica para enviar mensajes de WhatsApp usando Evolution API.
 */
export async function sendWhatsAppMessage(phone: string, text: string) {
  try {
    const url = import.meta.env.VITE_EVOLUTION_API_URL;
    const instance = import.meta.env.VITE_EVOLUTION_INSTANCE;
    const apiKey = import.meta.env.VITE_EVOLUTION_API_KEY;

    if (!url || !instance || !apiKey) {
      console.warn("Faltan variables de entorno de Evolution API. Mensaje no enviado.");
      return false;
    }

    // Formatear teléfono: quitar símbolos
    let formattedPhone = phone.replace(/\D/g, "");
    
    // Asumir Colombia (+57) si tiene exactamente 10 dígitos (típicamente celulares de allá)
    if (formattedPhone.length === 10) {
      formattedPhone = `57${formattedPhone}`;
    }

    const payload = {
      number: formattedPhone,
      text: text,
      delay: 1200, // un pequeño delay para que parezca más humano
    };

    const endpoint = `${url}/message/sendText/${instance}`;
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const respError = await response.text();
      throw new Error(`Evolution API Error (${response.status}): ${respError}`);
    }

    console.log(`Mensaje de WhatsApp enviado correctamente a ${formattedPhone}`);
    return true;
  } catch (error) {
    // Manejo de errores silencioso para no romper la creación de envíos en UI
    console.error("Error al enviar mensaje de WhatsApp:", error);
    return false;
  }
}
