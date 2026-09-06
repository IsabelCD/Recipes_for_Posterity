// The one place that queries (and, since the editor content-amend below,
// writes) Firestore recipes. Every caller — the auth-state listener, and
// any action that publishes/amends/deletes a recipe — goes through
// `loadVisibleRecipes` for reads, so the "which query for which identity"
// logic exists exactly once.
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { toAppRecipe, type FirestoreRecipeData, type FirestoreRecipeStep } from './firestoreRecipes';
import type { Access, Ingredient, Recipe, Role } from '../types';

const RECIPES_COLLECTION = 'recipes';

function docsToRecipes(snap: { docs: { id: string; data: () => unknown }[] }): Recipe[] {
  return snap.docs.map((d) => toAppRecipe(d.id, d.data() as FirestoreRecipeData));
}

export async function queryPublicRecipes(): Promise<Recipe[]> {
  const q = query(collection(db, RECIPES_COLLECTION), where('access', '==', 'public'));
  return docsToRecipes(await getDocs(q));
}

export async function queryOwnRecipes(uid: string): Promise<Recipe[]> {
  const q = query(collection(db, RECIPES_COLLECTION), where('ownerUid', '==', uid));
  return docsToRecipes(await getDocs(q));
}

export async function queryCircleRecipes(email: string): Promise<Recipe[]> {
  const q = query(collection(db, RECIPES_COLLECTION), where('circleEmails', 'array-contains', email));
  return docsToRecipes(await getDocs(q));
}

export async function queryAllRecipesForEditor(): Promise<Recipe[]> {
  return docsToRecipes(await getDocs(collection(db, RECIPES_COLLECTION)));
}

// A single recipe by its known id, bypassing the visibility-query merge.
// Not called anywhere in Phase 1 — kept here (rather than left for a
// later phase to invent its own ad-hoc getDoc call) so there is still
// only one file that knows how a Firestore recipe doc turns into a
// `Recipe`.
export async function fetchRecipeById(id: string): Promise<Recipe | null> {
  const snap = await getDoc(doc(db, RECIPES_COLLECTION, id));
  return snap.exists() ? toAppRecipe(snap.id, snap.data() as FirestoreRecipeData) : null;
}

function dedupeById(recipes: Recipe[]): Recipe[] {
  const byId = new Map<string, Recipe>();
  recipes.forEach((r) => byId.set(r.id, r));
  return Array.from(byId.values());
}

export interface VisibilityContext {
  signedIn: boolean;
  role: Role;
  uid: string | null;
  email: string | null;
}

// The reusable entry point requested for Phase 1: signed-out visitors get
// the public query only; a signed-in reader gets the public/own/circle
// three-query merge, de-duplicated by doc id; an editor gets everything.
// Call this after any event that could change which recipes should be
// visible — auth changes now, and (in later phases) after publishing,
// amending, or deleting a recipe — instead of re-deriving the query
// selection at each call site.
export async function loadVisibleRecipes(ctx: VisibilityContext): Promise<Recipe[]> {
  if (!ctx.signedIn) return queryPublicRecipes();
  if (ctx.role === 'editor') return queryAllRecipesForEditor();
  const [pub, own, circle] = await Promise.all([
    queryPublicRecipes(),
    ctx.uid ? queryOwnRecipes(ctx.uid) : Promise.resolve([]),
    ctx.email ? queryCircleRecipes(ctx.email) : Promise.resolve([]),
  ]);
  return dedupeById([...pub, ...own, ...circle]);
}

// Everything an editor's "fix" (amend) form can change about an
// already-published recipe. Deliberately excludes ownerUid/ownerEmail/
// circleEmails/access-driven visibility bookkeeping, rating/votes/
// ratingSum, date, blurb and comments — none of those are fields the
// amend form even shows, and firestore.rules' isEditorContentAmend()
// independently enforces the same boundary (only these fields may move).
export interface RecipeAmendment {
  title: string; author: string; submitter: string; nationality: string; meal: string;
  tastes: string[]; time: number; difficulty: number; portions: number; source: string;
  notes: string; access: Access; ingredients: Ingredient[]; steps: FirestoreRecipeStep[]; photos: string[];
  editedOn: string; editedBy: string;
}

// Editor-only (see firestore.rules). Content amend of a recipe that's
// already live — the submission-stage equivalent of this is
// submissionsRepo.ts's amendSubmissionContent; this is what "Amend the
// recipe" from a report, or "Save the new version" from a recipe page,
// actually persists now instead of only updating local state.
export async function amendRecipe(id: string, content: RecipeAmendment): Promise<void> {
  await updateDoc(doc(db, RECIPES_COLLECTION, id), { ...content });
}
