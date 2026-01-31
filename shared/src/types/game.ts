export interface Game {
  id: string;
  players: [string, string];
  currentTurn: string;
  status: GameStatus;
  winner: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type GameStatus = "active" | "finished";

export interface CreateGameData {
  players: [string, string];
}
