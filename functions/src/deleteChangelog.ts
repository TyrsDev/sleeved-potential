import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import type {
  DeleteChangelogInput,
  DeleteChangelogOutput,
  ChangelogEntry,
} from "@sleeved-potential/shared";
import { getResponseMeta } from "./utils/apiMeta.js";

export const deleteChangelog = onCall<DeleteChangelogInput, Promise<DeleteChangelogOutput>>(
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

    const { changelogId } = request.data;

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

    // Only allow deletion of drafts
    if (existingChangelog.status !== "draft") {
      throw new HttpsError(
        "failed-precondition",
        "Cannot delete published changelogs. Only drafts can be deleted."
      );
    }

    // Delete the changelog
    await changelogRef.delete();

    return {
      success: true,
      _meta: getResponseMeta(),
    };
  }
);
