import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { format as formatBuildNumber } from 'build-number-generator';
import type { Logger } from "@caporal/core";

interface VersionInfo {
  buildnum: string;
  component: string;
  version: string;
  build: {
    commit: string;
    branch: string;
    time: string;
  };
}

interface StringOptions {
  short?: boolean;
  full?: boolean;
  date?: boolean;
  only?: boolean;
}

/**
 * Display version as a formatted string
 */
export function displayVersionString(options: StringOptions, logger: Logger): void {
  try {
    const rootDir = process.cwd();
    const versionJsonPath = join(rootDir, "version.json");

    if (!existsSync(versionJsonPath)) {
      logger.error("version.json not found. Run 'blt version update' first.");
      process.exit(1);
    }

    const versionInfo: VersionInfo = JSON.parse(readFileSync(versionJsonPath, "utf-8"));
    
    // Determine format: default to short, --full overrides to full
    const useFull = options.full === true;
    const useShort = options.short === true;
    const useDate = options.date === true;
    const useOnly = options.only === true;

    let versionString: string;
    let buildnumString: string;

    if (useDate) {
      buildnumString = formatBuildNumber(versionInfo.buildnum);
    } else {
      buildnumString = versionInfo.buildnum;
    }


    if (useFull) {
      // Full format: component vversion.buildnum - branch hash(full-commit)
      versionString = `${versionInfo.component} v${versionInfo.version} ${buildnumString} - ${versionInfo.build.branch} hash(${versionInfo.build.commit})`;
    } else if (useShort) {
      versionString = `${versionInfo.component} v${versionInfo.version} ${buildnumString}`;
    } else if (useOnly) {
      versionString = buildnumString;
    } else {
      // defaultShort format: component vversion buildnum - branch (short-commit)
      const shortCommit = versionInfo.build.commit?.substring(0, 7) ?? "";
      versionString = `${versionInfo.component} v${versionInfo.version} ${buildnumString} - ${versionInfo.build.branch} (${shortCommit})`;
    }
    
    console.log(versionString);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to read version.json: ${message}`);
    process.exit(1);
  }
}
