import type { Logger } from "@caporal/core";
import debug from "debug";
import { statSync } from "fs";
import { relative } from "path";
import { getSupabaseClient } from "../../utils/supabase";
import { getAllFiles } from "./utils";

const log = debug("blt:bucket");

export async function uploadFolder(
	args: { bucketName: string; localFolder: string },
	options: { remotePrefix: string; upsert: boolean; dryRun: boolean },
	logger: Logger,
): Promise<void> {
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
				const file = Bun.file(filePath);
				const fileBuffer = await file.arrayBuffer();

				const { data, error } = await supabase.storage
					.from(bucketName)
					.upload(remotePath, fileBuffer, {
						upsert,
						contentType: file.type,
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
			logger.info(
				`Completed: ${successCount} succeeded, ${errorCount} failed`,
			);
		}
	} catch (error) {
		logger.error("Error:", (error as Error).message);
		process.exit(1);
	}
}
