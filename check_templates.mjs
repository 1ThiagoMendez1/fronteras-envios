import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach(line => {
  const [key, ...value] = line.split("=");
  if (key && value) env[key.trim()] = value.join("=").trim();
});

async function checkTemplates() {
  const accountId = env.VITE_WHATSAPP_ACCOUNT_ID;
  const url = `https://graph.facebook.com/v17.0/${accountId}/message_templates`;
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${env.VITE_WHATSAPP_TOKEN}`
    }
  });
  const data = await response.json();
  console.log("Templates:", JSON.stringify(data, null, 2));
}

checkTemplates();
