import { executeQuery } from "../../lib/database-runner";

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
 * Rows command implementation - display row counts for all tables
 */
export async function showRows(): Promise<void> {
  try {
    console.log("\n📊 Fetching row counts from database...\n");
    const rows = await executeQuery<{ table_name: string; row_count: string | number | bigint }>(
      "SELECT * FROM get_row_counts()"
    );

    if (rows.length === 0) {
      console.log("No tables found in the database.");
      return;
    }

    // Build ASCII table
    const headers = ["Table Name", "Row Count"];
    const tableRows: string[][] = [headers];
    for (const row of rows) {
      // Handle bigint which may come as string from PostgreSQL
      const count = typeof row.row_count === 'string' 
        ? parseInt(row.row_count, 10).toLocaleString()
        : Number(row.row_count).toLocaleString();
      tableRows.push([
        row.table_name,
        count,
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

    // Calculate and display total
    const total = rows.reduce((sum, row) => {
      const count = typeof row.row_count === 'string' 
        ? parseInt(row.row_count, 10)
        : Number(row.row_count);
      return sum + count;
    }, 0);
    console.log(`Total rows across all tables: ${total.toLocaleString()}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Error: ${message}`);
    console.error("\nMake sure the database is accessible and get_row_counts() function exists.");
    process.exit(1);
  }
}
