import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach(line => {
  const [key, ...value] = line.split("=");
  if (key && value) env[key.trim()] = value.join("=").trim();
});

async function sendRaw() {
  const phone = "573102951743"; // My test number
  const url = `https://graph.facebook.com/v17.0/${env.VITE_WHATSAPP_NUMBER_ID}/messages`;
  
  const payload = {
    messaging_product: "whatsapp",
    to: phone,
    type: "template",
    template: {
      name: "guia_generada",
      language: { code: "es_CO" },
      components: [
        {
          type: "header",
          parameters: [{ type: "text", text: "Cliente Prueba" }]
        },
        {
          type: "body",
          parameters: [
            { type: "text", text: "2024/05/08" },
            { type: "text", text: "9999" },
            { type: "text", text: "Bogota" },
            { type: "text", text: "Medellin" },
            { type: "text", text: "Efectivo" },
            { type: "text", text: "$50,000" },
            { type: "text", text: "Caja" }
          ]
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: "?guide=9999" }]
        }
      ]
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.VITE_WHATSAPP_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}

sendRaw();
