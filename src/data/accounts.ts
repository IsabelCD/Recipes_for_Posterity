import type { Account } from '../types';

// Mocked auth "database" — plaintext seed accounts, kept in memory only.
// See src/state/AppStateContext.tsx for the sign in / sign up logic, and
// the project README for why this must be replaced before any real launch.
export const INITIAL_ACCOUNTS: Account[] = [
  { email: 'ana@example.pt', pass: 'artichoke', name: 'Ana Ribeiro', role: 'reader', joined: '2025-11-03', seed: true },
  { email: 'ana@example.com', pass: 'qwertyuiop', name: 'Ana Ribeiro', role: 'editor', joined: '2025-11-03', seed: true },
  { email: 'whitcombe@example.pt', pass: 'letterpress', name: 'Editor Whitcombe', role: 'editor', joined: '2025-09-14' },
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

// The inner circles other cooks have drawn up.
export const SEED_CIRCLES: Record<string, string[]> = {
  'sunhee@example.pt': ['ana@example.com', 'ana@example.pt'],
  'rekha@example.pt': ['marek@example.pt'],
  'diogo@example.pt': ['marek@example.pt'],
};
