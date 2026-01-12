import type { Logger } from "@caporal/core";
import debug from "debug";
import { statSync, renameSync } from "fs";
import { join, basename, dirname } from "path";

const log = debug("blt:image:color");

export function imageColorHelp() {
    console.log("\nChange the base color of an image\n");
    console.log("Usage:");
    console.log("  blt image color <input> [options]\n");
    console.log("Options:");
    console.log("  -t, --to <color>        Target color (hex, rgb, or color name)");
    console.log("  -f, --from <color>      Source color to replace (hex, rgb, or color name)");
    console.log("                          If not specified, detects dominant color");
    console.log("  -o, --output <path>     Output file path (defaults to overwriting input)");
    console.log("  -q, --quality <quality> WebP quality (0-100)");
    console.log("  -z, --tolerance <num>   Color matching tolerance (0-100, default: 30)\n");
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

// Minimal interface for sharp (optional dependency, dynamically imported)
type SharpInstance = {
  (input?: string | Buffer, options?: { raw?: { width: number; height: number; channels: number } }): SharpPipeline;
};

type SharpPipeline = {
  raw(): SharpPipeline;
  webp(options?: { quality?: number; effort?: number }): SharpPipeline;
  metadata(): Promise<{ width?: number; height?: number; format?: string }>;
  toBuffer(options?: { resolveWithObject: true }): Promise<{ data: Buffer; info: { width: number; height: number; channels: number } }>;
  toFile(path: string): Promise<void>;
};

// entry point for the image color command
export async function imageColorCommand(
  args: { input?: string },
  options: {
    to?: string;
    from?: string;
    output?: string;
    quality?: number;
    tolerance?: number;
  },
  logger: Logger
) {
  try {
    const inputPath = args.input as string;
    const targetColor = ((options.to as string) || "").toLowerCase();
    const sourceColor = ((options.from as string) || "").toLowerCase();
    const outputPath = options.output as string;
    const quality = options.quality as number;
    const tolerance = options.tolerance as number;

    log("Changing color: %s", inputPath);

    if (!inputPath) {
      imageColorHelp();
      process.exit(1);
    }

    if (!targetColor) {
      logger.error("Target color is required. Use --to <color> to specify the target color.");
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

    // Validate tolerance
    if (tolerance < 0 || tolerance > 100) {
      logger.error("Tolerance must be between 0 and 100");
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
    const metadata = await (image as unknown as SharpPipeline).metadata();

    console.log(`  Original: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

    // Get image buffer for color analysis
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

    // Detect source color if not provided
    if (!sourceRgb) {
      console.log("  Detecting dominant color...");
      sourceRgb = detectDominantColor(data, info);
      console.log(`  Detected base color: rgb(${sourceRgb.r}, ${sourceRgb.g}, ${sourceRgb.b})`);
    } else {
      console.log(`  Using source color: rgb(${sourceRgb.r}, ${sourceRgb.g}, ${sourceRgb.b})`);
    }

    console.log(`  Target color: rgb(${targetRgb.r}, ${targetRgb.g}, ${targetRgb.b})`);

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

    console.log(`✓ Color changed: ${finalPath}`);
    console.log(`  Input:  ${(inputSize / 1024).toFixed(2)} KB`);
    console.log(`  Output: ${(outputSize / 1024).toFixed(2)} KB`);
  } catch (error) {
    logger.error("Error:", (error as Error).message);
    if ((error as Error).stack) {
      log("Stack trace: %s", (error as Error).stack);
    }
    process.exit(1);
  }
}
