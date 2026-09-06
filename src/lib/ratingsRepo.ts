// Centralized Firestore access for the ratings workflow — mirrors
// src/lib/recipesRepo.ts / submissionsRepo.ts. One rating per user per
// recipe, at recipes/{recipeId}/ratings/{uid}.
//
// Rating or un-rating also updates the recipe's own displayed
// `rating`/`votes` aggregate, in the same transaction as the rating
// document write — see rateRecipe/clearRating below. There is no Cloud
// Function in this project, so this is a client-side transaction rather
// than a trusted-server recompute; `runTransaction` still makes it
// correct under concurrent raters (Firestore retries a transaction that
// loses a race on the recipe doc), but firestore.rules can only bound
// the *shape* of the resulting update (exactly these three fields, one
// rating's worth of movement, internally consistent), not prove it
// corresponds to a real rating document being written — see
// firestore.rules' isAggregateUpdate() for the exact limits.
import {
  doc, getDoc, runTransaction, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

// This is the very first Firestore read that strictly requires
// request.auth (recipes/comments are readable by anyone; a rating get
// needs the caller's own uid) — right after a cold page load restores a
// signed-in session, it can briefly race the SDK attaching the refreshed
// credential to the Firestore transport and come back permission-denied
// even though the exact same read reliably succeeds moments later.
// Retrying once, same idea as fetchUserProfile's retry in
// AppStateContext.tsx, rides out that window instead of surfacing it.
async function getRatingWithRetry(recipeId: string, uid: string) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await getDoc(doc(db, 'recipes', recipeId, 'ratings', uid));
    } catch (e) {
      const code = (e as { code?: string } | null)?.code;
      if (code !== 'permission-denied' || attempt === 3) throw e;
      await sleep(300);
    }
  }
  throw new Error('unreachable');
}

// One get() per recipe rather than a collectionGroup query: at this
// archive's scale a handful of parallel reads is simpler than adding a
// redundant indexed field and a wildcard security rule just to support a
// query that only ever needs to run once per sign-in.
export async function loadMyRatings(uid: string, recipeIds: string[]): Promise<Record<string, number>> {
  const entries = await Promise.all(recipeIds.map(async (id) => {
    const snap = await getRatingWithRetry(id, uid);
    const value = snap.exists() ? (snap.data().value as number) : 0;
    return [id, value] as const;
  }));
  const out: Record<string, number> = {};
  entries.forEach(([id, value]) => { if (value) out[id] = value; });
  return out;
}

// A recipe doc from before this feature existed has no ratingSum field
// yet — treat it as the exact product of its seeded rating/votes rather
// than 0, so a demo recipe's first real rating adjusts a plausible
// existing average instead of discarding it (see
// src/lib/firestoreRecipes.ts's ratingSum field comment, which backfills
// this same value for anything freshly seeded from now on).
function priorRatingSum(recipeData: { rating?: number; votes?: number; ratingSum?: number }): number {
  if (typeof recipeData.ratingSum === 'number') return recipeData.ratingSum;
  return (recipeData.rating || 0) * (recipeData.votes || 0);
}

export async function rateRecipe(recipeId: string, uid: string, value: number): Promise<void> {
  const recipeRef = doc(db, 'recipes', recipeId);
  const ratingRef = doc(db, 'recipes', recipeId, 'ratings', uid);
  await runTransaction(db, async (tx) => {
    const [recipeSnap, ratingSnap] = await Promise.all([tx.get(recipeRef), tx.get(ratingRef)]);
    if (!recipeSnap.exists()) throw new Error('This recipe no longer exists.');
    const recipeData = recipeSnap.data();
    const wasRated = ratingSnap.exists();
    const oldValue = wasRated ? (ratingSnap.data().value as number) : 0;
    const currentVotes = recipeData.votes || 0;
    const currentSum = priorRatingSum(recipeData);

    const newVotes = wasRated ? currentVotes : currentVotes + 1;
    const newSum = currentSum - oldValue + value;
    const newRating = newVotes > 0 ? newSum / newVotes : 0;

    tx.set(ratingRef, { uid, value, ratedAt: serverTimestamp() });
    tx.update(recipeRef, { votes: newVotes, ratingSum: newSum, rating: newRating });
  });
}

export async function clearRating(recipeId: string, uid: string): Promise<void> {
  const recipeRef = doc(db, 'recipes', recipeId);
  const ratingRef = doc(db, 'recipes', recipeId, 'ratings', uid);
  await runTransaction(db, async (tx) => {
    const [recipeSnap, ratingSnap] = await Promise.all([tx.get(recipeRef), tx.get(ratingRef)]);
    if (!ratingSnap.exists()) return; // nothing to remove
    if (!recipeSnap.exists()) { tx.delete(ratingRef); return; }
    const recipeData = recipeSnap.data();
    const oldValue = ratingSnap.data().value as number;
    const currentVotes = recipeData.votes || 0;
    const currentSum = priorRatingSum(recipeData);

    const newVotes = Math.max(0, currentVotes - 1);
    const newSum = newVotes > 0 ? currentSum - oldValue : 0;
    const newRating = newVotes > 0 ? newSum / newVotes : 0;

    tx.delete(ratingRef);
    tx.update(recipeRef, { votes: newVotes, ratingSum: newSum, rating: newRating });
  });
}
