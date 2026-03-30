import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const FORCE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";

const envPath = path.resolve(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
let url = "";
for (const line of envContent.split("\n")) {
  if (line.startsWith("VITE_SUPABASE_URL=")) url = line.split("=")[1].trim();
}

const supabase = createClient(url, FORCE_SERVICE_KEY, { auth: { persistSession: false } });

async function run() {
  const { data: ships } = await supabase.from("shipments").select("id, sender_document, sender_name").limit(3);
  console.log("Sample Shipments:");
  console.log(ships);

  const { data: clients } = await supabase.from("clients").select("id, document, name, total_shipments").order("total_shipments", { ascending: false }).limit(5);
  console.log("Sample Clients (by highest total_shipments):");
  console.log(clients);

  const { data: testClientShipments } = await supabase.from("shipments").select("id, guide_number").eq("sender_document", clients[0]?.document);
  console.log("Shipments for first client:", testClientShipments);
}
run();
