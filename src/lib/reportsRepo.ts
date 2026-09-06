// Centralized Firestore access for recipe reports/takedown requests —
// mirrors src/lib/submissionsRepo.ts's shape. Reports live in their own
// top-level collection (not nested under the recipe) so an editor can
// query one global queue across every recipe, the same reasoning as
// Phase 2's submissions collection.
//
// Nothing here is ever hard-deleted: dismissing or resolving a report is
// a status change, so the moderation history stays in Firestore even
// though the editor's own queue (queryOpenReports) only ever shows the
// open ones — matching the mock's exact "it just disappears" UX.
import {
  collection, doc, getDocs, query, serverTimestamp, setDoc, Timestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Takedown } from '../types';

const REPORTS_COLLECTION = 'reports';
const RECIPES_COLLECTION = 'recipes';

interface FirestoreReportData {
  recipeId: string;
  recipeTitle: string;
  // Nullable rather than required: the app only ever calls createReport
  // for a signed-in reporter today (that's a product choice — gating
  // reporting to real accounts, made in AppStateContext.tsx/RecipePage.tsx
  // — not a constraint Firestore forces), but the schema itself doesn't
  // rule out an anonymous report existing later.
  reporterUid: string | null;
  reporterName: string | null;
  kind: string;
  reason: string;
  status: 'open' | 'dismissed' | 'resolved';
  createdAt: Timestamp;
  closedAt: Timestamp | null;
  closedBy: string;
}

function toTakedown(id: string, data: FirestoreReportData): Takedown {
  return {
    id, recipeId: data.recipeId, title: data.recipeTitle,
    by: data.reporterName || 'A reader', kind: data.kind, reason: data.reason,
  };
}

export async function createReport(
  recipeId: string, recipeTitle: string, reporterUid: string, reporterName: string, kind: string, reason: string,
): Promise<void> {
  const ref = doc(collection(db, REPORTS_COLLECTION));
  const data: FirestoreReportData = {
    recipeId, recipeTitle, reporterUid, reporterName, kind, reason, status: 'open',
    createdAt: serverTimestamp() as unknown as Timestamp, closedAt: null, closedBy: '',
  };
  await setDoc(ref, data);
}

export async function queryOpenReports(): Promise<Takedown[]> {
  const q = query(collection(db, REPORTS_COLLECTION), where('status', '==', 'open'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toTakedown(d.id, d.data() as FirestoreReportData));
}

async function closeReport(id: string, status: 'dismissed' | 'resolved', closedBy: string): Promise<void> {
  await updateDoc(doc(db, REPORTS_COLLECTION, id), { status, closedBy, closedAt: serverTimestamp() });
}

export async function dismissReport(id: string, closedBy: string): Promise<void> {
  await closeReport(id, 'dismissed', closedBy);
}

// Deletes the reported recipe and resolves its report as one batch — the
// recipe amend/fix flow itself stays local-only (out of scope for this
// phase, same as it's been since Phase 2), but outright removal is a real
// write, so both halves of "the recipe is gone, the report is handled"
// commit together.
export async function removeReportedRecipe(reportId: string, recipeId: string, closedBy: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, RECIPES_COLLECTION, recipeId));
  batch.update(doc(db, REPORTS_COLLECTION, reportId), { status: 'resolved', closedBy, closedAt: serverTimestamp() });
  await batch.commit();
}

// Called once the editor saves their fix from the amend flow — the
// recipe content change itself is still local-only, but the report this
// fix was for is real, so its resolution is.
export async function resolveReport(reportId: string, closedBy: string): Promise<void> {
  await closeReport(reportId, 'resolved', closedBy);
}
