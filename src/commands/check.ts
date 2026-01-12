import { execSync } from "node:child_process";
import fs from "node:fs";
import type { Program } from "@caporal/core";
import dotenv from "dotenv";

export default function checkCommand(program: Program) {
	program
		.command("check", "Check the environment setup")
		.argument("[buckets]", "check bucket, {default:'all'}")
		.action(async ({ args, options, logger }) => {
			// console.log(args);

			// check if SMASH_KEY is set
			if (!process.env.SMASH_KEY) console.warn("SMASH_KEY is not set");

			// check if .env file exists
			if (!fs.existsSync(".env")) {
				console.error("❌ No .env file found, please create one");
				process.exit(1);
			}

			// load the .env file
			dotenv.config({ path: ".env", quiet: true, override: true });

			console.log(
				`.env first line: ${execSync("head -n 1 .env").toString().trim()}`,
			);

			// // check for important environment variables
			// if(!process.env.VITE_SUPABASE_URL)console.warn('VITE_SUPABASE_URL is not set');
			// if(!process.env.VITE_SUPABASE_SERVICE_ROLE_KEY)console.warn('VITE_SUPABASE_SERVICE_ROLE_KEY is not set');
			// if(!process.env.VITE_SUPABASE_DASHBOARD_URL)console.warn('VITE_SUPABASE_DASHBOARD_URL is not set');
			// if(!process.env.VITE_SUPABASE_PROJECT_REF)console.warn('VITE_SUPABASE_PROJECT_REF is not set');
			// if(!process.env.VITE_SUPABASE_PROJECT_ID)console.warn('VITE_SUPABASE_PROJECT_ID is not set');
			// if(!process.env.VITE_SUPABASE_PROJECT_NAME)console.warn('VITE_SUPABASE_PROJECT_NAME is not set');
			// if(!process.env.VITE_SUPABASE_PROJECT_URL)console.warn('VITE_SUPABASE_PROJECT_URL is not set');
			// if(!process.env.VITE_SUPABASE_PROJECT_ID)console.warn('VITE_SUPABASE_PROJECT_ID is not set');
		});

	//   '✅', // checkmark
	//   '❌', // xmark
	//   '❓', // question mark
	//   '❗', // double exclamation mark
	//   '👍'  // thumbs up
}
