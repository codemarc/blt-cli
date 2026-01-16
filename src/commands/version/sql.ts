import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Logger } from "@caporal/core";

/**
 * Generate SQL to upsert version.json to settings table
 */
export function generateVersionSQL(logger: Logger): void {
  try {
    const rootDir = process.cwd();
    const versionJsonPath = join(rootDir, "version.json");

    if (!existsSync(versionJsonPath)) {
      logger.error("version.json not found. Run 'blt version update' first.");
      process.exit(1);
    }

    const versionInfo = JSON.parse(readFileSync(versionJsonPath, "utf-8"));
    
    // Convert version.json to JSON string for SQL
    const propsJson = JSON.stringify(versionInfo);
    
    // Escape single quotes in JSON for SQL
    const escapedPropsJson = propsJson.replace(/'/g, "''");
    
    // Generate SQL upsert statement
    // Match format used in other settings INSERT statements (no casts in VALUES)
    const sql = `INSERT INTO settings (id, name, kind, props) VALUES
('00000000-0000-0000-0000-ffffffffffff', 'version', 'meta', '${escapedPropsJson}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, settings.name),
    kind = COALESCE(EXCLUDED.kind, settings.kind),
    props = COALESCE(EXCLUDED.props, settings.props);`;
    
    console.log(sql);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to generate SQL: ${message}`);
    process.exit(1);
  }
}
