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

The `ci` script runs: `pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck`

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
- `joinGame` - Matchmaking: find open challenge or create one
- `challengePlayer` - Create direct challenge to specific player
- `acceptChallenge` - Accept challenge, create game
- `declineChallenge` - Decline and delete challenge

## Firestore Collections

- `users/{userId}` - User profiles with `roles` array (e.g., `["ADMIN"]`)
- `challenges/{challengeId}` - Pending matchmaking/direct challenges
- `games/{gameId}` - Active/finished game matches
- `cards/{cardId}` - Card definitions (admin-editable)

## Security Model

- Users can read all users, create/update own profile
- Admins (users with `ADMIN` role) can write to `cards` collection
- `challenges` and `games` write-only via Cloud Functions
- Games readable only by participants
