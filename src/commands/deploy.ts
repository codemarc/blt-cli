import type { Program, Logger, ParsedArgumentsObject } from "@caporal/core";
import { deploySchema } from "./deploy/schema";
import { deployData } from "./deploy/data";
import { runSqlFile } from "../lib/database-runner";

/**
 * Register deploy commands with the CLI program
 */
export default function deployCommand(program: Program) {
	const deployHelpText = `
database deployment actions

Usage:
  blt deploy <operation>

Available operations:
  schema      Deploy schema from .sql files
  data        Deploy data instance from .sql files
  sql         Deploy a named SQL file to database

Run 'blt deploy <operation> --help' for more information on a specific command.
`;

	program
		.command("deploy", "database deployment actions")
		.help(deployHelpText)
		.action(() => {
			console.log(deployHelpText);
		});

	program
		.command("deploy schema", "Deploy schema from .sql files")
		.hide()
		.argument("[name]", "Schema name")
		.action(async ({ args, logger }: { args: ParsedArgumentsObject; logger: Logger }) => {
			try {
				const name = args.name as string | undefined;
				await deploySchema(name, logger);
			} catch(error) {
				const message = error instanceof Error ? error.message : String(error);
				logger.error(`Failed to deploy schema: ${message}`);
				process.exit(1);
			}
		});

	program
		.command("deploy data", "Deploy data instance from .sql files")
		.hide()
		.argument("[name]", "Instance name")
		.action(async ({ args, logger }: { args: ParsedArgumentsObject; logger: Logger }) => {
			try {
				const name = args.name as string | undefined;
				await deployData(name, logger);
			} catch(error) {
				const message = error instanceof Error ? error.message : String(error);
				logger.error(`Failed to deploy data: ${message}`);
				process.exit(1);
			}
		});

	program
		.command("deploy sql", "Deploy a named SQL file to database")
		.hide()
		.argument("<file>", "Path to SQL file")
		.action(async ({ args, logger }: { args: ParsedArgumentsObject; logger: Logger }) => {
			try {
				const file = args.file as string;
				await runSqlFile(file);
			} catch(error) {
				const message = error instanceof Error ? error.message : String(error);
				logger.error(`Failed to deploy SQL file: ${message}`);
				process.exit(1);
			}
		});
}
