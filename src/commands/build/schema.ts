import type { Logger } from "@caporal/core";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { getDefaultSchemaName } from "../../lib/schema-discovery";
import {
  buildSchemaFile,
  getPackageVersion,
  getSortedSqlFiles,
  writeSchemaFile,
} from "../../lib/sql-builder";
import { getPaths } from "../../lib/constants";

/**
 * Build schema from DDL files
 */
export async function buildSchema(name: string | undefined, logger: Logger): Promise<void> {
  const schemaName = name || getDefaultSchemaName();
  const paths = getPaths();

  // Validate schema directory exists
  const sqlDir = join(process.cwd(), paths.SCHEMA_BASE, schemaName, "sql");
  if (!existsSync(sqlDir)) {
    logger.error(`Schema directory does not exist: ${sqlDir}`);
    process.exit(1);
  }

  const version = getPackageVersion();

  // Build schema file from DDL files only
  const sqlFiles = getSortedSqlFiles(sqlDir, schemaName);
  if (sqlFiles.length === 0) {
    logger.error(`No SQL files found in schema directory: ${sqlDir}`);
    process.exit(1);
  }

  const combinedContent = buildSchemaFile(sqlDir, schemaName, sqlFiles, version);
  
  // Write to dist directory
  writeSchemaFile(combinedContent, schemaName);
  
  console.log(`✅ Schema built successfully: dist/${schemaName}.sql`);
}
