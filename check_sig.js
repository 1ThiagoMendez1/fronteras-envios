import { createClient } from "@supabase/supabase-js";

const FORCE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";
const SUPABASE_URL = "https://supabase.devsystech.com.co";

const supabase = createClient(SUPABASE_URL, FORCE_SERVICE_KEY);

async function checkSig() {
  const { data, error } = await supabase
    .from('shipments')
    .select('id, driver_signature, status, driver_id')
    .eq('guide_number', 'GUIA-1009')
    .single();
    
  if (error) {
    console.error("Error OR missing column:", error.message);
  } else {
    console.log("Success! Data:", {
      id: data.id,
      status: data.status,
      driver_id: data.driver_id,
      has_signature: !!data.driver_signature,
      signature_length: data.driver_signature ? data.driver_signature.length : 0,
      signature_preview: data.driver_signature ? data.driver_signature.substring(0, 50) + "..." : null
    });
  }
}

checkSig();
