import type { Logger } from "@caporal/core";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { getDefaultInstanceName } from "../../lib/instance-discovery";
import { runSqlFile } from "../../lib/database-runner";
import { getPaths } from "../../lib/constants";

/**
 * Deploy data to database
 */
export async function deployData(name: string | undefined, logger: Logger): Promise<void> {
  const paths = getPaths();
  const dataFile = join(process.cwd(), paths.DIST, "data.sql");

  if (!existsSync(dataFile)) {
    logger.error(`Data file not found: ${dataFile}`);
    const instanceName = name || getDefaultInstanceName();
    logger.error(`Please run 'blt build data ${instanceName}' first.`);
    process.exit(1);
  }

  await runSqlFile(dataFile);
}
