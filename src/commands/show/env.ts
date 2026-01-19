import { execSync } from "node:child_process";

/**
 * Mask sensitive values for display
 */
function maskValue(value: string, showLength: boolean = true): string {
  if (!value) return "(not set)";
  if (value.length <= 8) return "***";
  if (showLength) {
    return `${value.substring(0, 4)}...${value.substring(value.length - 4)} (${value.length} chars)`;
  }
  return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
}

/**
 * Render a table row for ASCII table display
 */
function renderRow(row: string[], colWidths: number[]): string {
  return `| ${row.map((cell, i) => cell.padEnd(colWidths[i])).join(" | ")} |`;
}

/**
 * Render a table divider row
 */
function renderDivider(colWidths: number[]): string {
  return `|-${colWidths.map((w) => "-".repeat(w)).join("-|-")}-|`;
}

/**
 * Show env command implementation - display blt core environment variables
 */
export async function showEnv(): Promise<void> {
  try {
    console.log(`\nChecking build .env ${execSync('head -n 1 .env').toString().trim()}`);
    
    console.log("\n🔧 BLT Core Environment Variables\n");

    // Define the environment variables to check
    const envVars = [
      {
        name: "BLT_SCHEMA_BASE",
        description: "Base path for schema files",
        value: process.env.BLT_SCHEMA_BASE,
        sensitive: false,
      },
      {
        name: "BLT_DIST_PATH",
        description: "Path for distribution files",
        value: process.env.BLT_DIST_PATH,
        sensitive: false,
      },
      {
        name: "SUPABASE_DATA_API",
        description: "Supabase Data API URL",
        value: process.env.SUPABASE_DATA_API,
        sensitive: false,
      },
      {
        name: "SUPABASE_SERVICE_ROLE_KEY",
        description: "Supabase service role key",
        value: process.env.SUPABASE_SERVICE_ROLE_KEY,
        sensitive: true,
      },
      {
        name: "SUPABASE_CONNECTION_STRING",
        description: "Supabase database connection string",
        value: process.env.SUPABASE_CONNECTION_STRING,
        sensitive: true,
      },
    ];

    // Build ASCII table
    const headers = ["Variable Name", "Description", "Value"];
    const tableRows: string[][] = [headers];
    
    for (const envVar of envVars) {
      const displayValue = envVar.sensitive
        ? maskValue(envVar.value || "")
        : envVar.value || "(not set)";
      
      tableRows.push([
        envVar.name,
        envVar.description,
        displayValue,
      ]);
    }

    // Calculate column widths
    const colWidths = headers.map((_header, i) =>
      Math.max(...tableRows.map((row) => row[i].toString().length))
    );

    // Print table
    console.log(renderRow(tableRows[0], colWidths));
    console.log(renderDivider(colWidths));
    for (let i = 1; i < tableRows.length; i++) {
      console.log(renderRow(tableRows[i], colWidths));
    }
    console.log("");

    // Count set vs unset
    const setCount = envVars.filter((v) => v.value).length;
    const unsetCount = envVars.length - setCount;
    console.log(`Set: ${setCount} | Unset: ${unsetCount}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Error: ${message}`);
    process.exit(1);
  }
}
