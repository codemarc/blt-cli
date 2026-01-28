// YAML to SQL conversion utilities

import * as fs from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { PATTERNS } from "./constants";
import type { YamlFile } from "./constants";

// ============================================================================
// Environment Variable Substitution
// ============================================================================

/**
 * Replace environment variables in a string.
 * Supports: ${VAR}, {VAR}, and $VAR patterns.
 */
function substituteEnvVars(str: string): string {
  return str
    .replace(/\$\{([^}]+)\}/g, (match, name) => process.env[name] ?? match)
    .replace(/\{([A-Z_][A-Z0-9_]*)\}/g, (match, name) => process.env[name] ?? match)
    .replace(/\$([A-Z_][A-Z0-9_]*)/gi, (match, name) => process.env[name] ?? match);
}

/**
 * Recursively substitute environment variables in all string values.
 * 
 * NOTE: If you see `${SUPABASE_URL}` (or any `${VAR}`) in your *output*,
 * instead of the actual env value, it means `process.env.VAR` was undefined
 * at the time this function ran. This likely means the environment variable
 * wasn't loaded, set, or visible to the Bun/Node.js process at runtime.
 *
 * Bun automatically loads from .env, but if you're running this with Node.js,
 * you need to ensure dotenv is loaded, or the env values are set in the OS.
 * 
 * If you want to debug, try logging `process.env` or check how you run Bun/Node.
 */
function processEnvVars(value: unknown): unknown {
  if (typeof value === "string") return substituteEnvVars(value);
  if (Array.isArray(value)) return value.map(processEnvVars);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, processEnvVars(v)])
    );
  }
  return value;
}

// ============================================================================
// Value Formatting
// ============================================================================

/**
 * Escape a string for SQL (double single quotes).
 */
function escapeString(str: string): string {
  return str.replace(/'/g, "''");
}

/**
 * Format a value as a SQL literal.
 */
function toSqlLiteral(value: unknown, column?: string): string {
  if (value === null || value === undefined) return "NULL";
  if (value === "") return column === "props" ? "'{}'::json" : "NULL";

  if (typeof value === "string") {
    return value.toUpperCase() === "NULL" ? "NULL" : `'${escapeString(value)}'`;
  }
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return String(value);

  if (Array.isArray(value)) {
    if (value.length === 0) {
      const arrayType = column === "perms" ? "app_perm" : column === "roles" ? "app_role" : "text";
      return `ARRAY[]::${arrayType}[]`;
    }
    const items = value.map((v) => typeof v === "string" ? `'${escapeString(v)}'` : String(v));
    const arrayType = column === "perms" ? "app_perm" : column === "roles" ? "app_role" : "text";
    return `ARRAY[${items.join(", ")}]::${arrayType}[]`;
  }

  if (typeof value === "object") {
    const json = JSON.stringify(value).replace(/\\/g, "\\\\").replace(/'/g, "''");
    return Object.keys(value).length === 0 ? "'{}'::json" : `'${json}'::json`;
  }

  return `'${escapeString(String(value))}'`;
}

/**
 * Check if a value is a JSON object or array (not a primitive).
 */
function isJsonValue(value: unknown): boolean {
  return Array.isArray(value) || (value !== null && typeof value === "object");
}

/**
 * Format a value as a quoted text parameter (for CALL/SELECT statements).
 * JSON objects/arrays are serialized to JSON strings.
 */
function toQuotedParam(value: unknown): string {
  if (value === null || value === undefined) return "'NULL'";

  if (typeof value === "string") {
    return value.toUpperCase() === "NULL" ? "'NULL'" : `'${escapeString(value)}'`;
  }
  if (typeof value === "boolean") return value ? "'TRUE'" : "'FALSE'";
  if (typeof value === "number") return `'${value}'`;

  // JSON objects and arrays → serialize to JSON string
  if (isJsonValue(value)) {
    const json = JSON.stringify(value).replace(/\\/g, "\\\\").replace(/'/g, "''");
    return `'${json}'`;
  }

  return `'${escapeString(String(value))}'`;
}

// ============================================================================
// YAML Parsing
// ============================================================================

/**
 * Parse YAML content and extract rows array.
 */
function parseYamlRows(yamlContent: string): Record<string, unknown>[] {
  const parsed = yaml.load(yamlContent);

  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    if ("rows" in parsed && Array.isArray((parsed as { rows: unknown }).rows)) {
      return (parsed as { rows: Record<string, unknown>[] }).rows;
    }
    return [parsed as Record<string, unknown>];
  }
  return [];
}

/**
 * Detect the target type and name from YAML content.
 */
function detectTarget(yamlContent: string): { type: "function" | "procedure" | "table"; name: string } | null {
  const functionMatch = yamlContent.match(PATTERNS.FUNCTION_NAME);
  if (functionMatch) return { type: "function", name: functionMatch[1].trim() };

  const procedureMatch = yamlContent.match(PATTERNS.PROCEDURE_NAME);
  if (procedureMatch) return { type: "procedure", name: procedureMatch[1].trim() };

  const tableMatch = yamlContent.match(PATTERNS.TABLE_NAME);
  if (tableMatch) return { type: "table", name: tableMatch[1].trim() };

  return null;
}

// ============================================================================
// SQL Generation
// ============================================================================

/**
 * Format a parameter with appropriate type cast for function/procedure calls.
 * Handles proper type casting for booleans, integers, strings, and JSON.
 */
function formatParam(value: unknown, columnName?: string): string {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return "NULL";
  }

  // Handle booleans - cast to BOOLEAN
  if (typeof value === "boolean") {
    return value ? "TRUE::BOOLEAN" : "FALSE::BOOLEAN";
  }

  // Handle numbers - cast to INTEGER or NUMERIC
  if (typeof value === "number") {
    // Check column name hints for type
    if (columnName && (columnName.includes("order") || (columnName.includes("id") && !columnName.includes("uuid")))) {
      return `${value}::INTEGER`;
    }
    // Default to INTEGER for whole numbers, NUMERIC for decimals
    return Number.isInteger(value) ? `${value}::INTEGER` : `${value}::NUMERIC`;
  }

  // Handle JSON objects/arrays - cast to JSONB using jsonb_build_object
  if (isJsonValue(value) && typeof value === "object" && value !== null && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return "jsonb_build_object()::JSONB";
    }
    const kvSql = entries
      .map(([k, v]) => {
        return `'${escapeString(String(k))}', ${formatParam(v)}`;
      })
      .join(", ");
    return `jsonb_build_object(${kvSql})::JSONB`;
  }
  // For arrays or non-object JSON types, fallback to stringify-and-cast
  if (isJsonValue(value)) {
    const json = JSON.stringify(value).replace(/\\/g, "\\\\").replace(/'/g, "''");
    return `'${json}'::JSONB`;
  }


  // Handle strings - cast to TEXT
  if (typeof value === "string") {
    if (value.toUpperCase() === "NULL") {
      return "NULL";
    }
    return `'${escapeString(value)}'::TEXT`;
  }

  // Fallback - convert to string and cast to TEXT
  return `'${escapeString(String(value))}'::TEXT`;
}

/**
 * Generate SELECT statements for function calls.
 */
function generateFunctionCalls(rows: { row: Record<string, unknown> }[], functionName: string): string {
  const statements = rows.map((r) => {
    const columns = Object.keys(r.row);
    const params = columns.map((col) => formatParam(r.row[col], col));
    return `SELECT ${functionName}(${params.join(", ")});`;
  });
  return `-- Generated from JSON data\n${statements.join("\n")}`;
}

/**
 * Generate CALL statements for procedure calls.
 */
function generateProcedureCalls(rows: { row: Record<string, unknown> }[], procedureName: string): string {
  const statements = rows.map((r) => {
    const columns = Object.keys(r.row);
    const params = columns.map((col) => formatParam(r.row[col], col));
    return `CALL ${procedureName}(${params.join(", ")});`;
  });
  return `-- Generated from JSON data\n${statements.join("\n")}`;
}

/**
 * Generate INSERT statement with ON CONFLICT upsert.
 */
function generateInsert(rows: { row: Record<string, unknown> }[], tableName: string): string {
  const columns = Object.keys(rows[0].row);
  const conflictColumn = columns[0];
  const updateColumns = columns.slice(1);

  const valueRows = rows.map((r) => {
    const values = columns.map((col) => toSqlLiteral(r.row[col], col));
    return `(${values.join(", ")})`;
  });

  const updateClauses = updateColumns.map(
    (col) => `    ${col} = COALESCE(EXCLUDED.${col}, ${tableName}.${col})`
  );

  return [
    "-- Generated from JSON data",
    `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES`,
    valueRows.join(",\n"),
    `ON CONFLICT (${conflictColumn}) DO UPDATE SET`,
    updateClauses.join(",\n") + ";",
  ].join("\n");
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Convert YAML content to JSON array format.
 */
export function yamlToJson(yamlContent: string): Record<string, unknown>[] {
  return parseYamlRows(yamlContent);
}

/**
 * Convert JSON rows to SQL statements.
 */
export function jsonToSql(
  rows: { row: Record<string, unknown> }[],
  name: string,
  type: "function" | "procedure" | "table" = "table"
): string {
  if (rows.length === 0) return "-- No rows to insert";

  switch (type) {
    case "function":
      return generateFunctionCalls(rows, name);
    case "procedure":
      return generateProcedureCalls(rows, name);
    case "table":
      return generateInsert(rows, name);
  }
}

/**
 * Convert YAML content to SQL statements.
 */
export function yamlToSql(
  yamlContent: string,
  name: string,
  type: "function" | "procedure" | "table" = "table"
): string {
  const jsonData = parseYamlRows(yamlContent);
  const processedData = jsonData.map((row) => ({
    row: processEnvVars(row.row) as Record<string, unknown>,
  }));
  return jsonToSql(processedData, name, type);
}

/**
 * Find all YAML files in the schema directory.
 * Checks both the yaml subdirectory and the sql directory.
 */
export function findYamlFiles(sqlDir: string): YamlFile[] {
  const yamlSubdir = join(sqlDir, "..", "yaml");
  const yamlFiles: YamlFile[] = [];
  const seen = new Set<string>();

  // Check yaml subdirectory first
  if (fs.existsSync(yamlSubdir)) {
    for (const file of fs.readdirSync(yamlSubdir).filter((f) => f.endsWith(".yml")).sort()) {
      yamlFiles.push({ name: file, path: join(yamlSubdir, file), source: "subdir" });
      seen.add(file);
    }
  }

  // Check current directory (skip duplicates)
  for (const file of fs.readdirSync(sqlDir).filter((f) => f.endsWith(".yml")).sort()) {
    if (!seen.has(file)) {
      yamlFiles.push({ name: file, path: join(sqlDir, file), source: "current" });
    }
  }

  return yamlFiles;
}

/**
 * Process all YAML files in a directory and convert them to SQL.
 * @returns Number of files processed.
 */
export function processYamlFiles(sqlDir: string): number {
  const yamlFiles = findYamlFiles(sqlDir);
  let count = 0;

  for (const yamlFile of yamlFiles) {
    console.log(`\nProcessing YAML file: ${yamlFile.name} (from ${yamlFile.source} directory)`);

    const yamlContent = fs.readFileSync(yamlFile.path, "utf8");
    const target = detectTarget(yamlContent);

    if (!target) {
      console.error(`No table, function, or procedure name found in YAML file: ${yamlFile.name}`);
      continue;
    }

    const sqlContent = yamlToSql(yamlContent, target.name, target.type);
    const sqlFileName = yamlFile.name.replace(".yml", ".sql");
    const sqlPath = join(sqlDir, sqlFileName);

    fs.writeFileSync(sqlPath, sqlContent);
    console.log(`Created ${sqlFileName}`);
    count++;
  }

  return count;
}
