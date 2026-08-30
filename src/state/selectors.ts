import type { AppState, Access, Recipe, Me } from '../types';
import { OWNERS, SEED_ACCESS, SEED_CIRCLES } from '../data/accounts';
import { ME } from '../data/recipes';
import { TODAY } from '../data/taxonomy';
import { ingKey, isBasic } from './helpers';

export function myEmail(state: AppState): string {
  return state.signedIn ? (state.signEmail || '').trim().toLowerCase() : '';
}

export function accessOf(_state: AppState, r: Recipe): Access {
  return r.access || SEED_ACCESS[r.id] || 'public';
}

export function ownerEmailOf(_state: AppState, r: Recipe): string {
  return (r.ownerEmail || OWNERS[r.submitter] || '').toLowerCase();
}

export function circleOf(state: AppState, email: string): string[] {
  if (email && email === myEmail(state)) return state.circle;
  return SEED_CIRCLES[email] || [];
}

export function canSee(state: AppState, r: Recipe): boolean {
  if (state.signedIn && state.role === 'editor') return true;
  const acc = accessOf(state, r);
  if (acc === 'public') return true;
  const me = myEmail(state);
  if (!me) return false;
  const owner = ownerEmailOf(state, r);
  if (owner && owner === me) return true;
  if (acc !== 'circle') return false;
  return circleOf(state, owner).map((e) => e.trim().toLowerCase()).indexOf(me) !== -1;
}

export function visibleRecipes(state: AppState): Recipe[] {
  return state.recipes.filter((r) => canSee(state, r));
}

// The person currently signed in. Only the seeded account carries a
// history; an account created in this session starts empty.
export function me(state: AppState): Me {
  if (!state.signedIn) return { name: '', joined: TODAY, ratingsGiven: {} };
  const acc = state.accounts.find((a) => a.email === (state.signEmail || '').trim().toLowerCase());
  if (acc?.seed) return ME;
  return { name: state.signName || acc?.name || '', joined: acc?.joined || TODAY, ratingsGiven: {} };
}

export function portionsFor(state: AppState, r: Recipe): number {
  return state.portionsById[r.id] || r.portions;
}

export function activeRecipe(state: AppState): Recipe {
  return state.recipes.find((x) => x.id === state.recipeId) || state.recipes[0];
}

export function filtered(state: AppState): Recipe[] {
  const f = state.f;
  const q = f.q.trim().toLowerCase();
  const now = new Date('2026-08-14T12:00:00');
  let out = state.recipes.filter((r) => {
    // A recipe only ever appears to its owner, to the circle its owner
    // drew up, to everybody if it is public, and to editors always.
    if (!canSee(state, r)) return false;
    if (q) {
      const hay = (`${r.title} ${r.blurb} ${r.author} ${r.nationality} ${r.meal} ${r.tastes.join(' ')} ${r.ingredients.map((i) => i.n).join(' ')}`).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    if (f.nationality !== 'All' && r.nationality !== f.nationality) return false;
    if (f.meal !== 'All' && r.meal !== f.meal) return false;
    if (f.language !== 'All' && r.language !== f.language) return false;
    if (f.author !== 'All' && r.author !== f.author) return false;
    if (f.since !== 'Any time') {
      const days = f.since === 'Last 30 days' ? 30 : f.since === 'Last 90 days' ? 90 : 365;
      if ((now.getTime() - new Date(r.date + 'T12:00:00').getTime()) / 86400000 > days) return false;
    }
    if (f.rating !== 'Any' && r.rating < parseFloat(f.rating)) return false;
    if (f.time !== 'Any' && r.time > parseInt(f.time, 10)) return false;
    if (f.difficulty !== 'Any' && r.difficulty > parseInt(f.difficulty, 10)) return false;
    return true;
  });
  const picked = f.tasteList || [];
  if (picked.length) out = out.filter((r) => picked.every((t) => r.tastes.indexOf(t) !== -1));
  const s = f.sort;
  out = out.slice().sort((a, b) =>
    s === 'Newest first' ? (a.date < b.date ? 1 : -1)
      : s === 'Quickest first' ? a.time - b.time
        : s === 'Easiest first' ? a.difficulty - b.difficulty
          : s === 'Title A to Z' ? a.title.localeCompare(b.title)
            : b.rating - a.rating);
  return out;
}

export interface PantryEntry { key: string; uses: number }

// Every non-basic ingredient across the archive, with how many recipes use it.
export function pantryCatalogue(state: AppState): PantryEntry[] {
  const counts: Record<string, number> = {};
  visibleRecipes(state).forEach((r) => r.ingredients.forEach((i) => {
    if (isBasic(i.n)) return;
    const k = ingKey(i.n);
    counts[k] = (counts[k] || 0) + 1;
  }));
  return Object.keys(counts)
    .sort((a, b) => counts[b] - counts[a] || (a < b ? -1 : 1))
    .map((k) => ({ key: k, uses: counts[k] }));
}

export interface RecipeMatch { total: number; missing: string[]; haveCount: number; pct: number }

export function matchRecipe(state: AppState, r: Recipe): RecipeMatch {
  const have = state.pantry;
  const need: string[] = [];
  const missing: string[] = [];
  r.ingredients.forEach((i) => {
    if (isBasic(i.n)) return;
    const k = ingKey(i.n);
    need.push(k);
    if (have.indexOf(k) < 0) missing.push(i.n.split(',')[0].trim());
  });
  const total = need.length || 1;
  return { total: need.length, missing, haveCount: need.length - missing.length,
    pct: Math.round((need.length - missing.length) / total * 100) };
}

export interface ShoppingItem { key: string; name: string; unit: string; total: number; recipes: string[]; qb?: boolean }

export function shoppingItems(state: AppState): ShoppingItem[] {
  const map: Record<string, ShoppingItem> = {};
  state.selected.forEach((id) => {
    const r = state.recipes.find((x) => x.id === id);
    if (!r || !canSee(state, r)) return;
    const factor = portionsFor(state, r) / r.portions;
    r.ingredients.forEach((i) => {
      if (isBasic(i.n)) return;
      const name = i.n.split(',')[0].trim();
      const key = `${name.toLowerCase()}|${i.u || ''}`;
      if (!map[key]) map[key] = { key, name, unit: i.u || '', total: 0, recipes: [] };
      // q.b. — as much as you like — never scales and never gets a total.
      if (i.qb) map[key].qb = true;
      else map[key].total += (Number(i.q) || 0) * factor;
      if (map[key].recipes.indexOf(r.title) === -1) map[key].recipes.push(r.title);
    });
  });
  return Object.keys(map).map((k) => map[k]).sort((a, b) => a.name.localeCompare(b.name));
}

export function myRatingFor(state: AppState, id: string): number {
  return state.myRatings[id] || me(state).ratingsGiven[id] || 0;
}

export function myRatedIds(state: AppState): string[] {
  const seeded = Object.keys(me(state).ratingsGiven || {});
  const live = Object.keys(state.myRatings || {}).filter((id) => state.myRatings[id]);
  return seeded.concat(live.filter((id) => seeded.indexOf(id) < 0))
    .filter((id) => state.recipes.some((r) => r.id === id));
}

export function myContributions(state: AppState): Recipe[] {
  const n = me(state).name;
  return n ? state.recipes.filter((r) => r.submitter === n) : [];
}
