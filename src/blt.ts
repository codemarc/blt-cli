#!/usr/bin/env bun
import { program } from "@caporal/core";
import bucketCommand from "./commands/bucket";
import buildCommand from "./commands/build";
import deployCommand from "./commands/deploy";
import imageCommand from "./commands/image";
import initCommand from "./commands/init";
import pdfCommand from "./commands/pdf";
import versionCommand from "./commands/version";
import showCommand from "./commands/show";
import cleanupCommand from "./commands/cleanup";

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
  initCommand(program);
  pdfCommand(program);
  versionCommand(program);
  buildCommand(program);
  deployCommand(program);
  bucketCommand(program);
  showCommand(program);
  cleanupCommand(program);

// If no command is provided, show help
const args = process.argv.slice(2);
if (args.length === 0) {
  process.argv.push('--help');
}
program.run();
