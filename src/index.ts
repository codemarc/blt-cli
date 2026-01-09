#!/usr/bin/env node
import { program } from "@caporal/core";
import dataCommand from "./commands/data";
import envCommand from "./commands/env";
import cleanupCommand from "./commands/cleanup";
import bucketCommand from "./commands/bucket";
import imageCommand from "./commands/image";


program
  .name("blt")
  .version("1.0.0")
  .description("BLT Core - Deployment and Management Tool");

  envCommand(program);
  dataCommand(program);
  cleanupCommand(program);
  bucketCommand(program);
  imageCommand(program);

program.run();