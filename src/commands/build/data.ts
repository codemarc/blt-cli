import type { Logger } from "@caporal/core";
import { getDefaultInstanceName } from "../../lib/instance-discovery";
import { getPackageVersion } from "../../lib/sql-builder";
import { buildDataFile, writeDataFile } from "../../lib/data-generator";

/**
 * Build data from instance directory
 */
export async function buildData(name: string | undefined, logger: Logger): Promise<void> {
  const instanceName = name || getDefaultInstanceName();
  const version = getPackageVersion();

  try {
    // Build data file from instance directory
    const dataContent = buildDataFile(instanceName, version);
    
    // Write to dist directory
    writeDataFile(dataContent, instanceName);
    
    console.log(`✅ Data generated successfully: dist/data.sql`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(message);
    process.exit(1);
  }
}
