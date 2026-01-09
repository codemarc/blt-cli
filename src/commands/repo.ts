import type { Program } from "@caporal/core";
import debug from "debug";

const log = debug("blt:repo");

const REPOSITORIES = [
  {
    name: "data",
    url: "https://github.com/bltcore-com/blt-core-data.git",
  },
  {
    name: "pos",
    url: "https://github.com/bltcore-com/blt-core-pos.git",
  },
  {
    name: "gateway",
    url: "https://github.com/bltcore-com/blt-device-gateway.git",
  }
];

/**
 * Register repo commands with the CLI program
 */
export default function repoCommand(program: Program) {
  // Main repo command - shows help for subcommands
  program
    .command("repo", "Manage repository clones and working projects")
    .action(({ args, options, logger }) => {
      logger.info("Repository management commands:");
      logger.info("");
      logger.info("  blt repo list                    List all available repositories");
      logger.info("  blt repo clone <name>            Clone a repository by name");
      logger.info("");
      logger.info("Use 'blt repo <subcommand> --help' for more information on each command.");
    });

  // List all available repos
  program
    .command("repo list", "List all available repositories in the project")
    .option("-f, --format <format>", "Output format: table or json", {
      default: "table",
      validator: ["table", "json"],
    })
    .action(async ({ options, logger }) => {
      try {
        log("Listing all available repositories");
        REPOSITORIES.forEach((repo) => {
         console.log(`${repo.name}`);
        });
      } catch (error: any) {
        logger.error(error.message);
        process.exit(1);
      }
    });

  // Clone a repository
  program
    .command("repo clone", "Clone a repository by name")
    .argument("<name>", "Repository name (e.g., 'data')")
    .action(async ({ args, options, logger }) => {
      try {
        const repoName = args.name as string;
        log(`Cloning repository: ${repoName}`);
        // TODO: Implement repository cloning logic
        // This should execute: git clone <proper-path-for-blt-{repoName}>
        logger.info(`Clone functionality for '${repoName}' to be implemented`);
      } catch (error: any) {
        logger.error(error.message);
        process.exit(1);
      }
    });
}
