/**
 * Game Rules Configuration
 *
 * Stored in Firestore at rules/current
 * Snapshotted at game start - changes only affect new games
 */
export interface GameRules {
  id: string;
  version: number;

  // Scoring
  pointsForSurviving: number; // default: 1
  pointsForDefeating: number; // default: 2
  pointsToWin: number; // default: 15

  // Card draw
  startingEquipmentHand: number; // default: 5
  equipmentDrawPerRound: number; // default: 1
  startingAnimalHand: number; // default: 3

  // Combat
  defaultInitiative: number; // default: 0

  // New scoring (v1.2.0)
  maxRounds: number; // default: 5
  pointsForKill: number; // default: 3
  pointsPerOverkill: number; // default: 1
  pointsPerAbsorbed: number; // default: 1

  // Future extensibility
  customRules?: Record<string, unknown>;

  updatedAt: string; // ISO 8601
  updatedBy: string; // User ID of admin who last updated
}

/**
 * Default game rules
 */
export const DEFAULT_GAME_RULES: Omit<GameRules, "id" | "updatedAt" | "updatedBy"> = {
  version: 1,
  pointsForSurviving: 1,
  pointsForDefeating: 2,
  pointsToWin: 15,
  startingEquipmentHand: 5,
  equipmentDrawPerRound: 1,
  startingAnimalHand: 3,
  defaultInitiative: 0,
  maxRounds: 5,
  pointsForKill: 3,
  pointsPerOverkill: 1,
  pointsPerAbsorbed: 1,
};

/**
 * Data for updating game rules
 */
export interface UpdateRulesData {
  pointsForSurviving?: number;
  pointsForDefeating?: number;
  pointsToWin?: number;
  startingEquipmentHand?: number;
  equipmentDrawPerRound?: number;
  startingAnimalHand?: number;
  defaultInitiative?: number;
  maxRounds?: number;
  pointsForKill?: number;
  pointsPerOverkill?: number;
  pointsPerAbsorbed?: number;
  customRules?: Record<string, unknown>;
}
