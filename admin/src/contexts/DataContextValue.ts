import { createContext } from "react";
import type { CardDefinition, User, Game } from "@sleeved-potential/shared";

export interface DataContextValue {
  // Stats
  stats: {
    users: number;
    cards: number;
    games: number;
    activeGames: number;
  };

  // Data lists
  users: User[];
  cards: CardDefinition[];
  games: Game[];

  // Loading states
  loading: {
    users: boolean;
    cards: boolean;
    games: boolean;
  };

  // Filtered card counts
  cardCounts: {
    sleeves: number;
    animals: number;
    equipment: number;
  };
}

export const DataContext = createContext<DataContextValue | null>(null);
