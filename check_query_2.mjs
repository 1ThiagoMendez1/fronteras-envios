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
  const document = "901363311"; // A known valid document with a shipment!

  let query = supabase
    .from("shipments")
    .select("*, drivers(name, vehicle_type, city)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(0, 4);

  query = query.eq("sender_document", document);

  const { data, error, count } = await query;
  console.log("Error:", error);
  console.log("Count:", count);
  console.log("Data length:", data?.length);
}
run();
