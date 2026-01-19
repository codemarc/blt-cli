// Instance discovery and file listing utilities

import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getPaths } from "./constants";

/**
 * Get all available instance names from the instances directory
 */
export function getAvailableInstances(): string[] {
  const paths = getPaths();
  const instancesBase = join(process.cwd(), paths.INSTANCES_BASE);
  if (!existsSync(instancesBase)) {
    return [];
  }
  return readdirSync(instancesBase)
    .filter((item) => {
      const itemPath = join(instancesBase, item);
      return statSync(itemPath).isDirectory();
    })
    .sort();
}

/**
 * Get the default instance name (prefers "default" if it exists)
 */
export function getDefaultInstanceName(): string {
  const instances = getAvailableInstances();
  // Prefer "default" if it exists, otherwise use the first available instance
  if (instances.includes("default")) {
    return "default";
  }
  if (instances.length > 0) {
    return instances[0];
  }
  // Fallback if no instances found
  return "default";
}

/**
 * Get instance directory path
 */
export function getInstanceDir(instanceName: string): string {
  const paths = getPaths();
  return join(process.cwd(), paths.INSTANCES_BASE, instanceName);
}
