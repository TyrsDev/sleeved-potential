# Sleeved Potential - Game Design Document

## Overview

A 1v1 composite card game where players "build" cards by layering transparent components inside sleeves. Each round, both players commit a composed card (Sleeve + Animal + optional Equipment), then cards fight. First to reach the point threshold wins.

---

## Core Mechanics

### Card Composition & Layering

Cards are composed by stacking transparent components in order:
1. **Sleeve Background** (bottom layer) - easily overwritten
2. **Animal** - the "champion"
3. **Equipment** (0+) - stacked in player-chosen order
4. **Sleeve Foreground** (top layer) - guaranteed stat (designer chooses which stat per sleeve)

**Stat Resolution:** Higher layers **overwrite** same stats from lower layers. ALL stats work this way, including Special Effects - only the topmost Special Effect is active on a composed card.

### Stats

| Stat | Range | Description |
|------|-------|-------------|
| Damage | 0+ (floor 0, no cap) | Damage dealt to opponent's card |
| Health | 0+ (floor 0, no cap) | HP; card destroyed if ≤0 after combat |
| Modifier | +/-Damage, +/-Health | Adjusts final stats (single card only) |
| Special Effect | trigger + effect | **Only ONE per card** (topmost overwrites) |
| Initiative | 0 (default, hidden) | Attack order; shown only when modified |

### Combat Resolution

Combat consists of one or more **attack rounds** within a single card matchup:

**Default (equal initiative):** 1 attack round, both cards attack simultaneously.

**Different initiative:** 2 attack rounds:
1. Higher initiative card attacks first
2. If defender survives, defender attacks back

**Attack Round Structure:**
1. Attacker deals Damage to defender's Health
2. Check if defender is destroyed (Health ≤ 0)
3. If destroyed, defender does NOT attack back (unless simultaneous)

**After all attack rounds:**
- Check final survival/destruction status for both cards
- Resolve post-combat Special Effects if conditions met
- Award points based on outcomes

**Note:** 0 Damage means no damage dealt. "Tanks that can't attack" is intentional.

### Scoring (Configurable via Rules)

Default values:
| Outcome | Points |
|---------|--------|
| Your card survives | +1 |
| Your card defeats opponent's | +2 |

Examples:
- Both survive: Both get 1 point
- You survive, opponent dies: You get 3 (1+2), opponent gets 0
- Both die: Both get 2 points

**Win Condition:** First to 15 points (configurable). If both reach threshold with same score: draw.

---

## Card Types

### Sleeves (5 total)
- **Unique:** Each sleeve is unique, but both players have copies of all sleeves
- **Background stats:** Inside sleeve, easily overwritten by cards inside
- **Foreground stats:** Outside front, **designer chooses** which stat it guarantees
- **Usage:** All available each round. Used sleeves go to graveyard. When all used, graveyard returns.

### Animals (9 total, shared deck)
- **Unique:** All Animals are unique, shared between both players
- **Stats:** Damage and Health (for initial prototype)
- **Deck:** Shared pool - drawing reveals info about what opponent can't have
- **Hand:** Always hold 3 Animals
- **Initial Draw:** Simultaneous/random distribution (server shuffles and deals 3 to each)
- **Recycling:** Used Animals go to shared discard. Shuffle back when deck empty.

### Equipment (20 total, per-player deck)
- **May have duplicates:** Some Equipment cards can exist multiple times
- **Stats:** Can have any stat type (Damage, Health, Modifier, Special Effect)
- **Starting hand:** 5 cards
- **Per-round draw:** Draw 1 Equipment at start of each round (configurable)
- **No hand limit:** Players can accumulate unlimited Equipment
- **Stacking:** Unlimited per composed card (practical max ~3 due to overwriting)
- **Recycling:** Used → discard pile. Shuffle discard into deck when empty.

---

## Special Effects

### Key Behavior
**Only ONE Special Effect can be active per composed card.** Higher layers overwrite lower layers' effects, just like other stats.

### Structure
```typescript
interface SpecialEffect {
  trigger: SpecialEffectTrigger;
  effect: SpecialEffectAction;
  timing: EffectTiming;
}

type SpecialEffectTrigger =
  | "on_play"           // When card is committed
  | "if_survives"       // After combat, if this card survives
  | "if_destroyed"      // After combat, if this card is destroyed
  | "if_defeats"        // After combat, if this card defeats opponent
  | "if_doesnt_defeat"; // After combat, if opponent survives

type SpecialEffectAction =
  | { type: "draw_cards"; count: number }
  | { type: "modify_initiative"; amount: number }
  // | { type: "attack_again" }  // POSTPONED for later
  | { type: "add_persistent_modifier"; stat: "damage" | "health"; amount: number };

type EffectTiming = "on_play" | "post_combat" | "end_of_round";
```

### Persistent Modifier Stack
- Future-proofing for effects like "add +1 Health to all future cards"
- Stored per-player in game state
- Applied after card composition, before combat

---

## Dynamic Rules System

Game rules are stored in Firestore and **snapshotted at game start** (like cards). Admin can edit rules, but changes only affect new games.

### Rules Document Structure
```typescript
interface GameRules {
  id: string;
  version: number;

  // Scoring
  pointsForSurviving: number;        // default: 1
  pointsForDefeating: number;        // default: 2
  pointsToWin: number;               // default: 15

  // Card draw
  startingEquipmentHand: number;     // default: 5
  equipmentDrawPerRound: number;     // default: 1
  startingAnimalHand: number;        // default: 3

  // Combat
  defaultInitiative: number;         // default: 0

  // Future extensibility
  customRules?: Record<string, unknown>;

  updatedAt: string;
  updatedBy: string;
}
```

### Admin Rules Editor
- Edit all rule values in admin panel
- View version history
- Rules changes are logged with who changed them

---

## Game Flow

### Game Setup
1. Game created when challenge accepted
2. **Snapshot current rules** from `rules/current` document
3. **Snapshot all card definitions** (ongoing games unaffected by edits)
4. Initialize:
   - Shared Animal deck (shuffle, randomly deal 3 to each player)
   - Per-player Equipment deck (shuffle, draw 5)
   - All Sleeves available to both players
   - Empty persistent modifier stacks
   - Score: 0-0

### Round Flow
1. **Draw Phase:** Each player draws Equipment (default 1) if deck not empty
2. **Commit Phase:** Both players secretly select Sleeve + Animal + Equipment(s)
3. **Reveal:** Instant reveal when both committed (frontend handles animations)
4. **Resolution:**
   - Calculate final stats (layering + modifiers + persistent stack)
   - Resolve on_play effect if present
   - Combat by initiative order
   - Check destruction
   - Resolve post_combat effect if present
   - Award points per rules
5. **Cleanup:**
   - Move used components to appropriate graveyards/discards
   - Draw replacement Animal (if hand < 3 and deck not empty)
   - Resolve end_of_round effect if present
   - Check win condition

### Game End
- First to reach pointsToWin wins
- Both reach threshold with same score = draw
- Store result, update player stats

---

## User System

### Username & Display Name
- **Accounts (Google sign-in):** Choose unique username (3-12 letters), display name from Google
- **Guests (anonymous):**
  - Username: UUID-based (guaranteed unique, used internally)
  - Display Name: Random "Adjective Noun" format (e.g., "Swift Panda") - can overlap with others
- **Uniqueness:** Account usernames enforced via `usernames/{username}` collection

### Challenge Restrictions
- **Account users:** Can be challenged directly by username, or use matchmaking
- **Guest users:** Can ONLY use matchmaking ("open challenge"). Cannot be challenged directly.

### Guest → Account Upgrade
- Guests can later sign in with Google
- They choose a new username (3-12 chars)
- Game history and stats transfer
- Display name updates to Google profile name

---

## Constraints

- **One active game per player pair:** Must finish current game before starting another with same opponent
- **No deck building:** All players have access to same card pool
- **Symmetric gameplay:** Same cards available to both players (except Animals in hand)

---

## Data Architecture

### Firestore Collections

#### `rules/current`
Single document with current game rules (see GameRules interface above).

#### `users/{userId}`
```typescript
interface User {
  id: string;
  authUserId: string;             // Firebase Auth UID
  email: string | null;
  displayName: string;            // Google name (accounts) or "Adjective Noun" (guests)
  username: string;               // Unique 3-12 chars (accounts) or UUID (guests)
  isGuest: boolean;
  photoURL: string | null;
  roles: UserRole[];              // ["ADMIN"] for admins
  stats: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
  };
  createdAt: string;              // ISO 8601
  updatedAt: string;
}
```

#### `usernames/{username}` (for uniqueness)
```typescript
interface UsernameDoc {
  userId: string;
  createdAt: string;
}
```

#### `cards/{cardId}`
```typescript
interface CardDefinition {
  id: string;
  type: "sleeve" | "animal" | "equipment";
  name: string;
  description: string;
  imageUrl: string | null;        // Firebase Storage URL

  // For sleeves:
  backgroundStats?: CardStats;
  foregroundStats?: CardStats;    // Designer chooses which stat

  // For animals/equipment:
  stats?: CardStats;

  createdAt: string;
  updatedAt: string;
}

interface CardStats {
  damage?: number;
  health?: number;
  modifier?: Modifier;
  specialEffect?: SpecialEffect;
  initiative?: number;            // Usually only on effects, but could be on cards
}

interface Modifier {
  type: "damage" | "health";
  amount: number;  // positive or negative
}
```

#### `games/{gameId}`
```typescript
interface Game {
  id: string;
  players: [string, string];      // User IDs
  status: "active" | "finished";
  currentRound: number;
  scores: { [playerId: string]: number };
  winner: string | null;          // null if draw or ongoing
  isDraw: boolean;

  // Snapshots at game start
  rulesSnapshot: GameRules;
  cardSnapshot: {
    sleeves: CardDefinition[];
    animals: CardDefinition[];
    equipment: CardDefinition[];
  };

  // Shared state
  animalDeck: string[];           // Card IDs remaining in shared deck
  animalDiscard: string[];        // Used animals

  // Round history
  rounds: RoundResult[];

  createdAt: string;
  startedAt: string;
  endedAt: string | null;
}

interface RoundResult {
  roundNumber: number;
  commits: { [playerId: string]: CommittedCard };
  results: { [playerId: string]: RoundOutcome };
  effectTriggered: TriggeredEffect | null;  // Only one effect per card
}

interface CommittedCard {
  sleeveId: string;
  animalId: string;
  equipmentIds: string[];         // In stacking order
  finalStats: ResolvedStats;
}

interface ResolvedStats {
  damage: number;
  health: number;
  initiative: number;
  modifier: Modifier | null;      // Single modifier (topmost)
  specialEffect: SpecialEffect | null;  // Single effect (topmost)
}

interface RoundOutcome {
  pointsEarned: number;
  survived: boolean;
  defeated: boolean;
  finalHealth: number;
}
```

#### `games/{gameId}/playerState/{playerId}`
Private subcollection - each player can only read their own document.

```typescript
interface PlayerGameState {
  playerId: string;
  odIduserId: string;

  // Hands
  animalHand: string[];           // Card IDs (3)
  equipmentHand: string[];        // Card IDs (no limit)

  // Decks/discards
  equipmentDeck: string[];
  equipmentDiscard: string[];

  // Sleeve tracking
  availableSleeves: string[];
  usedSleeves: string[];

  // Persistent modifiers from special effects
  persistentModifiers: PersistentModifier[];

  // Current round commit (null if not yet committed)
  currentCommit: CommittedCard | null;
  hasCommitted: boolean;
}

interface PersistentModifier {
  stat: "damage" | "health";
  amount: number;
  sourceRound: number;
}
```

#### `challenges/{challengeId}` (existing, enhanced)
Add support for username-based challenges.

---

## Firebase Functions

### User Management
- `getOrCreateUser()` - Fetch or create user doc on login. Generate UUID username for guests.
- `setUsername(username)` - Set username (3-12 chars). Validates uniqueness atomically.

### Game Flow
- `joinGame()` - (existing) Matchmaking - available to all users including guests
- `challengePlayer(opponentId)` - (existing) Direct challenge by user ID (accounts only)
- `challengeByUsername(username)` - Challenge by username lookup (accounts only, rejects guest targets)
- `acceptChallenge(challengeId)` - Create game with card + rules snapshots
- `declineChallenge(challengeId)` - (existing)
- `commitCard(gameId, sleeveId, animalId, equipmentIds[])` - Validate and commit

### Admin (ADMIN role required)
- `createCard(cardData)` - Create new card definition
- `updateCard(cardId, updates)` - Update card stats
- `deleteCard(cardId)` - Delete card
- `uploadCardImage(cardId, imageData)` - Upload to Firebase Storage
- `updateRules(rules)` - Update game rules

### Shared Package Exports
All function input/output interfaces defined in `shared/src/types/functions.ts`.

---

## Frontend Architecture

### Game App (`/game`)

**Routes:**
- `/` - Home (Play button, card viewer link, rules link)
- `/cards` - Card browser (all sleeves, animals, equipment)
- `/rules` - Game rules (fetched from Firestore)
- `/play` - Matchmaking/waiting room
- `/game/:gameId` - Active game view
- `/profile` - User profile, stats, game history
- `/profile/:username` - View other player's public profile

**Features:**
- Real-time Firestore listeners for game state
- Notification when challenge becomes game
- Card composition UI with layered preview
- Combat animation and sound effects
- Username prompt for new accounts

### Admin App (`/admin`)

**Routes:**
- `/` - Dashboard
- `/cards` - Card list with CRUD (filter by type)
- `/cards/new` - Create card form
- `/cards/:cardId` - Edit card (stats, image upload)
- `/rules` - Rules editor
- `/players` - Player list with stats
- `/players/:userId` - Player detail (games, stats)

**Features:**
- Image upload to Firebase Storage
- Live stat editing (affects future games only)
- Rules editor
- Player stats viewer

---

## Security Rules

### Firestore
```javascript
// Rules collection
match /rules/{ruleId} {
  allow read: if isSignedIn();
  allow write: if isAdmin();
}

// Username uniqueness collection
match /usernames/{username} {
  allow read: if isSignedIn();
  allow create, delete: if false; // Functions only
}

// Player-specific game state
match /games/{gameId}/playerState/{playerId} {
  allow read: if isSignedIn() && request.auth.uid == resource.data.userId;
  allow write: if false; // Functions only
}
```

### Storage
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /cards/{cardId}/{fileName} {
      allow read: if true;
      allow write: if false; // Admin functions only
    }
  }
}
```

---

## Implementation Phases

### Phase 1: Foundation
1. Update shared types (Card, Game, User, Rules structures)
2. Update CLAUDE.md with Storage info and function interface convention
3. Implement `getOrCreateUser` and `setUsername` functions
4. Create `rules/current` document with defaults
5. Update security rules (Firestore + Storage)

### Phase 2: Admin Panel
1. React Router setup
2. Card CRUD UI (list, create, edit, delete by type)
3. Image upload integration
4. Rules editor page
5. Player stats viewer

### Phase 3: Game Frontend Foundation
1. React Router setup
2. Card browser component
3. Rules page (fetches from Firestore)
4. Profile page with stats
5. GameContext with Firestore subscriptions
6. Username setup flow for new users

### Phase 4: Game Logic
1. Enhance `acceptChallenge` to initialize full game state with snapshots
2. Implement `commitCard` function with validation
3. Round resolution logic (combat, effects, scoring from rules)
4. `challengeByUsername` function

### Phase 5: Game UI
1. Card composition interface (layered preview)
2. Commit flow
3. Combat animations and effects
4. Round results display
5. Game end screen

### Phase 6: Polish
1. Sound effects
2. Notification system
3. Guest → account upgrade flow

---

## Open Questions for Later

1. **Soft delete cards?** Should deleted cards be hidden or permanently removed?
2. **Spectator mode?** Allow watching games?
3. **Rematch flow?** Quick rematch after game ends?
4. **Tutorial?** Guided first game?
5. **Turn timer?** Add optional time limits?
