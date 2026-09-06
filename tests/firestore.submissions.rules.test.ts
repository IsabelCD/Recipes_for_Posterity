// Phase 2 security-rules tests for /submissions and the editor-only
// recipes/create path it unlocks. Run the same way as the other rule
// test files — via `npm run test:rules`, which wraps every file in
// `tests/` under one `firebase emulators:exec` invocation.
//
// This file uses its own emulator projectId, deliberately different from
// tests/firestore.rules.test.ts and tests/firestore.recipes.rules.test.ts.
// Vitest runs test files concurrently, and each file's `afterEach` calls
// `testEnv.clearFirestore()` against its own project — sharing a
// projectId across files was found in Phase 1 to let one file's cleanup
// race another's seed-then-query sequence and intermittently wipe
// just-seeded docs. Separate projects give each file an isolated
// database with no shared mutable state.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import {
  assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = 'demo-recipes-for-posterity-submissions';

const [emulatorHost, emulatorPortStr] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
const FIRESTORE_PORT = Number(emulatorPortStr);

const ALICE_UID = 'alice-uid';
const ALICE_EMAIL = 'alice@example.com';
const BOB_UID = 'bob-uid';
const BOB_EMAIL = 'bob@example.com';
const EDITOR_UID = 'editor-uid';
const EDITOR_EMAIL = 'editor@example.com';

// A well-formed submission document, exactly the fields
// FirestoreSubmissionData (src/lib/submissionsRepo.ts) writes — used both
// for rules-checked create() calls and for seeding via
// withSecurityRulesDisabled.
function submissionDoc(overrides: Record<string, unknown> = {}) {
  return {
    ownerUid: ALICE_UID, ownerEmail: ALICE_EMAIL, submitter: 'Alice', status: 'pending',
    title: 'Caldo Verde', author: 'Rosa Marques', nationality: 'Portuguese', meal: 'Starter',
    tastes: ['Umami'], time: 40, difficulty: 1, portions: 6, source: '',
    notes: '', access: 'public',
    ingredients: [{ q: 750, u: 'g', n: 'potatoes' }],
    steps: [{ text: 'Boil the potatoes.', uses: [{ q: 750, u: 'g', n: 'potatoes' }] }],
    photos: [], summary: '1 ingredient and 1 step.', flag: '',
    reason: '', note: '', decidedBy: '', decidedAt: null,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
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

async function seedSubmission(id: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'submissions', id), data);
  });
}

async function seedEditorProfile(uid: string, email: string) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', uid), {
      displayName: 'Editor', email, role: 'editor', createdAt: new Date(),
    });
  });
}

describe('firestore.rules — /submissions/{submissionId} (Phase 2: submissions and publishing)', () => {
  test('a reader can create only a submission belonging to their own UID', async () => {
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertSucceeds(setDoc(doc(db, 'submissions', 'sub1'), submissionDoc()));
  });

  test('a reader cannot create a submission with no steps', async () => {
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(setDoc(doc(db, 'submissions', 'sub1'), submissionDoc({ steps: [] })));
  });

  test('a reader cannot submit on behalf of another user', async () => {
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(setDoc(doc(db, 'submissions', 'sub1'), submissionDoc({ ownerUid: BOB_UID })));
    // Also cannot lie about her own email while keeping her own uid.
    await assertFails(setDoc(doc(db, 'submissions', 'sub2'), submissionDoc({ ownerEmail: BOB_EMAIL })));
  });

  test('a reader can read their own submissions but not another reader’s', async () => {
    await seedSubmission('mine', submissionDoc({ ownerUid: ALICE_UID, ownerEmail: ALICE_EMAIL }));
    await seedSubmission('theirs', submissionDoc({ ownerUid: BOB_UID, ownerEmail: BOB_EMAIL }));
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    const q = query(collection(db, 'submissions'), where('ownerUid', '==', ALICE_UID));
    const snap = await assertSucceeds(getDocs(q));
    expect(snap.docs.map((d) => d.id)).toEqual(['mine']);
    await assertFails(getDoc(doc(db, 'submissions', 'theirs')));
    // An unconstrained query can't be proven safe for a non-editor either.
    await assertFails(getDocs(collection(db, 'submissions')));
  });

  test('a reader cannot publish or set themselves as editor', async () => {
    await seedSubmission('mine', submissionDoc({ ownerUid: ALICE_UID, ownerEmail: ALICE_EMAIL, status: 'pending' }));
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();

    // Cannot move her own submission straight to a decided status.
    await assertFails(updateDoc(doc(db, 'submissions', 'mine'), { status: 'rejected', reason: 'self-approved', decidedAt: serverTimestamp() }));

    // Cannot run the publish transaction herself — create the recipe and
    // remove the submission — even though she owns the submission half.
    const batch = writeBatch(db);
    batch.set(doc(collection(db, 'recipes')), {
      title: 'Caldo Verde', author: 'Rosa Marques', submitter: 'Alice', nationality: 'Portuguese',
      meal: 'Starter', tastes: ['Umami'], time: 40, difficulty: 1, rating: 0,
      votes: 0, date: '2026-09-02', portions: 6, source: '', blurb: '', notes: '',
      ingredients: [{ q: 750, u: 'g', n: 'potatoes' }],
      steps: [{ text: 'Boil the potatoes.', uses: [] }], photos: [], comments: [],
      access: 'public', ownerUid: ALICE_UID, ownerEmail: ALICE_EMAIL, circleEmails: [],
    });
    batch.delete(doc(db, 'submissions', 'mine'));
    await assertFails(batch.commit());

    // Cannot self-grant the editor role either (already covered by the
    // users/{uid} create rule, exercised again here in the same flow).
    await assertFails(setDoc(doc(db, 'users', ALICE_UID), {
      displayName: 'Alice', email: ALICE_EMAIL, role: 'editor', createdAt: serverTimestamp(),
    }));
  });

  test('a reader can only edit/resubmit their own submission in allowed statuses', async () => {
    await seedSubmission('needsRevision', submissionDoc({
      ownerUid: ALICE_UID, ownerEmail: ALICE_EMAIL, status: 'needs_revision', reason: 'Quantities incomplete', note: 'Add the salt amount.',
    }));
    await seedSubmission('stillPending', submissionDoc({ ownerUid: ALICE_UID, ownerEmail: ALICE_EMAIL, status: 'pending' }));
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();

    // Resubmitting a needs_revision submission of her own, transitioning
    // it back to pending, succeeds.
    await assertSucceeds(updateDoc(doc(db, 'submissions', 'needsRevision'), {
      title: 'Caldo Verde (revised)', status: 'pending', updatedAt: serverTimestamp(),
    }));

    // A submission that is still just 'pending' (not sent back to her)
    // is not hers to edit yet.
    await assertFails(updateDoc(doc(db, 'submissions', 'stillPending'), {
      title: 'Sneaky edit', status: 'pending', updatedAt: serverTimestamp(),
    }));

    // Editing another reader's needs_revision submission is never allowed.
    await seedSubmission('theirsRevision', submissionDoc({ ownerUid: BOB_UID, ownerEmail: BOB_EMAIL, status: 'needs_revision' }));
    await assertFails(updateDoc(doc(db, 'submissions', 'theirsRevision'), { status: 'pending', updatedAt: serverTimestamp() }));
  });

  test('an editor can read the moderation queue', async () => {
    await seedEditorProfile(EDITOR_UID, EDITOR_EMAIL);
    await seedSubmission('pending1', submissionDoc({ ownerUid: ALICE_UID, ownerEmail: ALICE_EMAIL, status: 'pending' }));
    await seedSubmission('revision1', submissionDoc({ ownerUid: BOB_UID, ownerEmail: BOB_EMAIL, status: 'needs_revision' }));
    await seedSubmission('rejected1', submissionDoc({ ownerUid: BOB_UID, ownerEmail: BOB_EMAIL, status: 'rejected' }));
    const db = testEnv.authenticatedContext(EDITOR_UID, { email: EDITOR_EMAIL }).firestore();
    const q = query(collection(db, 'submissions'), where('status', 'in', ['pending', 'needs_revision']));
    const snap = await assertSucceeds(getDocs(q));
    expect(snap.docs.map((d) => d.id).sort()).toEqual(['pending1', 'revision1']);
  });

  test('an editor can request revision, reject and publish', async () => {
    await seedEditorProfile(EDITOR_UID, EDITOR_EMAIL);
    await seedSubmission('toRevise', submissionDoc({ ownerUid: ALICE_UID, ownerEmail: ALICE_EMAIL, status: 'pending' }));
    await seedSubmission('toReject', submissionDoc({ ownerUid: ALICE_UID, ownerEmail: ALICE_EMAIL, status: 'pending' }));
    await seedSubmission('toPublish', submissionDoc({ ownerUid: ALICE_UID, ownerEmail: ALICE_EMAIL, status: 'pending' }));
    const db = testEnv.authenticatedContext(EDITOR_UID, { email: EDITOR_EMAIL }).firestore();

    await assertSucceeds(updateDoc(doc(db, 'submissions', 'toRevise'), {
      status: 'needs_revision', reason: 'Quantities incomplete', note: 'Add the salt amount.',
      decidedBy: 'Editor Whitcombe', decidedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));

    await assertSucceeds(updateDoc(doc(db, 'submissions', 'toReject'), {
      status: 'rejected', reason: 'Not a recipe', note: 'This does not look like a recipe.',
      decidedBy: 'Editor Whitcombe', decidedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));

    const batch = writeBatch(db);
    const recipeRef = doc(collection(db, 'recipes'));
    batch.set(recipeRef, {
      title: 'Caldo Verde', author: 'Rosa Marques', submitter: 'Alice', nationality: 'Portuguese',
      meal: 'Starter', tastes: ['Umami'], time: 40, difficulty: 1, rating: 0,
      votes: 0, date: '2026-09-02', portions: 6, source: '', blurb: '', notes: '',
      ingredients: [{ q: 750, u: 'g', n: 'potatoes' }],
      steps: [{ text: 'Boil the potatoes.', uses: [] }], photos: [], comments: [],
      access: 'public', ownerUid: ALICE_UID, ownerEmail: ALICE_EMAIL, circleEmails: [],
    });
    batch.delete(doc(db, 'submissions', 'toPublish'));
    await assertSucceeds(batch.commit());
    await assertSucceeds(getDoc(recipeRef));
  });

  test('publishing creates a valid recipe and cannot be performed by a reader', async () => {
    await seedEditorProfile(EDITOR_UID, EDITOR_EMAIL);
    await seedSubmission('toPublish', submissionDoc({ ownerUid: ALICE_UID, ownerEmail: ALICE_EMAIL, status: 'pending' }));

    const editorDb = testEnv.authenticatedContext(EDITOR_UID, { email: EDITOR_EMAIL }).firestore();
    const recipeRef = doc(collection(editorDb, 'recipes'));
    const recipeData = {
      title: 'Caldo Verde', author: 'Rosa Marques', submitter: 'Alice', nationality: 'Portuguese',
      meal: 'Starter', tastes: ['Umami'], time: 40, difficulty: 1, rating: 0,
      votes: 0, date: '2026-09-02', portions: 6, source: '', blurb: '', notes: '',
      ingredients: [{ q: 750, u: 'g', n: 'potatoes' }],
      steps: [{ text: 'Boil the potatoes.', uses: [] }], photos: [], comments: [],
      access: 'public', ownerUid: ALICE_UID, ownerEmail: ALICE_EMAIL, circleEmails: [],
    };
    const editorBatch = writeBatch(editorDb);
    editorBatch.set(recipeRef, recipeData);
    editorBatch.delete(doc(editorDb, 'submissions', 'toPublish'));
    await assertSucceeds(editorBatch.commit());
    const published = await assertSucceeds(getDoc(recipeRef));
    expect(published.data()?.title).toBe('Caldo Verde');
    expect(published.data()?.access).toBe('public');

    // A reader attempting the identical publish transaction on her own
    // submission — the recipes/create half is not an editor's write, so
    // the whole batch is rejected.
    await seedSubmission('readerTry', submissionDoc({ ownerUid: ALICE_UID, ownerEmail: ALICE_EMAIL, status: 'pending' }));
    const readerDb = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    const readerBatch = writeBatch(readerDb);
    readerBatch.set(doc(collection(readerDb, 'recipes')), recipeData);
    readerBatch.delete(doc(readerDb, 'submissions', 'readerTry'));
    await assertFails(readerBatch.commit());
  });
});
