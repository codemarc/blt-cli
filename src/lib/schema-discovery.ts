// Schema discovery and file listing utilities

import { readdirSync, statSync, existsSync } from "fs";
import { join } from "path";
import { getPaths } from "./constants";

/**
 * Get all available schema names from the schema directory
 */
export function getAvailableSchemas(): string[] {
  const paths = getPaths();
  const schemaBase = join(process.cwd(), paths.SCHEMA_BASE);
  if (!existsSync(schemaBase)) {
    return [];
  }
  return readdirSync(schemaBase)
    .filter((item) => {
      const itemPath = join(schemaBase, item);
      return statSync(itemPath).isDirectory() && existsSync(join(itemPath, "sql"));
    })
    .sort();
}

/**
 * Get the default schema name (prefers "public" if it exists)
 */
export function getDefaultSchemaName(): string {
  const schemas = getAvailableSchemas();
  // Prefer "public" if it exists, otherwise use the first available schema
  if (schemas.includes("public")) {
    return "public";
  }
  if (schemas.length > 0) {
    return schemas[0];
  }
  // Fallback if no schemas found
  return "public";
}

/**
 * Get detailed file information for all files in a schema's sql directory
 * Only includes files ending in .sql (case-insensitive)
 */
export function getSchemaFileList(schemaName?: string) {
  const paths = getPaths();
  const effectiveSchemaName = schemaName || getDefaultSchemaName();
  const schemaDir = join(process.cwd(), paths.SCHEMA_BASE, effectiveSchemaName, "sql");
  if (!existsSync(schemaDir)) {
    throw new Error(`Schema directory does not exist: ${schemaDir}`);
  }
  const files = readdirSync(schemaDir)
    .filter((file) => {
      // Only include .sql files (case-insensitive)
      return file.toLowerCase().endsWith(".sql");
    })
    .sort()
    .map((file) => {
      const stats = statSync(join(schemaDir, file));
      return {
        name: file,
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
        createdAt: stats.ctime.toISOString(),
        updatedAt: stats.mtime.toISOString(),
      };
    });
  return files;
}

/**
 * Get simplified file information for table display
 */
export function getSchemaTableRows(schemaName?: string) {
  const effectiveSchemaName = schemaName || getDefaultSchemaName();
  const files = getSchemaFileList(effectiveSchemaName);
  return files.map((file) => ({
    name: file.name,
    size: file.size,
    createdAt: file.createdAt,
    lastModified: file.lastModified,
    updatedAt: file.updatedAt,
  }));
}
