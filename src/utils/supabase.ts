import { createClient, SupabaseClient } from "@supabase/supabase-js";
import debug from "debug";

const log = debug("blt:supabase");

export function getSupabaseClient(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY environment variables are required"
    );
  }

  log("Creating Supabase client");
  return createClient(url, key);
}
