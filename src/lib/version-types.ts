/**
 * Standard version.json schema types for BLT components
 * 
 * This schema is used across all BLT components (CLI, Data, POS, DevOps, Deploy, Gateway)
 * to provide uniform version information including runtime, build metadata, and dependencies.
 */

/**
 * Supported component types
 */
export type ComponentType = 'cli' | 'data' | 'pos' | 'devops' | 'deploy' | 'gateway';

/**
 * Supported runtime types
 */
export type RuntimeType = 'node' | 'bun' | 'deno';

/**
 * Supported package manager types
 */
export type PackageManagerType = 'npm' | 'bun' | 'pnpm' | 'deno';

/**
 * Runtime information
 */
export interface RuntimeInfo {
  /** Runtime type (node, bun, or deno) */
  type: RuntimeType;
  /** Runtime version string */
  version: string;
}

/**
 * Build metadata from git and build process
 */
export interface BuildInfo {
  /** Git commit hash */
  commit: string;
  /** Git branch name */
  branch: string;
  /** ISO timestamp of build time */
  time: string;
}

/**
 * Package manager metadata
 */
export interface MetadataInfo {
  /** Package manager type (npm, bun, pnpm, or deno) */
  packageManager: PackageManagerType;
  /** Package manager version */
  packageManagerVersion: string;
}

/**
 * Complete version.json schema structure
 * 
 * This interface defines the structure of version.json files used across
 * all BLT components for uniform version tracking and inspection.
 */
export interface VersionInfo {
  /** Component identifier */
  component: ComponentType;
  /** Semantic version string (e.g., "1.0.0") */
  version: string;
  /** Runtime information (Node.js, Bun, or Deno) */
  runtime: RuntimeInfo;
  /** Build metadata (git commit, branch, build time) */
  build: BuildInfo;
  /** Package manager metadata */
  metadata: MetadataInfo;
}

/**
 * Partial version info for cases where some fields may be optional
 * (e.g., during development or when git info is unavailable)
 */
export interface PartialVersionInfo {
  component: ComponentType;
  version: string;
  runtime?: RuntimeInfo;
  build?: Partial<BuildInfo>;
  metadata?: Partial<MetadataInfo>;
}
