import { createClient } from "@supabase/supabase-js";

const FORCE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";
const SUPABASE_URL = "https://supabase.devsystech.com.co";

const supabase = createClient(SUPABASE_URL, FORCE_SERVICE_KEY);

async function testSig() {
  const dummyBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  
  // Update shipment
  const { data: updateData, error: updateError } = await supabase
    .from('shipments')
    .update({ driver_signature: dummyBase64 })
    .eq('guide_number', 'GUIA-1009')
    .select();
    
  if (updateError) {
    console.error("Update failed:", updateError);
    return;
  }
  
  console.log("Update success! Read back:", updateData[0].driver_signature.substring(0, 30) + "...");
}

testSig();
