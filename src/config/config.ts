import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface BltConfig {
  schemaBase: string;
  distPath: string;
  instancesPath?: string;
}

const DEFAULT_CONFIG: BltConfig = {
  schemaBase: './schema',
  distPath: './dist',
};

/**
 * Load configuration from multiple sources (priority order):
 * 1. blt.config.json in current directory
 * 2. .bltrc in current directory
 * 3. ~/.blt/config.json in home directory
 * 4. Environment variables (BLT_SCHEMA_BASE, BLT_DIST_PATH)
 * 5. Default values
 */
export function loadConfig(): BltConfig {
  let config = { ...DEFAULT_CONFIG };

  // Try loading from files
  const configPaths = [
    join(process.cwd(), 'blt.config.json'),
    join(process.cwd(), '.bltrc'),
    join(homedir(), '.blt', 'config.json'),
  ];

  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      try {
        const fileConfig = JSON.parse(readFileSync(configPath, 'utf8'));
        config = { ...config, ...fileConfig };
        console.log(`Loaded config from: ${configPath}`);
        break;
      } catch (_error) {
        console.warn(`Failed to parse config file: ${configPath}`);
      }
    }
  }

  // Override with environment variables
  if (process.env.BLT_SCHEMA_BASE) {
    config.schemaBase = process.env.BLT_SCHEMA_BASE;
  }
  if (process.env.BLT_DIST_PATH) {
    config.distPath = process.env.BLT_DIST_PATH;
  }

  return config;
}

let cachedConfig: BltConfig | null = null;

export function getConfig(): BltConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}
