import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import type {
  UpdateChangelogInput,
  UpdateChangelogOutput,
  ChangelogEntry,
} from "@sleeved-potential/shared";
import { getResponseMeta } from "./utils/apiMeta.js";

const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;

export const updateChangelog = onCall<UpdateChangelogInput, Promise<UpdateChangelogOutput>>(
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

    const { changelogId, updates } = request.data;

    if (!changelogId) {
      throw new HttpsError("invalid-argument", "changelogId is required");
    }

    // Get the changelog
    const changelogRef = db.collection("changelogs").doc(changelogId);
    const changelogDoc = await changelogRef.get();

    if (!changelogDoc.exists) {
      throw new HttpsError("not-found", "Changelog not found");
    }

    const existingChangelog = changelogDoc.data() as ChangelogEntry;

    // Only allow updates to drafts
    if (existingChangelog.status !== "draft") {
      throw new HttpsError(
        "failed-precondition",
        "Can only update draft changelogs. Published changelogs cannot be modified."
      );
    }

    // Validate version format if provided
    if (updates.version !== undefined && !SEMVER_REGEX.test(updates.version)) {
      throw new HttpsError(
        "invalid-argument",
        "Version must be in semantic version format (e.g., 1.2.0)"
      );
    }

    // Validate category if provided
    if (updates.category !== undefined) {
      const validCategories = ["feature", "balance", "bugfix", "other"];
      if (!validCategories.includes(updates.category)) {
        throw new HttpsError("invalid-argument", "Invalid category");
      }
    }

    // Build update object
    const now = new Date().toISOString();
    const updateData: Partial<ChangelogEntry> = {
      updatedAt: now,
    };

    if (updates.version !== undefined) {
      updateData.version = updates.version;
    }
    if (updates.title !== undefined) {
      updateData.title = updates.title.trim();
    }
    if (updates.summary !== undefined) {
      updateData.summary = updates.summary.trim();
    }
    if (updates.details !== undefined) {
      updateData.details = updates.details;
    }
    if (updates.category !== undefined) {
      updateData.category = updates.category;
    }

    await changelogRef.update(updateData);

    // Get updated document
    const updatedDoc = await changelogRef.get();
    const updatedChangelog = updatedDoc.data() as ChangelogEntry;

    return {
      changelog: updatedChangelog,
      _meta: getResponseMeta(),
    };
  }
);
