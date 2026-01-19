import type { Logger } from "@caporal/core";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { getDefaultSchemaName } from "../../lib/schema-discovery";
import { runSqlFile } from "../../lib/database-runner";
import { getPaths } from "../../lib/constants";

/**
 * Deploy schema to database
 */
export async function deploySchema(name: string | undefined, logger: Logger): Promise<void> {
  const schemaName = name || getDefaultSchemaName();
  const paths = getPaths();
  const schemaFile = join(process.cwd(), paths.DIST, `${schemaName}.sql`);

  if (!existsSync(schemaFile)) {
    logger.error(`Schema file not found: ${schemaFile}`);
    logger.error(`Please run 'blt build schema ${schemaName}' first.`);
    process.exit(1);
  }

  await runSqlFile(schemaFile);
}
