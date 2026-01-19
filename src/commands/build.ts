import type { Program, Logger, ParsedArgumentsObject } from "@caporal/core";
import { buildSchema } from "./build/schema";
import { buildData } from "./build/data";

/**
 * Register build commands with the CLI program
 */
export default function buildCommand(program: Program) {
	const buildHelpText = `
build utilities

Usage:
  blt build <operation>

Available operations:
  schema      Build schema from DDL files
  data        Build data from instance directory

Run 'blt build <operation> --help' for more information on a specific command.
`;

	program
		.command("build", "schema/data build utilities")
		.help(buildHelpText)
		.action(() => {
			console.log(buildHelpText);
		});

	program
		.command("build schema", "Build schema from DDL files")
		.hide()
		.argument("[name]", "Schema name")
		.action(async ({ args, logger }: { args: ParsedArgumentsObject; logger: Logger }) => {
			try {
				const name = args.name as string | undefined;
				await buildSchema(name, logger);
			} catch(error) {
				const message = error instanceof Error ? error.message : String(error);
				logger.error(`Failed to build schema: ${message}`);
				process.exit(1);
			}
		});

	program
		.command("build data", "Build data from instance directory")
		.hide()
		.argument("[name]", "Instance name")
		.action(async ({ args, logger }: { args: ParsedArgumentsObject; logger: Logger }) => {
			try {
				const name = args.name as string | undefined;
				await buildData(name, logger);
			} catch(error) {
				const message = error instanceof Error ? error.message : String(error);
				logger.error(`Failed to build data: ${message}`);
				process.exit(1);
			}
		});
}