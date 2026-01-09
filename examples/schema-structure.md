# Schema Directory Structure

This document describes the recommended schema directory structure for @codemarc/blt projects.

## Directory Layout

```
your-project/
├── blt.config.json          # Configuration file
├── schema/                  # Schema base directory
│   ├── public/             # Main schema (or any schema name)
│   │   └── sql/
│   │       ├── 10-000-types.sql
│   │       ├── 10-010-tables.sql
│   │       ├── 10-020-functions.sql
│   │       └── 10-030-triggers.sql
│   └── instances/          # Instance-specific data
│       ├── default/
│       │   ├── yaml/
│       │   │   ├── users.yml
│       │   │   └── roles.yml
│       │   └── sql/        # Auto-generated from YAML
│       └── production/
│           └── yaml/
│               └── seed-data.yml
└── dist/                   # Generated output
    ├── public.sql
    └── data.sql
```

## File Naming Convention

SQL files should follow the pattern: `<number>-<section>-<name>.sql`

- **Number**: Use leading zeros (e.g., `10-000`, `10-010`) for proper ordering
- **Section**: Logical grouping (e.g., `000-types`, `010-tables`, `020-functions`)
- **Name**: Descriptive name for the file

### Example Numbering Scheme

```
10-000-audit.sql           # Base structures first
10-010-types.sql          # Types and enums
10-020-tables.sql         # Table definitions
10-030-functions.sql      # Functions
10-040-triggers.sql       # Triggers
10-050-views.sql          # Views
10-060-policies.sql       # RLS policies
10-070-grants.sql         # Permissions
```

## YAML Data Format

Instance data can be defined in YAML format for easier management.

### Table Insert Example

```yaml
# table: users
table: users
rows:
  - id: user-001
    email: admin@example.com
    name: Admin User
    role: admin
    active: true

  - id: user-002
    email: user@example.com
    name: Regular User
    role: user
    active: true
```

### Function Call Example

```yaml
# function: create_organization
function: create_organization
rows:
  - name: Acme Corp
    plan: enterprise

  - name: Small Business
    plan: starter
```

### Environment Variables

Use environment variable substitution in YAML files:

```yaml
table: config
rows:
  - key: api_url
    value: ${API_URL}

  - key: api_key
    value: ${API_KEY}
```

## Configuration

Create `blt.config.json` in your project root:

```json
{
  "schemaBase": "./schema",
  "distPath": "./dist",
  "instancesPath": "./schema/instances"
}
```

## Workflow

1. **Create Schema Files**: Add numbered SQL files to `schema/<schema-name>/sql/`
2. **Create Instance Data**: Add YAML files to `schema/instances/<instance-name>/yaml/`
3. **Build Schema**: `blt build schema public`
4. **Build Data**: `blt build data default`
5. **Deploy**: `blt deploy schema` and `blt deploy data`

## Tips

- Keep schema files small and focused
- Use consistent naming conventions
- Document complex logic with comments
- Use version control for all schema files
- Test schema changes in development first
- Use instances for environment-specific data
