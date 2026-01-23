# BLT CLI Guide

A comprehensive guide to using the BLT (BLT Core) command-line tool for managing deployments, storage buckets, images, and menus.

## Table of Contents

- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Commands Overview](#commands-overview)
- [Bucket Commands](#bucket-commands)
- [Image Commands](#image-commands)
- [Menu Commands](#menu-commands)
- [Common Workflows](#common-workflows)
- [Troubleshooting](#troubleshooting)

---

## Installation & Setup

### Prerequisites

- **Bun** installed ([installation guide](https://bun.sh/docs/installation))
- Access to a Supabase project with service role key

### Installation

```bash
# Install dependencies
bun install

# Run commands using
bun run blt <command>
# or if you have the CLI installed globally
blt <command>
```

---

## Configuration

The CLI requires credentials to be available as environment variables. Create a `.env` file in the project root and set the following vars. Do not ever check in an unencrypted version of this file as it may contain secrets. An established pattern is to store the encrypted (smashed) version of this file in the `.trailz/env` folder of your repository. 

```bash
$ bun install @codemarc/smashdata -g

$ smash 

smash v1.0.4
usage: smash [options] <file>

Options:
  -k <key>  Key to encode/decode the file
  -n        Output to console, No write/delete
  -v        Verbose mode
  -h        Show this help message

$ export SMASH_KEY=a_preshared_key

# encrypt
$ smash .trailz/env/.env.$(whoami)

# decrypt
$ smash -n .trailz/env/.env.$(whoami) >.env

```

Environment Variable       | Usage
---------------------------|----------------------------
SUPABASE_PROJECT_REF       | Supabase project reference 
SUPABASE_DASHBOARD         | Supabase dashboard URL     
SUPABASE_DATA_API          | Supabase Data API URL      
SUPABASE_CONNECTION_STRING | Supabase connection string 
SUPABASE_ACCESS_TOKEN      | Supabase access token      
SUPABASE_SERVICE_ROLE_KEY  | Supabase service role key  
SUPABASE_ANON_KEY          | Supabase anonymous key     
VITE_SUPABASE_URL          | Supabase admin key         
VITE_SUPABASE_ANON_KEY     | Supabase anonymous key     
STRIPE_SECRET_KEY          | Stripe secret key          
STRIPE_PUBLISHABLE_KEY     | Stripe publishable key     
SQUARE_APP_ID              | Square app ID              
SQUARE_ACCESS_TOKEN        | Square access token        

> **Note:** Bun automatically loads `.env` files, so you don't need to use `dotenv`.  


### Getting Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the **Project URL** → use as `SUPABASE_DATA_API` (required) and `VITE_SUPABASE_URL` (for frontend)
4. Copy the **service_role** key (not the anon key) → use as `SUPABASE_SERVICE_ROLE_KEY` (required)
5. Copy the **anon** key → use as `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY` (for frontend)
6. For database operations, you may also need:
   - **Project Reference** → `SUPABASE_PROJECT_REF` (found in project settings)
   - **Connection String** → `SUPABASE_CONNECTION_STRING` (found in Database settings → Connection string)
   - **Access Token** → `SUPABASE_ACCESS_TOKEN` (for API access)

> **Important:** The service role key has full access to your database. Keep it secure and never commit it to version control.

### Example .env File

```bash
# SUPABASE vars
SUPABASE_PROJECT_REF=your-project-ref
SUPABASE_DASHBOARD=https://supabase.com/dashboard/project/your-project-ref
SUPABASE_DATA_API=https://your-project-ref.supabase.co
SUPABASE_CONNECTION_STRING=postgresql://postgres.your-project-ref:password@aws-1-us-east-1.pooler.supabase.com:6543/postgres
SUPABASE_ACCESS_TOKEN=sbp_your_access_token
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# VITE Build (for frontend applications)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe API Keys (optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Square API Keys (optional)
SQUARE_APP_ID=sq0idp-...
SQUARE_ACCESS_TOKEN=EAAAlzZrOKQ39OjlYlYZZYETYDz8lggTgAlsL6fbFf5IAJyGzdpNAR2NPKKfcFK5
```

### Optional BLT Configuration Variables

The CLI also supports optional configuration via environment variables or config files:

- `BLT_SCHEMA_BASE` - Base path for schema files (default: `./schema`)
- `BLT_DIST_PATH` - Output path for build artifacts (default: `./dist`)

These can also be configured via:
1. `blt.config.json` in the current directory
2. `.bltrc` in the current directory
3. `~/.blt/config.json` in your home directory

Configuration priority (highest to lowest): Environment variables → Config files → Defaults

---

## Commands Overview

BLT CLI provides three main command categories:

1. **`bucket`** - Manage Supabase storage buckets (list, upload, download, get URLs)
2. **`image`** - Convert images to WebP format
3. **`menu`** - Export and manage restaurant menu data

---

## Bucket Commands

Manage files in Supabase storage buckets.

### List Files in a Bucket

```bash
blt bucket list <bucket-name> [options]
```

**Options:**
- `-p, --prefix <prefix>` - Filter files by prefix/path (default: "")
- `-l, --limit <limit>` - Limit number of results (default: 100)
- `-f, --format <format>` - Output format: `table` or `json` (default: `table`)

**Examples:**
```bash
# List all files
blt bucket list avatars

# List files in a specific folder
blt bucket list avatars --prefix branding/

# Get JSON output
blt bucket list avatars --format json

# Limit results
blt bucket list avatars --limit 50
```

### Upload a File

```bash
blt bucket upload <bucket-name> <local-path> <remote-path> [options]
```

**Options:**
- `--upsert` - Overwrite if file exists

**Examples:**
```bash
# Upload a single file
blt bucket upload avatars ./logo.png logo.png

# Upload with overwrite
blt bucket upload avatars ./logo.png logo.png --upsert
```

### Upload a Folder

```bash
blt bucket upload-folder <bucket-name> <local-folder> [options]
```

**Options:**
- `-r, --remote-prefix <prefix>` - Remote path prefix in bucket (default: "")
- `--upsert` - Overwrite if files exist (default: true)
- `--dry-run` - Show what would be uploaded without uploading

**Examples:**
```bash
# Upload entire folder
blt bucket upload-folder avatars ./customers/joanne/avatars/

# Upload with remote prefix
blt bucket upload-folder branding ./assets/ --remote-prefix joanne/

# Preview what would be uploaded
blt bucket upload-folder avatars ./avatars/ --dry-run
```

### Download a File

```bash
blt bucket download <bucket-name> <remote-path> <local-path>
```

**Example:**
```bash
blt bucket download avatars logo.png ./downloads/logo.png
```

### Get File URL

```bash
blt bucket url <bucket-name> <remote-path> [options]
```

**Options:**
- `--signed` - Generate a signed URL (temporary access)
- `--expires-in <seconds>` - Expiry time for signed URL (default: 3600)

**Examples:**
```bash
# Get public URL
blt bucket url avatars logo.png

# Get signed URL (expires in 1 hour)
blt bucket url avatars logo.png --signed

# Get signed URL with custom expiry (24 hours)
blt bucket url avatars logo.png --signed --expires-in 86400
```

---

## Image Commands

Convert images to WebP format for optimized web delivery.

### Convert Image(s) to WebP

```bash
blt image convert <input> [options]
```

**Options:**
- `-o, --output <path>` - Output file or directory (default: same location as input)
- `-q, --quality <quality>` - WebP quality 0-100 (default: 80)
- `-r, --recursive` - Process directories recursively
- `--overwrite` - Overwrite existing WebP files

**Examples:**
```bash
# Convert single image
blt image convert logo.png

# Convert with custom quality
blt image convert photo.jpg --quality 90

# Convert with custom output location
blt image convert photo.jpg --output ./optimized/photo.webp

# Convert entire directory
blt image convert ./images/ --recursive

# Convert directory with output folder
blt image convert ./images/ --output ./webp/ --recursive

# Overwrite existing WebP files
blt image convert ./images/ --recursive --overwrite
```

**Supported Formats:**
- PNG, JPG, JPEG, GIF, TIFF, BMP

**Notes:**
- Files already in WebP format are skipped
- The conversion shows file size savings
- Requires the `sharp` library (installed automatically with dependencies)

---

## Menu Commands

Export and manage restaurant menu data from Supabase.

### Export Menu

Export menu system (menus, categories, items, groups) to JSON files.

```bash
blt menu export [customer] [options]
```

**Options:**
- `-o, --output <path>` - Output directory (default: `./customers/<customer>/menu`)
- `--only <component>` - Export only specific component: `menus`, `categories`, `items`, `groups`, or `modifiers`
- `--single-file` - Export to single file instead of modular structure
- `--pretty` - Pretty print JSON (default: true)

**Examples:**
```bash
# Export full menu (modular structure)
blt menu export joanne

# Export to custom location
blt menu export joanne --output ./backups/menu-2024-12-17

# Export to single file
blt menu export joanne --single-file --output ./menu-backup.json

# Export only categories
blt menu export joanne --only categories

# Export only items
blt menu export joanne --only items
```

**Export Structure (Modular):**

When exporting without `--single-file`, the following structure is created:

```
customers/joanne/menu/
├── menu.json           # Menu definitions (lunch, dinner, brunch)
├── categories.json     # Categories (pizzas, burgers, sides, etc.)
├── items/
│   ├── all-items.json  # All items in one file
│   ├── burgers.json    # Items in burgers category
│   ├── sides.json      # Items in sides category
│   ├── drinks.json     # Items in drinks category
│   ├── desserts.json   # Items in desserts category
│   └── uncategorized.json  # Items without category
└── groups.json         # Modifier groups (cooking preferences, cheese options, etc.)
```

**Export Structure (Single File):**

When using `--single-file`, all data is exported to a single JSON file:

```json
{
  "version": "1.0",
  "exported_at": "2024-12-17T20:00:00Z",
  "customer": "joanne",
  "menus": [...],
  "categories": [...],
  "items": [...],
  "groups": [...]
}
```

### List Menu Components

List menus, categories, items, or groups with optional filtering.

```bash
blt menu list <component> [options]
```

**Components:**
- `menus` - List all menus
- `categories` - List all categories
- `items` - List all items
- `groups` - List all modifier groups

**Options:**
- `-f, --format <format>` - Output format: `table` or `json` (default: `table`)
- `--menu <name>` - Filter categories by menu name
- `--category <name>` - Filter items by category name
- `--active-only` - Show only active items

**Examples:**
```bash
# List all menus
blt menu list menus

# List only active menus
blt menu list menus --active-only

# List menus as JSON
blt menu list menus --format json

# List categories in a specific menu
blt menu list categories --menu lunch

# List items in a specific category
blt menu list items --category burgers

# List only active items
blt menu list items --active-only

# List all modifier groups
blt menu list groups
```

**Example Output (Table Format):**
```
Found 3 menus

✓ Lunch Menu [lunch, dinner]
  Quick and delicious lunch options
✓ Dinner [lunch, dinner, brunch]
  A tasty meal for diner
✗ Brunch []
  Our famous sunday brunch
```

---

## Common Workflows

### Upload Customer Assets

```bash
# 1. Convert images to WebP first
blt image convert ./customers/joanne/branding/ --recursive --output ./customers/joanne/branding/webp/

# 2. Upload to Supabase storage
blt bucket upload-folder branding ./customers/joanne/branding/webp/ --remote-prefix joanne/

# 3. Upload avatars
blt bucket upload-folder avatars ./customers/joanne/avatars/ --remote-prefix joanne/
```

### Backup Menu Data

```bash
# Create dated backup
blt menu export joanne --output ./backups/menu-$(date +%Y-%m-%d)

# Or export for version control
blt menu export joanne
cd customers/joanne/menu
git add .
git commit -m "Export menu - $(date +%Y-%m-%d)"
```

### Quick Menu Overview

```bash
# See all menus
blt menu list menus

# See categories in lunch menu
blt menu list categories --menu lunch

# See burger items
blt menu list items --category burgers

# Get JSON for scripting
blt menu list items --format json | jq '.[] | select(.name | contains("burger"))'
```

### Batch Image Optimization

```bash
# Convert all customer images to WebP
for customer in ./customers/*/; do
  customer_name=$(basename "$customer")
  echo "Processing $customer_name..."
  blt image convert "$customer/branding/" --recursive --output "$customer/branding/webp/" --quality 85
done
```

---

## Troubleshooting

### Error: "SUPABASE_DATA_API and SUPABASE_SERVICE_ROLE_KEY environment variables are required"

**Solution:**
1. Ensure you have a `.env` file in the project root
2. Verify the environment variable names are correct:
   - `SUPABASE_DATA_API` (not `VITE_SUPABASE_URL`)
   - `SUPABASE_SERVICE_ROLE_KEY` (not `VITE_SUPABASE_SERVICE_ROLE_KEY`)
3. Make sure you're using the **service_role** key, not the anon key
4. Restart your terminal/process after updating `.env`
5. Verify the `.env` file is in the correct location (project root where you run `blt` commands)

### Error: "Permission denied" or "Invalid API key"

**Solution:**
- Verify you're using the service role key (not the anon key)
- Check that the key hasn't been rotated in Supabase
- Ensure the key has the correct permissions in Supabase settings

### Empty Results When Listing

**Solution:**
- Check that data exists in the database/storage
- Try listing without filters first
- Use `--format json` to see raw data
- Verify you're connected to the correct Supabase project

### Image Conversion Errors

**Solution:**
- Ensure `sharp` is installed: `bun add sharp`
- Check that input files are valid image formats
- Verify file permissions
- Try with a single file first to isolate the issue

### Menu Export Shows "No data"

**Solution:**
- Verify menu data exists in your Supabase database
- Check that you're connected to the correct Supabase project
- Try listing menus first: `blt menu list menus`
- Verify table names match: `menus`, `categories`, `items`, `groups`

### Bucket Operations Fail

**Solution:**
- Verify the bucket exists in Supabase Storage
- Check bucket permissions in Supabase dashboard
- Ensure the service role key has storage access
- Try listing the bucket first: `blt bucket list <bucket-name>`

---

## Tips & Best Practices

1. **Always backup before changes**: Export menus before making manual database edits
2. **Use version control**: Export menus to git for history tracking
3. **Test with dry-run**: Use `--dry-run` flag for bucket uploads to preview changes
4. **Optimize images first**: Convert images to WebP before uploading to reduce storage costs
5. **Start broad, filter narrow**: List all data first, then apply filters
6. **Use JSON format for scripts**: Use `--format json` when piping to other tools like `jq`
7. **Keep service role key secure**: Never commit `.env` files to version control

---

## Command Reference Quick Sheet

```bash
# Bucket
blt bucket list <bucket> [--prefix <path>] [--limit <n>] [--format json]
blt bucket upload <bucket> <local> <remote> [--upsert]
blt bucket upload-folder <bucket> <folder> [--remote-prefix <path>] [--dry-run]
blt bucket download <bucket> <remote> <local>
blt bucket url <bucket> <remote> [--signed] [--expires-in <seconds>]

# Image
blt image convert <input> [--output <path>] [--quality <0-100>] [--recursive] [--overwrite]

# Menu
blt menu export [customer] [--output <path>] [--only <component>] [--single-file]
blt menu list <component> [--format json] [--menu <name>] [--category <name>] [--active-only]
```

---

For issues, questions, or contributions, please refer to the project repository.
