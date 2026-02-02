/**
 * Changelog types for version tracking and release notes
 */

export type ChangelogCategory = "feature" | "balance" | "bugfix" | "other";
export type ChangelogStatus = "draft" | "published";

export interface ChangelogEntry {
  id: string;
  version: string; // Semantic version, e.g., "1.2.0"
  title: string; // Short title, e.g., "Balance Update"
  summary: string; // Brief description
  details: string; // Full markdown content
  category: ChangelogCategory;
  status: ChangelogStatus;
  publishedAt: string | null; // ISO 8601 string, null if draft
  publishedBy: string | null; // User ID who published, null if draft
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
}

export interface CreateChangelogData {
  version: string;
  title: string;
  summary: string;
  details: string;
  category: ChangelogCategory;
}

export interface UpdateChangelogData {
  version?: string;
  title?: string;
  summary?: string;
  details?: string;
  category?: ChangelogCategory;
}
