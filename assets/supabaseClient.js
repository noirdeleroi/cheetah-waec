import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Public config for the static site.
export const SUPABASE_URL = "https://casohrqgydyyvcclqwqm.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhc29ocnFneWR5eXZjY2xxd3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1MTY2MzYsImV4cCI6MjA2MzA5MjYzNn0.ct9XbPcvqZSG_HBLMzxRmxoH4dWfMArlRNw9s3wYt9I";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

