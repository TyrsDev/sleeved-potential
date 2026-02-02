/**
 * ELO rating calculation utilities
 */

/** Default ELO rating for new players */
export const DEFAULT_ELO = 1500;

/** K-factor for players with fewer than GAMES_UNTIL_ESTABLISHED games */
export const K_FACTOR_NEW = 40;

/** K-factor for established players */
export const K_FACTOR_ESTABLISHED = 20;

/** Number of games before a player is considered established */
export const GAMES_UNTIL_ESTABLISHED = 30;

/**
 * Get the K-factor for a player based on their games played.
 * New players (< 30 games) get K=40 for faster rating adjustment.
 * Established players (>= 30 games) get K=20 for more stable ratings.
 */
export function getKFactor(gamesPlayed: number): number {
  return gamesPlayed < GAMES_UNTIL_ESTABLISHED ? K_FACTOR_NEW : K_FACTOR_ESTABLISHED;
}

/**
 * Calculate the expected score (probability of winning) for a player.
 * Uses the standard ELO formula: E = 1 / (1 + 10^((opponentElo - playerElo) / 400))
 *
 * @param playerElo - The player's current ELO rating
 * @param opponentElo - The opponent's current ELO rating
 * @returns Expected score between 0 and 1
 */
export function calculateExpectedScore(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

/**
 * Calculate the new ELO rating after a game.
 *
 * @param oldRating - The player's rating before the game
 * @param expectedScore - The expected score (from calculateExpectedScore)
 * @param actualScore - The actual game result: 1 = win, 0.5 = draw, 0 = loss
 * @param k - The K-factor to use
 * @returns The new rating (rounded to nearest integer)
 */
export function calculateNewRating(
  oldRating: number,
  expectedScore: number,
  actualScore: number,
  k: number
): number {
  return Math.round(oldRating + k * (actualScore - expectedScore));
}

/**
 * Game result type for ELO calculation
 */
export type GameResult = "win" | "loss" | "draw";

/**
 * Calculate the ELO change for a player after a game.
 * This is the main function to use when updating ratings.
 *
 * @param playerElo - The player's current ELO rating
 * @param opponentElo - The opponent's current ELO rating
 * @param playerGamesPlayed - Number of games the player has played (for K-factor)
 * @param result - The game result from the player's perspective
 * @returns Object with newElo and eloChange (can be negative)
 */
export function calculateEloChange(
  playerElo: number,
  opponentElo: number,
  playerGamesPlayed: number,
  result: GameResult
): { newElo: number; eloChange: number } {
  const actualScore = result === "win" ? 1 : result === "draw" ? 0.5 : 0;
  const expectedScore = calculateExpectedScore(playerElo, opponentElo);
  const k = getKFactor(playerGamesPlayed);
  const newElo = calculateNewRating(playerElo, expectedScore, actualScore, k);

  return {
    newElo,
    eloChange: newElo - playerElo,
  };
}
