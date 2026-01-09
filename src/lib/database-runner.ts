// Database execution utilities

import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import pg from "pg";
import { PATTERNS, getPaths, SqlFile } from "./constants";

/**
 * Get the latest SQL file from the dist directory
 */
export function getLatestSqlFile(): SqlFile {
  const paths = getPaths();
  const distPath = join(process.cwd(), paths.DIST);

  if (!existsSync(distPath)) {
    console.error(`Dist directory does not exist: ${distPath}`);
    process.exit(1);
  }

  const sqlFiles = readdirSync(distPath)
    .filter((file) => file.startsWith("bltcore-v") && file.endsWith(".sql"))
    .map((file) => {
      const versionMatch = file.match(PATTERNS.SQL_FILE);
      if (!versionMatch) return null;
      return {
        name: file,
        version: versionMatch[1],
        path: join(distPath, file),
      };
    })
    .filter((f): f is SqlFile => f !== null)
    .sort((a, b) => {
      // Sort by semantic version (major.minor.patch)
      const [aMajor, aMinor, aPatch] = a.version.split(".").map(Number);
      const [bMajor, bMinor, bPatch] = b.version.split(".").map(Number);

      if (aMajor !== bMajor) return bMajor - aMajor;
      if (aMinor !== bMinor) return bMinor - aMinor;
      return bPatch - aPatch;
    });

  if (sqlFiles.length === 0) {
    console.error("No SQL files found in dist directory");
    process.exit(1);
  }

  return sqlFiles[0];
}

/**
 * Execute a SQL file against the database
 */
export async function runSqlFile(filePath?: string): Promise<void> {
  let targetFile: SqlFile;
  let sqlContent: string;

  if (filePath) {
    // Use specified file
    const fileName = filePath.split("/").pop() || filePath;
    sqlContent = readFileSync(filePath, "utf8");
    targetFile = {
      name: fileName,
      version: "unknown",
      path: filePath,
    };
    console.log(`\n🚀 Running SQL file: ${fileName}`);
  } else {
    // Use latest file (backward compatibility)
    targetFile = getLatestSqlFile();
    sqlContent = readFileSync(targetFile.path, "utf8");
    console.log(`\n🚀 Running latest SQL file: ${targetFile.name} (v${targetFile.version})`);
  }

  // Read database connection from environment variables
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

  if (!connectionString) {
    console.error(`\n❌ Error: No database connection string found.`);
    console.error("Please set DATABASE_URL or SUPABASE_DB_URL environment variable.");
    console.error("\nExample:");
    console.error('  export DATABASE_URL="postgresql://user:password@localhost:5432/dbname"');
    process.exit(1);
  }

  // Create PostgreSQL client
  const client = new pg.Client({ connectionString });

  try {
    console.log("📡 Connecting to database...");
    await client.connect();
    console.log("✅ Connected successfully");

    console.log("\n⏳ Executing SQL script...");
    console.log("   This may take a few moments...\n");

    // Execute the SQL
    await client.query(sqlContent);

    console.log("✅ SQL script executed successfully!");
    if (targetFile.version !== "unknown") {
      console.log(`\n📊 Database updated with schema v${targetFile.version}`);
    }
  } catch (error: any) {
    console.error("\n❌ Error executing SQL:");
    console.error("━".repeat(60));

    // Show the main error message
    console.error(`\n${error.message}`);

    // Show line number if available
    if (error.position) {
      const lines = sqlContent.substring(0, error.position).split("\n");
      const lineNumber = lines.length;
      const columnNumber = lines[lines.length - 1].length + 1;

      console.error(`\n📍 Location: Line ${lineNumber}, Column ${columnNumber}`);
      console.error(`   Position: ${error.position} characters into file`);

      // Show context around the error (3 lines before and after)
      const allLines = sqlContent.split("\n");
      const startLine = Math.max(0, lineNumber - 4);
      const endLine = Math.min(allLines.length, lineNumber + 2);

      console.error("\n📄 Context:");
      console.error("━".repeat(60));
      for (let i = startLine; i < endLine; i++) {
        const marker = i + 1 === lineNumber ? "➤" : " ";
        const lineNum = String(i + 1).padStart(5, " ");
        console.error(`${marker} ${lineNum} | ${allLines[i]}`);
      }
      console.error("━".repeat(60));
    }

    // Show additional PostgreSQL error details
    if (error.detail) {
      console.error(`\n📝 Detail: ${error.detail}`);
    }

    if (error.hint) {
      console.error(`\n💡 Hint: ${error.hint}`);
    }

    if (error.where) {
      console.error(`\n🔍 Where: ${error.where}`);
    }

    if (error.code) {
      console.error(`\n🏷️  SQL Error Code: ${error.code}`);
    }

    // Show the SQL file being executed
    console.error(`\n📂 File: ${targetFile.path}`);
    if (targetFile.version !== "unknown") {
      console.error(`   Version: ${targetFile.version}`);
    }

    console.error("\n" + "━".repeat(60));
    process.exit(1);
  } finally {
    await client.end();
    console.log("\n👋 Database connection closed");
  }
}

/**
 * Execute a SQL query and return results
 */
export async function executeQuery<T = any>(query: string): Promise<T[]> {
  // Read database connection from environment variables
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

  if (!connectionString) {
    console.error(`\n❌ Error: No database connection string found.`);
    console.error("Please set DATABASE_URL or SUPABASE_DB_URL environment variable.");
    console.error("\nExample:");
    console.error('  export DATABASE_URL="postgresql://user:password@localhost:5432/dbname"');
    process.exit(1);
  }

  // Create PostgreSQL client
  const client = new pg.Client({ connectionString });

  try {
    await client.connect();
    const result = await client.query(query);
    return result.rows;
  } catch (error: any) {
    console.error("\n❌ Error executing query:");
    console.error(`\n${error.message}`);
    if (error.detail) {
      console.error(`\n📝 Detail: ${error.detail}`);
    }
    if (error.hint) {
      console.error(`\n💡 Hint: ${error.hint}`);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}
