// Seeds the *local Firestore emulator* with the app's existing prototype
// recipes (src/data/recipes.ts), converted to the Firestore-legal shape
// (src/lib/firestoreRecipes.ts). This is a Node-only development script —
// firebase-admin must never be imported from anything under src/, so it
// can never end up in the browser bundle.
//
// Safety, per the explicit requirement that this can never touch a real
// project:
//   1. Hard-fails if FIRESTORE_EMULATOR_HOST isn't set at all.
//   2. Hard-fails if it's set to anything other than a loopback address —
//      catches a copy-pasted real hostname before it does any damage.
//   3. Initializes admin.initializeApp with a projectId ONLY, no service
//      account / credentials of any kind. Even if both checks above were
//      somehow bypassed, the Admin SDK has nothing to authenticate a
//      write to real production Firestore with, so it would simply fail
//      rather than silently succeed against prod.
//
// Run via `npm run seed:emulator` (starts the emulator suite separately
// first — see the console instructions this prints, or the project
// README). Idempotent: every recipe is written with `.set()` at its
// existing fixed id, so re-running just overwrites with the same data.
import { RECIPES } from '../src/data/recipes';
import { toFirestoreRecipeData } from '../src/lib/firestoreRecipes';

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

if (!emulatorHost) {
  console.error(
    '\n✕ Refusing to run: FIRESTORE_EMULATOR_HOST is not set.\n' +
    '  This script only ever writes to the local Firestore emulator, never\n' +
    '  to a real project. Start the emulator (`npm run emulators` in another\n' +
    '  terminal) and run this via `npm run seed:emulator`, which sets the\n' +
    '  variable for you.\n',
  );
  process.exit(1);
}

const [emulatorHostname] = emulatorHost.split(':');
if (emulatorHostname !== '127.0.0.1' && emulatorHostname !== 'localhost') {
  console.error(
    `\n✕ Refusing to run: FIRESTORE_EMULATOR_HOST ("${emulatorHost}") is not a loopback address.\n` +
    '  This looks like it could point at something other than a local emulator —\n' +
    '  stopping rather than risk writing anywhere else.\n',
  );
  process.exit(1);
}

const PROJECT_ID = 'family-recipes-for-posterity'; // must match .firebaserc / src/lib/firebase.ts

async function main() {
  console.log('\n🌱 Seeding the LOCAL FIRESTORE EMULATOR — this never touches production.');
  console.log(`   Emulator host: ${emulatorHost}`);
  console.log(`   Project id:    ${PROJECT_ID} (no credentials used — the Admin SDK cannot reach a real project like this)\n`);

  // Imported dynamically, after the safety checks above have already
  // exited the process if anything looked wrong.
  const { initializeApp } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');

  // No `credential` option — deliberately. The emulator accepts an app
  // with just a projectId; a real project would reject this outright.
  const app = initializeApp({ projectId: PROJECT_ID });
  const db = getFirestore(app);

  let count = 0;
  for (const recipe of RECIPES) {
    const data = toFirestoreRecipeData(recipe);
    await db.collection('recipes').doc(recipe.id).set(data);
    console.log(`   ✓ recipes/${recipe.id} — ${recipe.title}`);
    count += 1;
  }

  console.log(`\n✅ Seeded ${count} recipe(s) into the local emulator.\n`);
  process.exit(0);
}

main().catch((e) => {
  console.error('\n✕ Seeding failed:', e);
  process.exit(1);
});
