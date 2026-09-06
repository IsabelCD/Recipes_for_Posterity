// Phase 3 security-rules tests for ratings, comments and replies. Run the
// same way as the other rule test files — via `npm run test:rules`, which
// wraps every file in `tests/` under one `firebase emulators:exec`
// invocation.
//
// Own emulator projectId, deliberately different from every other rule
// test file — see tests/firestore.recipes.rules.test.ts's header comment
// for why sharing one races another file's seed-then-query sequence.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import {
  assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  addDoc, collection, doc, getDoc, getDocs, serverTimestamp, setDoc, deleteDoc, updateDoc,
} from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = 'demo-recipes-for-posterity-interactions';

const [emulatorHost, emulatorPortStr] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
const FIRESTORE_PORT = Number(emulatorPortStr);

const ALICE_UID = 'alice-uid';
const ALICE_EMAIL = 'alice@example.com';
const BOB_UID = 'bob-uid';
const BOB_EMAIL = 'bob@example.com';
const EDITOR_UID = 'editor-uid';
const EDITOR_EMAIL = 'editor@example.com';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8'),
      host: emulatorHost,
      port: FIRESTORE_PORT,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

async function seedRecipe(id: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'recipes', id), {
      title: `Recipe ${id}`, access: 'public', ownerUid: null, ownerEmail: '', circleEmails: [],
      rating: 0, votes: 0, ratingSum: 0,
      ...data,
    });
  });
}

async function seedComment(recipeId: string, commentId: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'recipes', recipeId, 'comments', commentId), {
      uid: BOB_UID, displayName: 'Bob', text: 'Seeded comment', createdAt: new Date(), ...data,
    });
  });
}

async function seedEditorProfile(uid: string, email: string) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', uid), {
      displayName: 'Editor', email, role: 'editor', createdAt: new Date(),
    });
  });
}

describe('firestore.rules — ratings (Phase 3)', () => {
  test('user can create, update and delete their own rating', async () => {
    await seedRecipe('pub1', { access: 'public' });
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    const ref = doc(db, 'recipes', 'pub1', 'ratings', ALICE_UID);

    await assertSucceeds(setDoc(ref, { uid: ALICE_UID, value: 4, ratedAt: serverTimestamp() }));
    await assertSucceeds(setDoc(ref, { uid: ALICE_UID, value: 5, ratedAt: serverTimestamp() }));
    const snap = await assertSucceeds(getDoc(ref));
    expect(snap.data()?.value).toBe(5);
    await assertSucceeds(deleteDoc(ref));
  });

  test('user cannot write another user’s rating', async () => {
    await seedRecipe('pub1', { access: 'public' });
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();

    // Wrong path — the rating doc id isn't her own uid.
    await assertFails(setDoc(doc(db, 'recipes', 'pub1', 'ratings', BOB_UID), {
      uid: BOB_UID, value: 3, ratedAt: serverTimestamp(),
    }));
    // Right path, but the stored uid field lies about who it belongs to.
    await assertFails(setDoc(doc(db, 'recipes', 'pub1', 'ratings', ALICE_UID), {
      uid: BOB_UID, value: 3, ratedAt: serverTimestamp(),
    }));
  });

  test('rating outside 1–5 is denied', async () => {
    await seedRecipe('pub1', { access: 'public' });
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    const ref = doc(db, 'recipes', 'pub1', 'ratings', ALICE_UID);

    await assertFails(setDoc(ref, { uid: ALICE_UID, value: 0, ratedAt: serverTimestamp() }));
    await assertFails(setDoc(ref, { uid: ALICE_UID, value: 6, ratedAt: serverTimestamp() }));
    await assertFails(setDoc(ref, { uid: ALICE_UID, value: 3.5, ratedAt: serverTimestamp() }));
  });

  test('user cannot rate a recipe they cannot access', async () => {
    await seedRecipe('priv1', { access: 'owner', ownerUid: BOB_UID, ownerEmail: BOB_EMAIL });
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(setDoc(doc(db, 'recipes', 'priv1', 'ratings', ALICE_UID), {
      uid: ALICE_UID, value: 4, ratedAt: serverTimestamp(),
    }));
  });

  test('extra fields on a rating are rejected', async () => {
    await seedRecipe('pub1', { access: 'public' });
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(setDoc(doc(db, 'recipes', 'pub1', 'ratings', ALICE_UID), {
      uid: ALICE_UID, value: 4, ratedAt: serverTimestamp(), note: 'sneaking this in',
    }));
  });
});

describe('firestore.rules — recipe rating aggregate (Phase 3 extension)', () => {
  test('a rating write can also update the recipe’s aggregate rating/votes', async () => {
    await seedRecipe('pub1', { access: 'public', rating: 0, votes: 0, ratingSum: 0 });
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertSucceeds(updateDoc(doc(db, 'recipes', 'pub1'), { votes: 1, ratingSum: 4, rating: 4 }));
  });

  test('removing a rating can lower the aggregate back down', async () => {
    await seedRecipe('pub1', { access: 'public', rating: 4, votes: 1, ratingSum: 4 });
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertSucceeds(updateDoc(doc(db, 'recipes', 'pub1'), { votes: 0, ratingSum: 0, rating: 0 }));
  });

  test('a recipe seeded before ratingSum existed can still receive its first aggregate update', async () => {
    // No ratingSum field at all, same as a recipe seeded by Phase 1's
    // original seed script — built directly rather than via seedRecipe()
    // (which always includes ratingSum) so the field is truly absent.
    // 128 * 4.6 = 588.8, plus a new 5 = 593.8 over 129 votes.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'recipes', 'legacy1'), {
        title: 'Recipe legacy1', access: 'public', ownerUid: null, ownerEmail: '', circleEmails: [],
        rating: 4.6, votes: 128,
      });
    });
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertSucceeds(updateDoc(doc(db, 'recipes', 'legacy1'), { votes: 129, ratingSum: 593.8, rating: 593.8 / 129 }));
  });

  test('an aggregate update cannot touch unrelated recipe fields', async () => {
    await seedRecipe('pub1', { access: 'public', rating: 0, votes: 0, ratingSum: 0 });
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(updateDoc(doc(db, 'recipes', 'pub1'), { votes: 1, ratingSum: 4, rating: 4, title: 'Hijacked' }));
  });

  test('an aggregate update cannot jump votes or ratingSum by more than one rating’s worth', async () => {
    await seedRecipe('pub1', { access: 'public', rating: 0, votes: 0, ratingSum: 0 });
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(updateDoc(doc(db, 'recipes', 'pub1'), { votes: 50, ratingSum: 200, rating: 4 }));
  });

  test('an aggregate update must stay internally consistent', async () => {
    await seedRecipe('pub1', { access: 'public', rating: 0, votes: 0, ratingSum: 0 });
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(updateDoc(doc(db, 'recipes', 'pub1'), { votes: 1, ratingSum: 4, rating: 5 }));
  });

  test('a reader cannot update the aggregate of a recipe they cannot access', async () => {
    await seedRecipe('priv1', {
      access: 'owner', ownerUid: BOB_UID, ownerEmail: BOB_EMAIL, rating: 0, votes: 0, ratingSum: 0,
    });
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(updateDoc(doc(db, 'recipes', 'priv1'), { votes: 1, ratingSum: 4, rating: 4 }));
  });
});

describe('firestore.rules — comments and replies (Phase 3)', () => {
  test('an unauthenticated reader can read comments on a public recipe', async () => {
    await seedRecipe('pub1', { access: 'public' });
    await seedComment('pub1', 'c1', {});
    const db = testEnv.unauthenticatedContext().firestore();
    const snap = await assertSucceeds(getDocs(collection(db, 'recipes', 'pub1', 'comments')));
    expect(snap.size).toBe(1);
  });

  test('authenticated user can comment on a recipe they can access', async () => {
    await seedRecipe('pub1', { access: 'public' });
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertSucceeds(addDoc(collection(db, 'recipes', 'pub1', 'comments'), {
      uid: ALICE_UID, displayName: 'Alice Reader', text: 'Lovely recipe.', createdAt: serverTimestamp(),
    }));
  });

  test('user cannot comment on a recipe they cannot access', async () => {
    await seedRecipe('priv1', { access: 'owner', ownerUid: BOB_UID, ownerEmail: BOB_EMAIL });
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(addDoc(collection(db, 'recipes', 'priv1', 'comments'), {
      uid: ALICE_UID, displayName: 'Alice Reader', text: 'Trying anyway.', createdAt: serverTimestamp(),
    }));
  });

  test('comment uid cannot impersonate another user', async () => {
    await seedRecipe('pub1', { access: 'public' });
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(addDoc(collection(db, 'recipes', 'pub1', 'comments'), {
      uid: BOB_UID, displayName: 'Bob', text: 'Not really Bob.', createdAt: serverTimestamp(),
    }));
  });

  test('extra fields on a comment are rejected', async () => {
    await seedRecipe('pub1', { access: 'public' });
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(addDoc(collection(db, 'recipes', 'pub1', 'comments'), {
      uid: ALICE_UID, displayName: 'Alice Reader', text: 'Hello', createdAt: serverTimestamp(), rating: 5,
    }));
  });

  test('authenticated user can reply to an accessible recipe’s comment', async () => {
    await seedRecipe('pub1', { access: 'public' });
    await seedComment('pub1', 'c1', {});
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertSucceeds(addDoc(collection(db, 'recipes', 'pub1', 'comments', 'c1', 'replies'), {
      uid: ALICE_UID, displayName: 'Alice Reader', text: 'Thanks for the note!', createdAt: serverTimestamp(),
    }));
  });

  test('unauthorized/private recipe comments and replies cannot be read', async () => {
    await seedRecipe('priv1', { access: 'owner', ownerUid: BOB_UID, ownerEmail: BOB_EMAIL });
    await seedComment('priv1', 'c1', {});
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'recipes', 'priv1', 'comments', 'c1', 'replies', 'r1'), {
        uid: BOB_UID, displayName: 'Bob', text: 'Seeded reply', createdAt: new Date(),
      });
    });

    const aliceDb = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(getDoc(doc(aliceDb, 'recipes', 'priv1', 'comments', 'c1')));
    await assertFails(getDocs(collection(aliceDb, 'recipes', 'priv1', 'comments')));
    await assertFails(getDoc(doc(aliceDb, 'recipes', 'priv1', 'comments', 'c1', 'replies', 'r1')));

    const anonDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDocs(collection(anonDb, 'recipes', 'priv1', 'comments')));
  });

  test('editor can read and comment on any recipe', async () => {
    await seedEditorProfile(EDITOR_UID, EDITOR_EMAIL);
    await seedRecipe('priv1', { access: 'owner', ownerUid: BOB_UID, ownerEmail: BOB_EMAIL });
    const db = testEnv.authenticatedContext(EDITOR_UID, { email: EDITOR_EMAIL }).firestore();
    await assertSucceeds(getDocs(collection(db, 'recipes', 'priv1', 'comments')));
    await assertSucceeds(addDoc(collection(db, 'recipes', 'priv1', 'comments'), {
      uid: EDITOR_UID, displayName: 'Editor Whitcombe', text: 'Checked this one.', createdAt: serverTimestamp(),
    }));
  });
});
