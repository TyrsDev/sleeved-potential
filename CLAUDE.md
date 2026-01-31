# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
pnpm install          # Install all workspace dependencies
pnpm build            # Build all packages (shared → functions, game, admin)
pnpm build:shared     # Build only shared package
pnpm lint             # Lint all packages
pnpm typecheck        # Type check all packages
pnpm format           # Format with Prettier
```

## Development

```bash
pnpm dev:game         # Start game frontend dev server (Vite)
pnpm dev:admin        # Start admin frontend dev server (Vite)
```

## CI Pipeline

The CI pipeline runs: `pnpm run ci && pnpm run build`

The `ci` script runs: `pnpm install --frozen-lockfile && pnpm build:shared && pnpm lint && pnpm typecheck`

**IMPORTANT:** Before declaring any code edits as finished, always run `pnpm lint && pnpm typecheck` to verify the changes pass the same checks as the CI pipeline. Do not skip this step.

## Firebase Deployment

```bash
firebase deploy                    # Deploy everything
firebase deploy --only hosting     # Deploy both hosting sites
firebase deploy --only hosting:game   # Deploy game site only
firebase deploy --only hosting:admin  # Deploy admin site only
firebase deploy --only functions   # Deploy Cloud Functions
firebase emulators:start           # Start local emulators
```

**Hosting Sites:**
- Game: `sleeved-potential.web.app` (target: `game`, public: `game/public`)
- Admin: `sleeved-potential-admin.web.app` (target: `admin`, public: `admin/public`)

## Architecture

This is a 1v1 card game with real-time Firestore updates. pnpm workspace monorepo with 4 packages:

**`shared/`** - `@sleeved-potential/shared`
- Pure TypeScript types and utilities (no React)
- Types: `User`, `Challenge`, `Game`, `Card`
- Imported by functions, game, and admin via `workspace:*`

**`game/`** - React + Vite frontend
- Firebase Auth: Google + Anonymous
- Builds to `game/public/` for Firebase Hosting

**`admin/`** - React + Vite frontend
- Firebase Auth: Google only
- For playtesting: admins can edit card stats live
- Builds to `admin/public/` for Firebase Hosting

**`functions/`** - Firebase Cloud Functions (Node.js 22)
- User: `getOrCreateUser`, `setUsername`
- Matchmaking: `joinGame`, `challengePlayer`, `challengeByUsername`
- Challenge: `acceptChallenge`, `declineChallenge`
- Game: `commitCard`
- Admin: `createCard`, `updateCard`, `deleteCard`, `uploadCardImage`, `updateRules`

## Firestore Collections

- `users/{userId}` - User profiles with `roles` array (e.g., `["ADMIN"]`)
- `usernames/{username}` - Username uniqueness enforcement (Functions-only write)
- `challenges/{challengeId}` - Pending matchmaking/direct challenges
- `games/{gameId}` - Active/finished game matches with card/rules snapshots
- `games/{gameId}/playerState/{playerId}` - Private player state (hands, decks, commits)
- `cards/{cardId}` - Card definitions: sleeves, animals, equipment (admin-editable)
- `rules/current` - Game rules configuration (admin-editable)

## Security Model

- Users can read all users, create/update own profile
- Admins (users with `ADMIN` role) can write to `cards` collection
- `challenges` and `games` write-only via Cloud Functions
- Games readable only by participants

## Date/Timestamp Convention

**All date/time fields use ISO 8601 strings (`string` type), not `Date` or Firestore `Timestamp`.**

This includes: `createdAt`, `updatedAt`, `startedAt`, `endedAt`, and any other temporal fields.

**Rationale:** Firebase Admin SDK, Firestore Web SDK, and Cloud Functions serialize Timestamps differently. Using ISO strings ensures consistent behavior across shared types.

**Rules:**
- Store as ISO string in Firestore (e.g., `"2025-01-31T12:00:00.000Z"`)
- Shared types define these fields as `string`
- Convert to `Date` only at display time in UI components
- Use `new Date().toISOString()` when creating timestamps
- In Cloud Functions, avoid `FieldValue.serverTimestamp()` for shared types; use `new Date().toISOString()` instead

## Firebase Storage

Card images are stored in Firebase Storage at `cards/{cardId}/{fileName}`.

**Rules:**
- Images are publicly readable (no auth required)
- Write access is restricted to Cloud Functions only (admin functions)
- Card images are partially transparent PNGs for layering

**Upload Pattern:**
- Admin uploads images via Cloud Functions, not directly from frontend
- Function validates admin role, then uploads to Storage
- Returns download URL to store in card document's `imageUrl` field

## Function Interface Convention

**All Firebase Function input/output types are defined in `shared/src/types/functions.ts`.**

This ensures type safety across the entire stack:
- Functions import input/output interfaces from shared
- Frontends import the same interfaces when calling functions
- No duplicate type definitions

**Pattern:**
```typescript
// In shared/src/types/functions.ts
export interface GetOrCreateUserInput {}
export interface GetOrCreateUserOutput {
  user: User;
  isNewUser: boolean;
}

// In functions/src/getOrCreateUser.ts
import { GetOrCreateUserInput, GetOrCreateUserOutput } from "@sleeved-potential/shared";

// In frontend
import { GetOrCreateUserInput, GetOrCreateUserOutput } from "@sleeved-potential/shared";
```

**Rules:**
- Every callable function must have corresponding `{FunctionName}Input` and `{FunctionName}Output` interfaces
- Functions must NOT define their own input/output types inline
- Use the shared interfaces for both validation and return types

## Cloud Functions Initialization

**IMPORTANT: Do NOT call Firebase Admin SDK methods at module scope in function files.**

The `initializeApp()` call happens in `index.ts`, but ESM module loading executes imports before the main module code runs. This causes "The default Firebase app does not exist" errors at deploy time.

**Wrong:**
```typescript
// functions/src/myFunction.ts
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore(); // ❌ Called at module load, before initializeApp()

export const myFunction = onCall(...);
```

**Correct:**
```typescript
// functions/src/myFunction.ts
import { getFirestore } from "firebase-admin/firestore";

export const myFunction = onCall(
  { region: "europe-west1" },
  async (request) => {
    const db = getFirestore(); // ✅ Called inside handler, after initializeApp()
    // ...
  }
);
