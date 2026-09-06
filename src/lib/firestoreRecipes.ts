// The Firestore-shaped recipe document, and the two pure mapping
// functions that convert to/from the app's existing `Recipe` type
// (src/types.ts). No page or selector needs to know this shape exists —
// everything downstream of `toAppRecipe` still sees the same
// steps[]/uses[][]/stepPhotos[] the UI was already built against.
//
// Why the shape differs from `Recipe`: Firestore Standard edition does
// not support an array whose elements are themselves arrays (Recipe.uses
// is `Ingredient[][]`, one array of "amounts used" per step, which is
// exactly that). An array of *maps*, each map holding its own array, is
// fine — so each step becomes one map carrying its own `uses` list
// alongside its text and (optional) photo slot id, instead of three
// parallel top-level arrays that only line up by index.
import type { Access, Ingredient, Recipe, RecipeComment } from '../types';

export interface FirestoreRecipeStep {
  text: string;
  uses: Ingredient[];
  // Was `stepPhotos[i]`. Omitted entirely when there's no photo for this
  // step, rather than stored as '' — Firestore has no reason to carry an
  // empty placeholder field, and `toAppRecipe` reintroduces the '' for
  // the UI, which already treats falsy stepPhotos entries as "no photo".
  photoSlotId?: string;
}

export interface FirestoreRecipeData {
  title: string;
  author: string;
  submitter: string;
  nationality: string;
  meal: string;
  tastes: string[];
  time: number;
  difficulty: number;
  rating: number;
  votes: number;
  // The exact sum of every individual rating (recipes/{id}/ratings/*),
  // maintained alongside `rating`/`votes` by the transaction in
  // src/lib/ratingsRepo.ts — `rating` is always `ratingSum / votes` (or 0),
  // stored at full precision so recomputing it repeatedly can't drift the
  // way rebuilding it from a rounded `rating * votes` would. Not exposed
  // on the app-facing Recipe type; nothing outside that transaction reads
  // or writes it.
  ratingSum: number;
  date: string;
  portions: number;
  source: string;
  blurb: string;
  notes: string;
  ingredients: Ingredient[];
  steps: FirestoreRecipeStep[];
  photos: string[];
  // Seeded/legacy notes, kept as a plain field for now — Phase 3 turns
  // this into a `comments` subcollection with real document IDs. Reading
  // it here is what lets RecipePage's existing
  // `r.comments.concat(extraComments[r.id])` merge keep working
  // unchanged in Phase 1.
  comments: RecipeComment[];
  access: Access;
  ownerUid: string | null;
  ownerEmail: string;
  circleEmails: string[];
  editedOn?: string;
  editedBy?: string;
}

// Firestore → app. `id` comes from the document ID, not a field.
export function toAppRecipe(id: string, data: FirestoreRecipeData): Recipe {
  return {
    id,
    title: data.title,
    author: data.author,
    submitter: data.submitter,
    nationality: data.nationality,
    meal: data.meal,
    tastes: data.tastes,
    time: data.time,
    difficulty: data.difficulty,
    rating: data.rating,
    votes: data.votes,
    date: data.date,
    portions: data.portions,
    source: data.source,
    blurb: data.blurb,
    notes: data.notes,
    ingredients: data.ingredients,
    steps: data.steps.map((s) => s.text),
    uses: data.steps.map((s) => s.uses),
    stepPhotos: data.steps.map((s) => s.photoSlotId ?? ''),
    comments: data.comments,
    access: data.access,
    ownerUid: data.ownerUid,
    ownerEmail: data.ownerEmail,
    circleEmails: data.circleEmails,
    photos: data.photos,
    editedOn: data.editedOn,
    editedBy: data.editedBy,
  };
}

// App → Firestore. Used only by the seed script (scripts/seedFirestoreRecipes.ts)
// to convert the existing src/data/recipes.ts array. `undefined` fields
// (Firestore rejects those, unlike missing keys) are all guarded out below.
export function toFirestoreRecipeData(recipe: Recipe): FirestoreRecipeData {
  const steps: FirestoreRecipeStep[] = recipe.steps.map((text, i) => {
    const photoSlotId = recipe.stepPhotos?.[i];
    return {
      text,
      uses: recipe.uses[i] ?? [],
      ...(photoSlotId ? { photoSlotId } : {}),
    };
  });
  return {
    title: recipe.title,
    author: recipe.author,
    submitter: recipe.submitter,
    nationality: recipe.nationality,
    meal: recipe.meal,
    tastes: recipe.tastes,
    time: recipe.time,
    difficulty: recipe.difficulty,
    rating: recipe.rating,
    votes: recipe.votes,
    // Backfilled from the seeded rating/votes so a demo recipe's first
    // real rating adjusts a plausible existing average rather than
    // discarding it — see the field comment above.
    ratingSum: recipe.rating * recipe.votes,
    date: recipe.date,
    portions: recipe.portions,
    source: recipe.source,
    blurb: recipe.blurb,
    notes: recipe.notes,
    ingredients: recipe.ingredients,
    steps,
    photos: recipe.photos ?? [],
    comments: recipe.comments,
    access: recipe.access ?? 'public',
    ownerUid: recipe.ownerUid ?? null,
    ownerEmail: recipe.ownerEmail ?? '',
    circleEmails: recipe.circleEmails ?? [],
    ...(recipe.editedOn ? { editedOn: recipe.editedOn } : {}),
    ...(recipe.editedBy ? { editedBy: recipe.editedBy } : {}),
  };
}
