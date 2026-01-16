import type { Logger } from "@caporal/core";
import debug from "debug";
import { getSupabaseClient } from "../../utils/supabase";

const log = debug("blt:bucket");

export async function downloadFile(
	args: { bucketName: string; remotePath: string; localPath: string },
	logger: Logger,
): Promise<void> {
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
		await Bun.write(args.localPath as string, buffer);

		logger.info(`Successfully downloaded to: ${args.localPath}`);
	} catch (error) {
		logger.error("Error:", (error as Error).message);
		process.exit(1);
	}
}
