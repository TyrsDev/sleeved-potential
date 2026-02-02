import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import type {
  CreateChangelogInput,
  CreateChangelogOutput,
  ChangelogEntry,
} from "@sleeved-potential/shared";
import { getResponseMeta } from "./utils/apiMeta.js";

const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;

export const createChangelog = onCall<CreateChangelogInput, Promise<CreateChangelogOutput>>(
  { region: "europe-west1" },
  async (request) => {
    const db = getFirestore();

    // Verify user is authenticated
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }

    const userId = request.auth.uid;

    // Check if user has ADMIN role
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new HttpsError("permission-denied", "User not found");
    }

    const userData = userDoc.data();
    if (!userData?.roles?.includes("ADMIN")) {
      throw new HttpsError("permission-denied", "Admin role required");
    }

    const { changelog } = request.data;

    // Validate version format (semver)
    if (!changelog.version || !SEMVER_REGEX.test(changelog.version)) {
      throw new HttpsError(
        "invalid-argument",
        "Version must be in semantic version format (e.g., 1.2.0)"
      );
    }

    // Validate required fields
    if (!changelog.title || changelog.title.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Title is required");
    }

    if (!changelog.summary || changelog.summary.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Summary is required");
    }

    if (!changelog.category) {
      throw new HttpsError("invalid-argument", "Category is required");
    }

    const validCategories = ["feature", "balance", "bugfix", "other"];
    if (!validCategories.includes(changelog.category)) {
      throw new HttpsError("invalid-argument", "Invalid category");
    }

    // Create changelog document
    const now = new Date().toISOString();
    const changelogRef = db.collection("changelogs").doc();

    const changelogEntry: ChangelogEntry = {
      id: changelogRef.id,
      version: changelog.version,
      title: changelog.title.trim(),
      summary: changelog.summary.trim(),
      details: changelog.details || "",
      category: changelog.category,
      status: "draft",
      publishedAt: null,
      publishedBy: null,
      createdAt: now,
      updatedAt: now,
    };

    await changelogRef.set(changelogEntry);

    return {
      changelog: changelogEntry,
      _meta: getResponseMeta(),
    };
  }
);
