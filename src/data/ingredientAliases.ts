// Known plural forms, typos, and spelling variants that should collapse
// to one canonical ingredient key — see normalizeIngredient() in
// src/state/helpers.ts, which looks up the whole (lowercased, trimmed)
// head phrase of an ingredient line here.
//
// Deliberately NOT a generic singularization rule: a word that isn't
// listed here is left exactly as written rather than guessed at, so
// "hummus"/"couscous"/"asparagus" (end in "s", not plural) can never be
// corrupted, and multi-word distinctions like "tomato paste" vs "tomato
// sauce" vs "cherry tomato" can never accidentally collapse onto
// "tomato" — lookup is always on the entire phrase, never a trailing
// word alone.
//
// Extend this list whenever a real mismatch is noticed (e.g. two
// cupboard/shopping-list entries that should have been one).
export const INGREDIENT_ALIASES: Record<string, string> = {
  // Plurals
  tomatoes: 'tomato',
  'cherry tomatoes': 'cherry tomato',
  'ripe tomatoes': 'tomato',
  potatoes: 'potato',
  onions: 'onion',
  'spring onions': 'spring onion',
  'red onions': 'red onion',
  eggs: 'egg',
  limes: 'lime',
  lemons: 'lemon',
  olives: 'olive',
  'black olives': 'black olive',
  cloves: 'clove',
  carrots: 'carrot',
  apples: 'apple',
  bananas: 'banana',
  mushrooms: 'mushroom',
  beans: 'bean',
  'fava beans': 'fava bean',
  peas: 'pea',
  chickpeas: 'chickpea',
  nuts: 'nut',
  peppers: 'pepper',
  chillies: 'chilli',
  chilies: 'chilli',
  chiles: 'chilli',
  'green chillies': 'green chilli',
  'green chilies': 'green chilli',
  cucumbers: 'cucumber',
  courgettes: 'courgette',
  aubergines: 'aubergine',
  shallots: 'shallot',
  leeks: 'leek',
  scallions: 'scallion',
  'chicken thighs': 'chicken thigh',
  'chicken breasts': 'chicken breast',
  tortillas: 'tortilla',
  'corn tortillas': 'corn tortilla',

  // Common misspellings/typos
  tomatos: 'tomato',
  tomatoe: 'tomato',
  potatoe: 'potato',
  potatos: 'potato',
  brocoli: 'broccoli',
  broccolli: 'broccoli',
  cabage: 'cabbage',
  yoghurt: 'yogurt',
  yogourt: 'yogurt',
};
