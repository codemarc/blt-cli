import fs from "node:fs";
import { join } from "node:path";
import { getPaths } from "../../lib/constants";
import { getAvailableInstances } from "../../lib/instance-discovery";
import type { Logger } from "@caporal/core";

export interface CleanupGeneratedOptions {
	instance?: string;
	all?: boolean;
}

/**
 * Cleanup generated SQL files and combined schema files
 */
export async function cleanupGenerated(
	options: CleanupGeneratedOptions,
	_logger: Logger,
): Promise<void> {
	const paths = getPaths();

	// Clean up generated SQL files in dist
	console.log("Cleaning generated SQL files and combined schema files");
	fs.rmSync(join(paths.DIST, "public.sql"), { recursive: true, force: true });
	fs.rmSync(join(paths.DIST, "data.sql"), { recursive: true, force: true });

	// Determine which instances to clean
	let instancesToClean: string[];

	if (options.all) {
		instancesToClean = getAvailableInstances();
		console.log(`Cleaning all instances: ${instancesToClean.join(", ")}`);
	} else if (options.instance) {
		instancesToClean = [options.instance];
	} else {
		// Default: clean default and joanne for backward compatibility
		instancesToClean = ["default", "joanne"];
	}

	// Remove generated SQL directories for each instance
	for (const instance of instancesToClean) {
		const sqlDir = join(paths.INSTANCES_BASE, instance, "sql");
		if (fs.existsSync(sqlDir)) {
			fs.rmSync(sqlDir, { recursive: true, force: true });
			console.log(`Removed generated SQL files: ${sqlDir}`);
		}
	}

	console.log("Cleanup complete");
}
