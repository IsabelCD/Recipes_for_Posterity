// Local security-rules tests for firestore.rules, run against the Firestore
// emulator only — see package.json's "test:rules" script, which wraps this
// in `firebase emulators:exec` so a real emulator is up before these run
// and torn down after. Never touches production: `projectId` below uses
// the "demo-" prefix, which the Firebase SDKs specifically recognize as a
// fake project and refuse to route to real infrastructure, and every
// Firestore instance used here comes from `rules-unit-testing`'s emulator
// contexts, never from src/lib/firebase.ts's real app.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import {
  assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = 'demo-recipes-for-posterity';

const [emulatorHost, emulatorPortStr] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
const FIRESTORE_PORT = Number(emulatorPortStr);

const ALICE_UID = 'alice-uid';
const ALICE_EMAIL = 'alice@example.com';
const BOB_UID = 'bob-uid';
const BOB_EMAIL = 'bob@example.com';

function validAliceProfile(overrides: Partial<{ displayName: string; email: string; role: string; circleEmails: string[] }> = {}) {
  return {
    displayName: 'Alice',
    email: ALICE_EMAIL,
    role: 'reader',
    createdAt: serverTimestamp(),
    circleEmails: [],
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

// Seeds a doc bypassing security rules entirely — used to set up "the other
// user's data already exists" scenarios without relying on the very rules
// under test to create it.
async function seedUserDoc(uid: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users', uid), data);
  });
}

describe('firestore.rules — /users/{userId}', () => {
  test('1. alice can create /users/alice with a valid reader profile', async () => {
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertSucceeds(setDoc(doc(db, 'users', ALICE_UID), validAliceProfile()));

    let snap;
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      snap = await getDoc(doc(ctx.firestore(), 'users', ALICE_UID));
    });
    expect(snap?.data()?.role).toBe('reader');
    expect(snap?.data()?.email).toBe(ALICE_EMAIL);
  });

  test('2. alice cannot create /users/alice with role "editor"', async () => {
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(setDoc(doc(db, 'users', ALICE_UID), validAliceProfile({ role: 'editor' })));
  });

  test('3. alice cannot create or write /users/bob', async () => {
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(setDoc(doc(db, 'users', BOB_UID), {
      displayName: 'Bob', email: BOB_EMAIL, role: 'reader', createdAt: serverTimestamp(),
    }));
  });

  test('4. alice cannot read /users/bob', async () => {
    await seedUserDoc(BOB_UID, { displayName: 'Bob', email: BOB_EMAIL, role: 'reader', createdAt: serverTimestamp() });
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(getDoc(doc(db, 'users', BOB_UID)));
  });

  test('5. alice can read /users/alice', async () => {
    await seedUserDoc(ALICE_UID, validAliceProfile());
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertSucceeds(getDoc(doc(db, 'users', ALICE_UID)));
  });

  test('6. an unauthenticated user cannot read or write /users/alice', async () => {
    await seedUserDoc(ALICE_UID, validAliceProfile());
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'users', ALICE_UID)));
    await assertFails(setDoc(doc(db, 'users', ALICE_UID), validAliceProfile()));
  });
});
