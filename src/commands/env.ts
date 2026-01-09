import { Program } from "@caporal/core";
import { execSync } from "child_process";

// =============================================
// CLI Command Implementation
// =============================================

/**
 * Register env commands with the CLI program
 */
export default function envCommand(program: Program) {
  program
    .command("env", "Get information runtime environment")
    .argument("[data]", "section name (e.g., 'build', 'core', 'data')", { 
      default: "build" ,
      validator: ["build", "core", "data"],
    })
    .action(async ({ args, options, logger }) => {
      const section = (args.data as string) || 'build';

      if(section === 'build') {
      console.log(`
Checking build .env ${execSync('head -n 1 .env').toString().trim()}
Supabase Dashboard URL: ${process.env["VITE_SUPABASE_DASHBOARD_URL"] ?? `not set`}
`)
      }
    });
  };
