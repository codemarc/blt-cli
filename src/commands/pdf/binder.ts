import type { Logger } from "@caporal/core";
import debug from "debug";
import { readdirSync, statSync, existsSync } from "fs";
import { join, extname, basename } from "path";

const log = debug("blt:pdf:binder");

// Helper functions
function isPdfFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return ext === ".pdf";
}

function getPdfFiles(dirPath: string): string[] {
  const files = readdirSync(dirPath);
  return files
    .filter((file) => file !== '.DS_Store' && !file.startsWith('._'))
    .map((file) => join(dirPath, file))
    .filter((filePath) => {
      try {
        return statSync(filePath).isFile() && isPdfFile(filePath);
      } catch {
        return false;
      }
    })
    .sort(); // Sort alphabetically
}

function getAllPdfFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = readdirSync(dirPath);

  files.forEach((file) => {
    // Skip .DS_Store and other hidden system files
    if (file === '.DS_Store' || file.startsWith('._')) {
      return;
    }

    const filePath = join(dirPath, file);
    try {
      if (statSync(filePath).isDirectory()) {
        arrayOfFiles = getAllPdfFiles(filePath, arrayOfFiles);
      } else if (isPdfFile(filePath)) {
        arrayOfFiles.push(filePath);
      }
    } catch {
      // Skip files we can't access
    }
  });

  return arrayOfFiles.sort(); // Sort alphabetically
}

function collectPdfFiles(inputs: string[], recursive: boolean): string[] {
  const pdfFiles: string[] = [];

  for (const input of inputs) {
    try {
      const stat = statSync(input);
      
      if (stat.isDirectory()) {
        const files = recursive ? getAllPdfFiles(input) : getPdfFiles(input);
        pdfFiles.push(...files);
      } else if (stat.isFile() && isPdfFile(input)) {
        pdfFiles.push(input);
      } else if (stat.isFile()) {
        console.log(`⊘ Skipping non-PDF file: ${basename(input)}`);
      }
    } catch (error) {
      console.log(`⊘ Skipping invalid path: ${input}`);
    }
  }

  return pdfFiles;
}

// Entry point for the PDF binder command
export async function pdfBinderCommand(
  args: { output?: string; inputs?: string[] },
  options: {
    recursive?: boolean;
    overwrite?: boolean;
  },
  logger: Logger
) {
  try {
    // Caporal bundles all arguments when using variadic syntax
    // Extract output (first) and inputs (rest) from the args
    let outputPath: string;
    let inputs: string[];
    
    if (Array.isArray(args.output)) {
      // All arguments are in the output field as an array
      [outputPath, ...inputs] = args.output;
    } else {
      // Fallback to standard parsing
      outputPath = args.output as string;
      inputs = args.inputs as string[] || [];
    }

    const recursive = options.recursive as boolean;
    const overwrite = options.overwrite as boolean;

    log("Binding PDFs to: %s", outputPath);

    // Check if inputs are provided
    if (!inputs || inputs.length === 0) {
      logger.error("At least one input file or directory is required");
      process.exit(1);
    }

    // Check if output file already exists
    if (!overwrite && existsSync(outputPath)) {
      logger.error(`Output file already exists: ${outputPath}. Use --overwrite to replace it.`);
      process.exit(1);
    }

    // Collect all PDF files from inputs
    const pdfFiles = collectPdfFiles(inputs, recursive);

    if (pdfFiles.length === 0) {
      logger.error("No PDF files found in the specified inputs");
      process.exit(1);
    }

    console.log(`Found ${pdfFiles.length} PDF file(s) to combine:\n`);
    for (const file of pdfFiles) {
      console.log(`  • ${file}`);
    }
    console.log("");

    // Import pdf-lib dynamically
    let PDFDocument: typeof import("pdf-lib").PDFDocument;
    try {
      const pdfLib = await import("pdf-lib");
      PDFDocument = pdfLib.PDFDocument;
    } catch {
      logger.error("pdf-lib library not found. Install with: bun add pdf-lib");
      process.exit(1);
    }

    // Create a new PDF document
    const mergedPdf = await PDFDocument.create();
    let totalPages = 0;

    // Process each PDF file
    for (const filePath of pdfFiles) {
      try {
        const pdfBytes = await Bun.file(filePath).arrayBuffer();
        const pdf = await PDFDocument.load(new Uint8Array(pdfBytes));
        
        const pageCount = pdf.getPageCount();
        const copiedPages = await mergedPdf.copyPages(pdf, Array.from({ length: pageCount }, (_, i) => i));
        
        for (const page of copiedPages) {
          mergedPdf.addPage(page);
        }
        
        totalPages += pageCount;
        console.log(`  ✓ Added ${basename(filePath)} (${pageCount} page${pageCount !== 1 ? 's' : ''})`);
      } catch (error) {
        logger.error(`  ✗ Failed to process ${basename(filePath)}: ${(error as Error).message}`);
      }
    }

    // Save the merged PDF
    const mergedPdfBytes = await mergedPdf.save();
    await Bun.write(outputPath, mergedPdfBytes);

    console.log("");
    console.log(`✓ Successfully created ${outputPath}`);
    console.log(`  Total: ${totalPages} page${totalPages !== 1 ? 's' : ''} from ${pdfFiles.length} file${pdfFiles.length !== 1 ? 's' : ''}`);
  } catch (error) {
    logger.error("Error:", (error as Error).message);
    process.exit(1);
  }
}
