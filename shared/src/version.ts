/**
 * Version constant shared across all packages
 */
export const VERSION = "1.1.3";

export interface VersionInfo {
  version: string;
  major: number;
  minor: number;
  patch: number;
}

/**
 * Parse a semantic version string into its components
 */
export function parseVersion(version: string): VersionInfo {
  const [major, minor, patch] = version.split(".").map(Number);
  return { version, major, minor, patch };
}
