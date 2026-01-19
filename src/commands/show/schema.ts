import type { Logger } from "@caporal/core";
import {
  getDefaultSchemaName,
  getSchemaFileList,
  getSchemaTableRows,
} from "../../lib/schema-discovery";

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
 * Show schema command implementation
 */
export async function showSchema(
  args: { schemaName?: string },
  options: { format: string },
  logger: Logger
): Promise<void> {
  const schemaName = (args.schemaName as string) || getDefaultSchemaName();

  // JSON format output
  if (options.format === "json") {
    try {
      const files = getSchemaFileList(schemaName);
      console.log(JSON.stringify(files, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(message);
      process.exit(1);
    }
    return;
  }

  // Table format output
  let rows: Array<{ name: string; size: number; createdAt: string; lastModified: string; updatedAt: string }>;
  try {
    rows = getSchemaTableRows(schemaName);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(message);
    process.exit(1);
  }

  // Build ASCII table
  const headers = ["Name", "Size", "Created At", "Last Modified"];
  const tableRows: string[][] = [headers];
  for (const row of rows) {
    tableRows.push([
      row.name,
      row.size.toString(),
      row.createdAt,
      row.lastModified,
    ]);
  }

  // Calculate column widths
  const colWidths = headers.map((_header, i) =>
    Math.max(...tableRows.map((row) => row[i].toString().length))
  );

  // Print table
  console.log("");
  console.log(renderRow(tableRows[0], colWidths));
  console.log(renderDivider(colWidths));
  for (let i = 1; i < tableRows.length; i++) {
    console.log(renderRow(tableRows[i], colWidths));
  }
  console.log("");
}
