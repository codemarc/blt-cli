import type { Logger } from "@caporal/core";
import { REPOSITORIES } from "../../lib/repositories";

interface RepoOptions {
  ssh?: boolean;
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
 * Display valid repositories in the current working set
 */
export async function showRepo(options: RepoOptions, logger: Logger): Promise<void> {
  try {
    console.log("\n📦 Current Repositories\n");

    const headers = ["Name", "Description", options.ssh ? "SSH URL" : "URL"];
    const tableRows: string[][] = [headers];

    for (const repo of REPOSITORIES) {
      tableRows.push([
        repo.name,
        repo.description || "",
        options.ssh ? repo.sshUrl : repo.url,
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

    // Print summary
    console.log(`Total repositories: ${REPOSITORIES.length}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to display repositories: ${message}`);
    process.exit(1);
  }
}
