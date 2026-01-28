# BLT PDF Commands

The BLT CLI now includes PDF manipulation commands under the `blt pdf` namespace.

## Installation

The `pdf-lib` package has been added as a dependency. If you need to reinstall:

```bash
bun install
```

## Available Commands

### 1. `blt pdf binder` - Combine PDFs

Combines multiple PDF files into a single PDF document.

**Usage:**
```bash
blt pdf binder <output> <inputs...> [OPTIONS]
```

**Arguments:**
- `<output>` - Output PDF filename
- `<inputs...>` - Input files or directories (can be mixed)

**Options:**
- `-r, --recursive` - Process directories recursively
- `--overwrite` - Overwrite existing output file

**Examples:**
```bash
# Combine two PDF files
blt pdf binder output.pdf file1.pdf file2.pdf

# Combine all PDFs in a directory
blt pdf binder output.pdf /path/to/pdfs/

# Combine files and directories (recursive)
blt pdf binder output.pdf file1.pdf /path/to/pdfs/ file2.pdf -r

# Overwrite existing output
blt pdf binder output.pdf *.pdf --overwrite
```

**Features:**
- Supports mixing files and directories as input
- Automatically skips non-PDF files with a warning
- Displays progress for each file processed
- Shows total page count and file count
- Files are processed in alphabetical order

---

### 2. `blt pdf folio` - Create Folio with Page Numbers

Creates a professional folio by combining PDFs with automatic page numbering and an optional table of contents.

**Usage:**
```bash
blt pdf folio <output> <inputs...> [OPTIONS]
```

**Arguments:**
- `<output>` - Output PDF filename
- `<inputs...>` - Input files or directories (can be mixed)

**Options:**
- `-r, --recursive` - Process directories recursively
- `--overwrite` - Overwrite existing output file
- `--no-toc` - Skip table of contents generation
- `--start-page <number>` - Starting page number (default: 1)

**Examples:**
```bash
# Create a folio with TOC and page numbers
blt pdf folio report.pdf *.pdf

# Create a folio starting at page 10
blt pdf folio report.pdf chapter1.pdf chapter2.pdf --start-page 10

# Create a folio without table of contents
blt pdf folio report.pdf /path/to/pdfs/ --no-toc

# Combine with recursive directory processing
blt pdf folio complete.pdf /docs/ /appendices/ -r
```

**Features:**
- Adds page numbers to the bottom center of each page
- Generates a table of contents at the beginning (unless `--no-toc` is used)
- TOC includes document names and starting page numbers
- Files are processed in alphabetical order
- Custom starting page number support
- Professional formatting with proper spacing

---

## Implementation Details

### File Structure
```
src/
  commands/
    pdf.ts              # Main PDF command registration
    pdf/
      binder.ts         # PDF combination logic
      folio.ts          # Folio creation with page numbers and TOC
```

### Dependencies
- **pdf-lib** (^1.17.1) - Core PDF manipulation library
- Supports all standard PDF operations
- Works with Bun runtime

### Technical Notes
- **Argument Parsing**: Caporal bundles required + variadic arguments into a single array. The commands extract the first element as output and the rest as inputs.
- **Wildcard Support**: Shell wildcards (e.g., `*.pdf`) are fully supported and work correctly.
- **Special Characters**: Filenames with special characters (underscores, hyphens, etc.) are handled correctly.

### Common Options
All PDF commands support:
- Mixing files and directories as input
- Recursive directory processing with `-r` flag
- Overwrite protection (use `--overwrite` to force)
- Automatic skipping of non-PDF files
- Alphabetical sorting of input files

---

## Development

### Building
```bash
bun run build
```

### Running in Development
```bash
bun run start pdf binder output.pdf input1.pdf input2.pdf
```

### Adding New PDF Commands
Follow the established pattern:
1. Create command file in `src/commands/pdf/`
2. Add command registration in `src/commands/pdf.ts`
3. Import necessary pdf-lib types dynamically
4. Follow the same error handling and logging patterns

---

## Notes

- All PDF files are processed in alphabetical order for consistent output
- The folio command adds page numbers in a light gray color (50% opacity)
- TOC pages are automatically sized to fit (approximately 40 entries per page)
- Both commands handle errors gracefully and continue processing remaining files
- `.DS_Store` and hidden files are automatically skipped

---

## Future Enhancements

Potential features to add:
- `blt pdf split` - Split a PDF into individual pages or ranges
- `blt pdf rotate` - Rotate pages in a PDF
- `blt pdf watermark` - Add watermarks to PDFs
- `blt pdf encrypt` - Add password protection
- `blt pdf optimize` - Compress and optimize PDF file size
- Custom TOC formatting options (fonts, colors, layout)
- Header/footer customization for folio command
