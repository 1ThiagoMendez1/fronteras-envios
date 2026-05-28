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

const phone = "573102951743"; // El teléfono de prueba
const template_name = "guia_creada";

async function testCombination(label, config) {
  console.log(`\n=============================================`);
  console.log(`🧪 PROBANDO: ${label}`);
  console.log(`=============================================`);
  
  const components = [];
  if (config.header) {
    components.push({
      type: "header",
      parameters: config.header.map(text => ({ type: "text", text }))
    });
  }
  if (config.body) {
    components.push({
      type: "body",
      parameters: config.body.map(text => ({ type: "text", text }))
    });
  }
  if (config.button) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: config.button.map(text => ({ type: "text", text }))
    });
  }

  try {
    const { data, error } = await supabase.rpc('send_whatsapp_components_sql', {
      phone: phone,
      template_name: template_name,
      components: components,
      lang: "es_CO"
    });

    if (error) {
      console.error(`❌ Error RPC:`, error.message);
    } else {
      console.log(`Response Data:`, JSON.stringify(data, null, 2));
      if (data && data.error) {
        console.error(`❌ Error Meta:`, data.error.message, `(${data.error.code})`);
      } else {
        console.log(`✅ ¡ÉXITO! Mensaje enviado con esta combinación.`);
        return true;
      }
    }
  } catch (err) {
    console.error(`❌ Error inesperado:`, err);
  }
  return false;
}

async function run() {
  // Configs
  const fecha = "24/04/2026, 03:34 p.m.";
  const guia = "1194";
  const origen = "Bogotá";
  const destino = "Medellín";
  const metodo = "Nequi";
  const costo = "$55.000";
  const contenido = "Repuesto para moto";
  const recojida = "Terminal del sur Medellin";
  const nombre = "Carlos";

  // COMBINACIÓN 1: Header (1), Body (8), Button (1) -- La actual que falla
  const success1 = await testCombination("COMBINACIÓN 1 (Header: 1, Body: 8, Button: 1)", {
    header: [nombre],
    body: [fecha, guia, origen, destino, metodo, costo, contenido, recojida],
    button: ["?guide=" + guia]
  });
  if (success1) return;

  // COMBINACIÓN 2: Header (0), Body (9), Button (1)
  const success2 = await testCombination("COMBINACIÓN 2 (Header: 0, Body: 9, Button: 1)", {
    body: [nombre, fecha, guia, origen, destino, metodo, costo, contenido, recojida],
    button: ["?guide=" + guia]
  });
  if (success2) return;

  // COMBINACIÓN 3: Header (1), Body (8), Button (0)
  const success3 = await testCombination("COMBINACIÓN 3 (Header: 1, Body: 8, Button: 0)", {
    header: [nombre],
    body: [fecha, guia, origen, destino, metodo, costo, contenido, recojida]
  });
  if (success3) return;

  // COMBINACIÓN 4: Header (0), Body (9), Button (0)
  const success4 = await testCombination("COMBINACIÓN 4 (Header: 0, Body: 9, Button: 0)", {
    body: [nombre, fecha, guia, origen, destino, metodo, costo, contenido, recojida]
  });
  if (success4) return;
  
  console.log("\n❌ Ninguna de las 4 combinaciones estándar funcionó.");
}

run();
