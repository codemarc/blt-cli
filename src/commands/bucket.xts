import type { Program } from "@caporal/core";
import debug from "debug";
import { readdirSync, statSync } from "fs";
import { readFile, access, writeFile } from "fs/promises";
import { constants } from "fs";
import { join, relative } from "path";
import { fileTypeFromFile } from "file-type";
import { getSupabaseClient } from "../utils/supabase";

const log = debug("blt:bucket");

export default function bucketCommand(program: Program) {
  // Main bucket command - shows help for subcommands
  program
    .command("bucket", "Manage Supabase storage buckets")
    .action(({ args, options, logger }) => {
        args.subcommand === "names" ? logger.info("Listing all bucket names") : logger.info("Listing all bucket names");
        args.subcommand === "list" ? logger.info("Listing files in a bucket") : logger.info("Listing files in a bucket");
        args.subcommand === "upload" ? logger.info("Uploading a file to a bucket") : logger.info("Uploading a file to a bucket");
        args.subcommand === "upload-folder" ? logger.info("Uploading a folder to a bucket") : logger.info("Uploading a folder to a bucket");
        args.subcommand === "download" ? logger.info("Downloading a file from a bucket") : logger.info("Downloading a file from a bucket");
        args.subcommand === "url" ? logger.info("Getting a file URL") : logger.info("Getting a file URL");
        args.subcommand === "help" ? logger.info("Getting help for a command") : logger.info("Getting help for a command");
        args.subcommand === "version" ? logger.info("Getting version information") : logger.info("Getting version information");
        args.subcommand === "help" ? logger.info("Getting help for a command") : logger.info("Getting help for a command");
    //   logger.info("Bucket management commands:");
    //   logger.info("");
    //   logger.info("  blt bucket buckets                    List all bucket names");
    //   logger.info("  blt bucket list <bucket-name>          List files in a bucket");
    //   logger.info("  blt bucket upload <bucket> <local> <remote>  Upload a file");
    //   logger.info("  blt bucket upload-folder <bucket> <folder>  Upload a folder");
    //   logger.info("  blt bucket download <bucket> <remote> <local>  Download a file");
    //   logger.info("  blt bucket url <bucket> <remote-path>  Get file URL");
    //   logger.info("");
    //   logger.info("Use 'blt bucket <subcommand> --help' for more information on each command.");
    });

  // List all buckets
  program
    .command("bucket names", "List all bucket names")
    .option("-f, --format <format>", "Output format: table or json", {
      default: "table",
      validator: ["table", "json"],
    })
    .action(async ({ options, logger }) => {
      try {
        log("Listing all buckets");
        const supabase = getSupabaseClient();

        const { data, error } = await supabase.storage.listBuckets();

        if (error) {
          logger.error("Error listing buckets:", error.message);
          process.exit(1);
        }

        if (!data || data.length === 0) {
          if (options.format === "json") {
            console.log(JSON.stringify({ buckets: [], count: 0 }, null, 2));
          } else {
            logger.info("No buckets found");
          }
          return;
        }

        if (options.format === "json") {
          const output = {
            count: data.length,
            buckets: data.map((bucket) => ({
              id: bucket.id,
              name: bucket.name,
              public: bucket.public,
              fileSizeLimit: bucket.file_size_limit,
              allowedMimeTypes: bucket.allowed_mime_types,
              createdAt: bucket.created_at,
              updatedAt: bucket.updated_at,
            })),
          };
          console.log(JSON.stringify(output, null, 2));
        } else {
          logger.info("");
          logger.info(`Found ${data.length} bucket(s)`);
          logger.info("");
          data.forEach((bucket) => {
            const publicStatus = bucket.public ? "public" : "private";
            logger.info(`- ${bucket.name} (${publicStatus})`);
          });
          logger.info("");
        }
      } catch (error) {
        logger.error("Error:", (error as Error).message);
        process.exit(1);
      }
    });

  // List files in a bucket
  program
    .command("bucket list", "List files in a bucket")
    .argument("<bucket-name>", "Name of the bucket")
    .option("-p, --prefix <prefix>", "Filter files by prefix/path", {
      default: "",
    })
    .option("-l, --limit <limit>", "Limit number of results", {
      default: 100,
      validator: program.NUMBER,
    })
    .option("-f, --format <format>", "Output format: table or json", {
      default: "table",
      validator: ["table", "json"],
    })
    .action(async ({ args, options, logger }) => {
      try {
        log("Listing files in bucket: %s", args.bucketName);
        const supabase = getSupabaseClient();

        const { data, error } = await supabase.storage
          .from(args.bucketName as string)
          .list(options.prefix as string, {
            limit: options.limit as number,
            sortBy: { column: "name", order: "asc" },
          });

        if (error) {
          logger.error("Error listing files:", error.message);
          process.exit(1);
        }

        if (!data || data.length === 0) {
          if (options.format === "json") {
            console.log(JSON.stringify({ files: [], count: 0, totalSize: 0 }, null, 2));
          } else {
            logger.info("No files found");
          }
          return;
        }

        const totalSize = data.reduce((acc, file) => acc + (file.metadata?.size || 0), 0);

        if (options.format === "json") {
          const output = {
            bucket: args.bucketName,
            prefix: options.prefix || "/",
            count: data.length,
            totalSize,
            totalSizeFormatted: formatBytes(totalSize),
            files: data.map((file) => ({
              name: file.name,
              id: file.id,
              size: file.metadata?.size || 0,
              sizeFormatted: formatBytes(file.metadata?.size || 0),
              mimetype: file.metadata?.mimetype,
              lastModified: file.metadata?.lastModified,
              createdAt: file.created_at,
              updatedAt: file.updated_at,
            })),
          };
          console.log(JSON.stringify(output, null, 2));
        } else {
          logger.info("");
          logger.info(`Found ${data.length} file(s)`);
          logger.info("");
          data.forEach((file) => {
            const size = file.metadata?.size
              ? `(${formatBytes(file.metadata.size)})`
              : "";
            logger.info(`- ${file.name} ${size}`);
          });
          logger.info("");
          logger.info(`   Total size: ${formatBytes(totalSize)}`); 
          logger.info("");
        }
      } catch (error) {
        logger.error("Error:", (error as Error).message);
        process.exit(1);
      }
    });

  // Upload a file to a bucket
  program
    .command("bucket upload", "Upload a file to a bucket")
    .argument("<bucket-name>", "Name of the bucket")
    .argument("<local-path>", "Local file path")
    .argument("<remote-path>", "Remote path in bucket")
    .option("--upsert", "Overwrite if file exists", { default: false })
    .action(async ({ args, options, logger }) => {
      try {
        log("Uploading file to bucket: %s", args.bucketName);
        const supabase = getSupabaseClient();

        // Check if file exists
        try {
          await access(args.localPath as string, constants.F_OK);
        } catch {
          logger.error(`File not found: ${args.localPath}`);
          process.exit(1);
        }

        // Read file and detect MIME type
        const fileBuffer = await readFile(args.localPath as string);
        const fileType = await fileTypeFromFile(args.localPath as string);
        const contentType = fileType?.mime || 'application/octet-stream';

        const { data, error } = await supabase.storage
          .from(args.bucketName as string)
          .upload(args.remotePath as string, fileBuffer, {
            upsert: options.upsert as boolean,
            contentType,
          });

        if (error) {
          logger.error("Error uploading file:", error.message);
          process.exit(1);
        }

        logger.info(`Successfully uploaded to: ${data.path}`);
      } catch (error) {
        logger.error("Error:", (error as Error).message);
        process.exit(1);
      }
    });

  // Upload all files in a folder to a bucket
  program
    .command("bucket upload-folder", "Upload all files in a folder to a bucket")
    .argument("<bucket-name>", "Name of the bucket")
    .argument("<local-folder>", "Local folder path")
    .option("-r, --remote-prefix <prefix>", "Remote path prefix in bucket", {
      default: "",
    })
    .option("--upsert", "Overwrite if files exist", { default: true })
    .option("--dry-run", "Show what would be uploaded without uploading", {
      default: false,
    })
    .action(async ({ args, options, logger }) => {
      try {
        const localFolder = args.localFolder as string;
        const bucketName = args.bucketName as string;
        const remotePrefix = options.remotePrefix as string;
        const upsert = options.upsert as boolean;
        const dryRun = options.dryRun as boolean;

        log("Uploading folder to bucket: %s", bucketName);

        // Check if folder exists
        try {
          const stat = statSync(localFolder);
          if (!stat.isDirectory()) {
            logger.error(`Not a directory: ${localFolder}`);
            process.exit(1);
          }
        } catch {
          logger.error(`Folder not found: ${localFolder}`);
          process.exit(1);
        }

        // Get all files recursively
        const files = getAllFiles(localFolder);
        
        if (files.length === 0) {
          logger.info("No files found in folder");
          return;
        }

        logger.info(`Found ${files.length} file(s) to upload`);
        logger.info("");

        if (dryRun) {
          logger.info("DRY RUN - Files that would be uploaded:");
          logger.info("");
        }

        const supabase = getSupabaseClient();
        let successCount = 0;
        let errorCount = 0;

        for (const filePath of files) {
          const relativePath = relative(localFolder, filePath);
          const remotePath = remotePrefix
            ? `${remotePrefix}/${relativePath}`
            : relativePath;

          if (dryRun) {
            logger.info(`  ${relativePath} → ${remotePath}`);
            continue;
          }

          try {
            const fileBuffer = await readFile(filePath);
            const fileType = await fileTypeFromFile(filePath);
            const contentType = fileType?.mime || 'application/octet-stream';

            const { data, error } = await supabase.storage
              .from(bucketName)
              .upload(remotePath, fileBuffer, {
                upsert,
                contentType,
              });

            if (error) {
              logger.error(`  ✗ ${relativePath}: ${error.message}`);
              errorCount++;
            } else {
              logger.info(`  ✓ ${relativePath} → ${data.path}`);
              successCount++;
            }
          } catch (error) {
            logger.error(`  ✗ ${relativePath}: ${(error as Error).message}`);
            errorCount++;
          }
        }

        if (!dryRun) {
          logger.info("");
          logger.info(`Completed: ${successCount} succeeded, ${errorCount} failed`);
        }
      } catch (error) {
        logger.error("Error:", (error as Error).message);
        process.exit(1);
      }
    });

  // Download a file from a bucket
  program
    .command("bucket download", "Download a file from a bucket")
    .argument("<bucket-name>", "Name of the bucket")
    .argument("<remote-path>", "Remote path in bucket")
    .argument("<local-path>", "Local file path to save")
    .action(async ({ args, logger }) => {
      try {
        log("Downloading file from bucket: %s", args.bucketName);
        const supabase = getSupabaseClient();

        const { data, error } = await supabase.storage
          .from(args.bucketName as string)
          .download(args.remotePath as string);

        if (error) {
          logger.error("Error downloading file:", error.message);
          process.exit(1);
        }

        if (!data) {
          logger.error("No data received");
          process.exit(1);
        }

        const buffer = await data.arrayBuffer();
        await writeFile(args.localPath as string, Buffer.from(buffer));

        logger.info(`Successfully downloaded to: ${args.localPath}`);
      } catch (error) {
        logger.error("Error:", (error as Error).message);
        process.exit(1);
      }
    });

  // Get public URL for a file
  program
    .command("bucket url", "Get public URL for a file")
    .argument("<bucket-name>", "Name of the bucket")
    .argument("<remote-path>", "Remote path in bucket")
    .option("--signed", "Generate a signed URL", { default: false })
    .option(
      "--expires-in <seconds>",
      "Expiry time in seconds for signed URL",
      {
        default: 3600,
        validator: program.NUMBER,
      }
    )
    .action(async ({ args, options, logger }) => {
      try {
        log("Getting URL for file in bucket: %s", args.bucketName);
        const supabase = getSupabaseClient();

        if (options.signed) {
          const { data, error } = await supabase.storage
            .from(args.bucketName as string)
            .createSignedUrl(args.remotePath as string, options.expiresIn as number);

          if (error) {
            logger.error("Error generating signed URL:", error.message);
            process.exit(1);
          }

          logger.info(`Signed URL (expires in ${options.expiresIn}s):`);
          logger.info(data.signedUrl);
        } else {
          const { data } = supabase.storage
            .from(args.bucketName as string)
            .getPublicUrl(args.remotePath as string);

          logger.info("Public URL:");
          logger.info(data.publicUrl);
        }
      } catch (error) {
        logger.error("Error:", (error as Error).message);
        process.exit(1);
      }
    });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = readdirSync(dirPath);

  files.forEach((file) => {
    // Skip .DS_Store and other hidden system files
    if (file === '.DS_Store' || file.startsWith('._')) {
      return;
    }

    const filePath = join(dirPath, file);
    if (statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

