// Plain unit tests for normalizeIngredient() — no Firestore/emulator
// needed (unlike every other file under tests/), so this runs directly
// via `npm run test:unit`. It also gets swept up by `npm run test:rules`
// (which runs every *.test.ts under tests/ inside the emulator wrapper),
// harmlessly, since it never touches Firestore.
import { describe, expect, test } from 'vitest';
import { normalizeIngredient } from '../src/state/helpers';

describe('normalizeIngredient — case and whitespace', () => {
  test('lowercases and trims', () => {
    expect(normalizeIngredient('  Olive Oil  ')).toBe('olive oil');
    expect(normalizeIngredient('GARLIC')).toBe('garlic');
  });

  test('collapses internal whitespace', () => {
    expect(normalizeIngredient('olive   oil')).toBe('olive oil');
  });

  test('only the head phrase before the first comma is used', () => {
    expect(normalizeIngredient('onion, sliced thin')).toBe('onion');
    expect(normalizeIngredient('parsley, chopped')).toBe('parsley');
  });
});

describe('normalizeIngredient — common plurals', () => {
  test('single-word plurals collapse to their singular', () => {
    expect(normalizeIngredient('tomatoes')).toBe('tomato');
    expect(normalizeIngredient('Tomatoes, chopped')).toBe('tomato');
    expect(normalizeIngredient('potatoes')).toBe('potato');
    expect(normalizeIngredient('onions')).toBe('onion');
    expect(normalizeIngredient('eggs')).toBe('egg');
    expect(normalizeIngredient('limes, juiced')).toBe('lime');
  });

  test('multi-word plurals collapse to their singular phrase', () => {
    expect(normalizeIngredient('spring onions, cut long')).toBe('spring onion');
    expect(normalizeIngredient('chicken thighs, bone in')).toBe('chicken thigh');
    expect(normalizeIngredient('green chillies, split')).toBe('green chilli');
  });

  test('a real seeded-recipe variant ("ripe tomatoes") still matches plain tomato', () => {
    expect(normalizeIngredient('ripe tomatoes, in wedges')).toBe('tomato');
    expect(normalizeIngredient('tomato, diced')).toBe('tomato');
  });
});

describe('normalizeIngredient — common typos', () => {
  test('known misspellings collapse to the correct ingredient', () => {
    expect(normalizeIngredient('tomatos')).toBe('tomato');
    expect(normalizeIngredient('tomatoe')).toBe('tomato');
    expect(normalizeIngredient('potatos')).toBe('potato');
    expect(normalizeIngredient('brocoli')).toBe('broccoli');
    expect(normalizeIngredient('yoghurt')).toBe('yogurt');
  });
});

describe('normalizeIngredient — preserves meaningful distinctions', () => {
  test('tomato, tomato paste, tomato sauce and cherry tomato are all different keys', () => {
    const tomato = normalizeIngredient('tomato');
    const paste = normalizeIngredient('tomato paste');
    const sauce = normalizeIngredient('tomato sauce');
    const cherry = normalizeIngredient('cherry tomato');
    const keys = [tomato, paste, sauce, cherry];
    expect(new Set(keys).size).toBe(4);
    expect(paste).toBe('tomato paste');
    expect(sauce).toBe('tomato sauce');
    expect(cherry).toBe('cherry tomato');
  });

  test('cherry tomatoes (plural) matches cherry tomato, not plain tomato', () => {
    expect(normalizeIngredient('cherry tomatoes')).toBe('cherry tomato');
    expect(normalizeIngredient('cherry tomatoes')).not.toBe(normalizeIngredient('tomatoes'));
  });
});

describe('normalizeIngredient — non-count ingredients are never corrupted', () => {
  test('uncountable ingredients pass through unchanged', () => {
    expect(normalizeIngredient('flour')).toBe('flour');
    expect(normalizeIngredient('Rice')).toBe('rice');
    expect(normalizeIngredient('olive oil')).toBe('olive oil');
    expect(normalizeIngredient('butter')).toBe('butter');
  });

  test('words ending in "s" that are not plural are not blindly stripped', () => {
    expect(normalizeIngredient('hummus')).toBe('hummus');
    expect(normalizeIngredient('couscous')).toBe('couscous');
    expect(normalizeIngredient('asparagus')).toBe('asparagus');
    expect(normalizeIngredient('molasses')).toBe('molasses');
  });
});
