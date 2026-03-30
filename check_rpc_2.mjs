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
  const doc = "900515661";
  
  // check before
  let { data: bfore } = await supabase.from("clients").select("total_shipments").eq("document", doc).single();
  console.log("Before:", bfore);

  // run rpc
  await supabase.rpc("increment_client_shipments", { p_document: doc });

  // check after
  let { data: after } = await supabase.from("clients").select("total_shipments").eq("document", doc).single();
  console.log("After:", after);
}
run();
