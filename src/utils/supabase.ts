import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import debug from "debug";

const log = debug("blt:supabase");

export function getSupabaseClient(): SupabaseClient {
	const url = process.env.SUPABASE_DATA_API;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!url || !key) {
		throw new Error(
			"SUPABASE_DATA_API and SUPABASE_SERVICE_ROLE_KEY environment variables are required",
		);
	}

	log("Creating Supabase client");
	return createClient(url, key);
}
