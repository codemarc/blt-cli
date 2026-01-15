import type { Program, Logger } from "@caporal/core";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { updateVersion } from "./version/update";
import { format as formatBuildNumber } from 'build-number-generator'

interface VersionInfo {
  buildnum: string;
  component: string;
  version: string;
  build: {
    commit: string;
    branch: string;
    time: string;
  };
}

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
			try {
				const rootDir = process.cwd();
				const versionJsonPath = join(rootDir, "version.json");

				if (!existsSync(versionJsonPath)) {
					logger.error("version.json not found. Run 'blt version update' first.");
					process.exit(1);
				}

				const versionInfo: VersionInfo = JSON.parse(readFileSync(versionJsonPath, "utf-8"));
				
				// Determine format: default to short, --full overrides to full
				const useFull = options.full === true;
				const useShort = options.short === true;
				const useDate = options.date === true;
				const useOnly = options.only === true;

				let versionString: string;
				let buildnumString: string;

				if (useDate) {
					buildnumString = formatBuildNumber(versionInfo.buildnum);
				} else {
					buildnumString = versionInfo.buildnum;
				}


				if (useFull) {
					// Full format: component vversion.buildnum - branch hash(full-commit)
					versionString = `${versionInfo.component} v${versionInfo.version} ${buildnumString} - ${versionInfo.build.branch} hash(${versionInfo.build.commit})`;
				} else if (useShort) {
					versionString = `${versionInfo.component} v${versionInfo.version} ${buildnumString}`;
				} else if (useOnly) {
					versionString = buildnumString;
				} else {
					// defaultShort format: component vversion buildnum - branch (short-commit)
					const shortCommit = versionInfo.build.commit?.substring(0, 7) ?? "";
					versionString = `${versionInfo.component} v${versionInfo.version} ${buildnumString} - ${versionInfo.build.branch} (${shortCommit})`;
				}
				
				console.log(versionString);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				logger.error(`Failed to read version.json: ${message}`);
				process.exit(1);
			}
		});
}