import type { Logger } from "@caporal/core";
import { execSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

const DEFAULT_FUNCTIONS_DIR = "./supabase/functions";

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

function resolveFunctionsDir(functionsDir?: string): string {
	return resolve(process.cwd(), functionsDir ?? DEFAULT_FUNCTIONS_DIR);
}

function resolveProjectRoot(functionsDir: string): string {
	const parent = dirname(functionsDir);
	if (basename(functionsDir) === "functions" && basename(parent) === "supabase") {
		return dirname(parent);
	}
	return process.cwd();
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

function getFunctions(functionsDir: string, logger: Logger): string[] {
	if (!existsSync(functionsDir)) {
		logger.error(`Functions directory not found: ${functionsDir}`);
		return [];
	}

	return readdirSync(functionsDir)
		.filter((item) => {
			const itemPath = join(functionsDir, item);
			return statSync(itemPath).isDirectory();
		});
}

function deployFunction(
	functionName: string,
	projectRef: string | undefined,
	projectRoot: string,
	logger: Logger,
): boolean {
	logger.info(`Deploying function: ${functionName}`);

	try {
		const projectFlag = projectRef ? ` --project-ref "${projectRef}"` : "";

		if (projectRef && !process.env.SUPABASE_ACCESS_TOKEN?.trim()) {
			try {
				logger.info("Checking project link...");
				exec(`bunx supabase link --project-ref "${projectRef}"`, {
					silent: true,
					ignoreError: true,
					cwd: projectRoot,
				});
			} catch {
				// Ignore link errors (likely already linked)
			}
		}

		exec(`bunx supabase functions deploy ${functionName}${projectFlag}`, { cwd: projectRoot });
		logger.info(`Function '${functionName}' deployed successfully`);
		return true;
	} catch (error) {
		logger.error(`Failed to deploy function '${functionName}'`);
		const message = error instanceof Error ? error.message : String(error);

		if (message.includes("403") || message.includes("privileges")) {
			console.error("Authentication/Permission Error:");
			console.error("Your account may not have the necessary privileges.");
			console.error("Try one of these solutions:");
			console.error("1. Login with: bunx supabase login");
			if (projectRef) {
				console.error(`2. Link project: bunx supabase link --project-ref ${projectRef}`);
			} else {
				console.error("2. Link project: bunx supabase link --project-ref <project_ref>");
			}
			console.error("3. Use an access token with Functions permissions:");
			console.error("   Get token: https://supabase.com/dashboard/account/tokens");
			console.error("   Set in your environment: SUPABASE_ACCESS_TOKEN=your_token_here");
		} else {
			console.error(message);
		}

		return false;
	}
}

export async function deployFunctions(
	options: { name?: string; functionsDir?: string },
	logger: Logger,
): Promise<void> {
	const functionsDir = resolveFunctionsDir(options.functionsDir);
	const projectRoot = resolveProjectRoot(functionsDir);

	if (!checkSupabaseCli(logger, projectRoot) || !checkSupabaseLogin(logger, projectRoot)) {
		process.exit(1);
	}

	const functions = getFunctions(functionsDir, logger);
	if (functions.length === 0) {
		logger.warn("No functions found to deploy.");
		return;
	}

	const projectRef = process.env.SUPABASE_PROJECT_REF?.trim();

	if (options.name) {
		if (!functions.includes(options.name)) {
			logger.error(`Function '${options.name}' not found.`);
			console.log("Available functions:");
			functions.forEach((name) => {
				console.log(`  - ${name}`);
			});
			process.exit(1);
		}

		deployFunction(options.name, projectRef, projectRoot, logger);
		logger.info("Tip: Set secrets with: blt deploy secrets");
		return;
	}

	logger.info(`Found ${functions.length} function(s): ${functions.join(", ")}`);

	const results: { success: string[]; failed: string[] } = {
		success: [],
		failed: [],
	};

	for (const name of functions) {
		if (deployFunction(name, projectRef, projectRoot, logger)) {
			results.success.push(name);
		} else {
			results.failed.push(name);
		}
	}

	console.log("");
	console.log("Deployment Summary");
	console.log("==================");

	if (results.success.length > 0) {
		logger.info(`${results.success.length} function(s) deployed successfully:`);
		results.success.forEach((name) => {
			console.log(`  - ${name}`);
		});
	}

	if (results.failed.length > 0) {
		logger.error(`${results.failed.length} function(s) failed:`);
		results.failed.forEach((name) => {
			console.log(`  - ${name}`);
		});
	}

	logger.info("Tip: Set secrets with: blt deploy secrets");
}
