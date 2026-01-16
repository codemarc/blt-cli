import type { Logger } from "@caporal/core";
import debug from "debug";
import { getSupabaseClient } from "../../utils/supabase";

const log = debug("blt:bucket");

export async function getFileUrl(
	args: { bucketName: string; remotePath: string },
	options: { signed: boolean; expiresIn: number },
	logger: Logger,
): Promise<void> {
	try {
		log("Getting URL for file in bucket: %s", args.bucketName);
		const supabase = getSupabaseClient();

		if (options.signed) {
			const { data, error } = await supabase.storage
				.from(args.bucketName as string)
				.createSignedUrl(
					args.remotePath as string,
					options.expiresIn as number,
				);

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
}
