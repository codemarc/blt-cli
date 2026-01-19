import { executeQuery } from "../../lib/database-runner";
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

interface DbOptions {
  short?: boolean;
  full?: boolean;
  date?: boolean;
  only?: boolean;
}

/**
 * Display version from database as a formatted string
 */
export async function showDb(options: DbOptions, logger: Logger): Promise<void> {
  try {
    // Query the settings table for the version record
    const query = `
      SELECT props
      FROM settings
      WHERE id = '00000000-0000-0000-0000-ffffffffffff'
        AND name = 'version'
        AND kind = 'meta'
      LIMIT 1;
    `;

    const results = await executeQuery<{ props: VersionInfo }>(query);

    if (results.length === 0) {
      logger.error("Version record not found in settings table. Run 'blt version sql' to insert version information.");
      process.exit(1);
    }

    const versionInfo = results[0].props;

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
    logger.error(`Failed to read version from database: ${message}`);
    process.exit(1);
  }
}
