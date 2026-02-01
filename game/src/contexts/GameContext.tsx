/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  subscribeToGame,
  subscribeToPlayerState,
  commitCard as firebaseCommitCard,
} from "../firebase";
import { useUser } from "./UserContext";
import type {
  Game,
  PlayerGameState,
  CardDefinition,
  RoundResult,
} from "@sleeved-potential/shared";

/**
 * Game phases:
 * - loading: Fetching game data
 * - composing: Player is building their card for this round
 * - waiting: Player has committed, waiting for opponent
 * - revealing: Both committed, showing results (brief transition)
 * - result: Showing round result, waiting for player to continue
 * - finished: Game has ended
 */
export type GamePhase = "loading" | "composing" | "waiting" | "revealing" | "result" | "finished";

interface GameContextValue {
  // Core data
  game: Game | null;
  playerState: PlayerGameState | null;
  loading: boolean;
  error: string | null;

  // Derived state
  opponentId: string | null;
  hasCommitted: boolean;
  currentPhase: GamePhase;
  latestRound: RoundResult | null;
  myScore: number;
  opponentScore: number;

  // Card lookup (from cardSnapshot)
  getCard: (cardId: string) => CardDefinition | undefined;
  getSleeve: (cardId: string) => CardDefinition | undefined;
  getAnimal: (cardId: string) => CardDefinition | undefined;
  getEquipment: (cardId: string) => CardDefinition | undefined;

  // Actions
  commitCard: (sleeveId: string, animalId: string, equipmentIds: string[]) => Promise<void>;

  // UI state management
  showingResult: boolean;
  setShowingResult: (showing: boolean) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

interface GameProviderProps {
  gameId: string;
  children: ReactNode;
}

export function GameProvider({ gameId, children }: GameProviderProps) {
  const { user } = useUser();
  const userId = user?.id ?? null;

  const [game, setGame] = useState<Game | null>(null);
  const [playerState, setPlayerState] = useState<PlayerGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showingResult, setShowingResult] = useState(false);
  const lastSeenRoundCountRef = useRef(0);
  const isInitialLoadRef = useRef(true);

  // Subscribe to game document
  useEffect(() => {
    if (!gameId) {
      return;
    }

    const unsubscribe = subscribeToGame(gameId, (gameData) => {
      if (gameData) {
        const newRoundCount = gameData.rounds.length;

        // On initial load, just capture state - don't try to show results
        if (isInitialLoadRef.current) {
          lastSeenRoundCountRef.current = newRoundCount;
          isInitialLoadRef.current = false;
        } else {
          // After initial load, check if a new round was completed
          if (newRoundCount > lastSeenRoundCountRef.current) {
            setShowingResult(true);
          }
          lastSeenRoundCountRef.current = newRoundCount;
        }

        setGame(gameData);
        setError(null);
      } else {
        setError("Game not found");
        setGame(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [gameId]);

  // Subscribe to player state
  useEffect(() => {
    if (!gameId || !userId) {
      return;
    }

    const unsubscribe = subscribeToPlayerState(gameId, userId, (state) => {
      setPlayerState(state);
    });

    return unsubscribe;
  }, [gameId, userId]);

  // Derived state
  const opponentId = useMemo(() => {
    if (!game || !userId) return null;
    return game.players.find((p) => p !== userId) ?? null;
  }, [game, userId]);

  const hasCommitted = playerState?.hasCommitted ?? false;

  const currentPhase: GamePhase = useMemo(() => {
    if (loading) return "loading";
    if (!game) return "loading";
    if (game.status === "finished") return "finished";
    if (showingResult) return "result";
    if (hasCommitted) return "waiting";
    return "composing";
  }, [loading, game, hasCommitted, showingResult]);

  const latestRound = useMemo(() => {
    if (!game || game.rounds.length === 0) return null;
    return game.rounds[game.rounds.length - 1];
  }, [game]);

  const myScore = useMemo(() => {
    if (!game || !userId) return 0;
    return game.scores[userId] ?? 0;
  }, [game, userId]);

  const opponentScore = useMemo(() => {
    if (!game || !opponentId) return 0;
    return game.scores[opponentId] ?? 0;
  }, [game, opponentId]);

  // Card lookup functions - use game as dependency for compiler compatibility
  const cardSnapshot = game?.cardSnapshot;

  const getCard = useCallback(
    (cardId: string): CardDefinition | undefined => {
      if (!cardSnapshot) return undefined;
      const { sleeves, animals, equipment } = cardSnapshot;
      return (
        sleeves.find((c) => c.id === cardId) ??
        animals.find((c) => c.id === cardId) ??
        equipment.find((c) => c.id === cardId)
      );
    },
    [cardSnapshot]
  );

  const getSleeve = useCallback(
    (cardId: string): CardDefinition | undefined => {
      return cardSnapshot?.sleeves.find((c) => c.id === cardId);
    },
    [cardSnapshot]
  );

  const getAnimal = useCallback(
    (cardId: string): CardDefinition | undefined => {
      return cardSnapshot?.animals.find((c) => c.id === cardId);
    },
    [cardSnapshot]
  );

  const getEquipment = useCallback(
    (cardId: string): CardDefinition | undefined => {
      return cardSnapshot?.equipment.find((c) => c.id === cardId);
    },
    [cardSnapshot]
  );

  // Commit card action
  const commitCard = useCallback(
    async (sleeveId: string, animalId: string, equipmentIds: string[]): Promise<void> => {
      if (!gameId) {
        throw new Error("No game ID");
      }
      try {
        await firebaseCommitCard(gameId, sleeveId, animalId, equipmentIds);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to commit card");
        throw err;
      }
    },
    [gameId]
  );

  const value: GameContextValue = {
    game,
    playerState,
    loading,
    error,
    opponentId,
    hasCommitted,
    currentPhase,
    latestRound,
    myScore,
    opponentScore,
    getCard,
    getSleeve,
    getAnimal,
    getEquipment,
    commitCard,
    showingResult,
    setShowingResult,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}
