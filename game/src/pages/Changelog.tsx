import { useEffect, useState } from "react";
import { subscribeToPublishedChangelogs } from "../firebase";
import type { ChangelogEntry, VersionInfo } from "@sleeved-potential/shared";
import { parseVersion, VERSION } from "@sleeved-potential/shared";

interface ChangelogGroup {
  majorVersion: number;
  label: string;
  entries: ChangelogEntry[];
}

/**
 * Compare two versions. Returns:
 *  -1 if a < b
 *   0 if a == b
 *   1 if a > b
 */
function compareVersions(a: VersionInfo, b: VersionInfo): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

/**
 * Filter entries to only include versions <= current app version
 * Users shouldn't see changelog for versions they don't have yet
 */
function filterToCurrentVersion(entries: ChangelogEntry[]): ChangelogEntry[] {
  const currentVersion = parseVersion(VERSION);
  return entries.filter((entry) => {
    const entryVersion = parseVersion(entry.version);
    return compareVersions(entryVersion, currentVersion) <= 0;
  });
}

/**
 * Group changelog entries by major version
 */
function groupByMajorVersion(entries: ChangelogEntry[]): ChangelogGroup[] {
  const groups = new Map<number, ChangelogEntry[]>();

  for (const entry of entries) {
    const { major } = parseVersion(entry.version);
    if (!groups.has(major)) {
      groups.set(major, []);
    }
    groups.get(major)!.push(entry);
  }

  // Convert to array and sort by major version descending
  const result: ChangelogGroup[] = [];
  const sortedMajors = Array.from(groups.keys()).sort((a, b) => b - a);

  for (const major of sortedMajors) {
    const groupEntries = groups.get(major)!;
    // Sort entries within group by version descending
    groupEntries.sort((a, b) => {
      const vA = parseVersion(a.version);
      const vB = parseVersion(b.version);
      if (vB.major !== vA.major) return vB.major - vA.major;
      if (vB.minor !== vA.minor) return vB.minor - vA.minor;
      return vB.patch - vA.patch;
    });

    result.push({
      majorVersion: major,
      label: `Version ${major}.x`,
      entries: groupEntries,
    });
  }

  return result;
}

function getCategoryBadgeClass(category: ChangelogEntry["category"]): string {
  switch (category) {
    case "feature":
      return "badge-feature";
    case "balance":
      return "badge-balance";
    case "bugfix":
      return "badge-bugfix";
    default:
      return "badge-other";
  }
}

function getCategoryLabel(category: ChangelogEntry["category"]): string {
  switch (category) {
    case "feature":
      return "Feature";
    case "balance":
      return "Balance";
    case "bugfix":
      return "Bug Fix";
    default:
      return "Other";
  }
}

export function Changelog() {
  const [changelogs, setChangelogs] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = subscribeToPublishedChangelogs((entries) => {
      setChangelogs(entries);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (loading) {
    return <div className="loading">Loading changelog...</div>;
  }

  // Only show changelogs for versions <= current app version
  const visibleChangelogs = filterToCurrentVersion(changelogs);
  const groups = groupByMajorVersion(visibleChangelogs);

  return (
    <div className="changelog-page">
      <h2>Changelog</h2>
      <p className="version-info">Current version: {VERSION}</p>

      {groups.length === 0 ? (
        <div className="empty-state">
          <p>No changelog entries yet.</p>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.majorVersion} className="changelog-group">
            <h3 className="changelog-group-title">{group.label}</h3>
            <div className="changelog-entries">
              {group.entries.map((entry) => (
                <article key={entry.id} className="changelog-entry">
                  <header
                    className="changelog-entry-header"
                    onClick={() => toggleExpanded(entry.id)}
                  >
                    <div className="changelog-entry-title-row">
                      <span className="changelog-version">{entry.version}</span>
                      <h4 className="changelog-title">{entry.title}</h4>
                      <span
                        className={`badge changelog-category ${getCategoryBadgeClass(entry.category)}`}
                      >
                        {getCategoryLabel(entry.category)}
                      </span>
                    </div>
                    <p className="changelog-summary">{entry.summary}</p>
                    {entry.publishedAt && (
                      <time className="changelog-date">
                        {new Date(entry.publishedAt).toLocaleDateString()}
                      </time>
                    )}
                  </header>
                  {expandedIds.has(entry.id) && entry.details && (
                    <div className="changelog-details">
                      <pre className="changelog-details-content">{entry.details}</pre>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
