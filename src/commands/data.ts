import { Program } from "@caporal/core";
import { join } from "path";
import { existsSync } from "fs";
import {
  getDefaultSchemaName,
  getSchemaFileList,
  getSchemaTableRows,
  getAvailableSchemas,
} from "../lib/schema-discovery";
import {
  getDefaultInstanceName,
  getAvailableInstances,
} from "../lib/instance-discovery";
import {
  buildSchemaFile,
  getPackageVersion,
  getSortedSqlFiles,
  writeSchemaFile,
} from "../lib/sql-builder";
import { buildDataFile, writeDataFile } from "../lib/data-generator";
import { runSqlFile, executeQuery } from "../lib/database-runner";
import { getPaths } from "../lib/constants";

// Re-export for backward compatibility
export { getSchemaTableRows, getSchemaFileList, getAvailableSchemas, getDefaultSchemaName };

// =============================================
// CLI Command Implementation
// =============================================

/**
 * Render a table row for ASCII table display
 */
function renderRow(row: string[], colWidths: number[]): string {
  return "| " + row.map((cell, i) => cell.padEnd(colWidths[i])).join(" | ") + " |";
}

/**
 * Render a table divider row
 */
function renderDivider(colWidths: number[]): string {
  return "|-" + colWidths.map((w) => "-".repeat(w)).join("-|-") + "-|";
}

/**
 * Register schema commands with the CLI program
 */
export default function dataCommand(program: Program) {
  // Schema info command - display schema file information
  program
    .command("schema info", "Get information about the schema")
    .argument("[schema-name]", "Schema name (e.g., 'core', 'public')")
    .option("-f, --format <format>", "Output format: table or json", {
      default: "table",
      validator: ["table", "json"],
    })
    .action(async ({ args, options, logger }) => {
      const schemaName = (args.schemaName as string) || getDefaultSchemaName();

      // JSON format output
      if (options.format === "json") {
        try {
          const files = getSchemaFileList(schemaName);
          console.log(JSON.stringify(files, null, 2));
        } catch (error: any) {
          logger.error(error.message);
          process.exit(1);
        }
        return;
      }

      // Table format output
      let rows;
      try {
        rows = getSchemaTableRows(schemaName);
      } catch (error: any) {
        logger.error(error.message);
        process.exit(1);
      }

      // Build ASCII table
      const headers = ["Name", "Size", "Created At", "Last Modified"];
      const tableRows = [headers];
      for (const row of rows) {
        tableRows.push([
          row.name,
          row.size.toString(),
          row.createdAt,
          row.lastModified,
        ]);
      }

      // Calculate column widths
      const colWidths = headers.map((header, i) =>
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
    });

  // Build command - unified build command for schema or data
  program
    .command("build", "Build SQL files (schema or data)")
    .argument("<type>", "Build type: 'schema' or 'data'", {
      validator: ["schema", "data"],
    })
    .argument("[name]", "Schema name (for schema) or instance name (for data)")
    .action(async ({ args, logger }) => {
      const buildType = args.type as string;
      const name = args.name as string | undefined;

      if (buildType === "schema") {
        // Build schema
        const schemaName = name || getDefaultSchemaName();

        // Validate schema directory exists
        const paths = getPaths();
        const sqlDir = join(process.cwd(), paths.SCHEMA_BASE, schemaName, "sql");
        if (!existsSync(sqlDir)) {
          logger.error(`Schema directory does not exist: ${sqlDir}`);
          process.exit(1);
        }

        const version = getPackageVersion();

        // Build schema file from DDL files only
        const sqlFiles = getSortedSqlFiles(sqlDir, schemaName);
        if (sqlFiles.length === 0) {
          logger.error(`No SQL files found in schema directory: ${sqlDir}`);
          process.exit(1);
        }

        const combinedContent = buildSchemaFile(sqlDir, schemaName, sqlFiles, version);
        
        // Write to dist directory
        writeSchemaFile(combinedContent, schemaName);
        
        console.log(`✅ Schema built successfully: dist/${schemaName}.sql`);
      } else if (buildType === "data") {
        // Build data
        const instanceName = name || getDefaultInstanceName();
        const version = getPackageVersion();

        try {
          // Build data file from instance directory
          const dataContent = buildDataFile(instanceName, version);
          
          // Write to dist directory
          writeDataFile(dataContent, instanceName);
          
          console.log(`✅ Data generated successfully: dist/data.sql`);
        } catch (error: any) {
          logger.error(error.message);
          process.exit(1);
        }
      }
    });

  // Deploy command - execute SQL files
  program
    .command("deploy", "Deploy SQL files to database")
    .argument("<type>", "Deploy type: 'schema' or 'data'", {
      validator: ["schema", "data"],
    })
    .argument("[name]", "Schema name (for schema) or instance name (for data)")
    .action(async ({ args, logger }) => {
      const deployType = args.type as string;
      const name = args.name as string | undefined;

      if (deployType === "schema") {
        // Deploy schema
        const schemaName = name || getDefaultSchemaName();
        const paths = getPaths();
        const schemaFile = join(process.cwd(), paths.DIST, `${schemaName}.sql`);

        if (!existsSync(schemaFile)) {
          logger.error(`Schema file not found: ${schemaFile}`);
          logger.error(`Please run 'blt build schema ${schemaName}' first.`);
          process.exit(1);
        }

        await runSqlFile(schemaFile);
      } else if (deployType === "data") {
        // Deploy data
        const paths = getPaths();
        const dataFile = join(process.cwd(), paths.DIST, "data.sql");

        if (!existsSync(dataFile)) {
          logger.error(`Data file not found: ${dataFile}`);
          const instanceName = name || getDefaultInstanceName();
          logger.error(`Please run 'blt build data ${instanceName}' first.`);
          process.exit(1);
        }

        await runSqlFile(dataFile);
      }
    });

  // Counts command - display row counts for all tables
  program
    .command("rows", "Display row counts for all tables")
    .action(async () => {
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
        const tableRows = [headers];
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
        const colWidths = headers.map((header, i) =>
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
      } catch (error: any) {
        console.error(`\n❌ Error: ${error.message}`);
        console.error("\nMake sure the database is accessible and get_row_counts() function exists.");
        process.exit(1);
      }
    });
}
