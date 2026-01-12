import type { Logger } from "@caporal/core";
import debug from "debug";
import { readdirSync, statSync } from "fs";
import { join, extname, basename } from "path";

const log = debug("blt:image:sharpen");

export function imageSharpenHelp() {
    console.log("\nSharpen image edges\n");
    console.log("Usage:");
    console.log("  blt image sharpen <input> [options]\n");
    console.log("Options:");
    console.log("  -o, --output <path>     Output file or directory");
    console.log("  -s, --sigma <sigma>      Sigma value for sharpening (0.3-1000, default: 1.0)");
    console.log("  -f, --flat <flat>        Flat threshold (0-10000, default: 1.0)");
    console.log("  -j, --jagged <jagged>    Jagged threshold (0-10000, default: 2.0)");
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

// Minimal interface for sharp (optional dependency, dynamically imported)
type SharpInstance = {
  (input?: string | Buffer): SharpPipeline;
};

type SharpPipeline = {
  sharpen(sigma?: number, flat?: number, jagged?: number): SharpPipeline;
  sharpen(options?: { sigma?: number; flat?: number; jagged?: number }): SharpPipeline;
  toFile(path: string): Promise<void>;
};

// entry point for the image sharpen command
export async function imageSharpenCommand(
  args: { input?: string },
  options: {
    output?: string;
    sigma?: number;
    flat?: number;
    jagged?: number;
    recursive?: boolean;
    overwrite?: boolean;
  },
  logger: Logger
) {
  try {
    const inputPath = args.input as string;
    const outputPath = options.output as string;
    const sigma = options.sigma as number;
    const flat = options.flat as number;
    const jagged = options.jagged as number;
    const recursive = options.recursive as boolean;
    const overwrite = options.overwrite as boolean;

    log("Sharpening image: %s", inputPath);

    if (!inputPath) {
      imageSharpenHelp();
      process.exit(1);
    }

    // Check if input exists
    let isDirectory = false;
    try {
      const stat = statSync(inputPath);
      isDirectory = stat.isDirectory();
    } catch {
      logger.error(`Input not found: ${inputPath}`);
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

    const processImage = async (filePath: string): Promise<void> => {
      const ext = extname(filePath).toLowerCase();
      const isWebP = ext === ".webp";
      
      if (!isWebP && !isImageFile(filePath)) {
        console.log(`  ⊘ ${basename(filePath)} (not a supported image)`);
        return;
      }

      const outputFilePath = outputPath
        ? (isDirectory 
            ? join(outputPath, basename(filePath))
            : outputPath)
        : filePath;

      // Check if output exists
      if (!overwrite && filePath !== outputFilePath) {
        try {
          statSync(outputFilePath);
          console.log(`  ⊘ ${basename(filePath)} (output exists, use --overwrite)`);
          return;
        } catch {
          // File doesn't exist, proceed
        }
      }

      try {
        await sharp(filePath)
          .sharpen(sigma, flat, jagged)
          .toFile(outputFilePath);

        console.log(`  ✓ ${basename(filePath)} → ${basename(outputFilePath)}`);
      } catch (error) {
        logger.error(`  ✗ ${basename(filePath)}: ${(error as Error).message}`);
        throw error;
      }
    };

    if (isDirectory) {
      // Process directory
      const files = recursive
        ? getAllImageFiles(inputPath)
        : [...getImageFiles(inputPath), ...readdirSync(inputPath)
            .filter((file) => file.endsWith(".webp"))
            .map((file) => join(inputPath, file))];

      if (files.length === 0) {
        console.log("No image files found");
        return;
      }

      console.log(`Found ${files.length} image(s) to sharpen`);
      console.log("");

      let successCount = 0;
      let errorCount = 0;

      for (const filePath of files) {
        try {
          await processImage(filePath);
          successCount++;
        } catch {
          errorCount++;
        }
      }

      console.log("");
      console.log(
        `Completed: ${successCount} sharpened, ${errorCount} failed`
      );
    } else {
      // Process single file
      await processImage(inputPath);
      console.log(`✓ Sharpened: ${outputPath || inputPath}`);
    }
  } catch (error) {
    logger.error("Error:", (error as Error).message);
    process.exit(1);
  }
}
