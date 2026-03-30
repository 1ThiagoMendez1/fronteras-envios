import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const FORCE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";

const envPath = path.resolve(process.cwd(), ".env");
let url = "";
for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
  if (line.startsWith("VITE_SUPABASE_URL=")) url = line.split("=")[1].trim();
}
const supabase = createClient(url, FORCE_SERVICE_KEY, { auth: { persistSession: false } });

async function run() {
  const { data: ships } = await supabase.from("shipments").select("sender_document");
  
  const shipCounts = {};
  for (const s of ships) {
    const d = s.sender_document;
    if (d) shipCounts[d] = (shipCounts[d] || 0) + 1;
  }
  
  console.log("Real Shipments grouped by sender_document:");
  console.log(shipCounts);

  const { data: clients } = await supabase.from("clients").select("document, total_shipments").in("document", Object.keys(shipCounts));
  
  console.log("\nClients total_shipments field in DB:");
  const mismatches = [];
  for (const c of clients) {
    const realCount = shipCounts[c.document] || 0;
    if (c.total_shipments !== realCount) {
      mismatches.push(`Doc: ${c.document}, DB says: ${c.total_shipments}, Real asks for: ${realCount}`);
    }
  }
  
  if (mismatches.length > 0) {
    console.log("Found MISMATCHES:");
    console.log(mismatches.join('\n'));
  } else {
    console.log("No mismatches found!");
  }
}
run();
