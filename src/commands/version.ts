import type { Program, Logger } from "@caporal/core";
import { updateVersion } from "./version/update";
import { displayVersionString } from "./version/string";
import { generateVersionSQL } from "./version/sql";

/**
 * Register version commands with the CLI program
 */
export default function versionCommand(program: Program) {
	// Main version command - shows help for subcommands
	const versionHelpText = `
version management utilities

Usage:
  blt version <operation>

Available operations:
  update      Update version.json with current build information
  string      Display version as a formatted string
  sql         Generate SQL to upsert version.json to settings table

Run 'blt version <operation> --help' for more information on a specific command.
`;

	program
		.command("version", "version management utilities")
		.help(versionHelpText)
		.action(() => {
			console.log(versionHelpText);
		});

	// Update version.json
	program
		.command("version update", "Update version.json with current build information")
		.hide()
		.action(async ({ logger }: { logger: Logger }) => {
			try {
				// Use current working directory where the command is run
				const rootDir = process.cwd();
				logger.info("Updating version.json...");
				
				// Call the update function directly
				updateVersion(rootDir);
				
				logger.info("Version information updated successfully");
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				logger.error(`Failed to update version.json: ${message}`);
				process.exit(1);
			}
		});

	// Display version string
	program
		.command("version string", "Display version as a formatted string")
		.hide()
		.option("-d, --date", "Display buildnum as date", { default: false })
		.option("-o, --only", "Display buildnum as date", { default: false })
		.option("-s, --short", "Display short version (7-char commit hash)", { default: false })
		.option("-f, --full", "Display full version (full commit hash)", { default: false })
		.action(async ({ options, logger }: { options: { short?: boolean; full?: boolean; date?: boolean; only?: boolean }; logger: Logger }) => {
			displayVersionString(options, logger);
		});

	// Generate SQL to upsert version.json to settings table
	program
		.command("version sql", "Generate SQL to upsert version.json to settings table")
		.hide()
		.action(async ({ logger }: { logger: Logger }) => {
			generateVersionSQL(logger);
		});
}