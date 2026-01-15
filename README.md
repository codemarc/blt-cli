# @codemarc/blt

> BLT CLI - Command-line tools for environment checking and image processing

## Features

- **Environment Checking**: Verify environment setup and configuration
- **Image Processing**: WebP conversion, sharpening, color manipulation, and enhancement
- **Version Management**: Update and manage version.json files with build information

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

### Check Environment

Verify your environment setup:

```bash
blt check
```

This command checks for:
- `.env` file existence
- `SMASH_KEY` environment variable
- Other environment configuration

### Process Images

Convert an image to WebP:

```bash
blt image convert ./photo.jpg
```

Sharpen an image:

```bash
blt image sharpen ./photo.jpg
```

### Version Management

Update version.json with current build information:

```bash
blt version update
```

This command creates or updates a `version.json` file in the current directory with:
- Build number (generated using `build-number-generator`)
- Component name (detected from `package.json`)
- Component version from `package.json`
- Runtime information (Bun/Node version)
- Git commit hash and branch
- Build timestamp
- Package manager information

## Commands

### Environment Commands

#### `blt check [all]`

Check the environment setup

```bash
blt check
blt check all
```

This command verifies:
- Presence of `.env` file
- `SMASH_KEY` environment variable
- Other environment configuration

### Image Commands

#### `blt image convert <input>`

Convert images to WebP format

```bash
blt image convert ./photo.jpg
blt image convert ./images/ --recursive
blt image convert ./photo.jpg --quality 90 --output ./photo.webp
```

**Options:**
- `-o, --output <path>`: Output file or directory (default: same location as input)
- `-q, --quality <quality>`: WebP quality 0-100 (default: 80)
- `-r, --recursive`: Process directories recursively
- `--overwrite`: Overwrite existing files

#### `blt image sharpen <input>`

Sharpen image edges

```bash
blt image sharpen ./photo.jpg
blt image sharpen ./images/ --recursive
```

**Options:**
- `-o, --output <path>`: Output file or directory (default: same location as input)
- `-s, --sigma <sigma>`: Sigma value for sharpening 0.3-1000 (default: 1.0)
- `-f, --flat <flat>`: Flat threshold 0-10000 (default: 1.0)
- `-j, --jagged <jagged>`: Jagged threshold 0-10000 (default: 2.0)
- `-r, --recursive`: Process directories recursively
- `--overwrite`: Overwrite existing files

#### `blt image enhance <input>`

Enhance avatar images for dark or light mode

```bash
blt image enhance ./avatar.jpg --mode dark
blt image enhance ./avatar.jpg --mode light --quality 95
```

**Options:**
- `-m, --mode <mode>`: Enhancement mode: `dark` or `light` (default: dark)
- `-o, --output <path>`: Output file path (default: overwrites input)
- `-q, --quality <quality>`: WebP quality 0-100 (default: 90)

#### `blt image color <input>`

Change the base color of an image

```bash
blt image color ./logo.png --to blue
blt image color ./logo.png --from red --to blue --tolerance 30
```

**Options:**
- `-t, --to <color>`: Target color (hex, rgb, or color name)
- `-f, --from <color>`: Source color to replace (hex, rgb, or color name). If not specified, detects dominant color
- `-o, --output <path>`: Output file path (default: overwrites input)
- `-q, --quality <quality>`: WebP quality 0-100 (default: 90)
- `-z, --tolerance <tolerance>`: Color matching tolerance 0-100 (default: 30)

### Version Commands

#### `blt version`

Show version management help

```bash
blt version
```

#### `blt version update`

Update `version.json` with current build information

```bash
blt version update
```

This command:
- Creates `version.json` if it doesn't exist
- Updates existing `version.json` with current information
- Works from any directory (uses current working directory)
- Detects component name from `package.json`
- Generates a unique build number for each update
- Includes git commit, branch, and build timestamp
- Captures runtime and package manager versions

**Example `version.json` output:**

```json
{
  "buildnum": "260115212",
  "component": "cli",
  "version": "1.1.0",
  "runtime": {
    "type": "bun",
    "version": "1.3.4"
  },
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

**Version.json Fields:**

- `buildnum`: Unique build number generated using `build-number-generator` (e.g., "260115212")
- `component`: Component name (cli, data, pos, devops, deploy, gateway)
- `version`: Semantic version from `package.json`
- `runtime.type`: Runtime type ("bun" or "node")
- `runtime.version`: Runtime version (e.g., "1.3.4" for Bun, "v25.2.1" for Node)
- `build.commit`: Full git commit hash
- `build.branch`: Current git branch name
- `build.time`: ISO 8601 timestamp of when version.json was updated
- `metadata.packageManager`: Package manager name ("bun" or "npm")
- `metadata.packageManagerVersion`: Package manager version

The command automatically detects the component name from your `package.json`:
- `@codemarc/blt` or `blt-cli` → `cli`
- `blt-core-pos` → `pos`
- `blt-core-devops` → `devops`
- `data` → `data`
- `deploy` → `deploy`
- `gateway` → `gateway`

## Environment Variables

### Environment Checking

- `SMASH_KEY`: Required for certain operations (checked by `blt check`)

The `blt check` command looks for a `.env` file in the current directory and verifies environment variable configuration.

## Troubleshooting

### Sharp library errors (image commands)

Sharp is an optional dependency. Install manually if needed:

```bash
bun add sharp
# or
npm install sharp
```

## Development

This package is built with TypeScript and uses Bun as the runtime.

### Building from Source

```bash
git clone https://github.com/codemarc/blt-cli.git
cd blt-cli
bun install
bun run build
bun link
```

The build process automatically:
- Compiles TypeScript to JavaScript
- Updates `version.json` with current build information
- Sets execute permissions on the built binary

### Running in Development

You can run the CLI directly from source using Bun:

```bash
bun run src/blt.ts check
```

### Version Management

The CLI includes a postbuild script that automatically updates `version.json` after each build. The build number is automatically generated and incremented on each update.

You can manually update version information:

```bash
# From any directory (updates version.json in current directory)
blt version update

# Or from the CLI project directory, run the script directly
bun run src/commands/version/update.ts
```

**Note:** The `blt version update` command works from any directory. It will:
- Read `package.json` from the current directory
- Create or update `version.json` in the current directory
- Use git information from the current directory's repository
- Generate a new build number for each update

### Testing

```bash
bun test
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

Marc J. Greenberg <marc@bltwai.com>

## Repository

https://github.com/codemarc/blt-cli

## Support

For issues and questions: https://github.com/codemarc/blt-cli/issues
