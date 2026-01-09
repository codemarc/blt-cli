# @codemarc/blt

> BLT CLI - Schema management, data generation, and deployment tools for PostgreSQL/Supabase projects

## Features

- **Schema Management**: Build versioned PostgreSQL schemas from modular SQL files
- **YAML to SQL Conversion**: Convert YAML data definitions to INSERT/CALL statements
- **Data Generation**: Generate instance-specific data from YAML/SQL sources
- **Database Deployment**: Direct PostgreSQL deployment with detailed error reporting
- **Supabase Integration**: Manage storage buckets (upload, download, list)
- **Image Processing**: WebP conversion, sharpening, color manipulation

## Installation

```bash
npm install -g @codemarc/blt
# or
yarn global add @codemarc/blt
# or
pnpm add -g @codemarc/blt
```

## Quick Start

### 1. Create Configuration

Create `blt.config.json` in your project root:

```json
{
  "schemaBase": "./schema",
  "distPath": "./dist",
  "instancesPath": "./schema/instances"
}
```

### 2. Set Up Schema Directory

```
your-project/
├── blt.config.json
├── schema/
│   ├── public/           # Main schema
│   │   └── sql/
│   │       ├── 10-000-types.sql
│   │       ├── 10-010-tables.sql
│   │       └── 10-020-functions.sql
│   └── instances/        # Instance-specific data
│       └── default/
│           ├── yaml/     # YAML data sources
│           │   └── users.yml
│           └── sql/      # Generated SQL (auto-created)
```

### 3. Build Schema

```bash
blt build schema public
```

### 4. Deploy to Database

Set database connection:
```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

Deploy schema:
```bash
blt deploy schema public
```

## Configuration

BLT CLI looks for configuration in this order (first found wins):

1. `blt.config.json` in current directory
2. `.bltrc` in current directory
3. `~/.blt/config.json` in home directory
4. Environment variables (`BLT_SCHEMA_BASE`, `BLT_DIST_PATH`)
5. Default values (`./schema`, `./dist`)

### Configuration Options

```typescript
{
  "schemaBase": string,      // Path to schema directory (default: "./schema")
  "distPath": string,        // Output directory (default: "./dist")
  "instancesPath": string    // Instances directory (default: "<schemaBase>/instances")
}
```

## Schema Directory Structure

See [examples/schema-structure.md](examples/schema-structure.md) for detailed information about organizing your schema files.

## Commands

### Schema Commands

#### `blt schema info [schema-name]`

Get information about schema files

```bash
blt schema info public
blt schema info public --format json
```

#### `blt build schema [schema-name]`

Build combined schema SQL file

```bash
blt build schema public
# Output: dist/public.sql
```

#### `blt deploy schema [schema-name]`

Deploy schema to database

```bash
blt deploy schema public
```

### Data Commands

#### `blt build data [instance-name]`

Build data SQL file from instance

```bash
blt build data default
# Output: dist/data.sql
```

#### `blt deploy data [instance-name]`

Deploy data to database

```bash
blt deploy data default
```

#### `blt rows`

Display row counts for all tables

```bash
blt rows
```

### Bucket Commands (Supabase)

Requires environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_SERVICE_ROLE_KEY`

#### `blt bucket names`

List all buckets

```bash
blt bucket names
blt bucket names --format json
```

#### `blt bucket list <bucket-name>`

List files in bucket

```bash
blt bucket list avatars
blt bucket list avatars --prefix users/
```

#### `blt bucket upload <bucket> <local> <remote>`

Upload file to bucket

```bash
blt bucket upload avatars ./image.jpg users/profile.jpg
blt bucket upload avatars ./image.jpg users/profile.jpg --upsert
```

#### `blt bucket upload-folder <bucket> <folder>`

Upload entire folder

```bash
blt bucket upload-folder assets ./public/images
blt bucket upload-folder assets ./public --remote-prefix images/
```

#### `blt bucket download <bucket> <remote> <local>`

Download file from bucket

```bash
blt bucket download avatars users/profile.jpg ./downloaded.jpg
```

#### `blt bucket url <bucket> <remote>`

Get public URL or signed URL

```bash
blt bucket url avatars users/profile.jpg
blt bucket url avatars private/doc.pdf --signed --expires-in 3600
```

### Image Commands

#### `blt image convert <input>`

Convert images to WebP

```bash
blt image convert ./photo.jpg
blt image convert ./images/ --recursive
blt image convert ./photo.jpg --quality 90 --output ./photo.webp
```

#### `blt image sharpen <input>`

Sharpen image edges

```bash
blt image sharpen ./photo.jpg
blt image sharpen ./images/ --recursive
```

#### `blt image enhance <input>`

Enhance for dark/light mode

```bash
blt image enhance ./avatar.jpg --mode dark
blt image enhance ./avatar.jpg --mode light --quality 95
```

#### `blt image color <input>`

Change image color

```bash
blt image color ./logo.png --to blue
blt image color ./logo.png --from red --to blue --tolerance 30
```

### Utility Commands

#### `blt env [section]`

Display environment information

```bash
blt env
blt env build
```

#### `blt cleanup`

Clean generated files

```bash
blt cleanup
```

## YAML Data Format

### Table Insert Format

```yaml
# table: users
table: users
rows:
  - id: user-001
    email: user@example.com
    name: John Doe
    active: true
    props:
      age: 30
      tags: [admin, user]

  - id: user-002
    email: another@example.com
    name: Jane Smith
    active: false
```

### Function Call Format

```yaml
# function: create_user
function: create_user
rows:
  - email: user@example.com
    name: John Doe
    role: admin

  - email: another@example.com
    name: Jane Smith
    role: user
```

### Procedure Call Format

```yaml
# procedure: setup_tenant
procedure: setup_tenant
rows:
  - tenant_id: tenant-001
    name: Acme Corp
    plan: enterprise

  - tenant_id: tenant-002
    name: Small Co
    plan: basic
```

### Environment Variable Substitution

YAML files support environment variable substitution:

```yaml
table: config
rows:
  - key: api_url
    value: ${API_URL}

  - key: api_key
    value: ${API_KEY}

  - key: db_host
    value: $DATABASE_HOST
```

## Environment Variables

### Database Connection

- `DATABASE_URL` or `SUPABASE_DB_URL`: PostgreSQL connection string

### Supabase (for bucket commands)

- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_SERVICE_ROLE_KEY`: Service role key

### Configuration Override

- `BLT_SCHEMA_BASE`: Override schema directory path
- `BLT_DIST_PATH`: Override output directory path

## Examples

Complete examples are available in the `examples/` directory:

- [`blt.config.example.json`](examples/blt.config.example.json) - Configuration template
- [`schema-structure.md`](examples/schema-structure.md) - Schema organization guide

## Troubleshooting

### "Schema directory does not exist"

Ensure `blt.config.json` points to correct `schemaBase` path.

### "No database connection string found"

Set `DATABASE_URL` or `SUPABASE_DB_URL` environment variable:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

### Sharp library errors (image commands)

Sharp is an optional dependency. Install manually if needed:

```bash
npm install sharp
```

## Development

This package is built with TypeScript and targets Node.js 18+.

### Building from Source

```bash
git clone https://github.com/codemarc/blt-cli.git
cd blt-cli
npm install
npm run build
npm link
```

### Testing

```bash
npm test
```

## Migration from Bun Version

If migrating from the Bun-based version:

1. Install: `npm install -g @codemarc/blt`
2. No schema changes needed if using standard structure
3. Add `blt.config.json` if using custom paths
4. Replace `bun cli/blt.ts` with `blt` command
5. Environment variables remain the same

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

Marc J. Greenberg <marc@Blt.org>

## Repository

https://github.com/codemarc/blt-cli

## Support

For issues and questions: https://github.com/codemarc/blt-cli/issues
