// src/lib/evolution.ts

export async function sendWhatsAppMessage(phone: string, text: string) {
  try {
    const url = import.meta.env.VITE_EVOLUTION_API_URL;
    const instance = import.meta.env.VITE_EVOLUTION_INSTANCE;
    const apiKey = import.meta.env.VITE_EVOLUTION_API_KEY;

    if (!url || !instance || !apiKey) {
      console.warn("Faltan variables de entorno de Evolution API. Mensaje no enviado.");
      return false;
    }

    if (!phone) {
      console.warn("No hay número de teléfono para enviar el mensaje.");
      return false;
    }

    // Formatear teléfono: quitar símbolos
    let formattedPhone = phone.replace(/\D/g, "");
    
    // Si tiene 10 dígitos, asumir teléfono móvil de Colombia (+57)
    if (formattedPhone.length === 10) {
      formattedPhone = `57${formattedPhone}`;
    }

    const payload = {
      number: formattedPhone,
      text: text,
      delay: 1200, 
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
      console.error(`Evolution API Error (${response.status}): ${respError}`);
      return false;
    }

    console.log(`Mensaje enviado a ${formattedPhone}`);
    return true;
  } catch (error) {
    console.error("Excepción al enviar mensaje de WhatsApp:", error);
    return false;
  }
}
