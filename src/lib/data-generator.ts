// Data generation utilities for instance-specific data

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { getPaths, PATTERNS } from "./constants";
import { processYamlFiles } from "./yaml-converter";
import { getSortedSqlFiles } from "./sql-builder";
import { getInstanceDir } from "./instance-discovery";

/**
 * Build data file from instance directory
 * Handles both direct SQL files and YAML files that need conversion
 * Instance directory structure: instances/<instance>/{sql/, yaml/}
 */
export function buildDataFile(instanceName: string, version: string): string {
  const instanceDir = getInstanceDir(instanceName);
  
  if (!existsSync(instanceDir)) {
    throw new Error(`Instance directory does not exist: ${instanceDir}`);
  }

  const sqlDir = join(instanceDir, "sql");
  const yamlDir = join(instanceDir, "yaml");

  let dataContent = `-- =============================================
-- Instance Data: ${instanceName}
-- v${version} ፨ ${new Date().toLocaleString()}
-- =============================================
SET search_path = public, auth, extensions;
`;

  // Check for YAML files and convert them first
  // processYamlFiles expects sqlDir and looks for yaml files in sqlDir/../yaml
  if (existsSync(yamlDir)) {
    // Process YAML files to SQL (creates .sql files in the sql directory)
    if (existsSync(sqlDir)) {
      processYamlFiles(sqlDir);
    } else {
      // Create sql directory if it doesn't exist
      mkdirSync(sqlDir, { recursive: true });
      processYamlFiles(sqlDir);
    }
  }

  // Get all SQL files from the sql subdirectory
  if (!existsSync(sqlDir)) {
    console.warn(`No SQL directory found in instance: ${instanceDir}`);
    return dataContent;
  }

  const sqlFiles = readdirSync(sqlDir)
    .filter((file) => file.toLowerCase().endsWith(".sql") && PATTERNS.FILE_NUMBER.test(file))
    .sort();

  if (sqlFiles.length === 0) {
    console.warn(`No SQL files found in instance sql directory: ${sqlDir}`);
    return dataContent;
  }

  // Append each SQL file
  for (const file of sqlFiles) {
    console.log(`Processing data file: ${file}`);
    const filePath = join(sqlDir, file);
    const content = readFileSync(filePath, "utf8");
    dataContent += `\n\n-- ${file}\nSET search_path = public, auth, extensions;\n\n`;
    dataContent += `${content}`;
  }

  return dataContent;
}

/**
 * Write data file to dist directory
 */
export function writeDataFile(content: string, instanceName: string): void {
  const paths = getPaths();
  const distPath = join(process.cwd(), paths.DIST);
  const datafile = join(distPath, 'data.sql');
  console.log(`Writing data file to ${datafile}`);

  // Ensure dist directory exists
  if (!existsSync(distPath)) {
    mkdirSync(distPath, { recursive: true });
  }

  writeFileSync(datafile, content);
}
