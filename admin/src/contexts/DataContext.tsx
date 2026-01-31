import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import type { CardDefinition, User, Game } from "@sleeved-potential/shared";

interface DataContextValue {
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

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [cards, setCards] = useState<CardDefinition[]>([]);
  const [games, setGames] = useState<Game[]>([]);

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingCards, setLoadingCards] = useState(true);
  const [loadingGames, setLoadingGames] = useState(true);

  // Subscribe to users collection
  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const userData = snapshot.docs.map((doc) => doc.data() as User);
        setUsers(userData);
        setLoadingUsers(false);
      },
      (error) => {
        console.error("Error fetching users:", error);
        setLoadingUsers(false);
      }
    );
    return unsubscribe;
  }, []);

  // Subscribe to cards collection
  useEffect(() => {
    const q = query(collection(db, "cards"), orderBy("name"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const cardData = snapshot.docs.map((doc) => doc.data() as CardDefinition);
        setCards(cardData);
        setLoadingCards(false);
      },
      (error) => {
        console.error("Error fetching cards:", error);
        setLoadingCards(false);
      }
    );
    return unsubscribe;
  }, []);

  // Subscribe to games collection
  // Note: Games may not be readable by admins depending on security rules
  // In that case, we gracefully show 0 games
  useEffect(() => {
    const q = query(collection(db, "games"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const gameData = snapshot.docs.map((doc) => doc.data() as Game);
        setGames(gameData);
        setLoadingGames(false);
      },
      (error) => {
        // Permission errors are expected if admin can't read all games
        // Just set empty games list and continue
        console.warn("Games collection not accessible (expected if security rules restrict access):", error.message);
        setGames([]);
        setLoadingGames(false);
      }
    );
    return unsubscribe;
  }, []);

  // Compute derived values
  const cardCounts = {
    sleeves: cards.filter((c) => c.type === "sleeve").length,
    animals: cards.filter((c) => c.type === "animal").length,
    equipment: cards.filter((c) => c.type === "equipment").length,
  };

  const activeGames = games.filter((g) => g.status === "active").length;

  const value: DataContextValue = {
    stats: {
      users: users.length,
      cards: cards.length,
      games: games.length,
      activeGames,
    },
    users,
    cards,
    games,
    loading: {
      users: loadingUsers,
      cards: loadingCards,
      games: loadingGames,
    },
    cardCounts,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
