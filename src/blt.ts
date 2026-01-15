#!/usr/bin/env bun
import { program } from "@caporal/core";
// import bucketCommand from "./commands/bucket";
// import checkCommand from "./commands/check";
// import cleanupCommand from "./commands/cleanup";
// import dataCommand from "./commands/data";
// import envCommand from "./commands/env";
import imageCommand from "./commands/image";
import versionCommand from "./commands/version";

// 0import repoCommand from "./commands/repo";

import { join, dirname } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname,  "..", "package.json");

export function getPackageVersion(): string {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  return packageJson.version;
}


program.name("blt")
	.version(getPackageVersion())
	.description("BLT Core Cli");

  imageCommand(program);
  versionCommand(program);

// If no command is provided, show help
const args = process.argv.slice(2);
if (args.length === 0) {
  process.argv.push('--help');
}


program.run();
