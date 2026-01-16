import type { Logger } from "@caporal/core";
import debug from "debug";
import { getSupabaseClient } from "../../utils/supabase";

const log = debug("blt:bucket");

export async function uploadFile(
	args: { bucketName: string; localPath: string; remotePath: string },
	options: { upsert: boolean },
	logger: Logger,
): Promise<void> {
	try {
		log("Uploading file to bucket: %s", args.bucketName);
		const supabase = getSupabaseClient();

		const file = Bun.file(args.localPath as string);
		const exists = await file.exists();

		if (!exists) {
			logger.error(`File not found: ${args.localPath}`);
			process.exit(1);
		}

		const fileBuffer = await file.arrayBuffer();
		const { data, error } = await supabase.storage
			.from(args.bucketName as string)
			.upload(args.remotePath as string, fileBuffer, {
				upsert: options.upsert as boolean,
				contentType: file.type,
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
}
