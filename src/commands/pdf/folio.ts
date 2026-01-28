import type { Logger } from "@caporal/core";
import debug from "debug";
import { readdirSync, statSync, existsSync } from "fs";
import { join, extname, basename } from "path";

const log = debug("blt:pdf:folio");

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

// Entry point for the PDF folio command
export async function pdfFolioCommand(
  args: { output?: string; inputs?: string[] },
  options: {
    recursive?: boolean;
    overwrite?: boolean;
    noToc?: boolean;
    startPage?: number;
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
    const noToc = options.noToc as boolean;
    const startPage = options.startPage as number;

    log("Creating folio PDF: %s", outputPath);

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
    let StandardFonts: typeof import("pdf-lib").StandardFonts;
    let rgb: typeof import("pdf-lib").rgb;
    
    try {
      const pdfLib = await import("pdf-lib");
      PDFDocument = pdfLib.PDFDocument;
      StandardFonts = pdfLib.StandardFonts;
      rgb = pdfLib.rgb;
    } catch {
      logger.error("pdf-lib library not found. Install with: bun add pdf-lib");
      process.exit(1);
    }

    // Create a new PDF document
    const mergedPdf = await PDFDocument.create();
    const font = await mergedPdf.embedFont(StandardFonts.Helvetica);
    const boldFont = await mergedPdf.embedFont(StandardFonts.HelveticaBold);

    // Track TOC entries
    const tocEntries: Array<{ title: string; page: number; pageCount: number }> = [];
    let currentPageNumber = startPage;

    // Process each PDF file
    for (const filePath of pdfFiles) {
      try {
        const pdfBytes = await Bun.file(filePath).arrayBuffer();
        const pdf = await PDFDocument.load(new Uint8Array(pdfBytes));
        
        const pageCount = pdf.getPageCount();
        const startPageForFile = currentPageNumber;
        const copiedPages = await mergedPdf.copyPages(pdf, Array.from({ length: pageCount }, (_, i) => i));
        
        // Add pages and page numbers
        for (const page of copiedPages) {
          const addedPage = mergedPdf.addPage(page);
          
          // Add page number at the bottom center
          const { width, height } = addedPage.getSize();
          addedPage.drawText(`${currentPageNumber}`, {
            x: width / 2 - 10,
            y: 20,
            size: 10,
            color: rgb(0.5, 0.5, 0.5),
          });
          
          currentPageNumber++;
        }
        
        // Add to TOC
        tocEntries.push({
          title: basename(filePath, '.pdf'),
          page: startPageForFile,
          pageCount: pageCount,
        });
        
        console.log(`  ✓ Added ${basename(filePath)} (${pageCount} page${pageCount !== 1 ? 's' : ''}, starting at page ${startPageForFile})`);
      } catch (error) {
        logger.error(`  ✗ Failed to process ${basename(filePath)}: ${(error as Error).message}`);
      }
    }

    // Add TOC at the beginning if requested
    if (!noToc && tocEntries.length > 0) {
      console.log("");
      console.log("Adding table of contents...");
      
      // Calculate how many TOC pages we need (roughly 40 entries per page)
      const entriesPerPage = 40;
      const tocPageCount = Math.ceil(tocEntries.length / entriesPerPage);
      
      for (let tocPageIndex = 0; tocPageIndex < tocPageCount; tocPageIndex++) {
        const tocPage = mergedPdf.addPage([612, 792]); // US Letter size
        const startIndex = tocPageIndex * entriesPerPage;
        const endIndex = Math.min(startIndex + entriesPerPage, tocEntries.length);
        
        let yPosition = 750;
        
        // Title on first page only
        if (tocPageIndex === 0) {
          tocPage.drawText('Table of Contents', {
            x: 50,
            y: yPosition,
            size: 18,
            color: rgb(0, 0, 0),
          });
          yPosition -= 40;
        }
        
        // Add entries for this page
        for (let i = startIndex; i < endIndex; i++) {
          const entry = tocEntries[i];
          const entryText = `${entry.title}`;
          const pageText = `${entry.page}`;
          
          tocPage.drawText(entryText, {
            x: 50,
            y: yPosition,
            size: 11,
            color: rgb(0, 0, 0),
          });
          
          tocPage.drawText(pageText, {
            x: 550,
            y: yPosition,
            size: 11,
            color: rgb(0, 0, 0),
          });
          
          yPosition -= 18;
        }
        
        // Add page number to TOC page
        tocPage.drawText(`${tocPageIndex + 1}`, {
          x: 300,
          y: 20,
          size: 10,
          color: rgb(0.5, 0.5, 0.5),
        });
      }
      
      // Move TOC pages to the beginning
      const allPages = mergedPdf.getPages();
      const contentPages = allPages.slice(0, -tocPageCount);
      const tocPages = allPages.slice(-tocPageCount);
      
      // This is a workaround since pdf-lib doesn't have a reorder method
      // We'll need to create a new document with pages in the right order
      const finalPdf = await PDFDocument.create();
      const finalFont = await finalPdf.embedFont(StandardFonts.Helvetica);
      
      // Copy TOC pages first
      for (const tocPage of tocPages) {
        const copiedPages = await finalPdf.copyPages(mergedPdf, [allPages.indexOf(tocPage)]);
        finalPdf.addPage(copiedPages[0]);
      }
      
      // Then copy content pages
      for (const contentPage of contentPages) {
        const copiedPages = await finalPdf.copyPages(mergedPdf, [allPages.indexOf(contentPage)]);
        finalPdf.addPage(copiedPages[0]);
      }
      
      // Save the final PDF
      const finalPdfBytes = await finalPdf.save();
      await Bun.write(outputPath, finalPdfBytes);
      
      console.log(`  ✓ Added ${tocPageCount} table of contents page${tocPageCount !== 1 ? 's' : ''}`);
    } else {
      // Save without TOC
      const mergedPdfBytes = await mergedPdf.save();
      await Bun.write(outputPath, mergedPdfBytes);
    }

    const totalPages = currentPageNumber - startPage;
    console.log("");
    console.log(`✓ Successfully created ${outputPath}`);
    console.log(`  Total: ${totalPages} page${totalPages !== 1 ? 's' : ''} from ${pdfFiles.length} file${pdfFiles.length !== 1 ? 's' : ''}`);
    if (!noToc) {
      console.log(`  TOC: Table of contents included`);
    }
  } catch (error) {
    logger.error("Error:", (error as Error).message);
    process.exit(1);
  }
}
