// Phase 4 security-rules tests for recipe reports and asks
// (questions/suggestions). Run the same way as the other rule test
// files — via `npm run test:rules`, which wraps every file in `tests/`
// under one `firebase emulators:exec` invocation.
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
  collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where,
} from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = 'demo-recipes-for-posterity-reports-asks';

const [emulatorHost, emulatorPortStr] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
const FIRESTORE_PORT = Number(emulatorPortStr);

const ALICE_UID = 'alice-uid';
const ALICE_EMAIL = 'alice@example.com';
const BOB_UID = 'bob-uid';
const EDITOR_UID = 'editor-uid';
const EDITOR_EMAIL = 'editor@example.com';

function reportDoc(overrides: Record<string, unknown> = {}) {
  return {
    recipeId: 'pub1', recipeTitle: 'Public Recipe', reporterUid: ALICE_UID, reporterName: 'Alice Reader',
    kind: 'Wrong ingredient', reason: 'Salt should be pepper.', status: 'open',
    createdAt: serverTimestamp(), closedAt: null, closedBy: '',
    ...overrides,
  };
}

function askDoc(overrides: Record<string, unknown> = {}) {
  return {
    uid: ALICE_UID, by: 'Alice Reader', kind: 'A question', subject: 'Test subject',
    text: 'A question long enough to matter.', status: 'Waiting', reply: '', repliedBy: '', published: false,
    createdAt: serverTimestamp(), repliedAt: null,
    ...overrides,
  };
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

async function seedReport(id: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'reports', id), data);
  });
}

async function seedAsk(id: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'asks', id), data);
  });
}

async function seedEditorProfile(uid: string, email: string) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', uid), {
      displayName: 'Editor', email, role: 'editor', createdAt: new Date(),
    });
  });
}

describe('firestore.rules — reports (Phase 4)', () => {
  test('authenticated user can create a valid report', async () => {
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertSucceeds(setDoc(doc(db, 'reports', 'r1'), reportDoc()));
  });

  test('user cannot impersonate another reporter', async () => {
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(setDoc(doc(db, 'reports', 'r1'), reportDoc({ reporterUid: BOB_UID })));
  });

  test('extra fields on a report are rejected', async () => {
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(setDoc(doc(db, 'reports', 'r1'), reportDoc({ note: 'sneaking this in' })));
  });

  test('reader cannot read the reports moderation queue', async () => {
    await seedReport('r1', reportDoc());
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(getDoc(doc(db, 'reports', 'r1')));
    await assertFails(getDocs(collection(db, 'reports')));
  });

  test('editor can read, update and resolve reports', async () => {
    await seedEditorProfile(EDITOR_UID, EDITOR_EMAIL);
    await seedReport('r1', reportDoc());
    await seedReport('r2', reportDoc({ reason: 'Actually just take it down.' }));
    const db = testEnv.authenticatedContext(EDITOR_UID, { email: EDITOR_EMAIL }).firestore();

    const q = query(collection(db, 'reports'), where('status', '==', 'open'));
    const snap = await assertSucceeds(getDocs(q));
    expect(snap.size).toBe(2);

    await assertSucceeds(updateDoc(doc(db, 'reports', 'r1'), {
      status: 'dismissed', closedBy: 'Editor Whitcombe', closedAt: serverTimestamp(),
    }));
    await assertSucceeds(updateDoc(doc(db, 'reports', 'r2'), {
      status: 'resolved', closedBy: 'Editor Whitcombe', closedAt: serverTimestamp(),
    }));

    const after = await assertSucceeds(getDocs(query(collection(db, 'reports'), where('status', '==', 'open'))));
    expect(after.size).toBe(0);
  });

  test('editor cannot rewrite what was reported or by whom while closing it', async () => {
    await seedEditorProfile(EDITOR_UID, EDITOR_EMAIL);
    await seedReport('r1', reportDoc());
    const db = testEnv.authenticatedContext(EDITOR_UID, { email: EDITOR_EMAIL }).firestore();
    await assertFails(updateDoc(doc(db, 'reports', 'r1'), {
      status: 'dismissed', closedBy: 'Editor Whitcombe', closedAt: serverTimestamp(), reporterUid: EDITOR_UID,
    }));
  });
});

describe('firestore.rules — asks (Phase 4)', () => {
  test('authenticated user can create an ask belonging to themselves', async () => {
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertSucceeds(setDoc(doc(db, 'asks', 'a1'), askDoc()));
  });

  test('user cannot create an ask for another uid', async () => {
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(setDoc(doc(db, 'asks', 'a1'), askDoc({ uid: BOB_UID })));
  });

  test('extra fields on an ask are rejected', async () => {
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(setDoc(doc(db, 'asks', 'a1'), askDoc({ extra: true })));
  });

  test('user can read their own ask', async () => {
    await seedAsk('a1', askDoc());
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertSucceeds(getDoc(doc(db, 'asks', 'a1')));
    const q = query(collection(db, 'asks'), where('uid', '==', ALICE_UID));
    const snap = await assertSucceeds(getDocs(q));
    expect(snap.docs.map((d) => d.id)).toEqual(['a1']);
  });

  test('published asks are readable as intended', async () => {
    await seedAsk('a1', askDoc({
      uid: BOB_UID, status: 'Answered', published: true, reply: 'Here is the answer.', repliedBy: 'Editor Whitcombe',
    }));
    const anonDb = testEnv.unauthenticatedContext().firestore();
    const q = query(collection(anonDb, 'asks'), where('status', '==', 'Answered'), where('published', '==', true));
    const snap = await assertSucceeds(getDocs(q));
    expect(snap.docs.map((d) => d.id)).toEqual(['a1']);
    await assertSucceeds(getDoc(doc(anonDb, 'asks', 'a1')));
  });

  test('unpublished asks are not exposed to unrelated users', async () => {
    await seedAsk('a1', askDoc({ uid: BOB_UID }));
    const aliceDb = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(getDoc(doc(aliceDb, 'asks', 'a1')));
    const anonDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anonDb, 'asks', 'a1')));
  });

  test('reader cannot set editor-only ask fields', async () => {
    await seedAsk('a1', askDoc());
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(updateDoc(doc(db, 'asks', 'a1'), {
      status: 'Answered', reply: 'I will answer my own question.', repliedBy: 'Alice Reader', published: true,
    }));
  });

  test('editor can reply, publish/unpublish, and close asks', async () => {
    await seedEditorProfile(EDITOR_UID, EDITOR_EMAIL);
    await seedAsk('a1', askDoc());
    await seedAsk('a2', askDoc({ subject: 'Second question' }));
    const db = testEnv.authenticatedContext(EDITOR_UID, { email: EDITOR_EMAIL }).firestore();

    await assertSucceeds(updateDoc(doc(db, 'asks', 'a1'), {
      status: 'Answered', reply: 'Here is the answer.', repliedBy: 'Editor Whitcombe', published: true,
      repliedAt: serverTimestamp(),
    }));
    await assertSucceeds(updateDoc(doc(db, 'asks', 'a1'), { published: false }));
    await assertSucceeds(updateDoc(doc(db, 'asks', 'a2'), { status: 'Closed' }));
  });
});
