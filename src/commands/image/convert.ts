import type { Logger } from "@caporal/core";
import debug from "debug";
import { readdirSync, statSync } from "fs";
import { join, extname, basename } from "path";

const log = debug("blt:image:convert");

export function imageConvertHelp(logger: Logger) {
    console.log("\nConvert images to WebP format\n");
    console.log("Usage:");
    console.log("  blt image convert <input> [options]\n");
    console.log("Options:");
    console.log("  -o, --output <path>      Output file or directory");
    console.log("  -q, --quality <quality>  WebP quality (0-100)");
    console.log("  -r, --recursive          Process directories recursively");
    console.log("      --overwrite          Overwrite existing files\n");
}

// Helper functions
function isImageFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return [".png", ".jpg", ".jpeg", ".gif", ".tiff", ".tif", ".bmp"].includes(ext);
}

function getImageFiles(dirPath: string): string[] {
  const files = readdirSync(dirPath);
  return files
    .filter((file) => file !== '.DS_Store' && !file.startsWith('._'))
    .map((file) => join(dirPath, file))
    .filter((filePath) => {
      try {
        return statSync(filePath).isFile() && isImageFile(filePath);
      } catch {
        return false;
      }
    });
}

function getAllImageFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = readdirSync(dirPath);

  files.forEach((file) => {
    // Skip .DS_Store and other hidden system files
    if (file === '.DS_Store' || file.startsWith('._')) {
      return;
    }

    const filePath = join(dirPath, file);
    try {
      if (statSync(filePath).isDirectory()) {
        arrayOfFiles = getAllImageFiles(filePath, arrayOfFiles);
      } else if (isImageFile(filePath)) {
        arrayOfFiles.push(filePath);
      }
    } catch {
      // Skip files we can't access
    }
  });

  return arrayOfFiles;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}


// entry point for the image convert command
export async function imageConvertCommand(
  args: { input?: string },
  options: {
    output?: string;
    quality?: number;
    recursive?: boolean;
    overwrite?: boolean;
  },
  logger: Logger
) {
  try {
    const inputPath = args.input as string;
    const outputPath = options.output as string;
    const quality = options.quality as number;
    const recursive = options.recursive as boolean;
    const overwrite = options.overwrite as boolean;

    log("Converting to WebP: %s", inputPath);

    // Check if input exists
    let isDirectory = false;
    try {
      const stat = statSync(inputPath);
      isDirectory = stat.isDirectory();
    } catch {
      logger.error(`Input not found: ${inputPath}`);
      process.exit(1);
    }

    // Validate quality
    if (quality < 0 || quality > 100) {
      logger.error("Quality must be between 0 and 100");
      process.exit(1);
    }

    // Import sharp dynamically
    type SharpInstance = {
      (input?: string | Buffer): SharpPipeline;
    };
    type SharpPipeline = {
      webp(options: { quality: number }): SharpPipeline;
      toFile(path: string): Promise<void>;
    };
    
    let sharp: SharpInstance;
    try {
      const sharpModule = await import("sharp");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sharp = sharpModule.default as unknown as SharpInstance;
    } catch {
      logger.error("Sharp library not found. Install with: bun add sharp");
      process.exit(1);
    }

    if (isDirectory) {
      // Process directory
      const files = recursive
        ? getAllImageFiles(inputPath)
        : getImageFiles(inputPath);

      if (files.length === 0) {
        console.log("No image files found");
        return;
      }

      console.log(`Found ${files.length} image(s) to convert`);
      console.log("");

      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;

      for (const filePath of files) {
        const ext = extname(filePath).toLowerCase();
        if (ext === ".webp") {
          console.log(`  ⊘ ${basename(filePath)} (already WebP)`);
          skippedCount++;
          continue;
        }

        try {
          const outputFilePath = outputPath
            ? join(
                outputPath,
                basename(filePath, ext) + ".webp"
              )
            : filePath.replace(ext, ".webp");

          // Check if output exists
          if (!overwrite) {
            try {
              statSync(outputFilePath);
              console.log(`  ⊘ ${basename(filePath)} (output exists, use --overwrite)`);
              skippedCount++;
              continue;
            } catch {
              // File doesn't exist, proceed
            }
          }

          await sharp(filePath).webp({ quality }).toFile(outputFilePath);

          const inputSize = statSync(filePath).size;
          const outputSize = statSync(outputFilePath).size;
          const savings = ((1 - outputSize / inputSize) * 100).toFixed(1);

          console.log(
            `  ✓ ${basename(filePath)} → ${basename(outputFilePath)} (${savings}% smaller)`
          );
          successCount++;
        } catch (error) {
          logger.error(`  ✗ ${basename(filePath)}: ${(error as Error).message}`);
          errorCount++;
        }
      }

      console.log("");
      console.log(
        `Completed: ${successCount} converted, ${skippedCount} skipped, ${errorCount} failed`
      );
    } else {
      // Process single file
      const ext = extname(inputPath).toLowerCase();
      
      if (ext === ".webp") {
        console.log("Input is already a WebP file");
        return;
      }

      if (!isImageFile(inputPath)) {
        logger.error("Input is not a supported image file (png, jpg, jpeg, gif, tiff, bmp)");
        process.exit(1);
      }

      const outputFilePath = outputPath
        ? outputPath
        : inputPath.replace(ext, ".webp");

      // Check if output exists
      if (!overwrite) {
        try {
          statSync(outputFilePath);
          logger.error(`Output file exists: ${outputFilePath}. Use --overwrite to replace it.`);
          process.exit(1);
        } catch {
          // File doesn't exist, proceed
        }
      }

      await sharp(inputPath).webp({ quality }).toFile(outputFilePath);

      const inputSize = statSync(inputPath).size;
      const outputSize = statSync(outputFilePath).size;
      const savings = ((1 - outputSize / inputSize) * 100).toFixed(1);

      console.log(`✓ Converted: ${outputFilePath}`);
      console.log(`  Input:  ${formatBytes(inputSize)}`);
      console.log(`  Output: ${formatBytes(outputSize)}`);
      console.log(`  Saved:  ${savings}%`);
    }
  } catch (error) {
    logger.error("Error:", (error as Error).message);
    process.exit(1);
  }
}