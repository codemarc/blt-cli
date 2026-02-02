import type { Logger } from "@caporal/core";
import { execSync } from "node:child_process";

const DEFAULT_PROJECT_REF = "erpofhdbqnvltzggpnrn";

type ExecOptions = {
	silent?: boolean;
	ignoreError?: boolean;
	cwd?: string;
};

function exec(command: string, options: ExecOptions = {}): string | null {
	try {
		return execSync(command, {
			encoding: "utf8",
			stdio: options.silent ? "pipe" : "inherit",
			cwd: options.cwd,
		});
	} catch (error) {
		if (options.ignoreError) {
			return null;
		}
		throw error;
	}
}

function checkSupabaseCli(logger: Logger, cwd?: string): boolean {
	logger.info("Checking Supabase CLI installation...");

	try {
		const version = exec("bunx supabase --version", { silent: true, cwd });
		logger.info(`Supabase CLI found: ${version?.trim() ?? "unknown"}`);
		return true;
	} catch {
		logger.error("Supabase CLI not found.");
		console.log("Install with: bun install -g supabase");
		console.log("Or use: bunx supabase <command>");
		return false;
	}
}

function checkSupabaseLogin(logger: Logger, cwd?: string): boolean {
	logger.info("Checking Supabase authentication...");

	const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();

	if (accessToken) {
		logger.info("Using SUPABASE_ACCESS_TOKEN from environment");

		if (process.env.CI) {
			console.log(`Token length: ${accessToken.length}`);
			console.log(`Token starts with: ${accessToken.substring(0, 10)}...`);
			console.log(`Token ends with: ...${accessToken.substring(accessToken.length - 10)}`);
		}

		try {
			exec("bunx supabase projects list", { silent: true, cwd });
			logger.info("Authenticated with Supabase (via token)");
			return true;
		} catch (error) {
			logger.error("SUPABASE_ACCESS_TOKEN is invalid or expired.");
			console.log("Get a new token from: https://supabase.com/dashboard/account/tokens");
			console.log("Make sure the token has Functions permissions.");
			if (process.env.CI && error instanceof Error) {
				console.log("Debug info:");
				console.log(`Error: ${error.message}`);
			}
			return false;
		}
	}

	try {
		exec("bunx supabase projects list", { silent: true, cwd });
		logger.info("Authenticated with Supabase (via CLI)");
		return true;
	} catch {
		logger.warn("Not logged in to Supabase.");
		console.log("Options:");
		console.log("1. Login with: bunx supabase login");
		console.log(
			"   Then link project: bunx supabase link --project-ref $" + "{SUPABASE_PROJECT_REF}",
		);
		console.log("2. Set SUPABASE_ACCESS_TOKEN in your environment");
		console.log("   Get token from: https://supabase.com/dashboard/account/tokens");
		console.log("   Make sure token has Functions scope/permissions");
		return false;
	}
}

export async function setSecrets(logger: Logger): Promise<void> {
	if (!checkSupabaseCli(logger) || !checkSupabaseLogin(logger)) {
		process.exit(1);
	}

	const stripeKey = process.env.STRIPE_SECRET_KEY;
	const squareToken = process.env.SQUARE_ACCESS_TOKEN;

	if (!stripeKey && !squareToken) {
		logger.error("No payment provider secrets found in environment variables.");
		console.log("Make sure you have a .env file with one or more of:");
		console.log("STRIPE_SECRET_KEY=sk_test_...");
		console.log("SQUARE_ACCESS_TOKEN=EAAAl...");
		process.exit(1);
	}

	const projectRef = (process.env.SUPABASE_PROJECT_REF || DEFAULT_PROJECT_REF).trim();
	const projectFlag = ` --project-ref "${projectRef}"`;

	let secretsSet = 0;

	if (stripeKey) {
		logger.info("Setting STRIPE_SECRET_KEY...");
		exec(`bunx supabase secrets set STRIPE_SECRET_KEY="${stripeKey}"${projectFlag}`);
		logger.info("STRIPE_SECRET_KEY set successfully");
		secretsSet++;
	} else {
		logger.warn("STRIPE_SECRET_KEY not found, skipping...");
	}

	if (squareToken) {
		logger.info("Setting SQUARE_ACCESS_TOKEN...");
		exec(`bunx supabase secrets set SQUARE_ACCESS_TOKEN="${squareToken}"${projectFlag}`);
		logger.info("SQUARE_ACCESS_TOKEN set successfully");
		secretsSet++;
	} else {
		logger.warn("SQUARE_ACCESS_TOKEN not found, skipping...");
	}

	logger.info(`${secretsSet} secret(s) set successfully`);
	logger.info("You can verify secrets with: bunx supabase secrets list");
}
