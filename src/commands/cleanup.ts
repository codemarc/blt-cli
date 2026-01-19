import type { Program } from "@caporal/core";
import fs from "node:fs";

/**
 * Register env commands with the CLI program
 */
export default function cleanupCommand(program: Program) {
	program
		.command("cleanup", "Cleanup generated files")
		.action(async ({ args, options, logger }) => {
			console.log(`Cleaning generated SQL files and combined schema files`);
			fs.rmSync("dist/public.sql", { recursive: true, force: true });
			fs.rmSync("dist/data.sql", { recursive: true, force: true });

			console.log(`Removed generated instance files`);
			fs.rmSync("schema/instances/default/sql/", {
				recursive: true,
				force: true,
			});
			fs.rmSync("schema/instances/joanne/sql/", {
				recursive: true,
				force: true,
			});
		});
}
