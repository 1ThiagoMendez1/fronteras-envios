import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach(line => {
  const [key, ...value] = line.split("=");
  if (key && value) env[key.trim()] = value.join("=").trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function runTest() {
  console.log("🚀 Iniciando prueba de plantilla...");
  
  const components = [
    {
      type: "header",
      parameters: [{ type: "text", text: "Cliente Prueba" }]
    },
    {
      type: "body",
      parameters: [
        { type: "text", text: "08/05/2026, 02:30 PM" },
        { type: "text", text: "9999" },
        { type: "text", text: "Bogota" },
        { type: "text", text: "Medellin" },
        { type: "text", text: "Efectivo" },
        { type: "text", text: "$ 15.000" },
        { type: "text", text: "Documentos" }
      ]
    },
    {
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: "?guide=9999" }]
    }
  ];

  const { data, error } = await supabase.rpc("send_whatsapp_components_sql", {
    phone: "573102951743", // Número de prueba
    template_name: "guia_generada",
    components: components,
    lang: "es_CO"
  });

  console.log("RPC Error:", error);
  console.log("RPC Data:", JSON.stringify(data, null, 2));
}

runTest();
