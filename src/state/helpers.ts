import type { Access } from '../types';

export function stars(n: number): string {
  const k = Math.round(n);
  return '★★★★★'.slice(0, k) + '☆☆☆☆☆'.slice(0, 5 - k);
}

export function dateLabel(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function timeText(m: number): string {
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 ? `${m % 60}m` : ''}`.trim() : `${m} min`;
}

// Round to 2dp, dropping trailing zeroes; whole numbers show with no decimal.
export function fmt(n: number): string {
  const v = Math.round(n * 100) / 100;
  if (Math.abs(v - Math.round(v)) < 0.01) return String(Math.round(v));
  return String(v >= 10 ? Math.round(v) : Math.round(v * 10) / 10);
}

const MEAL_ICONS: Record<string, string> = {
  Breakfast: 'ph-coffee', Starter: 'ph-bowl-food', 'Main dish': 'ph-cooking-pot',
  'Side dish': 'ph-carrot', Dessert: 'ph-cake', Baking: 'ph-bread', Snack: 'ph-cookie',
};

export function mealIcon(meal: string): string {
  return MEAL_ICONS[meal] || 'ph-fork-knife';
}

export function host(u: string): string {
  try {
    return new URL(u).hostname.replace('www.', '');
  } catch {
    return u;
  }
}

// The head word of an ingredient line: "onion, sliced thin" → "onion".
export function ingKey(name: string): string {
  return name.split(',')[0].trim().toLowerCase();
}

// Basics are assumed to be in every kitchen and never counted as missing.
export function isBasic(name: string): boolean {
  const n = name.toLowerCase();
  return n.indexOf('water') === 0 || n.indexOf('salt,') === 0 || n === 'salt' || n.indexOf('pepper') === 0;
}

export function accessWords(a: Access): string {
  return a === 'owner' ? 'Only me' : a === 'circle' ? 'My inner circle' : 'Everyone';
}
