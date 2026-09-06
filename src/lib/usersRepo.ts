// Centralized Firestore access for the users/{uid} collection: a signed-in
// user's own profile (today just the inner-circle list — nothing in the
// UI edits displayName yet, though firestore.rules' update rule allows it
// too) and an editor's account-role management (find an account by email,
// list current editors, promote/demote). Mirrors the other *Repo.ts
// files' one-collection-per-concern convention.
import {
  collection, doc, getDocs, query, Timestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { EditorAccount, Role } from '../types';

const USERS_COLLECTION = 'users';
const RECIPES_COLLECTION = 'recipes';

function toEditorAccount(uid: string, data: Record<string, unknown>): EditorAccount {
  return {
    uid,
    displayName: typeof data.displayName === 'string' ? data.displayName : '',
    email: typeof data.email === 'string' ? data.email : '',
    role: data.role === 'editor' ? 'editor' : 'reader',
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString().slice(0, 10) : '',
  };
}

// Editor-only (see firestore.rules' users/{userId} `list` rule): find the
// one account signed up with this email, to promote or demote it. Not a
// security boundary in itself — the actual role change is gated by
// firestore.rules' isEditorRoleChange(), which re-checks isEditor() and
// exactly-role-field-moves independently of whatever this lookup found.
export async function findUserByEmail(email: string): Promise<EditorAccount | null> {
  const snap = await getDocs(query(collection(db, USERS_COLLECTION), where('email', '==', email)));
  if (snap.empty) return null;
  const d = snap.docs[0];
  return toEditorAccount(d.id, d.data());
}

// Editor-only: every account currently holding the editor role, for the
// Admin page's "Editors" list.
export async function queryEditors(): Promise<EditorAccount[]> {
  const snap = await getDocs(query(collection(db, USERS_COLLECTION), where('role', '==', 'editor')));
  return snap.docs.map((d) => toEditorAccount(d.id, d.data()));
}

// Promotes or demotes an account by uid. firestore.rules' users/{userId}
// update rule only allows this for a caller who isEditor(), moving
// nothing but the role field, and never on the caller's own document —
// see isEditorRoleChange().
export async function setUserRole(uid: string, role: Role): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, uid), { role });
}

// Persists a signed-in user's inner circle, and keeps every one of their
// own already-published circle-access recipes in sync with it. A
// recipe's `circleEmails` is denormalized onto the recipe doc itself (so
// Firestore can query "recipes visible to me" with a plain
// array-contains — see recipesRepo.ts's queryCircleRecipes), so changing
// the circle is a fan-out write, not just one document.
//
// One batch rather than a transaction: finding which recipes need the
// update requires a query first, and a client transaction can only
// re-read documents it already knows the ref of — a batch has no such
// restriction, and still commits every write atomically together (see
// firestore.rules' isCircleSync(), which bounds each recipe half of this
// batch to exactly the circleEmails field, on exactly the caller's own
// circle-access recipes).
export async function setMyCircleEmails(uid: string, circleEmails: string[]): Promise<void> {
  const own = await getDocs(query(collection(db, RECIPES_COLLECTION), where('ownerUid', '==', uid)));
  const batch = writeBatch(db);
  batch.update(doc(db, USERS_COLLECTION, uid), { circleEmails });
  own.docs.forEach((d) => {
    const data = d.data() as { access?: string };
    if (data.access === 'circle') {
      batch.update(doc(db, RECIPES_COLLECTION, d.id), { circleEmails });
    }
  });
  await batch.commit();
}
