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
