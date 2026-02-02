# @codemarc/blt

> BLT CLI — Command-line tools for image processing, PDF manipulation, storage, schema/data build and deploy, and version management.

## Features

- **Image**: WebP conversion, sharpening, color manipulation, and enhancement
- **PDF**: Combine PDFs (binder), create folios with page numbers and table of contents
- **Version**: Update and manage `version.json`, format version strings, generate version SQL
- **Build**: Build schema from DDL files, build data from instance directory
- **Deploy**: Deploy schema/data from SQL files, run a single SQL file
- **Bucket**: Supabase storage — list buckets, list/upload/download files, get URLs
- **Show**: Schema info, row counts, env vars, DB version, repo list
- **Cleanup**: Remove generated SQL/instance files, clean infrequently used YAML tags

## Installation

```bash
bun install -g @codemarc/blt
# or
npm install -g @codemarc/blt
# or
yarn global add @codemarc/blt
# or
pnpm add -g @codemarc/blt
```

## Quick Start

```bash
# Convert an image to WebP
blt image convert ./photo.jpg

# Combine PDFs into one file
blt pdf binder output.pdf file1.pdf file2.pdf

# Update version.json in current directory
blt version update

# List Supabase storage buckets
blt bucket names

# Show schema info
blt show schema

# Deploy schema from .sql files
blt deploy schema
```

## Commands Overview

| Command       | Description                          |
|---------------|--------------------------------------|
| `blt image`   | Convert, sharpen, enhance, recolor    |
| `blt pdf`     | Binder (combine), folio (TOC + pages)|
| `blt version` | Update, string, sql                  |
| `blt build`   | Schema (DDL), data (instance)        |
| `blt deploy`  | Schema, data, sql file               |
| `blt bucket`  | names, list, upload, download, url   |
| `blt show`    | schema, counts, env, db, repo       |
| `blt cleanup` | generated, tags                      |

Run `blt <command>` with no subcommand for help (e.g. `blt image`, `blt pdf`).

---

## Image Commands

### `blt image convert <input>`

Convert images to WebP format.

```bash
blt image convert ./photo.jpg
blt image convert ./images/ --recursive
blt image convert ./photo.jpg --quality 90 --output ./photo.webp
```

**Options:**

- `-o, --output <path>` — Output file or directory (default: same as input)
- `-q, --quality <quality>` — WebP quality 0–100 (default: 80)
- `-r, --recursive` — Process directories recursively
- `--overwrite` — Overwrite existing files

### `blt image sharpen <input>`

Sharpen image edges.

```bash
blt image sharpen ./photo.jpg
blt image sharpen ./images/ --recursive
```

**Options:**

- `-o, --output <path>` — Output file or directory
- `-s, --sigma <sigma>` — Sigma for sharpening 0.3–1000 (default: 1.0)
- `-f, --flat <flat>` — Flat threshold 0–10000 (default: 1.0)
- `-j, --jagged <jagged>` — Jagged threshold 0–10000 (default: 2.0)
- `-r, --recursive` — Process directories recursively
- `--overwrite` — Overwrite existing files

### `blt image enhance <input>`

Enhance avatar images for dark or light mode.

```bash
blt image enhance ./avatar.jpg --mode dark
blt image enhance ./avatar.jpg --mode light --quality 95
```

**Options:**

- `-m, --mode <mode>` — `dark` or `light` (default: dark)
- `-o, --output <path>` — Output path (default: overwrites input)
- `-q, --quality <quality>` — WebP quality 0–100 (default: 90)

### `blt image color <input>`

Change the base color of an image.

```bash
blt image color ./logo.png --to blue
blt image color ./logo.png --from red --to blue --tolerance 30
```

**Options:**

- `-t, --to <color>` — Target color (hex, rgb, or name)
- `-f, --from <color>` — Source color to replace; if omitted, dominant color is used
- `-o, --output <path>` — Output path (default: overwrites input)
- `-q, --quality <quality>` — WebP quality 0–100 (default: 90)
- `-z, --tolerance <tolerance>` — Color matching tolerance 0–100 (default: 30)

---

## PDF Commands

PDF manipulation uses the `blt pdf` namespace. Inputs can be files and/or directories (optionally recursive). Non-PDF files are skipped with a warning. Files are processed in alphabetical order.

**Dependency:** `pdf-lib`. If needed: `bun install` (or `npm install`).

### `blt pdf binder <output> <inputs...>`

Combine multiple PDFs into a single document.

```bash
# Two files
blt pdf binder output.pdf file1.pdf file2.pdf

# All PDFs in a directory
blt pdf binder output.pdf /path/to/pdfs/

# Mix files and directories (recursive)
blt pdf binder output.pdf file1.pdf /path/to/pdfs/ file2.pdf -r

# Overwrite existing output
blt pdf binder output.pdf *.pdf --overwrite
```

**Arguments:**

- `<output>` — Output PDF path
- `<inputs...>` — Input files and/or directories (can be mixed)

**Options:**

- `-r, --recursive` — Process directories recursively
- `--overwrite` — Overwrite existing output file

**Behavior:** Mix files and directories; non-PDFs skipped with a warning; progress and total page/file count are shown.

### `blt pdf folio <output> <inputs...>`

Create a folio with automatic page numbers and an optional table of contents.

```bash
# Folio with TOC and page numbers
blt pdf folio report.pdf *.pdf

# Start page number at 10
blt pdf folio report.pdf chapter1.pdf chapter2.pdf --start-page 10

# No table of contents
blt pdf folio report.pdf /path/to/pdfs/ --no-toc

# Recursive directories
blt pdf folio complete.pdf /docs/ /appendices/ -r
```

**Arguments:**

- `<output>` — Output PDF path
- `<inputs...>` — Input files and/or directories (can be mixed)

**Options:**

- `-r, --recursive` — Process directories recursively
- `--overwrite` — Overwrite existing output file
- `--no-toc` — Skip table of contents
- `--start-page <number>` — First page number (default: 1)

**Behavior:** Page numbers at bottom center; TOC at start (unless `--no-toc`) with document names and starting pages; professional formatting. Page numbers use light gray (50% opacity). TOC auto-sized (~40 entries per page). `.DS_Store` and hidden files are skipped.

**Technical:** Uses `pdf-lib` (^1.17.1). Shell wildcards (e.g. `*.pdf`) and special characters in filenames are supported.

---

## Version Commands

### `blt version update`

Create or update `version.json` in the current directory with build information.

```bash
blt version update
```

Fills in: build number (from build-number-generator), component name (from `package.json`), component version, runtime (Bun/Node), git commit and branch, build timestamp, package manager info.

**Example `version.json`:**

```json
{
  "buildnum": "260115212",
  "component": "cli",
  "version": "1.1.0",
  "runtime": { "type": "bun", "version": "1.3.4" },
  "build": {
    "commit": "c79d284f8d2a3df00af85740cc64010587d12b08",
    "branch": "main",
    "time": "2026-01-15T12:04:31.662Z"
  },
  "metadata": {
    "packageManager": "bun",
    "packageManagerVersion": "1.3.4"
  }
}
```

**Component mapping:** `@codemarc/blt` / `blt-cli` → `cli`; `blt-core-pos` → `pos`; `blt-core-devops` → `devops`; `data` → `data`; `deploy` → `deploy`; `gateway` → `gateway`.

### `blt version string`

Print version as a formatted string.

```bash
blt version string
blt version string --short
blt version string --full --date
```

**Options:** `-d, --date`, `-o, --only`, `-s, --short`, `-f, --full`.

### `blt version sql`

Generate SQL to upsert `version.json` into the settings table.

```bash
blt version sql
```

---

## Build Commands

### `blt build schema [name]`

Build schema from DDL files.

```bash
blt build schema
blt build schema my_schema
```

### `blt build data [name]`

Build data from instance directory.

```bash
blt build data
blt build data my_instance
```

---

## Deploy Commands

### `blt deploy schema [name]`

Deploy schema from .sql files.

```bash
blt deploy schema
blt deploy schema my_schema
```

### `blt deploy data [name]`

Deploy data instance from .sql files.

```bash
blt deploy data
blt deploy data my_instance
```

### `blt deploy sql <file>`

Run a single SQL file against the database.

```bash
blt deploy sql ./migrations/001_init.sql
```

---

## Bucket Commands (Supabase Storage)

### `blt bucket names`

List all bucket names.

```bash
blt bucket names
blt bucket names --format json
```

**Options:** `-f, --format <format>` — `table` or `json` (default: table).

### `blt bucket list <bucket-name>`

List files in a bucket.

```bash
blt bucket list my-bucket
blt bucket list my-bucket --prefix path/ --limit 50
```

**Options:**

- `-p, --prefix <prefix>` — Path/prefix filter (default: "")
- `-l, --limit <limit>` — Max results (default: 100)
- `-f, --format <format>` — `table` or `json` (default: table).

### `blt bucket upload <bucket-name> <local-path> <remote-path>`

Upload a file.

```bash
blt bucket upload my-bucket ./local.pdf docs/file.pdf
blt bucket upload my-bucket ./local.pdf docs/file.pdf --upsert
```

**Options:** `--upsert` — Overwrite if exists (default: false).

### `blt bucket upload-folder <bucket-name> <local-folder>`

Upload all files in a folder.

```bash
blt bucket upload-folder my-bucket ./public/
blt bucket upload-folder my-bucket ./public/ -r prefix/
blt bucket upload-folder my-bucket ./public/ --dry-run
```

**Options:**

- `-r, --remote-prefix <prefix>` — Remote path prefix (default: "")
- `--upsert` — Overwrite existing files (default: true)
- `--dry-run` — Show what would be uploaded without uploading.

### `blt bucket download <bucket-name> <remote-path> <local-path>`

Download a file.

```bash
blt bucket download my-bucket docs/file.pdf ./local.pdf
```

### `blt bucket url <bucket-name> <remote-path>`

Get public or signed URL for a file.

```bash
blt bucket url my-bucket docs/file.pdf
blt bucket url my-bucket docs/file.pdf --signed --expires-in 7200
```

**Options:**

- `--signed` — Generate signed URL (default: false)
- `--expires-in <seconds>` — Signed URL expiry (default: 3600).

---

## Show Commands

### `blt show schema [schema-name]`

Schema information.

```bash
blt show schema
blt show schema core
blt show schema --format json
```

**Options:** `-f, --format <format>` — `table` or `json` (default: table).

### `blt show counts`

Row counts for all tables.

```bash
blt show counts
```

### `blt show env`

Display BLT core environment variables.

```bash
blt show env
```

### `blt show db`

Display version from database (same format as version string).

```bash
blt show db
blt show db --short
blt show db --full --date
```

**Options:** `-d, --date`, `-o, --only`, `-s, --short`, `-f, --full`.

### `blt show repo`

List valid repositories in the current working set.

```bash
blt show repo
blt show repo --ssh
```

**Options:** `-s, --ssh` — Show SSH URLs instead of HTTPS.

---

## Cleanup Commands

### `blt cleanup generated`

Remove generated SQL files and instance SQL directories.

```bash
blt cleanup generated
blt cleanup generated -i instance1 -i instance2
blt cleanup generated --all
```

**Options:**

- `-i, --instance <instance>` — Instance to clean (repeatable)
- `-a, --all` — Clean all instances.

### `blt cleanup tags <instance>`

Clean infrequently used tags in YAML files.

```bash
blt cleanup tags default
blt cleanup tags joanne --min-count 2 --dry-run
```

**Options:**

- `-m, --min-count <count>` — Minimum tag count to keep (default: 4)
- `-d, --dry-run` — Show changes without modifying files.

---

## Environment Variables

Bucket and database operations typically use Supabase configuration (e.g. from `.env`). The `blt show env` command displays BLT core environment variables.

---

## Troubleshooting

### Image commands (Sharp)

Sharp is an optional dependency. If image commands fail, install it:

```bash
bun add sharp
# or
npm install sharp
```

### PDF commands

Ensure `pdf-lib` is installed: `bun install` (or `npm install`). The CLI uses `pdf-lib` ^1.17.1 and works with the Bun runtime.

---

## Development

Built with TypeScript and Bun.

### Build from source

```bash
git clone https://github.com/codemarc/blt-cli.git
cd blt-cli
bun install
bun run build
bun link
```

Build compiles TypeScript, updates `version.json`, and sets execute permissions on the binary.

### Run from source

```bash
bun run src/blt.ts image convert ./photo.jpg
bun run src/blt.ts pdf binder output.pdf a.pdf b.pdf
```

### Tests

```bash
bun test
```

---

## License

MIT License — see [LICENSE](LICENSE).

## Author

Marc J. Greenberg <marc@bltwai.com>

## Repository

https://github.com/codemarc/blt-cli

## Support

https://github.com/codemarc/blt-cli/issues
