# Recipes for Posterity

Family recipe website — a client-side React + TypeScript SPA (Vite), suitable
for static hosting (e.g. Firebase Hosting). No backend, no server-side
rendering.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to dist/
npm run preview  # serve the production build locally
```

## Project structure

```
src/
  main.tsx                 entry point
  App.tsx                  app shell: sidebar + routed page content
  types.ts                 shared TypeScript interfaces
  state/
    AppStateContext.tsx     mocked "backend": app state + every action
                             (sign in/up, search, ratings, shopping list,
                             pantry matching, contribute form, admin queue)
    selectors.ts             pure derived-data functions (filtering,
                              visibility/access rules, shopping list totals…)
    helpers.ts                small pure formatters (dates, stars, units…)
    initialState.ts            the app's initial in-memory state
  data/                     seed/mock content (recipes, FAQ, accounts…)
  components/               shared UI: Sidebar, ImageSlot, CmykNumeral,
                             HeroBanner, Toast, ReportDialog
  pages/                    one component per page (Home, Search, Recipe,
                             Contribute, ShoppingList, Cupboard, My page,
                             About, FAQ, SignIn, Admin)
  styles/                   tokens.css (design-system base, reused verbatim
                             from the Claude Design import) + theme.css
                             (the site's retheme, layout classes, responsive
                             and print rules)
  images/                   real photographs, imported directly by the
                             pages that use them (Vite bundles + hashes them)

design-reference/           the original Claude Design output — kept as
                             reference only, not used by the app at runtime
```

## Firebase backend

Authentication and data are real, backed by Firebase Auth + Cloud Firestore
(see `src/lib/firebase.ts` for setup, `firestore.rules` for access control,
and `src/lib/*Repo.ts` for the one service module per collection that every
read/write goes through — nothing outside those files calls Firestore or
Auth directly). `src/state/AppStateContext.tsx` holds UI state and wires
user actions to those repo calls; it is not a mock backend itself.

Firestore-backed, real, and durable across reloads:
- **Accounts** — Firebase Auth for identity, `users/{uid}` for `displayName`,
  `role`, and `circleEmails` (the source of truth for authorization; a
  reader can never grant themselves the editor role).
- **Recipes** — `recipes/{id}`, including the `public`/`circle`/`owner`
  visibility split and the rating aggregate.
- **Submissions** — `submissions/{id}`: the pending → needs_revision/rejected
  → published lifecycle.
- **Ratings, comments, replies** — `recipes/{id}/ratings/*`,
  `recipes/{id}/comments/*` and their `replies` subcollection.
- **Reports and asks** — `reports/{id}` and `asks/{id}`.

Still local/mock by design, not a gap to close later:
- **Pantry and shopping list** (`pantry`, `selected`, `ticked` in app state)
  — session-only, out of scope for Firestore persistence for now.
- **Photo "uploads"** — the contribute form's photo slots are placeholder
  IDs only; no file ever leaves the browser, and there is no Firebase
  Storage integration.
- **The Admin page's "Editors" list** (`src/data/accounts.ts`'s
  `INITIAL_ACCOUNTS`) — a cosmetic demo list so the page has something to
  show; adding or removing a "mocked editor" there never touches anyone's
  real `role`.

## Security Rules tests

`tests/*.rules.test.ts` runs against a real local Firestore emulator (never
production — every test uses a `demo-`-prefixed project id, which the
Firebase SDKs specifically refuse to route anywhere but an emulator):

```bash
npm run test:rules   # starts the emulator, runs every tests/*.test.ts file, tears it down
npm run seed:emulator # separately: seed src/data/recipes.ts into a running emulator
```

## Local development against the emulators

`npm run dev` connects to the local Auth + Firestore emulators by default
(see `src/lib/firebase.ts`) whenever the app is built in dev mode — this
never happens in a production build (`npm run build`), where the emulator
connection code is compiled out entirely rather than just skipped at
runtime. Set `VITE_USE_FIREBASE_EMULATORS=false` in `.env.local` to point a
dev server at the real Firebase project instead.

## Images

`src/images/` holds the real photographs, imported directly (as ES
modules) by the pages that use them, so Vite bundles, hashes, and
content-addresses them like any other build asset:

| File | Used by |
|---|---|
| `Presentation1.png` | Home hero banner, About hero banner (`HeroBanner`) |
| `IMG_3605.jpg` | About page photo box |
| `Picturewaffle.jpg` | Home page cut-out #1 (`cut-waffle`) |
| `Picture3.jpg` | Home page cut-out #2 (`cut-tomatoes`) |
| `eat-the-rainbow-…jpg` | Home page cut-out #3 (`cut-cake`, "Where everything is" section) |

`HeroBanner` and `ImageSlot` both still fall back gracefully (plain
gradient panel / empty drop-a-photo placeholder) if a referenced image is
ever missing, so a future missing asset degrades rather than breaking the
page.

## Design reference

`design-reference/` holds the original Claude Design output (`Common
Table.dc.html` and its runtime) as visual/interaction reference material.
It still opens directly in a browser (self-contained, no build step) but is
not part of the shipped app — see the PR/commit description for the full
breakdown of what's still required vs. reference-only.
