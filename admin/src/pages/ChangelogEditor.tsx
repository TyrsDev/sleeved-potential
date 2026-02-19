import { useEffect, useState } from "react";
import {
  subscribeToChangelogs,
  createChangelog,
  updateChangelog,
  publishChangelog,
  deleteChangelog,
} from "../firebase";
import type {
  ChangelogEntry,
  ChangelogCategory,
  CreateChangelogData,
  UpdateChangelogData,
} from "@sleeved-potential/shared";
import { VERSION } from "@sleeved-potential/shared";

const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;

const CATEGORY_OPTIONS: { value: ChangelogCategory; label: string }[] = [
  { value: "feature", label: "Feature" },
  { value: "balance", label: "Balance" },
  { value: "bugfix", label: "Bug Fix" },
  { value: "other", label: "Other" },
];

interface FormData {
  version: string;
  title: string;
  summary: string;
  details: string;
  category: ChangelogCategory;
}

const EMPTY_FORM: FormData = {
  version: "",
  title: "",
  summary: "",
  details: "",
  category: "feature",
};

export function ChangelogEditor() {
  const [changelogs, setChangelogs] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);

  // Confirmation state (replaces browser confirm dialogs)
  const [pendingAction, setPendingAction] = useState<{
    type: "publish" | "delete";
    entry: ChangelogEntry;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToChangelogs((entries) => {
      setChangelogs(entries);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setError(null);
  };

  const startEditing = (entry: ChangelogEntry) => {
    setEditingId(entry.id);
    setFormData({
      version: entry.version,
      title: entry.title,
      summary: entry.summary,
      details: entry.details,
      category: entry.category,
    });
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.version.trim()) {
      setError("Version is required");
      return false;
    }
    if (!SEMVER_REGEX.test(formData.version.trim())) {
      setError("Version must be in format X.Y.Z (e.g., 1.2.0)");
      return false;
    }
    if (!formData.title.trim()) {
      setError("Title is required");
      return false;
    }
    if (!formData.summary.trim()) {
      setError("Summary is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      if (editingId) {
        // Update existing
        const updates: UpdateChangelogData = {
          version: formData.version.trim(),
          title: formData.title.trim(),
          summary: formData.summary.trim(),
          details: formData.details,
          category: formData.category,
        };
        await updateChangelog(editingId, updates);
        setSuccess("Changelog updated successfully");
      } else {
        // Create new
        const data: CreateChangelogData = {
          version: formData.version.trim(),
          title: formData.title.trim(),
          summary: formData.summary.trim(),
          details: formData.details,
          category: formData.category,
        };
        await createChangelog(data);
        setSuccess("Changelog created successfully");
      }
      resetForm();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changelog");
    } finally {
      setSaving(false);
    }
  };

  const requestPublish = (entry: ChangelogEntry) => {
    if (entry.status === "published") return;
    setPendingAction({ type: "publish", entry });
  };

  const requestDelete = (entry: ChangelogEntry) => {
    if (entry.status === "published") {
      setError("Cannot delete published changelogs");
      return;
    }
    setPendingAction({ type: "delete", entry });
  };

  const cancelPendingAction = () => {
    setPendingAction(null);
  };

  const confirmPendingAction = async () => {
    if (!pendingAction) return;

    const { type, entry } = pendingAction;
    setPendingAction(null);
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      if (type === "publish") {
        await publishChangelog(entry.id);
        setSuccess("Changelog published successfully");
      } else {
        await deleteChangelog(entry.id);
        if (editingId === entry.id) {
          resetForm();
        }
        setSuccess("Changelog deleted successfully");
      }
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${type} changelog`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading changelogs...</div>;
  }

  const drafts = changelogs.filter((c) => c.status === "draft");
  const published = changelogs.filter((c) => c.status === "published");

  return (
    <div className="changelog-editor-page">
      <h2>Changelog Editor</h2>
      <p className="help-text">
        Manage version changelog entries. Current version: <strong>{VERSION}</strong>
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="changelog-editor-layout">
        <section className="changelog-form-section">
          <h3>{editingId ? "Edit Entry" : "Create New Entry"}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="version">Version</label>
                <input
                  id="version"
                  type="text"
                  placeholder="1.2.0"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  pattern="\d+\.\d+\.\d+"
                  required
                />
                <small>Semantic version (X.Y.Z)</small>
              </div>
              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as ChangelogCategory })
                  }
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input
                id="title"
                type="text"
                placeholder="Balance Update"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="summary">Summary</label>
              <input
                id="summary"
                type="text"
                placeholder="Brief description of changes"
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                required
              />
              <small>Short description shown in list view</small>
            </div>

            <div className="form-group">
              <label htmlFor="details">Details</label>
              <textarea
                id="details"
                rows={8}
                placeholder="Detailed changelog content..."
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              />
              <small>Full details (shown when expanded)</small>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Save Changes" : "Create Draft"}
              </button>
              {editingId && (
                <button type="button" className="btn" onClick={resetForm} disabled={saving}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="changelog-list-section">
          <h3>Drafts ({drafts.length})</h3>
          {drafts.length === 0 ? (
            <p className="empty-state">No drafts</p>
          ) : (
            <div className="changelog-list">
              {drafts.map((entry) => (
                <div
                  key={entry.id}
                  className={`changelog-list-item ${editingId === entry.id ? "editing" : ""}`}
                >
                  <div className="changelog-item-header">
                    <span className="changelog-version">{entry.version}</span>
                    <span className={`badge badge-${entry.category}`}>{entry.category}</span>
                    <span className="badge badge-draft">Draft</span>
                  </div>
                  <div className="changelog-item-title">{entry.title}</div>
                  <div className="changelog-item-summary">{entry.summary}</div>
                  <div className="changelog-item-actions">
                    <button
                      className="btn btn-small"
                      onClick={() => startEditing(entry)}
                      disabled={saving}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-small btn-primary"
                      onClick={() => requestPublish(entry)}
                      disabled={saving}
                    >
                      Publish
                    </button>
                    <button
                      className="btn btn-small btn-danger"
                      onClick={() => requestDelete(entry)}
                      disabled={saving}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h3>Published ({published.length})</h3>
          {published.length === 0 ? (
            <p className="empty-state">No published entries</p>
          ) : (
            <div className="changelog-list">
              {published.map((entry) => (
                <div key={entry.id} className="changelog-list-item published">
                  <div className="changelog-item-header">
                    <span className="changelog-version">{entry.version}</span>
                    <span className={`badge badge-${entry.category}`}>{entry.category}</span>
                    <span className="badge badge-published">Published</span>
                  </div>
                  <div className="changelog-item-title">{entry.title}</div>
                  <div className="changelog-item-summary">{entry.summary}</div>
                  {entry.publishedAt && (
                    <div className="changelog-item-date">
                      Published: {new Date(entry.publishedAt).toLocaleString()}
                    </div>
                  )}
                  <div className="changelog-item-actions">
                    <button
                      className={`btn btn-small ${editingId === entry.id ? "" : ""}`}
                      onClick={() => startEditing(entry)}
                      disabled={saving}
                    >
                      {editingId === entry.id ? "Editing..." : "Edit"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Confirmation Modal */}
      {pendingAction && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>
              {pendingAction.type === "publish" ? "Publish Changelog" : "Delete Draft"}
            </h3>
            <p>
              {pendingAction.type === "publish"
                ? `Publish "${pendingAction.entry.title}" (v${pendingAction.entry.version})? This cannot be undone.`
                : `Delete draft "${pendingAction.entry.title}"? This cannot be undone.`}
            </p>
            <div className="modal-actions">
              <button className="btn" onClick={cancelPendingAction}>
                Cancel
              </button>
              <button
                className={`btn ${pendingAction.type === "delete" ? "btn-danger" : "btn-primary"}`}
                onClick={confirmPendingAction}
              >
                {pendingAction.type === "publish" ? "Publish" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
