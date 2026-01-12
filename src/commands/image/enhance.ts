import type { Logger } from "@caporal/core";
import debug from "debug";
import { statSync, renameSync } from "fs";
import { join, basename, dirname } from "path";

const log = debug("blt:image:enhance");

export function imageEnhanceHelp() {
    console.log("\nEnhance avatar image for dark or light mode\n");
    console.log("Usage:");
    console.log("  blt image enhance <input> [options]\n");
    console.log("Options:");
    console.log("  -m, --mode <mode>      Enhancement mode: dark or light");
    console.log("  -o, --output <path>    Output file path (defaults to overwriting input)");
    console.log("  -q, --quality <quality> WebP quality (0-100)\n");
}

// Minimal interface for sharp (optional dependency, dynamically imported)
type SharpInstance = {
  (input?: string | Buffer): SharpPipeline;
};

type SharpPipeline = {
  modulate(options: { brightness?: number; saturation?: number; hue?: number }): SharpPipeline;
  gamma(value: number): SharpPipeline;
  normalise(): SharpPipeline;
  sharpen(options?: { sigma?: number; flat?: number; jagged?: number }): SharpPipeline;
  webp(options?: { quality?: number; effort?: number }): SharpPipeline;
  metadata(): Promise<{ width?: number; height?: number; format?: string }>;
  toFile(path: string): Promise<void>;
};

// entry point for the image enhance command
export async function imageEnhanceCommand(
  args: { input?: string },
  options: {
    mode?: string;
    output?: string;
    quality?: number;
  },
  logger: Logger
) {
  try {
    const inputPath = args.input as string;
    const mode = ((options.mode as string) || "dark").toLowerCase();
    const outputPath = options.output as string;
    const quality = options.quality as number;

    log("Enhancing %s mode avatar: %s", mode, inputPath);

    if (!inputPath) {
      imageEnhanceHelp();
      process.exit(1);
    }

    // Check if input exists
    try {
      statSync(inputPath);
    } catch {
      logger.error(`Input file not found: ${inputPath}`);
      process.exit(1);
    }

    // Validate quality
    if (quality < 0 || quality > 100) {
      logger.error("Quality must be between 0 and 100");
      process.exit(1);
    }

    // Validate mode
    if (mode !== "dark" && mode !== "light") {
      logger.error("Mode must be 'dark' or 'light'");
      process.exit(1);
    }

    // Import sharp dynamically
    let sharp: SharpInstance;
    try {
      const sharpModule = await import("sharp");
      sharp = sharpModule.default as unknown as SharpInstance;
    } catch {
      logger.error("Sharp library not found. Install with: bun add sharp");
      process.exit(1);
    }

    // If output is same as input, use a temp file
    const isSameFile = !outputPath;
    const finalOutputPath = outputPath || inputPath;
    const tempPath = isSameFile
      ? join(dirname(inputPath), `.${basename(inputPath)}.tmp`)
      : finalOutputPath;

    const image = sharp(inputPath);
    const metadata = await (image as unknown as SharpPipeline).metadata();

    console.log(`  Original: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

    let pipeline: SharpPipeline;

    if (mode === "dark") {
      // Make dark mode image really pop:
      // - Increase contrast significantly
      // - Boost saturation for vibrant colors
      // - Increase brightness slightly
      // - Sharpen edges
      // - Add a subtle glow effect with gamma correction
      pipeline = image
        .modulate({
          brightness: 1.15, // Slight brightness boost
          saturation: 1.4, // Much more vibrant colors
          hue: 0,
        })
        .gamma(1.1) // Slight gamma boost for glow
        .normalise() // Normalize to full dynamic range
        .sharpen({
          sigma: 1.2,
          flat: 1.0,
          jagged: 2.5,
        })
        .webp({
          quality,
          effort: 6,
        });
    } else {
      // Create better light mode version:
      // - Slightly increase contrast but keep it soft
      // - Reduce saturation slightly for a cleaner look
      // - Ensure good brightness
      // - Gentle sharpening
      pipeline = image
        .modulate({
          brightness: 1.05, // Subtle brightness
          saturation: 0.85, // Slightly desaturated for clean look
          hue: 0,
        })
        .gamma(1.0) // No gamma change (keep it natural)
        .normalise() // Normalize to full dynamic range
        .sharpen({
          sigma: 0.8,
          flat: 1.0,
          jagged: 1.5,
        })
        .webp({
          quality,
          effort: 6,
        });
    }

    await pipeline.toFile(tempPath);

    // If same file, replace original with temp
    if (isSameFile) {
      renameSync(tempPath, inputPath);
    }

    const inputSize = statSync(inputPath).size;
    const finalPath = isSameFile ? inputPath : finalOutputPath;
    const outputSize = statSync(finalPath).size;

    console.log(`✓ Enhanced: ${finalPath}`);
    console.log(`  Input:  ${(inputSize / 1024).toFixed(2)} KB`);
    console.log(`  Output: ${(outputSize / 1024).toFixed(2)} KB`);
    console.log(`  Mode: ${mode}`);
  } catch (error) {
    logger.error("Error:", (error as Error).message);
    if ((error as Error).stack) {
      log("Stack trace: %s", (error as Error).stack);
    }
    process.exit(1);
  }
}
