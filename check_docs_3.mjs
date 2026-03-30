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
  const { data: ships } = await supabase.from("shipments").select("id, sender_document, sender_name, guide_number");
  console.log(`Total Shipments: ${ships.length}`);
  
  let validDoc = 0;
  let invalidDoc = 0;
  for (const s of ships) {
    if (!s.sender_document) {
      invalidDoc++;
    } else {
      validDoc++;
    }
  }
  console.log(`Shipments with document: ${validDoc}, without: ${invalidDoc}`);

  // Are there documents that mismatch?
  for (const s of ships) {
    if (s.sender_document) {
      const { data: client } = await supabase.from("clients").select("document, name").eq("document", s.sender_document);
      if (!client || client.length === 0) {
        console.log(`Orphan Shipment! Guide: ${s.guide_number}, Sender Document: '${s.sender_document}', Name: '${s.sender_name}'`);
      }
    }
  }
}
run();
