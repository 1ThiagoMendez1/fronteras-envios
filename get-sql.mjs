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

async function getFunction() {
  const { data, error } = await supabase.rpc('get_function_def', { func_name: 'send_whatsapp_template_sql' });
  if (error) {
    console.error("Error with custom rpc, trying raw query via REST...");
  }
}
getFunction();
