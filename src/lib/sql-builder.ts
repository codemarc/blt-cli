// SQL file building and generation utilities

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getPaths, PATTERNS } from "./constants";

/**
 * Get sorted list of SQL files from a directory
 * Uses lexicographic sorting to preserve the numeric ordering from file names
 * (e.g., "10-000-audit.sql" comes before "10-010-types.sql")
 */
export function getSortedSqlFiles(sqlDir: string, schemaName: string): string[] {
  return readdirSync(sqlDir)
    .filter(
      (file) =>
        !file.startsWith(schemaName) &&
        (file.endsWith(".sql") || file.endsWith(".ddl")) &&
        PATTERNS.FILE_NUMBER.test(file)
    )
    .sort(); // Use lexicographic sorting (same as schema info) - works correctly due to leading zeros
}

/**
 * Generate SQL header with version and schema setup
 */
export function generateSqlHeader(schemaName: string, version: string): string {
  let header = `-- =============================================
-- Database postgres, Schema ${schemaName} 
-- v${version} ፨ ${new Date().toLocaleString()}
-- =============================================
SELECT current_user, session_user;
--
SELECT set_config('myvars.version','${version}', false);
SELECT current_setting('myvars.version');`;

  // Add schema setup (drops and recreates the schema)
  // This applies to all schemas, not just "public"
  header += `
-- =============================================
-- Schema Setup
-- =============================================
-- CAREFUL: This will drop the ${schemaName} schema 
DROP SCHEMA IF EXISTS ${schemaName} CASCADE;
${schemaName === "public" ? "DELETE FROM vault.secrets;\n" : ""}
CREATE SCHEMA IF NOT EXISTS ${schemaName} AUTHORIZATION pg_database_owner;
-- Enable pgcrypto extension (installed at database level for Supabase compatibility)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure extension functions are in search path
SET search_path = ${schemaName}, auth, extensions;
`;

  return header;
}

/**
 * Build combined schema file from individual SQL files
 */
export function buildSchemaFile(sqlDir: string, schemaName: string, sqlFiles: string[], version: string): string {
  let combinedContent = generateSqlHeader(schemaName, version);

  // Append each SQL file with search_path set
  for (const file of sqlFiles) {
    console.log("Processing file:", file);
    const filePath = join(sqlDir, file);
    const content = readFileSync(filePath, "utf8");
    combinedContent += `\n\n-- ${file}\nSET search_path = ${schemaName}, auth;\n\n`;
    combinedContent += `${content}`;
  }

  return combinedContent;
}

/**
 * Write schema file to dist directory
 * Output: dist/<schemaName>.sql (e.g., dist/public.sql)
 */
export function writeSchemaFile(content: string, schemaName: string): void {
  const paths = getPaths();
  const distPath = join(process.cwd(), paths.DIST);
  const schemafile = join(distPath, `${schemaName}.sql`);
  console.log(`Writing schema file to ${schemafile}`);

  // Ensure dist directory exists
  if (!existsSync(distPath)) {
    mkdirSync(distPath, { recursive: true });
  }

  writeFileSync(schemafile, content);
}

/**
 * Get package version from package.json
 * Looks in multiple locations: user's project and @codemarc/blt package
 */
export function getPackageVersion(): string {
  const searchPaths = [
    join(process.cwd(), 'package.json'),              // User's project
    join(__dirname, '..', '..', 'package.json'),      // @codemarc/blt package
  ];

  for (const packageJsonPath of searchPaths) {
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
        if (packageJson.version) {
          return packageJson.version;
        }
      } catch {
        // Continue to next path
      }
    }
  }

  return "0.0.0"; // Fallback
}
