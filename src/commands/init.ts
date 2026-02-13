import type { Program } from "@caporal/core";
import { generateInitScript } from "./init/script";

/**
 * Register init command with the CLI program
 */
export default function initCommand(program: Program) {
	const initHelpText = `
Initialize a BLT workspace by creating a script to clone/pull all projects

Usage:
  blt init [options]

Creates a shell script that will clone all BLT repositories (if they don't exist)
or pull the latest changes (if they do). Run the generated script in the
directory where you want the projects to live.

With -w, also creates blt.code-workspace with folder entries from the repository list.
With -c (and -w), adds sqltools.connections from SUPABASE_* vars in .env if present.

Example:
  blt init
  blt init -w -c
  ./getblt.sh
`;

	program
		.command("init", "clone repo script")
		.help(initHelpText)
		.option("-o, --output <path>", "Output path for the script", {
			default: "./getblt.sh",
		})
		.option("-s, --ssh", "Use SSH URLs instead of HTTPS URLs", { default: false })
		.option("-w, --workspace", "Also generate blt.code-workspace with folders from repositories", {
			default: false,
		})
		.option("-c, --connections", "Add sqltools.connections from .env if present", {
			default: false,
		})
		.action(async ({ options, logger }) => {
			await generateInitScript(
				{
					output: options.output as string,
					ssh: options.ssh as boolean,
					workspace: options.workspace as boolean,
					connectionsFromEnv: options.connections as boolean,
				},
				logger,
			);
		});
}
