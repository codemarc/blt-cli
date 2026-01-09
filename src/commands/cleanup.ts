import { Program } from "@caporal/core";
import fs, { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getPaths } from '../lib/constants';

/**
 * Register cleanup commands with the CLI program
 */
export default function cleanupCommand(program: Program) {
  program
    .command("cleanup", "Cleanup generated SQL files and combined schema files")
    .action(async ({ args, options, logger }) => {
      const paths = getPaths();

      console.log(`Cleaning generated SQL files and combined schema files`)
      fs.rmSync(join(process.cwd(), paths.DIST, 'public.sql'), { recursive: true, force: true })
      fs.rmSync(join(process.cwd(), paths.DIST, 'data.sql'), { recursive: true, force: true })

      console.log(`Removed generated instance files`)
      const instancesPath = join(process.cwd(), paths.INSTANCES_BASE);
      if (existsSync(instancesPath)) {
        // Clean all instance SQL directories
        const instances = readdirSync(instancesPath);
        instances.forEach(instance => {
          const sqlPath = join(instancesPath, instance, 'sql');
          fs.rmSync(sqlPath, { recursive: true, force: true });
          console.log(`  Removed ${instance}/sql/`);
        });
      }
    });
  };
