import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { subscribeToPublishedChangelogs } from "../firebase";
import type { ChangelogEntry, VersionInfo } from "@sleeved-potential/shared";
import { parseVersion, VERSION } from "@sleeved-potential/shared";

interface MinorGroup {
  minorVersion: number;
  label: string;
  entries: ChangelogEntry[];
}

interface MajorGroup {
  majorVersion: number;
  label: string;
  minorGroups: MinorGroup[];
}

function compareVersions(a: VersionInfo, b: VersionInfo): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function filterToCurrentVersion(entries: ChangelogEntry[]): ChangelogEntry[] {
  const currentVersion = parseVersion(VERSION);
  return entries.filter((entry) => {
    const entryVersion = parseVersion(entry.version);
    return compareVersions(entryVersion, currentVersion) <= 0;
  });
}

function groupEntries(entries: ChangelogEntry[]): MajorGroup[] {
  // Map: major -> minor -> entries
  const majorMap = new Map<number, Map<number, ChangelogEntry[]>>();

  for (const entry of entries) {
    const { major, minor } = parseVersion(entry.version);
    if (!majorMap.has(major)) majorMap.set(major, new Map());
    const minorMap = majorMap.get(major)!;
    if (!minorMap.has(minor)) minorMap.set(minor, []);
    minorMap.get(minor)!.push(entry);
  }

  const result: MajorGroup[] = [];

  for (const major of Array.from(majorMap.keys()).sort((a, b) => b - a)) {
    const minorMap = majorMap.get(major)!;
    const minorGroups: MinorGroup[] = [];

    for (const minor of Array.from(minorMap.keys()).sort((a, b) => b - a)) {
      const groupEntries = minorMap.get(minor)!;
      // Sort by patch descending within minor group
      groupEntries.sort((a, b) =>
        -compareVersions(parseVersion(a.version), parseVersion(b.version))
      );
      minorGroups.push({
        minorVersion: minor,
        label: `${major}.${minor}.x`,
        entries: groupEntries,
      });
    }

    result.push({
      majorVersion: major,
      label: `Version ${major}.x`,
      minorGroups,
    });
  }

  return result;
}

function getCategoryClass(category: ChangelogEntry["category"]): string {
  switch (category) {
    case "feature": return "category-feature";
    case "balance": return "category-balance";
    case "bugfix":  return "category-bugfix";
    default:        return "category-other";
  }
}

function getCategoryLabel(category: ChangelogEntry["category"]): string {
  switch (category) {
    case "feature": return "Feature";
    case "balance": return "Balance";
    case "bugfix":  return "Bug Fix";
    default:        return "Other";
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function Changelog() {
  const [changelogs, setChangelogs] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = subscribeToPublishedChangelogs((entries) => {
      setChangelogs(entries);
      setLoading(false);

      // Auto-expand the latest entry
      const visible = filterToCurrentVersion(entries);
      if (visible.length > 0) {
        const sorted = [...visible].sort((a, b) =>
          -compareVersions(parseVersion(a.version), parseVersion(b.version))
        );
        setExpandedIds(new Set([sorted[0].id]));
      }
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
    return (
      <div className="changelog-page">
        <h2>Changelog</h2>
        <div className="loading">Loading changelog...</div>
      </div>
    );
  }

  const visibleChangelogs = filterToCurrentVersion(changelogs);
  const groups = groupEntries(visibleChangelogs);

  return (
    <div className="changelog-page">
      <div className="changelog-page-header">
        <h2>Changelog</h2>
        <span className="changelog-current-version">v{VERSION}</span>
      </div>

      {groups.length === 0 ? (
        <div className="empty-state">
          <p>No changelog entries yet.</p>
        </div>
      ) : (
        groups.map((majorGroup) => (
          <section key={majorGroup.majorVersion} className="changelog-major-group">
            <h3 className="changelog-group-title">
              <span>{majorGroup.label}</span>
            </h3>

            {majorGroup.minorGroups.map((minorGroup) => (
              <div key={minorGroup.minorVersion} className="changelog-minor-group">
                <h4 className="changelog-minor-title">
                  <span>{minorGroup.label}</span>
                </h4>

                <div className="changelog-entries">
                  {minorGroup.entries.map((entry) => {
                    const isExpanded = expandedIds.has(entry.id);
                    const categoryClass = getCategoryClass(entry.category);
                    return (
                      <article
                        key={entry.id}
                        className={`changelog-entry ${categoryClass}`}
                      >
                        <button
                          className="changelog-entry-header"
                          onClick={() => toggleExpanded(entry.id)}
                          aria-expanded={isExpanded}
                        >
                          <div className="changelog-entry-meta">
                            <span className={`changelog-category-badge ${categoryClass}`}>
                              {getCategoryLabel(entry.category)}
                            </span>
                            <span className="changelog-version">v{entry.version}</span>
                            {entry.publishedAt && (
                              <span className="changelog-date">
                                {formatDate(entry.publishedAt)}
                              </span>
                            )}
                          </div>
                          <div className="changelog-entry-title-row">
                            <h5 className="changelog-title">{entry.title}</h5>
                            <span className={`changelog-chevron ${isExpanded ? "expanded" : ""}`}>
                              ›
                            </span>
                          </div>
                          <p className="changelog-summary">{entry.summary}</p>
                        </button>

                        {isExpanded && entry.details && (
                          <div className="changelog-details">
                            <div className="changelog-details-content">
                              <Markdown remarkPlugins={[remarkBreaks]}>
                                {entry.details}
                              </Markdown>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  );
}
