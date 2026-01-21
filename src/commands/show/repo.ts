import type { Logger } from "@caporal/core";

interface Repository {
  name: string;
  url: string;
  sshUrl: string;
  description?: string;
}

/**
 * Hardcoded list of valid repositories in the current working set
 */
const REPOSITORIES: Repository[] = [
  {
    name: "cli",
    url: "https://github.com/codemarc/blt-cli.git",
    sshUrl: "git@github.com:codemarc/blt-cli.git",
    description: "BLT command line interface",
  },

  {
    name: "pos",
    url: "https://github.com/bltcore-com/blt-core-pos.git",
    sshUrl: "git@github.com:bltcore-com/blt-core-pos.git",
    description: "core pos application",
  },

  {
    name: "data",
    url: "https://github.com/bltcore-com/blt-core-data.git",
    sshUrl: "git@github.com:bltcore-com/blt-core-data.git",
    description: "data schema & sample data",
  },

  {
    name: "gateway",
    url: "https://github.com/bltcore-com/blt-device-gateway.git",
    sshUrl: "git@github.com:bltcore-com/blt-device-gateway.git",
    description: "device gateway",
  },
  {
    name: "devops",
    url: "https://github.com/bltcore-com/blt-core-devops.git",
    sshUrl: "git@github.com:bltcore-com/blt-core-devops.git",
    description: "devops scripts",
  },
  {
    name: "deploy",
    url: "https://github.com/bltcore-com/deploy.git",
    sshUrl: "git@github.com:bltcore-com/deploy.git",
    description: "deployment scripts",
  },
];

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
