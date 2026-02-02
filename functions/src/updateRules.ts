import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import type {
  UpdateRulesInput,
  UpdateRulesOutput,
  GameRules,
} from "@sleeved-potential/shared";
import { DEFAULT_GAME_RULES } from "@sleeved-potential/shared";
import { getResponseMeta } from "./utils/apiMeta.js";

export const updateRules = onCall<UpdateRulesInput, Promise<UpdateRulesOutput>>(
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

    const { rules: updates } = request.data;

    // Get existing rules or create with defaults
    const rulesRef = db.collection("rules").doc("current");
    const rulesDoc = await rulesRef.get();

    const now = new Date().toISOString();

    let existingRules: GameRules;

    if (!rulesDoc.exists) {
      // Initialize with defaults
      existingRules = {
        id: "current",
        ...DEFAULT_GAME_RULES,
        updatedAt: now,
        updatedBy: userId,
      };
    } else {
      existingRules = rulesDoc.data() as GameRules;
    }

    // Build update object, validating numbers
    const updatedRules: GameRules = {
      ...existingRules,
      updatedAt: now,
      updatedBy: userId,
      version: existingRules.version + 1,
    };

    // Apply updates with validation
    if (updates.pointsForSurviving !== undefined) {
      if (typeof updates.pointsForSurviving !== "number" || updates.pointsForSurviving < 0) {
        throw new HttpsError("invalid-argument", "pointsForSurviving must be a non-negative number");
      }
      updatedRules.pointsForSurviving = updates.pointsForSurviving;
    }

    if (updates.pointsForDefeating !== undefined) {
      if (typeof updates.pointsForDefeating !== "number" || updates.pointsForDefeating < 0) {
        throw new HttpsError("invalid-argument", "pointsForDefeating must be a non-negative number");
      }
      updatedRules.pointsForDefeating = updates.pointsForDefeating;
    }

    if (updates.pointsToWin !== undefined) {
      if (typeof updates.pointsToWin !== "number" || updates.pointsToWin < 1) {
        throw new HttpsError("invalid-argument", "pointsToWin must be at least 1");
      }
      updatedRules.pointsToWin = updates.pointsToWin;
    }

    if (updates.startingEquipmentHand !== undefined) {
      if (typeof updates.startingEquipmentHand !== "number" || updates.startingEquipmentHand < 0) {
        throw new HttpsError("invalid-argument", "startingEquipmentHand must be a non-negative number");
      }
      updatedRules.startingEquipmentHand = updates.startingEquipmentHand;
    }

    if (updates.equipmentDrawPerRound !== undefined) {
      if (typeof updates.equipmentDrawPerRound !== "number" || updates.equipmentDrawPerRound < 0) {
        throw new HttpsError("invalid-argument", "equipmentDrawPerRound must be a non-negative number");
      }
      updatedRules.equipmentDrawPerRound = updates.equipmentDrawPerRound;
    }

    if (updates.startingAnimalHand !== undefined) {
      if (typeof updates.startingAnimalHand !== "number" || updates.startingAnimalHand < 1) {
        throw new HttpsError("invalid-argument", "startingAnimalHand must be at least 1");
      }
      updatedRules.startingAnimalHand = updates.startingAnimalHand;
    }

    if (updates.defaultInitiative !== undefined) {
      if (typeof updates.defaultInitiative !== "number") {
        throw new HttpsError("invalid-argument", "defaultInitiative must be a number");
      }
      updatedRules.defaultInitiative = updates.defaultInitiative;
    }

    if (updates.customRules !== undefined) {
      updatedRules.customRules = updates.customRules;
    }

    // Save the updated rules
    await rulesRef.set(updatedRules);

    return {
      rules: updatedRules,
      _meta: getResponseMeta(),
    };
  }
);
