import type { Program, Logger } from "@caporal/core";
import { showSchema } from "./show/schema";
import { showRows } from "./show/rows";
import { showEnv } from "./show/env";
import { showDb } from "./show/db";
/**
 * Register show commands with the CLI program
 */
export default function showCommand(program: Program) {
	const showHelpText = `
show utilities

Usage:
  blt show <operation>

Available operations:
  counts      Display row counts for all tables
  schema      Get information about the schema
  env         Display blt core environment variables
  db          Display version from database (same format as version string)

Run 'blt show <operation> --help' for more information on a specific command.
`;

  program
    .command("show", "show utilities")
    .help(showHelpText)
    .action(() => {
      console.log(showHelpText);
    });

  program
    .command("show schema", "Get information about the schema")
    .hide()
    .argument("[schema-name]", "Schema name (e.g., 'core', 'public')")
    .option("-f, --format <format>", "Output format: table or json", {
      default: "table",
      validator: ["table", "json"],
    })
    .action(async ({ args, options, logger }) => {
      await showSchema(
        { schemaName: args.schemaName as string | undefined },
        { format: options.format as string },
        logger
      );
    });


  // Counts command - display row counts for all tables
  program
    .command("show counts", "Display row counts for all tables")
    .hide()
    .action(async () => {
      await showRows();
    });

  program
    .command("show env", "Display blt core environment variables")
    .hide()
    .action(async () => {
      await showEnv();
    });

  program
    .command("show db", "Display version from database (same format as version string)")
    .hide()
    .option("-d, --date", "Display buildnum as date", { default: false })
    .option("-o, --only", "Display buildnum only", { default: false })
    .option("-s, --short", "Display short version (7-char commit hash)", { default: false })
    .option("-f, --full", "Display full version (full commit hash)", { default: false })
    .action(async ({ options, logger }: { options: { short?: boolean; full?: boolean; date?: boolean; only?: boolean }; logger: Logger }) => {
      await showDb(options, logger);
    });
}
