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
public/design-assets/       where to drop the two photographs the design
                             import couldn't recover (see below)

design-reference/           the original Claude Design output — kept as
                             reference only, not used by the app at runtime
```

## Mocked authentication and data

There is no backend. Everything lives in memory for the lifetime of the
browser tab, seeded from `src/data/*`:

- **Accounts** are a plaintext array in `src/data/accounts.ts` (seeded) plus
  any created at runtime — see `doSignIn` in `src/state/AppStateContext.tsx`.
  This is fine for a prototype and must **not** be reused as-is once a real
  backend (e.g. Firebase Auth) is added.
- **Recipes, pending submissions, questions, takedowns** — `src/data/*.ts`,
  mutated only in memory via the actions in `AppStateContext.tsx`.
- Nothing persists across a page reload by design (no localStorage, no
  cookies) — this keeps the mock model honest about what will need real
  persistence later.

## Known gap: two photographs

`uploads/Presentation1.png` (hero banner) and `img_3605-mt74qexg-t4zo.jpg`
(About page photo) exceeded the design-import tool's 256 KiB file-read cap
and could not be recovered. The app falls back to a plain gradient panel
until real files are added at:

- `public/design-assets/hero-collage.png`
- `public/design-assets/about-photo.jpg`

## Design reference

`design-reference/` holds the original Claude Design output (`Common
Table.dc.html` and its runtime) as visual/interaction reference material.
It still opens directly in a browser (self-contained, no build step) but is
not part of the shipped app — see the PR/commit description for the full
breakdown of what's still required vs. reference-only.
