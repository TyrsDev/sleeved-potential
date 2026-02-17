import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import type {
  DeleteSnapshotInput,
  DeleteSnapshotOutput,
} from "@sleeved-potential/shared";
import { getResponseMeta } from "./utils/apiMeta.js";

export const deleteSnapshot = onCall<DeleteSnapshotInput, Promise<DeleteSnapshotOutput>>(
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

    const { snapshotId } = request.data;

    if (!snapshotId) {
      throw new HttpsError("invalid-argument", "snapshotId is required");
    }

    // Get the snapshot
    const snapshotRef = db.collection("snapshots").doc(snapshotId);
    const snapshotDoc = await snapshotRef.get();

    if (!snapshotDoc.exists) {
      throw new HttpsError("not-found", "Snapshot not found");
    }

    // Delete the snapshot
    await snapshotRef.delete();

    return {
      success: true,
      _meta: getResponseMeta(),
    };
  }
);
