import type { Program } from "@caporal/core";
import { listBucketNames } from "./bucket/names";
import { listBucketFiles } from "./bucket/list";
import { uploadFile } from "./bucket/upload";
import { uploadFolder } from "./bucket/upload-folder";
import { downloadFile } from "./bucket/download";
import { getFileUrl } from "./bucket/url";

/**
 * Register bucket commands with the CLI program
 */
export default function bucketCommand(program: Program) {
	// Main bucket command - shows help for subcommands
	const bucketHelpText = `
bucket management utilities

Usage:
  blt bucket <operation>

Available operations:
  names         List all bucket names
  list          List files in a bucket
  upload        Upload a file to a bucket
  upload-folder Upload all files in a folder to a bucket
  download      Download a file from a bucket
  url           Get public or signed URL for a file

Run 'blt bucket <operation> --help' for more information on a specific command.
`;

	program
		.command("bucket", "supabase storage buckets")
		.help(bucketHelpText)
		.action(() => {
			console.log(bucketHelpText);
		});

	// List all buckets
	program
		.command("bucket names", "List all bucket names")
		.hide()
		.option("-f, --format <format>", "Output format: table or json", {
			default: "table",
			validator: ["table", "json"],
		})
		.action(async ({ options, logger }) => {
			await listBucketNames({ format: options.format as string }, logger);
		});

	// List files in a bucket
	program
		.command("bucket list", "List files in a bucket")
		.hide()
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
			await listBucketFiles({ bucketName: args.bucketName as string }, { prefix: options.prefix as string, limit: options.limit as number, format: options.format as string }, logger);
		});

	// Upload a file to a bucket
	program
		.command("bucket upload", "Upload a file to a bucket")
		.hide()
		.argument("<bucket-name>", "Name of the bucket")
		.argument("<local-path>", "Local file path")
		.argument("<remote-path>", "Remote path in bucket")
		.option("--upsert", "Overwrite if file exists", { default: false })
		.action(async ({ args, options, logger }) => {
			await uploadFile(
				{
					bucketName: args.bucketName as string,
					localPath: args.localPath as string,
					remotePath: args.remotePath as string,
				},
				{ upsert: options.upsert as boolean },
				logger,
			);
		});

	// Upload all files in a folder to a bucket
	program
		.command("bucket upload-folder", "Upload all files in a folder to a bucket")
		.hide()
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
			await uploadFolder(
				{
					bucketName: args.bucketName as string,
					localFolder: args.localFolder as string,
				},
				{
					remotePrefix: options.remotePrefix as string,
					upsert: options.upsert as boolean,
					dryRun: options.dryRun as boolean,
				},
				logger,
			);
		});

	// Download a file from a bucket
	program
		.command("bucket download", "Download a file from a bucket")
		.hide()
		.argument("<bucket-name>", "Name of the bucket")
		.argument("<remote-path>", "Remote path in bucket")
		.argument("<local-path>", "Local file path to save")
		.action(async ({ args, logger }) => {
			await downloadFile({ bucketName: args.bucketName as string, remotePath: args.remotePath as string, localPath: args.localPath as string }, logger);
		});

	// Get public URL for a file
	program
		.command("bucket url", "Get public URL for a file")
		.hide()
		.argument("<bucket-name>", "Name of the bucket")
		.argument("<remote-path>", "Remote path in bucket")
		.option("--signed", "Generate a signed URL", { default: false })
		.option("--expires-in <seconds>", "Expiry time in seconds for signed URL", {
			default: 3600,
			validator: program.NUMBER,
		})
		.action(async ({ args, options, logger }) => {
			await getFileUrl({ bucketName: args.bucketName as string, remotePath: args.remotePath as string }, { signed: options.signed as boolean, expiresIn: options.expiresIn as number }, logger);
		});
}
