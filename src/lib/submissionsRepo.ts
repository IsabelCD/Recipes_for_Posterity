// Centralized Firestore access for the submission/publishing workflow —
// mirrors src/lib/recipesRepo.ts's shape so every caller (create, resubmit,
// discard, the editor's moderation actions, and the auth-driven refresh in
// AppStateContext.tsx) goes through one place rather than repeating query
// or transaction logic. See firestore.rules for the access rules these
// queries are shaped to satisfy — especially the note on list-query
// provability under `match /submissions/{submissionId}`.
import {
  collection, deleteDoc, doc, getDocs, query, runTransaction, serverTimestamp, setDoc, Timestamp, updateDoc, where,
} from 'firebase/firestore';
import { db } from './firebase';
import type { FirestoreRecipeStep } from './firestoreRecipes';
import type { Access, Ingredient, PendingSubmission, RejectedSubmission, Submission, SubmissionStatus } from '../types';

const SUBMISSIONS_COLLECTION = 'submissions';
const RECIPES_COLLECTION = 'recipes';

interface FirestoreSubmissionData {
  ownerUid: string;
  ownerEmail: string;
  submitter: string;
  status: SubmissionStatus;
  title: string;
  author: string;
  nationality: string;
  meal: string;
  tastes: string[];
  time: number;
  difficulty: number;
  portions: number;
  source: string;
  notes: string;
  access: Access;
  ingredients: Ingredient[];
  steps: FirestoreRecipeStep[];
  photos: string[];
  summary: string;
  flag: string;
  reason: string;
  note: string;
  decidedBy: string;
  decidedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Content fields a reader supplies from the contribute form — everything
// in FirestoreSubmissionData except the identity/status/moderation/time
// fields the caller (not the form) is responsible for.
export interface SubmissionContent {
  title: string; author: string; nationality: string; meal: string;
  tastes: string[]; time: number; difficulty: number; portions: number; source: string;
  notes: string; access: Access; ingredients: Ingredient[]; steps: FirestoreRecipeStep[]; photos: string[];
  summary: string; flag: string;
}

// Three parallel arrays (steps/uses/stepPhotos — the shape the contribute
// form and the old mock PendingSubmission both use) converted into the
// array-of-maps shape Firestore needs, same convention as
// firestoreRecipes.ts's toFirestoreRecipeData.
export function stepsToFirestore(steps: string[], uses: Ingredient[][], stepPhotos: string[]): FirestoreRecipeStep[] {
  return steps.map((text, i) => {
    const photoSlotId = stepPhotos[i];
    return { text, uses: uses[i] ?? [], ...(photoSlotId ? { photoSlotId } : {}) };
  });
}

// The contribute form's `formFields()` output, converted into a
// FirestoreSubmissionData content patch.
export function contentFromFormFields(v: {
  title: string; author: string; nationality: string; meal: string;
  tastes: string[]; time: number; difficulty: number; portions: number; source: string;
  notes: string; access: Access; ingredients: Ingredient[]; steps: string[]; uses: Ingredient[][];
  stepPhotos: string[]; photos: string[];
}, summary: string, flag: string): SubmissionContent {
  return {
    title: v.title, author: v.author, nationality: v.nationality, meal: v.meal,
    tastes: v.tastes, time: v.time, difficulty: v.difficulty, portions: v.portions, source: v.source,
    notes: v.notes, access: v.access, ingredients: v.ingredients,
    steps: stepsToFirestore(v.steps, v.uses, v.stepPhotos),
    photos: v.photos, summary, flag,
  };
}

function toDateString(ts: Timestamp | null | undefined): string {
  return ts instanceof Timestamp ? ts.toDate().toISOString().slice(0, 10) : '';
}

// Firestore → the shapes AdminPage/MyPage already render. `wait` is
// computed from the real createdAt timestamp rather than stored as a
// canned string like the old mock's 'Submitted 2 days ago'.
function toPendingSubmission(id: string, data: FirestoreSubmissionData): PendingSubmission {
  return {
    id, title: data.title, author: data.author, submitter: data.submitter,
    nationality: data.nationality, meal: data.meal, tastes: data.tastes,
    time: data.time, difficulty: data.difficulty, portions: data.portions, source: data.source,
    wait: waitLabel(data.createdAt), summary: data.summary, flag: data.flag,
    ingredients: data.ingredients,
    steps: data.steps.map((s) => s.text),
    uses: data.steps.map((s) => s.uses),
    stepPhotos: data.steps.map((s) => s.photoSlotId ?? ''),
    access: data.access, ownerUid: data.ownerUid, ownerEmail: data.ownerEmail, notes: data.notes,
    photos: data.photos,
  };
}

function toRejectedSubmission(id: string, data: FirestoreSubmissionData): RejectedSubmission {
  return {
    ...toPendingSubmission(id, data),
    status: data.status === 'rejected' ? 'Rejected' : 'Pending revision',
    reason: data.reason, note: data.note, rejectedOn: toDateString(data.decidedAt), by: data.decidedBy,
  };
}

function toSubmission(id: string, data: FirestoreSubmissionData): Submission {
  return {
    ...toPendingSubmission(id, data),
    ownerUid: data.ownerUid, status: data.status, reason: data.reason || undefined,
    note: data.note || undefined, decidedBy: data.decidedBy || undefined,
    decidedOn: data.decidedAt ? toDateString(data.decidedAt) : undefined,
  };
}

// "Submitted 3 days ago" — computed from the real createdAt timestamp
// instead of the old mock's hardcoded string.
export function waitLabel(ts: Timestamp | null | undefined): string {
  if (!(ts instanceof Timestamp)) return 'Just submitted';
  const days = Math.floor((Date.now() - ts.toDate().getTime()) / 86400000);
  if (days <= 0) {
    const hours = Math.floor((Date.now() - ts.toDate().getTime()) / 3600000);
    return hours <= 0 ? 'Submitted moments ago' : `Submitted ${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  return `Submitted ${days} day${days === 1 ? '' : 's'} ago`;
}

// ── reader: own submissions ──

export async function createSubmission(owner: { uid: string; email: string }, submitter: string, content: SubmissionContent): Promise<void> {
  const ref = doc(collection(db, SUBMISSIONS_COLLECTION));
  const data: FirestoreSubmissionData = {
    ownerUid: owner.uid, ownerEmail: owner.email, submitter, status: 'pending',
    ...content,
    reason: '', note: '', decidedBy: '', decidedAt: null,
    createdAt: serverTimestamp() as unknown as Timestamp,
    updatedAt: serverTimestamp() as unknown as Timestamp,
  };
  await setDoc(ref, data);
}

export async function queryMySubmissions(uid: string): Promise<Submission[]> {
  const q = query(collection(db, SUBMISSIONS_COLLECTION), where('ownerUid', '==', uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toSubmission(d.id, d.data() as FirestoreSubmissionData));
}

// Owner resubmitting a needs_revision submission — status returns to
// 'pending'. Firestore rules only allow this exact transition on a doc
// the caller owns.
export async function resubmitSubmission(id: string, content: SubmissionContent): Promise<void> {
  await updateDoc(doc(db, SUBMISSIONS_COLLECTION, id), {
    ...content, status: 'pending', updatedAt: serverTimestamp(),
  });
}

// Owner discarding their own needs_revision/rejected submission.
export async function discardSubmission(id: string): Promise<void> {
  await deleteDoc(doc(db, SUBMISSIONS_COLLECTION, id));
}

// ── editor: moderation queue ──

export async function queryModerationQueue(): Promise<{ pending: PendingSubmission[]; rejected: RejectedSubmission[] }> {
  const q = query(collection(db, SUBMISSIONS_COLLECTION), where('status', 'in', ['pending', 'needs_revision']));
  const snap = await getDocs(q);
  const pending: PendingSubmission[] = [];
  const rejected: RejectedSubmission[] = [];
  snap.docs.forEach((d) => {
    const data = d.data() as FirestoreSubmissionData;
    if (data.status === 'pending') pending.push(toPendingSubmission(d.id, data));
    else rejected.push(toRejectedSubmission(d.id, data));
  });
  return { pending, rejected };
}

// Editor content-only amend ("Amend before approving" / "Save, keep in
// the queue") — status is left exactly as it was.
export async function amendSubmissionContent(id: string, content: SubmissionContent): Promise<void> {
  await updateDoc(doc(db, SUBMISSIONS_COLLECTION, id), { ...content, updatedAt: serverTimestamp() });
}

export async function requestRevision(id: string, decidedBy: string, reason: string, note: string): Promise<void> {
  await updateDoc(doc(db, SUBMISSIONS_COLLECTION, id), {
    status: 'needs_revision', reason, note, decidedBy, decidedAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
}

export async function rejectSubmission(id: string, decidedBy: string, reason: string, note: string): Promise<void> {
  await updateDoc(doc(db, SUBMISSIONS_COLLECTION, id), {
    status: 'rejected', reason, note, decidedBy, decidedAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
}

export interface PublishSource {
  id: string; title: string; author: string; submitter: string; nationality: string; meal: string;
  tastes: string[]; time: number; difficulty: number; portions: number; source: string;
  notes: string; access: Access; ownerUid: string; ownerEmail: string;
  ingredients: Ingredient[]; steps: FirestoreRecipeStep[]; photos: string[]; blurb: string;
}

// Publishing: create the real recipes/{id} doc and remove the submission,
// as one transaction so nothing can half-succeed. Firestore rules check
// each half independently (recipes/create and submissions/delete), both
// gated to editors — see firestore.rules.
export async function publishSubmission(p: PublishSource): Promise<void> {
  await runTransaction(db, async (tx) => {
    const subRef = doc(db, SUBMISSIONS_COLLECTION, p.id);
    const subSnap = await tx.get(subRef);
    if (!subSnap.exists()) throw new Error('This submission no longer exists — it may have just been published or discarded.');
    const recipeRef = doc(collection(db, RECIPES_COLLECTION));
    tx.set(recipeRef, {
      title: p.title, author: p.author, submitter: p.submitter, nationality: p.nationality, meal: p.meal,
      tastes: p.tastes, time: p.time, difficulty: p.difficulty, rating: 0, votes: 0,
      ratingSum: 0,
      date: new Date().toISOString().slice(0, 10), portions: p.portions, source: p.source, blurb: p.blurb,
      notes: p.notes, ingredients: p.ingredients, steps: p.steps, photos: p.photos, comments: [],
      access: p.access, ownerUid: p.ownerUid, ownerEmail: p.ownerEmail, circleEmails: [],
    });
    tx.delete(subRef);
  });
}
