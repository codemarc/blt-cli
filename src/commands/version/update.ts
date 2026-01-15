#!/usr/bin/env bun

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

interface VersionInfo {
  component: string;
  version: string;
  runtime: {
    type: string;
    version: string;
  };
  build: {
    commit: string;
    branch: string;
    time: string;
  };
  metadata: {
    packageManager: string;
    packageManagerVersion: string;
  };
}

function getGitCommit(rootDir: string): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf-8", cwd: rootDir }).trim();
  } catch {
    return "";
  }
}

function getGitBranch(rootDir: string): string {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8", cwd: rootDir }).trim();
  } catch {
    return "";
  }
}

function getBuildTime(): string {
  return new Date().toISOString();
}

function getRuntimeVersion(): string {
  try {
    if (typeof Bun !== "undefined") {
      return Bun.version;
    }
    // Fallback to node version
    return process.versions.node ? `v${process.versions.node}` : "";
  } catch {
    return "";
  }
}

function getPackageManagerVersion(): string {
  try {
    if (typeof Bun !== "undefined") {
      return Bun.version;
    }
    // Try npm
    const npmVersion = execSync("npm --version", { encoding: "utf-8" }).trim();
    if (npmVersion) return npmVersion;
  } catch {
    // Ignore errors
  }
  return "";
}

function getPackageManager(rootDir: string): string {
  if (typeof Bun !== "undefined") {
    return "bun";
  }
  // Check for packageManager field in package.json
  try {
    const packageJsonPath = join(rootDir, "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    if (packageJson.packageManager) {
      return packageJson.packageManager.split("@")[0];
    }
  } catch {
    // Ignore errors
  }
  return "npm";
}

function getRuntimeType(): string {
  if (typeof Bun !== "undefined") {
    return "bun";
  }
  return "node";
}

/**
 * Detect component name from package.json or directory
 */
function detectComponentName(packageJson: { name?: string; version?: string }, rootDir: string): string {
  // Try to extract component name from package.json name
  if (packageJson.name) {
    // Handle scoped packages like "@codemarc/blt" -> "cli"
    const nameParts = packageJson.name.split("/");
    const lastPart = nameParts[nameParts.length - 1];
    
    // Map known package names to component names
    if (lastPart === "blt" || lastPart === "blt-cli") return "cli";
    if (lastPart === "blt-core-pos") return "pos";
    if (lastPart === "blt-core-devops") return "devops";
    if (lastPart === "data") return "data";
    if (lastPart === "deploy") return "deploy";
    
    return lastPart;
  }
  
  // Fallback to directory name
  const pathParts = rootDir.split("/");
  const dirName = pathParts[pathParts.length - 1];
  return dirName || "unknown";
}

/**
 * Create a default version.json structure
 */
function createDefaultVersionInfo(packageJson: { name?: string; version?: string }, rootDir: string): VersionInfo {
  return {
    component: detectComponentName(packageJson, rootDir),
    version: packageJson.version || "0.0.0",
    runtime: {
      type: getRuntimeType(),
      version: getRuntimeVersion(),
    },
    build: {
      commit: getGitCommit(rootDir),
      branch: getGitBranch(rootDir),
      time: getBuildTime(),
    },
    metadata: {
      packageManager: getPackageManager(rootDir),
      packageManagerVersion: getPackageManagerVersion(),
    },
  };
}

/**
 * Update the version.json file with the current build information
 * @param rootDir - The root directory of the project
 * @returns void
 */
export function updateVersion(rootDir: string = process.cwd()): void {
  const versionJsonPath = join(rootDir, "version.json");
  const packageJsonPath = join(rootDir, "package.json");

  // Read package.json for version
  let packageJson: { name?: string; version?: string; packageManager?: string };
  try {
    packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  } catch {
    throw new Error("Failed to read package.json");
  }

  // Read current version.json or create default
  let versionInfo: VersionInfo;
  if (existsSync(versionJsonPath)) {
    try {
      versionInfo = JSON.parse(readFileSync(versionJsonPath, "utf-8"));
    } catch {
      // If file exists but is invalid, create default
      versionInfo = createDefaultVersionInfo(packageJson, rootDir);
    }
  } else {
    // File doesn't exist, create default structure
    versionInfo = createDefaultVersionInfo(packageJson, rootDir);
  }

  // Update version info
  versionInfo.version = packageJson.version || "0.0.0";
  versionInfo.runtime.type = getRuntimeType();
  versionInfo.runtime.version = getRuntimeVersion();
  versionInfo.build.commit = getGitCommit(rootDir);
  versionInfo.build.branch = getGitBranch(rootDir);
  versionInfo.build.time = getBuildTime();
  versionInfo.metadata.packageManager = getPackageManager(rootDir);
  versionInfo.metadata.packageManagerVersion = getPackageManagerVersion();

  // Write updated version.json
  writeFileSync(versionJsonPath, `${JSON.stringify(versionInfo, null, 2)}\n`);
  console.log("Updated version.json");
}

// Allow running as a script
if (import.meta.main) {
  updateVersion();
}