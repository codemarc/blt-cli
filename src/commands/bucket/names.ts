import type { Logger } from "@caporal/core";
import debug from "debug";
import { getSupabaseClient } from "../../utils/supabase";

const log = debug("blt:bucket");

export async function listBucketNames(
	options: { format: string },
	logger: Logger,
): Promise<void> {
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
}
