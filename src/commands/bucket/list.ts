import type { Logger } from "@caporal/core";
import debug from "debug";
import { getSupabaseClient } from "../../utils/supabase";
import { formatBytes } from "./utils";

const log = debug("blt:bucket");

export async function listBucketFiles(
	args: { bucketName: string },
	options: { prefix: string; limit: number; format: string },
	logger: Logger,
): Promise<void> {
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
				console.log(
					JSON.stringify({ files: [], count: 0, totalSize: 0 }, null, 2),
				);
			} else {
				logger.info("No files found");
			}
			return;
		}

		const totalSize = data.reduce(
			(acc, file) => acc + (file.metadata?.size || 0),
			0,
		);

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
}
