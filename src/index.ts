#!/usr/bin/env node
import { program } from "@caporal/core";
import dataCommand from "./commands/data";
import envCommand from "./commands/env";
import cleanupCommand from "./commands/cleanup";
import bucketCommand from "./commands/bucket";
import imageCommand from "./commands/image";
import repoCommand from "./commands/repo";


program
  .name("blt")
  .version("1.0.0")
  .description("BLT Core Cli");

  envCommand(program);
  dataCommand(program);
  cleanupCommand(program);
  bucketCommand(program);
  imageCommand(program);
  repoCommand(program);

// If no command is provided, show help
const args = process.argv.slice(2);
if (args.length === 0) {
  process.argv.push('--help');
}

program.run();