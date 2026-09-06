// Phase 5 security-rules tests for user-profile updates (inner circle +
// displayName) and the recipe-side circleEmails sync it drives. Run the
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
  collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where,
} from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = 'demo-recipes-for-posterity-users-circle';

const [emulatorHost, emulatorPortStr] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
const FIRESTORE_PORT = Number(emulatorPortStr);

const ALICE_UID = 'alice-uid';
const ALICE_EMAIL = 'alice@example.com';
const BOB_UID = 'bob-uid';
const BOB_EMAIL = 'bob@example.com';
const EDITOR_UID = 'editor-uid';
const EDITOR_EMAIL = 'editor@example.com';

function profileDoc(overrides: Record<string, unknown> = {}) {
  return {
    displayName: 'Alice Reader', email: ALICE_EMAIL, role: 'reader', createdAt: new Date(), circleEmails: [],
    ...overrides,
  };
}

function publicRecipe(id: string, overrides: Record<string, unknown> = {}) {
  return {
    title: `Recipe ${id}`, author: 'A', submitter: 'A', nationality: 'Test', meal: 'Main dish',
    tastes: [], time: 10, difficulty: 1, rating: 0, votes: 0, date: '2026-01-01',
    portions: 2, source: '', blurb: '', notes: '', ingredients: [], steps: [], photos: [], comments: [],
    access: 'public', ownerUid: null, ownerEmail: '', circleEmails: [],
    ...overrides,
  };
}

function circleRecipe(id: string, ownerUid: string, ownerEmail: string, circleEmails: string[]) {
  return publicRecipe(id, { access: 'circle', ownerUid, ownerEmail, circleEmails });
}

function ownerOnlyRecipe(id: string, ownerUid: string, ownerEmail: string) {
  return publicRecipe(id, { access: 'owner', ownerUid, ownerEmail });
}

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

async function seedProfile(uid: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', uid), data);
  });
}

async function seedRecipe(id: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'recipes', id), data);
  });
}

describe('firestore.rules — user profile updates (Phase 5)', () => {
  test('user can update their own displayName', async () => {
    await seedProfile(ALICE_UID, profileDoc());
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertSucceeds(updateDoc(doc(db, 'users', ALICE_UID), { displayName: 'Alice R.' }));
  });

  test('user can update their own circleEmails', async () => {
    await seedProfile(ALICE_UID, profileDoc());
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertSucceeds(updateDoc(doc(db, 'users', ALICE_UID), { circleEmails: [BOB_EMAIL] }));
  });

  test('user cannot update another user\'s profile', async () => {
    await seedProfile(ALICE_UID, profileDoc());
    const bobDb = testEnv.authenticatedContext(BOB_UID, { email: BOB_EMAIL }).firestore();
    await assertFails(updateDoc(doc(bobDb, 'users', ALICE_UID), { circleEmails: [BOB_EMAIL] }));
  });

  test('user cannot promote themselves to editor', async () => {
    await seedProfile(ALICE_UID, profileDoc());
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(updateDoc(doc(db, 'users', ALICE_UID), { role: 'editor' }));
  });

  test('user cannot change their stored email or createdAt', async () => {
    await seedProfile(ALICE_UID, profileDoc());
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(updateDoc(doc(db, 'users', ALICE_UID), { email: 'someone-else@example.com' }));
    await assertFails(updateDoc(doc(db, 'users', ALICE_UID), { createdAt: new Date() }));
  });

  test('unexpected fields on a profile update are rejected', async () => {
    await seedProfile(ALICE_UID, profileDoc());
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(updateDoc(doc(db, 'users', ALICE_UID), { circleEmails: [BOB_EMAIL], note: 'sneaking this in' }));
  });

  test('circleEmails must actually look like a list of emails', async () => {
    await seedProfile(ALICE_UID, profileDoc());
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(updateDoc(doc(db, 'users', ALICE_UID), { circleEmails: ['not-an-email'] }));
    await assertFails(updateDoc(doc(db, 'users', ALICE_UID), { circleEmails: 'not-a-list' }));
  });
});

describe('firestore.rules — circle changes and recipe visibility (Phase 5)', () => {
  test('adding someone to the circle grants access to an existing circle recipe', async () => {
    await seedProfile(ALICE_UID, profileDoc());
    await seedRecipe('r1', circleRecipe('r1', ALICE_UID, ALICE_EMAIL, []));
    await assertFails(getDoc(doc(testEnv.authenticatedContext(BOB_UID, { email: BOB_EMAIL }).firestore(), 'recipes', 'r1')));

    const aliceDb = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertSucceeds(updateDoc(doc(aliceDb, 'users', ALICE_UID), { circleEmails: [BOB_EMAIL] }));
    await assertSucceeds(updateDoc(doc(aliceDb, 'recipes', 'r1'), { circleEmails: [BOB_EMAIL] }));

    await assertSucceeds(getDoc(doc(testEnv.authenticatedContext(BOB_UID, { email: BOB_EMAIL }).firestore(), 'recipes', 'r1')));
  });

  test('removing someone revokes access to an existing circle recipe', async () => {
    await seedProfile(ALICE_UID, profileDoc({ circleEmails: [BOB_EMAIL] }));
    await seedRecipe('r1', circleRecipe('r1', ALICE_UID, ALICE_EMAIL, [BOB_EMAIL]));
    const bobCtx = testEnv.authenticatedContext(BOB_UID, { email: BOB_EMAIL }).firestore();
    await assertSucceeds(getDoc(doc(bobCtx, 'recipes', 'r1')));

    const aliceDb = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertSucceeds(updateDoc(doc(aliceDb, 'users', ALICE_UID), { circleEmails: [] }));
    await assertSucceeds(updateDoc(doc(aliceDb, 'recipes', 'r1'), { circleEmails: [] }));

    await assertFails(getDoc(doc(testEnv.authenticatedContext(BOB_UID, { email: BOB_EMAIL }).firestore(), 'recipes', 'r1')));
  });

  test('unrelated users still cannot access an owner-only recipe', async () => {
    await seedRecipe('r1', ownerOnlyRecipe('r1', ALICE_UID, ALICE_EMAIL));
    const bobDb = testEnv.authenticatedContext(BOB_UID, { email: BOB_EMAIL }).firestore();
    await assertFails(getDoc(doc(bobDb, 'recipes', 'r1')));
    const anonDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anonDb, 'recipes', 'r1')));
  });

  test('only the recipe\'s real owner can sync its circleEmails', async () => {
    await seedRecipe('r1', circleRecipe('r1', ALICE_UID, ALICE_EMAIL, []));
    const bobDb = testEnv.authenticatedContext(BOB_UID, { email: BOB_EMAIL }).firestore();
    await assertFails(updateDoc(doc(bobDb, 'recipes', 'r1'), { circleEmails: [BOB_EMAIL] }));
  });

  test('a circle sync cannot smuggle changes to any other field', async () => {
    await seedRecipe('r1', circleRecipe('r1', ALICE_UID, ALICE_EMAIL, []));
    const aliceDb = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(updateDoc(doc(aliceDb, 'recipes', 'r1'), { circleEmails: [BOB_EMAIL], access: 'public' }));
    await assertFails(updateDoc(doc(aliceDb, 'recipes', 'r1'), { circleEmails: [BOB_EMAIL], title: 'Renamed' }));
  });

  test('a circle sync cannot write an invalid circleEmails value', async () => {
    await seedRecipe('r1', circleRecipe('r1', ALICE_UID, ALICE_EMAIL, []));
    const aliceDb = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(updateDoc(doc(aliceDb, 'recipes', 'r1'), { circleEmails: ['not-an-email'] }));
  });
});

describe('firestore.rules — editor account management (Phase 7)', () => {
  test('an editor can find an account by email; a reader cannot', async () => {
    await seedProfile(EDITOR_UID, profileDoc({ email: EDITOR_EMAIL, role: 'editor' }));
    await seedProfile(ALICE_UID, profileDoc());
    const editorDb = testEnv.authenticatedContext(EDITOR_UID, { email: EDITOR_EMAIL }).firestore();
    const q = query(collection(editorDb, 'users'), where('email', '==', ALICE_EMAIL));
    const snap = await assertSucceeds(getDocs(q));
    expect(snap.docs.map((d) => d.id)).toEqual([ALICE_UID]);

    const aliceDb = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(getDocs(query(collection(aliceDb, 'users'), where('email', '==', EDITOR_EMAIL))));
  });

  test('an editor can list every current editor', async () => {
    await seedProfile(EDITOR_UID, profileDoc({ email: EDITOR_EMAIL, role: 'editor' }));
    await seedProfile(ALICE_UID, profileDoc());
    const editorDb = testEnv.authenticatedContext(EDITOR_UID, { email: EDITOR_EMAIL }).firestore();
    const snap = await assertSucceeds(getDocs(query(collection(editorDb, 'users'), where('role', '==', 'editor'))));
    expect(snap.docs.map((d) => d.id)).toEqual([EDITOR_UID]);
  });

  test('an editor can promote a reader to editor', async () => {
    await seedProfile(EDITOR_UID, profileDoc({ email: EDITOR_EMAIL, role: 'editor' }));
    await seedProfile(ALICE_UID, profileDoc());
    const editorDb = testEnv.authenticatedContext(EDITOR_UID, { email: EDITOR_EMAIL }).firestore();
    await assertSucceeds(updateDoc(doc(editorDb, 'users', ALICE_UID), { role: 'editor' }));
  });

  test('an editor can demote another editor to reader', async () => {
    await seedProfile(EDITOR_UID, profileDoc({ email: EDITOR_EMAIL, role: 'editor' }));
    await seedProfile(BOB_UID, profileDoc({ email: BOB_EMAIL, role: 'editor' }));
    const editorDb = testEnv.authenticatedContext(EDITOR_UID, { email: EDITOR_EMAIL }).firestore();
    await assertSucceeds(updateDoc(doc(editorDb, 'users', BOB_UID), { role: 'reader' }));
  });

  test('an editor cannot change their own role through this path', async () => {
    await seedProfile(EDITOR_UID, profileDoc({ email: EDITOR_EMAIL, role: 'editor' }));
    const editorDb = testEnv.authenticatedContext(EDITOR_UID, { email: EDITOR_EMAIL }).firestore();
    await assertFails(updateDoc(doc(editorDb, 'users', EDITOR_UID), { role: 'reader' }));
  });

  test('a reader cannot change anyone\'s role', async () => {
    await seedProfile(ALICE_UID, profileDoc());
    await seedProfile(BOB_UID, profileDoc({ email: BOB_EMAIL }));
    const aliceDb = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(updateDoc(doc(aliceDb, 'users', BOB_UID), { role: 'editor' }));
  });

  test('an editor changing a role cannot smuggle changes to any other field', async () => {
    await seedProfile(EDITOR_UID, profileDoc({ email: EDITOR_EMAIL, role: 'editor' }));
    await seedProfile(ALICE_UID, profileDoc());
    const editorDb = testEnv.authenticatedContext(EDITOR_UID, { email: EDITOR_EMAIL }).firestore();
    await assertFails(updateDoc(doc(editorDb, 'users', ALICE_UID), { role: 'editor', displayName: 'Renamed' }));
    await assertFails(updateDoc(doc(editorDb, 'users', ALICE_UID), { role: 'editor', circleEmails: [EDITOR_EMAIL] }));
  });

  test('an editor cannot set a role to anything other than reader or editor', async () => {
    await seedProfile(EDITOR_UID, profileDoc({ email: EDITOR_EMAIL, role: 'editor' }));
    await seedProfile(ALICE_UID, profileDoc());
    const editorDb = testEnv.authenticatedContext(EDITOR_UID, { email: EDITOR_EMAIL }).firestore();
    await assertFails(updateDoc(doc(editorDb, 'users', ALICE_UID), { role: 'superadmin' }));
  });
});
