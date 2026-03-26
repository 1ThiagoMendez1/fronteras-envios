import { createClient } from "@supabase/supabase-js";

const FORCE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";
const SUPABASE_URL = "https://supabase.devsystech.com.co";

const supabase = createClient(SUPABASE_URL, FORCE_SERVICE_KEY);

async function check() {
  const { data: shipments, error: err1 } = await supabase.from('shipments').select('id, created_at, status, guide_number').gte('created_at', '2026-03-22');
  if (err1) console.error("Error fetching shipments:", err1);
  else console.log("Shipments from 2026-03-22 onwards:");
  shipments?.forEach(s => console.log(`  ${s.guide_number}: ${s.status} at ${s.created_at}`));

  const { data: closes, error: err2 } = await supabase.from('daily_close').select('*');
  if (err2) console.error("Error fetching closes:", err2);
  else console.log("\nDaily closes:");
  closes?.forEach(c => console.log(`  Close for ${c.close_date} with ${c.total_shipments} shipments`));
}

check();
