// Shared constants and types for schema operations
import { getConfig } from '../config/config';

export const PATTERNS = {
  SQL_FILE: /bltcore-v(\d+\.\d+\.\d+)\.sql/,
  TABLE_NAME: /^table:\s*(.+)$/m,
  FUNCTION_NAME: /^function:\s*(.+)$/m,
  PROCEDURE_NAME: /^procedure:\s*(.+)$/m,
  FILE_NUMBER: /\d+/,
};

export function getPaths() {
  const config = getConfig();
  return {
    DIST: config.distPath,
    SCHEMA_BASE: config.schemaBase,
    INSTANCES_BASE: config.instancesPath || `${config.schemaBase}/instances`,
  };
}

export interface YamlFile {
  name: string;
  path: string;
  source: string;
}

export interface SqlFile {
  name: string;
  version: string;
  path: string;
}
