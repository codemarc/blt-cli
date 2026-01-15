import type { Program, Logger } from "@caporal/core";
import { updateVersion } from "./version/update";

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
}