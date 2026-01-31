import type { Program } from "@caporal/core";
import { cleanupGenerated } from "./cleanup/generated";
import { cleanupTags } from "./cleanup/tags";

/**
 * Register cleanup commands with the CLI program
 */
export default function cleanupCommand(program: Program) {
	const cleanupHelpText = `
cleanup utilities

Usage:
  blt cleanup <operation>

Available operations:
  generated    Cleanup generated SQL files and instance SQL directories
  tags         Cleanup infrequently used tags in YAML files

Run 'blt cleanup <operation> --help' for more information on a specific command.
`;

	program
		.command("cleanup", "cleanup utilities")
		.help(cleanupHelpText)
		.action(() => {
			console.log(cleanupHelpText);
		});

	// Cleanup generated files
	program
		.command("cleanup generated", "Cleanup generated SQL files and instance SQL directories")
		.hide()
		.option("-i, --instance <instance>", "Instance to clean (can be used multiple times)")
		.option("-a, --all", "Clean all instances", { default: false })
		.action(async ({ options, logger }) => {
			await cleanupGenerated(
				{
					instance: options.instance as string | undefined,
					all: options.all as boolean,
				},
				logger,
			);
		});

	// Cleanup tags
	program
		.command("cleanup tags", "Cleanup infrequently used tags in YAML files")
		.hide()
		.argument("<instance>", "Instance name (e.g., 'default', 'joanne')")
		.option("-m, --min-count <count>", "Minimum tag count to keep (default: 4)", {
			default: 4,
			validator: program.NUMBER,
		})
		.option("-d, --dry-run", "Show what would be changed without modifying files", {
			default: false,
		})
		.action(async ({ args, options, logger }) => {
			await cleanupTags(
				args.instance as string,
				{
					minCount: options.minCount as number,
					dryRun: options.dryRun as boolean,
				},
				logger,
			);
		});
}
