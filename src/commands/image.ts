import type { Program } from "@caporal/core";
import debug from "debug";
import { readdirSync, statSync, renameSync } from "fs";
import { join, extname, basename, dirname } from "path";

const log = debug("blt:image");

export default function imageCommand(program: Program) {
  // Convert image to WebP
  program
    .command("image convert", "Convert image(s) to WebP format")
    .argument("<input>", "Input file or directory")
    .option("-o, --output <path>", "Output file or directory", {
      default: "",
    })
    .option("-q, --quality <quality>", "WebP quality (0-100)", {
      default: 80,
      validator: program.NUMBER,
    })
    .option("-r, --recursive", "Process directories recursively", {
      default: false,
    })
    .option("--overwrite", "Overwrite existing files", {
      default: false,
    })
    .action(async ({ args, options, logger }) => {
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
        } catch (error) {
          logger.error(`Input not found: ${inputPath}`);
          process.exit(1);
        }

        // Validate quality
        if (quality < 0 || quality > 100) {
          logger.error("Quality must be between 0 and 100");
          process.exit(1);
        }

        // Import sharp dynamically
        let sharp: any;
        try {
          sharp = (await import("sharp")).default;
        } catch (error) {
          logger.error("Sharp library not found. Install with: bun add sharp");
          process.exit(1);
        }

        if (isDirectory) {
          // Process directory
          const files = recursive
            ? getAllImageFiles(inputPath)
            : getImageFiles(inputPath);

          if (files.length === 0) {
            logger.info("No image files found");
            return;
          }

          logger.info(`Found ${files.length} image(s) to convert`);
          logger.info("");

          let successCount = 0;
          let errorCount = 0;
          let skippedCount = 0;

          for (const filePath of files) {
            const ext = extname(filePath).toLowerCase();
            if (ext === ".webp") {
              logger.info(`  ⊘ ${basename(filePath)} (already WebP)`);
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
                  logger.info(`  ⊘ ${basename(filePath)} (output exists, use --overwrite)`);
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

              logger.info(
                `  ✓ ${basename(filePath)} → ${basename(outputFilePath)} (${savings}% smaller)`
              );
              successCount++;
            } catch (error) {
              logger.error(`  ✗ ${basename(filePath)}: ${(error as Error).message}`);
              errorCount++;
            }
          }

          logger.info("");
          logger.info(
            `Completed: ${successCount} converted, ${skippedCount} skipped, ${errorCount} failed`
          );
        } else {
          // Process single file
          const ext = extname(inputPath).toLowerCase();
          
          if (ext === ".webp") {
            logger.info("Input is already a WebP file");
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

          logger.info(`✓ Converted: ${outputFilePath}`);
          logger.info(`  Input:  ${formatBytes(inputSize)}`);
          logger.info(`  Output: ${formatBytes(outputSize)}`);
          logger.info(`  Saved:  ${savings}%`);
        }
      } catch (error) {
        logger.error("Error:", (error as Error).message);
        process.exit(1);
      }
    });

  // Sharpen image edges
  program
    .command("image sharpen", "Sharpen image edges")
    .argument("<input>", "Input file or directory")
    .option("-o, --output <path>", "Output file or directory", {
      default: "",
    })
    .option("-s, --sigma <sigma>", "Sigma value for sharpening (0.3-1000, default: 1.0)", {
      default: 1.0,
      validator: program.NUMBER,
    })
    .option("-f, --flat <flat>", "Flat threshold (0-10000, default: 1.0)", {
      default: 1.0,
      validator: program.NUMBER,
    })
    .option("-j, --jagged <jagged>", "Jagged threshold (0-10000, default: 2.0)", {
      default: 2.0,
      validator: program.NUMBER,
    })
    .option("-r, --recursive", "Process directories recursively", {
      default: false,
    })
    .option("--overwrite", "Overwrite existing files", {
      default: false,
    })
    .action(async ({ args, options, logger }) => {
      try {
        const inputPath = args.input as string;
        const outputPath = options.output as string;
        const sigma = options.sigma as number;
        const flat = options.flat as number;
        const jagged = options.jagged as number;
        const recursive = options.recursive as boolean;
        const overwrite = options.overwrite as boolean;

        log("Sharpening image: %s", inputPath);

        // Check if input exists
        let isDirectory = false;
        try {
          const stat = statSync(inputPath);
          isDirectory = stat.isDirectory();
        } catch (error) {
          logger.error(`Input not found: ${inputPath}`);
          process.exit(1);
        }

        // Import sharp dynamically
        let sharp: any;
        try {
          sharp = (await import("sharp")).default;
        } catch (error) {
          logger.error("Sharp library not found. Install with: bun add sharp");
          process.exit(1);
        }

        const processImage = async (filePath: string): Promise<void> => {
          const ext = extname(filePath).toLowerCase();
          const isWebP = ext === ".webp";
          
          if (!isWebP && !isImageFile(filePath)) {
            logger.info(`  ⊘ ${basename(filePath)} (not a supported image)`);
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
              logger.info(`  ⊘ ${basename(filePath)} (output exists, use --overwrite)`);
              return;
            } catch {
              // File doesn't exist, proceed
            }
          }

          try {
            await sharp(filePath)
              .sharpen(sigma, flat, jagged)
              .toFile(outputFilePath);

            logger.info(`  ✓ ${basename(filePath)} → ${basename(outputFilePath)}`);
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
            logger.info("No image files found");
            return;
          }

          logger.info(`Found ${files.length} image(s) to sharpen`);
          logger.info("");

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

          logger.info("");
          logger.info(
            `Completed: ${successCount} sharpened, ${errorCount} failed`
          );
        } else {
          // Process single file
          await processImage(inputPath);
          logger.info(`✓ Sharpened: ${outputPath || inputPath}`);
        }
      } catch (error) {
        logger.error("Error:", (error as Error).message);
        process.exit(1);
      }
    });

  // Enhance avatar image for dark or light mode
  program
    .command("image enhance", "Enhance avatar image for dark or light mode")
    .argument("<input>", "Input image file path")
    .option("-m, --mode <mode>", "Enhancement mode: dark or light", {
      default: "dark",
      validator: ["dark", "light"],
    })
    .option("-o, --output <path>", "Output file path (defaults to overwriting input)", {
      default: "",
    })
    .option("-q, --quality <quality>", "WebP quality (0-100)", {
      default: 90,
      validator: program.NUMBER,
    })
    .action(async ({ args, options, logger }) => {
      try {
        const inputPath = args.input as string;
        const mode = (options.mode as string).toLowerCase();
        const outputPath = options.output as string;
        const quality = options.quality as number;

        log("Enhancing %s mode avatar: %s", mode, inputPath);

        // Check if input exists
        try {
          statSync(inputPath);
        } catch (error) {
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
        let sharp: any;
        try {
          sharp = (await import("sharp")).default;
        } catch (error) {
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
        const metadata = await image.metadata();

        logger.info(`  Original: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

        let pipeline = image;

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

        logger.info(`✓ Enhanced: ${finalPath}`);
        logger.info(`  Input:  ${(inputSize / 1024).toFixed(2)} KB`);
        logger.info(`  Output: ${(outputSize / 1024).toFixed(2)} KB`);
        logger.info(`  Mode: ${mode}`);
      } catch (error) {
        logger.error("Error:", (error as Error).message);
        if ((error as Error).stack) {
          log("Stack trace: %s", (error as Error).stack);
        }
        process.exit(1);
      }
    });

  // Change base color of image
  program
    .command("image color", "Change the base color of an image")
    .argument("<input>", "Input image file path")
    .option("-t, --to <color>", "Target color (hex, rgb, or color name)", {
      default: "",
    })
    .option("-f, --from <color>", "Source color to replace (hex, rgb, or color name). If not specified, detects dominant color", {
      default: "",
    })
    .option("-o, --output <path>", "Output file path (defaults to overwriting input)", {
      default: "",
    })
    .option("-q, --quality <quality>", "WebP quality (0-100)", {
      default: 90,
      validator: program.NUMBER,
    })
    .option("--tolerance <tolerance>", "Color matching tolerance (0-100, default: 30)", {
      default: 30,
      validator: program.NUMBER,
    })
    .action(async ({ args, options, logger }) => {
      try {
        const inputPath = args.input as string;
        const targetColor = (options.to as string).toLowerCase();
        const sourceColor = (options.from as string).toLowerCase();
        const outputPath = options.output as string;
        const quality = options.quality as number;
        const tolerance = options.tolerance as number;

        if (!targetColor) {
          logger.error("Target color is required. Use --to <color> to specify the target color.");
          process.exit(1);
        }

        log("Changing color: %s", inputPath);

        // Check if input exists
        try {
          statSync(inputPath);
        } catch (error) {
          logger.error(`Input file not found: ${inputPath}`);
          process.exit(1);
        }

        // Validate quality
        if (quality < 0 || quality > 100) {
          logger.error("Quality must be between 0 and 100");
          process.exit(1);
        }

        // Validate tolerance
        if (tolerance < 0 || tolerance > 100) {
          logger.error("Tolerance must be between 0 and 100");
          process.exit(1);
        }

        // Import sharp dynamically
        let sharp: any;
        try {
          sharp = (await import("sharp")).default;
        } catch (error) {
          logger.error("Sharp library not found. Install with: bun add sharp");
          process.exit(1);
        }

        // Parse colors
        const targetRgb = parseColor(targetColor);
        if (!targetRgb) {
          logger.error(`Invalid target color: ${targetColor}. Use hex (#FF0000), rgb (255,0,0), or color name (red).`);
          process.exit(1);
        }

        let sourceRgb: { r: number; g: number; b: number } | null = null;
        if (sourceColor) {
          sourceRgb = parseColor(sourceColor);
          if (!sourceRgb) {
            logger.error(`Invalid source color: ${sourceColor}. Use hex (#0000FF), rgb (0,0,255), or color name (blue).`);
            process.exit(1);
          }
        }

        // If output is same as input, use a temp file
        const isSameFile = !outputPath;
        const finalOutputPath = outputPath || inputPath;
        const tempPath = isSameFile
          ? join(dirname(inputPath), `.${basename(inputPath)}.tmp`)
          : finalOutputPath;

        const image = sharp(inputPath);
        const metadata = await image.metadata();

        logger.info(`  Original: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

        // Get image buffer for color analysis
        const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

        // Detect source color if not provided
        if (!sourceRgb) {
          logger.info("  Detecting dominant color...");
          sourceRgb = detectDominantColor(data, info);
          logger.info(`  Detected base color: rgb(${sourceRgb.r}, ${sourceRgb.g}, ${sourceRgb.b})`);
        } else {
          logger.info(`  Using source color: rgb(${sourceRgb.r}, ${sourceRgb.g}, ${sourceRgb.b})`);
        }

        logger.info(`  Target color: rgb(${targetRgb.r}, ${targetRgb.g}, ${targetRgb.b})`);

        // Replace colors in the image
        const replacedData = replaceColor(data, info, sourceRgb, targetRgb, tolerance);

        // Reconstruct image with new colors
        await sharp(replacedData, {
          raw: {
            width: info.width,
            height: info.height,
            channels: info.channels,
          },
        })
          .webp({
            quality,
            effort: 6,
          })
          .toFile(tempPath);

        // If same file, replace original with temp
        if (isSameFile) {
          renameSync(tempPath, inputPath);
        }

        const inputSize = statSync(inputPath).size;
        const finalPath = isSameFile ? inputPath : finalOutputPath;
        const outputSize = statSync(finalPath).size;

        logger.info(`✓ Color changed: ${finalPath}`);
        logger.info(`  Input:  ${(inputSize / 1024).toFixed(2)} KB`);
        logger.info(`  Output: ${(outputSize / 1024).toFixed(2)} KB`);
      } catch (error) {
        logger.error("Error:", (error as Error).message);
        if ((error as Error).stack) {
          log("Stack trace: %s", (error as Error).stack);
        }
        process.exit(1);
      }
    });
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

// Color helper functions
function parseColor(color: string): { r: number; g: number; b: number } | null {
  const normalized = color.trim().toLowerCase();

  // Named colors
  const namedColors: Record<string, { r: number; g: number; b: number }> = {
    red: { r: 255, g: 0, b: 0 },
    green: { r: 0, g: 255, b: 0 },
    blue: { r: 0, g: 0, b: 255 },
    yellow: { r: 255, g: 255, b: 0 },
    cyan: { r: 0, g: 255, b: 255 },
    magenta: { r: 255, g: 0, b: 255 },
    orange: { r: 255, g: 165, b: 0 },
    purple: { r: 128, g: 0, b: 128 },
    pink: { r: 255, g: 192, b: 203 },
    white: { r: 255, g: 255, b: 255 },
    black: { r: 0, g: 0, b: 0 },
    gray: { r: 128, g: 128, b: 128 },
    grey: { r: 128, g: 128, b: 128 },
  };

  if (namedColors[normalized]) {
    return namedColors[normalized];
  }

  // Hex color (#FF0000 or FF0000)
  if (normalized.startsWith("#") || /^[0-9a-f]{6}$/i.test(normalized)) {
    const hex = normalized.startsWith("#") ? normalized.slice(1) : normalized;
    if (/^[0-9a-f]{6}$/i.test(hex)) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
  }

  // RGB format (255,0,0 or rgb(255,0,0))
  const rgbMatch = normalized.match(/(?:rgb\()?(\d+),?\s*(\d+),?\s*(\d+)\)?/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    };
  }

  return null;
}

function detectDominantColor(
  data: Buffer,
  info: { width: number; height: number; channels: number }
): { r: number; g: number; b: number } {
  const colorCounts: Map<string, number> = new Map();
  const sampleSize = Math.min(10000, data.length); // Sample up to 10k pixels for performance
  const step = Math.max(1, Math.floor(data.length / sampleSize));

  for (let i = 0; i < data.length; i += step * info.channels) {
    if (info.channels >= 3) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Quantize colors to reduce noise (group similar colors)
      const quantizedR = Math.floor(r / 16) * 16;
      const quantizedG = Math.floor(g / 16) * 16;
      const quantizedB = Math.floor(b / 16) * 16;
      
      const key = `${quantizedR},${quantizedG},${quantizedB}`;
      colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
    }
  }

  // Find most common color
  let maxCount = 0;
  let dominantKey = "0,0,0";
  for (const [key, count] of colorCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      dominantKey = key;
    }
  }

  const [r, g, b] = dominantKey.split(",").map(Number);
  return { r, g, b };
}

function colorDistance(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number }
): number {
  // Euclidean distance in RGB space
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function replaceColor(
  data: Buffer,
  info: { width: number; height: number; channels: number },
  sourceColor: { r: number; g: number; b: number },
  targetColor: { r: number; g: number; b: number },
  tolerance: number
): Buffer {
  const output = Buffer.from(data);
  const maxDistance = (tolerance / 100) * 441; // Max RGB distance is ~441 (sqrt(255^2 * 3))

  for (let i = 0; i < data.length; i += info.channels) {
    if (info.channels >= 3) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const pixelColor = { r, g, b };
      const distance = colorDistance(pixelColor, sourceColor);

      if (distance <= maxDistance) {
        // Calculate replacement strength based on distance
        const strength = 1 - distance / maxDistance;
        
        // Blend between original and target based on distance
        output[i] = Math.round(r + (targetColor.r - r) * strength);
        output[i + 1] = Math.round(g + (targetColor.g - g) * strength);
        output[i + 2] = Math.round(b + (targetColor.b - b) * strength);
      }
    }
  }

  return output;
}
