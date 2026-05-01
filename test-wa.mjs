import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Cargar variables de entorno manualmente
const envPath = path.resolve(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach(line => {
  const [key, ...value] = line.split("=");
  if (key && value) env[key.trim()] = value.join("=").trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const testData = {
  phone: "573102951743",
  template_name: "guia_generada",
  params: ["24/04/2026", "1194", "Bogotá", "Medellín", "Nequi", "$55.000", "Repuesto"],
  lang: "es_CO"
};

async function runTest() {
  console.log("🚀 Iniciando prueba de envío de WhatsApp...");
  console.log("Datos:", JSON.stringify(testData, null, 2));

  try {
    const { data, error } = await supabase.rpc("send_whatsapp_template_sql", {
      phone: testData.phone,
      template_name: testData.template_name,
      params: testData.params,
      lang: testData.lang
    });

    if (error) {
      console.error("❌ Error en el RPC de Supabase:", error);
      if (error.message.includes("function send_whatsapp_template_sql(text, text, jsonb, text) does not exist")) {
        console.log("\n⚠️  LA FUNCIÓN RPC NO EXISTE. Debes crearla en Supabase SQL Editor.");
      }
    } else {
      console.log("✅ Respuesta de Supabase/Meta:", JSON.stringify(data, null, 2));
      if (data && data.error) {
        console.log("❌ Meta devolvió un error:", data.error.message);
      } else {
        console.log("\n✨ ¡Prueba completada! Revisa el teléfono para confirmar la recepción.");
      }
    }
  } catch (err) {
    console.error("❌ Error inesperado:", err);
  }
}

runTest();
