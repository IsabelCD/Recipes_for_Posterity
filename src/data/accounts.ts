import type { Account } from '../types';

// NON-AUTHORITATIVE mock data. Real sign-up/sign-in/sign-out now goes
// through Firebase Auth, and the real source of truth for a signed-in
// user's role is their users/{uid} Firestore doc (see
// src/state/AppStateContext.tsx and CurrentUser in src/types.ts) — never
// this array. This list only backs the Admin page's "Editors" demo
// section (adding/removing a mocked editor there does not touch Firestore
// or affect anyone's real role) and is kept purely so that UI still has
// something to show; it is next in line to be replaced once admin
// user-management is wired to Firestore.
export const INITIAL_ACCOUNTS: Account[] = [
  { email: 'ana@example.pt', name: 'Ana Ribeiro', role: 'reader', joined: '2025-11-03', seed: true },
  { email: 'ana@example.com', name: 'Ana Ribeiro', role: 'editor', joined: '2025-11-03', seed: true },
  { email: 'whitcombe@example.pt', name: 'Editor Whitcombe', role: 'editor', joined: '2025-09-14' },
];

// Who may see a recipe. Every submission carries an access setting chosen
// by whoever sent it: 'owner' (only them), 'circle' (their inner circle)
// or 'public'.
export const OWNERS: Record<string, string> = {
  'Ana Ribeiro': 'ana@example.com', 'Sun-hee Park': 'sunhee@example.pt',
  'Diogo Neves': 'diogo@example.pt', 'Nadia Hafez': 'nadia@example.pt',
  'Rekha Iyer': 'rekha@example.pt', 'Marek Nowak': 'marek@example.pt',
};

// Seeded access settings; anything not listed was submitted as public.
export const SEED_ACCESS: Record<string, 'circle' | 'owner'> = {
  kimchi: 'circle', dal: 'circle', lima: 'owner',
};
