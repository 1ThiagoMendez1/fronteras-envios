import { createClient } from '@supabase/supabase-js';

const url = "https://supabase.devsystech.com.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";

const supabase = createClient(url, key);

async function checkPermissions() {
  console.log("Checking direct select on clients...");
  const { data, error, status } = await supabase.from('clients').select('*').limit(1);
  
  if (error) {
    console.error("Select Error:", error);
    console.log("HTTP Status:", status);
  } else {
    console.log("Select Success! Rows:", data.length);
  }
}

checkPermissions();
