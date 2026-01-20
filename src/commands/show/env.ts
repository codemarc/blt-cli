import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

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

  if (!existsSync('.env')) {
    console.warn(`\n.env file not found`);
  } else {
    console.log(`\nChecking build .env ${execSync('head -n 1 .env').toString().trim()}`);
  }

  try {

    console.log("\n🔧 BLT Core Environment Variables\n");

    // Define the environment variables to check
    const envVars = [
      {
        name: "SUPABASE_PROJECT_REF",
        description: "Supabase project reference",
        value: process.env.SUPABASE_PROJECT_REF,
        sensitive: false,
      },
      
      {
        name: "SUPABASE_DASHBOARD",
        description: "Supabase dashboard URL",
        value: process.env.SUPABASE_DASHBOARD,
        sensitive: false,
      },
      
        {
        name: "SUPABASE_DATA_API",
        description: "Supabase Data API URL",
        value: process.env.SUPABASE_DATA_API,
        sensitive: false,
      },
      
      {
        name: "SUPABASE_CONNECTION_STRING",
        description: "Supabase connection string",
        value: process.env.SUPABASE_CONNECTION_STRING,
        sensitive: true,
      },
      
        {
        name: "SUPABASE_ACCESS_TOKEN",
        description: "Supabase access token",
        value: process.env.SUPABASE_ACCESS_TOKEN,
        sensitive: true,
      },
      
      {
        name: "SUPABASE_SERVICE_ROLE_KEY",
        description: "Supabase service role key",
        value: process.env.SUPABASE_SERVICE_ROLE_KEY,
        sensitive: true,
      },
      
      {
        name: "SUPABASE_ANON_KEY",
        description: "Supabase anonymous key",
        value: process.env.SUPABASE_ANON_KEY,
        sensitive: true,
      },

      {
        name: "VITE_SUPABASE_URL",
        description: "Supabase admin key",
        value: process.env.VITE_SUPABASE_URL,
        sensitive: false,
      },

      {
        name: "VITE_SUPABASE_ANON_KEY",
        description: "Supabase anonymous key",
        value: process.env.VITE_SUPABASE_ANON_KEY,
        sensitive: false,
      },
      
      {
        name: "STRIPE_SECRET_KEY",
        description: "Stripe secret key",
        value: process.env.STRIPE_SECRET_KEY,
        sensitive: true,
      },
      {
        name: "STRIPE_PUBLISHABLE_KEY",
        description: "Stripe publishable key",
        value: process.env.STRIPE_PUBLISHABLE_KEY,
        sensitive: true,
      },
      {
        name: "SQUARE_APP_ID",
        description: "Square app ID",
        value: process.env.SQUARE_APP_ID,
        sensitive: false,
      },
      {
        name: "SQUARE_ACCESS_TOKEN",
        description: "Square access token",
        value: process.env.SQUARE_ACCESS_TOKEN,
        sensitive: true,
      }
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
