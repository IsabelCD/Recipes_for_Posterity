// Centralized Firestore access for a signed-in user's own profile — today
// just the inner-circle list (nothing in the UI edits displayName yet,
// though firestore.rules' users/{uid} update rule allows it too, since the
// requirement is about which fields may ever move, not just today's
// screens). Mirrors the other *Repo.ts files' one-collection-per-concern
// convention.
import {
  collection, doc, getDocs, query, where, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

const USERS_COLLECTION = 'users';
const RECIPES_COLLECTION = 'recipes';

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
