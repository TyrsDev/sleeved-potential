import { useParams, Link } from "react-router-dom";
import { GameProvider, useGame } from "../contexts/GameContext";
import {
  GameHeader,
  CardComposer,
  WaitingForOpponent,
  RoundResult,
  GameOverScreen,
} from "../components/game";

function GameViewContent() {
  const {
    game,
    currentPhase,
    error,
    showingResult,
    setShowingResult,
  } = useGame();

  if (currentPhase === "loading") {
    return (
      <div className="game-view loading">
        <div className="loading">Loading game...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-view error">
        <div className="alert alert-error">{error}</div>
        <Link to="/play" className="btn">
          Back to Play
        </Link>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="game-view error">
        <div className="alert alert-error">Game not found</div>
        <Link to="/play" className="btn">
          Back to Play
        </Link>
      </div>
    );
  }

  if (currentPhase === "finished") {
    return (
      <div className="game-view finished">
        <GameOverScreen />
      </div>
    );
  }

  return (
    <div className="game-view active">
      <GameHeader />

      <div className="game-content">
        {showingResult ? (
          <RoundResult onContinue={() => setShowingResult(false)} />
        ) : currentPhase === "waiting" ? (
          <WaitingForOpponent />
        ) : (
          <CardComposer />
        )}
      </div>
    </div>
  );
}

export function GameView() {
  const { gameId } = useParams<{ gameId: string }>();

  if (!gameId) {
    return (
      <div className="game-view error">
        <div className="alert alert-error">No game ID provided</div>
        <Link to="/play" className="btn">
          Back to Play
        </Link>
      </div>
    );
  }

  return (
    <GameProvider gameId={gameId}>
      <GameViewContent />
    </GameProvider>
  );
}
