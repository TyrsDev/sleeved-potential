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
    hasCommitted,
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

  // Determine the action button based on current state
  let actionButton = null;
  if (showingResult) {
    actionButton = (
      <button
        onClick={() => setShowingResult(false)}
        className="btn btn-primary"
      >
        Continue
      </button>
    );
  } else if (hasCommitted) {
    actionButton = (
      <span className="header-status">Waiting for opponent...</span>
    );
  }
  // Note: Commit button stays in CardComposer since it needs the selection state

  return (
    <div className="game-view active">
      <GameHeader actionButton={actionButton} />

      <div className="game-content">
        {showingResult ? (
          <RoundResult />
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
