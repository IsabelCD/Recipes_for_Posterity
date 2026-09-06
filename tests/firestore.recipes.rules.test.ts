// Phase 1 security-rules tests for the /recipes collection. Run the same
// way as tests/firestore.rules.test.ts — via `npm run test:rules`, which
// wraps both files in `firebase emulators:exec` so a real emulator is up
// before these run and torn down after. Never touches production: see
// that file's header comment for the "demo-" projectId / emulator-only
// rationale, which applies identically here.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import {
  assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection, doc, getDoc, getDocs, query, setDoc, where,
} from 'firebase/firestore';
import { RECIPES } from '../src/data/recipes';
import { toFirestoreRecipeData } from '../src/lib/firestoreRecipes';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Deliberately different from tests/firestore.rules.test.ts's projectId.
// Vitest runs test files concurrently by default, and each file's
// `afterEach` calls `testEnv.clearFirestore()` — against the SAME
// emulator project, that races the other file's seed-then-query sequence
// and intermittently wipes docs this file just wrote. Separate projects
// (the emulator hosts multiple simultaneously) give each file an
// isolated database with no shared mutable state.
const PROJECT_ID = 'demo-recipes-for-posterity-recipes';

const [emulatorHost, emulatorPortStr] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
const FIRESTORE_PORT = Number(emulatorPortStr);

const ALICE_UID = 'alice-uid';
const ALICE_EMAIL = 'alice@example.com';
const BOB_UID = 'bob-uid';
const BOB_EMAIL = 'bob@example.com';
const EDITOR_UID = 'editor-uid';
const EDITOR_EMAIL = 'editor@example.com';

function publicRecipe(id: string) {
  return { title: `Public ${id}`, author: 'A', submitter: 'A', nationality: 'Test', meal: 'Main dish',
    tastes: [], time: 10, difficulty: 1, rating: 0, votes: 0, date: '2026-01-01',
    portions: 2, source: '', blurb: '', notes: '', ingredients: [], steps: [], photos: [], comments: [],
    access: 'public', ownerUid: null, ownerEmail: '', circleEmails: [] };
}

function ownerOnlyRecipe(id: string, ownerUid: string, ownerEmail: string) {
  return { ...publicRecipe(id), title: `Owner-only ${id}`, access: 'owner', ownerUid, ownerEmail };
}

function circleRecipe(id: string, ownerEmail: string, circleEmails: string[]) {
  return { ...publicRecipe(id), title: `Circle ${id}`, access: 'circle', ownerEmail, circleEmails };
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

async function seedRecipe(id: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'recipes', id), data);
  });
}

// Editors are determined by users/{uid}.role — seed that doc bypassing
// rules, same as the recipe docs, so these tests exercise the rules
// engine's own isEditor() get() call rather than faking it.
async function seedEditorProfile(uid: string, email: string) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', uid), {
      displayName: 'Editor', email, role: 'editor', createdAt: new Date(),
    });
  });
}

describe('firestore.rules — /recipes/{recipeId} (Phase 1: read-only)', () => {
  test('unauthenticated user can query public recipes', async () => {
    await seedRecipe('pub1', publicRecipe('pub1'));
    const db = testEnv.unauthenticatedContext().firestore();
    const q = query(collection(db, 'recipes'), where('access', '==', 'public'));
    const snap = await assertSucceeds(getDocs(q));
    expect(snap.size).toBe(1);
  });

  test('unauthenticated user cannot get a private/circle recipe', async () => {
    await seedRecipe('owner1', ownerOnlyRecipe('owner1', ALICE_UID, ALICE_EMAIL));
    await seedRecipe('circle1', circleRecipe('circle1', ALICE_EMAIL, [BOB_EMAIL]));
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'recipes', 'owner1')));
    await assertFails(getDoc(doc(db, 'recipes', 'circle1')));
  });

  test('reader can query public recipes', async () => {
    await seedRecipe('pub1', publicRecipe('pub1'));
    await seedRecipe('owner1', ownerOnlyRecipe('owner1', BOB_UID, BOB_EMAIL));
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    const q = query(collection(db, 'recipes'), where('access', '==', 'public'));
    const snap = await assertSucceeds(getDocs(q));
    expect(snap.docs.map((d) => d.id)).toEqual(['pub1']);
  });

  test('reader can query their own recipes', async () => {
    await seedRecipe('mine1', ownerOnlyRecipe('mine1', ALICE_UID, ALICE_EMAIL));
    await seedRecipe('theirs1', ownerOnlyRecipe('theirs1', BOB_UID, BOB_EMAIL));
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    const q = query(collection(db, 'recipes'), where('ownerUid', '==', ALICE_UID));
    const snap = await assertSucceeds(getDocs(q));
    expect(snap.docs.map((d) => d.id)).toEqual(['mine1']);
  });

  test('reader can query recipes whose circleEmails contains their authenticated email', async () => {
    await seedRecipe('circleForAlice', circleRecipe('circleForAlice', BOB_EMAIL, [ALICE_EMAIL]));
    await seedRecipe('circleForSomeoneElse', circleRecipe('circleForSomeoneElse', BOB_EMAIL, ['nobody@example.com']));
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    const q = query(collection(db, 'recipes'), where('circleEmails', 'array-contains', ALICE_EMAIL));
    const snap = await assertSucceeds(getDocs(q));
    expect(snap.docs.map((d) => d.id)).toEqual(['circleForAlice']);
  });

  test('reader cannot run an unconstrained query that could return other users’ private recipes', async () => {
    await seedRecipe('pub1', publicRecipe('pub1'));
    await seedRecipe('theirs1', ownerOnlyRecipe('theirs1', BOB_UID, BOB_EMAIL));
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(getDocs(collection(db, 'recipes')));
  });

  test('reader cannot directly get another user’s owner-only recipe', async () => {
    await seedRecipe('theirs1', ownerOnlyRecipe('theirs1', BOB_UID, BOB_EMAIL));
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(getDoc(doc(db, 'recipes', 'theirs1')));
  });

  test('editor can query all recipes', async () => {
    await seedEditorProfile(EDITOR_UID, EDITOR_EMAIL);
    await seedRecipe('pub1', publicRecipe('pub1'));
    await seedRecipe('theirs1', ownerOnlyRecipe('theirs1', BOB_UID, BOB_EMAIL));
    await seedRecipe('circle1', circleRecipe('circle1', BOB_EMAIL, ['nobody@example.com']));
    const db = testEnv.authenticatedContext(EDITOR_UID, { email: EDITOR_EMAIL }).firestore();
    const snap = await assertSucceeds(getDocs(collection(db, 'recipes')));
    expect(snap.size).toBe(3);
  });

  test('ordinary reader cannot create/update/delete published recipe documents during this phase', async () => {
    await seedRecipe('pub1', publicRecipe('pub1'));
    const db = testEnv.authenticatedContext(ALICE_UID, { email: ALICE_EMAIL }).firestore();
    await assertFails(setDoc(doc(db, 'recipes', 'newone'), publicRecipe('newone')));
    await assertFails(setDoc(doc(db, 'recipes', 'pub1'), { ...publicRecipe('pub1'), title: 'Hijacked' }));
  });

  test('editor can create a recipe with at least one step', async () => {
    await seedEditorProfile(EDITOR_UID, EDITOR_EMAIL);
    const db = testEnv.authenticatedContext(EDITOR_UID, { email: EDITOR_EMAIL }).firestore();
    await assertSucceeds(setDoc(doc(db, 'recipes', 'new1'), {
      ...publicRecipe('new1'), steps: [{ text: 'Boil the potatoes.', uses: [] }],
    }));
  });

  test('editor cannot create a recipe with no steps', async () => {
    await seedEditorProfile(EDITOR_UID, EDITOR_EMAIL);
    const db = testEnv.authenticatedContext(EDITOR_UID, { email: EDITOR_EMAIL }).firestore();
    await assertFails(setDoc(doc(db, 'recipes', 'new1'), publicRecipe('new1')));
  });

  test('the mapped seed recipes serialize to Firestore in the new step/uses representation', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      for (const recipe of RECIPES) {
        const data = toFirestoreRecipeData(recipe);
        await setDoc(doc(db, 'recipes', recipe.id), data);
      }
      const bacalhau = await getDoc(doc(db, 'recipes', 'bacalhau'));
      expect(bacalhau.exists()).toBe(true);
      const steps = bacalhau.data()?.steps as { text: string; uses: unknown[]; photoSlotId?: string }[];
      expect(Array.isArray(steps)).toBe(true);
      expect(steps.length).toBeGreaterThan(0);
      // Each step is a map with its own `uses` array — never a bare array
      // of arrays, which Standard edition rejects.
      steps.forEach((s) => {
        expect(typeof s.text).toBe('string');
        expect(Array.isArray(s.uses)).toBe(true);
      });
    });
  });
});
