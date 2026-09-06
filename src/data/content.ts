import type { PageKey } from '../types';

export interface NavPage {
  key: PageKey;
  label: string;
  n: string;
  desc: string;
}

// The nine pages listed in the sidebar and on the home page's "Where
// everything is" index.
export const PAGES: NavPage[] = [
  { key: 'home', label: 'Main page', n: '01', desc: 'What the website is for and how to use it.' },
  { key: 'search', label: 'Search', n: '02', desc: 'Find recipes and narrow them down with filters.' },
  { key: 'recipe', label: 'Recipe pages', n: '03', desc: 'Ingredients, method, portions, ratings and notes.' },
  { key: 'contribute', label: 'Add a recipe', n: '04', desc: 'A short form that sends a recipe for review.' },
  { key: 'list', label: 'Shopping list', n: '05', desc: 'What to buy for the recipes you picked, added up and scaled to your portions.' },
  { key: 'me', label: 'My page', n: '06', desc: 'What you have rated, what you have contributed, and the ratings on both.' },
  { key: 'cupboard', label: 'Cook from my cupboard', n: '07', desc: 'Tick off what you have in, and see what you could make tonight.' },
  { key: 'about', label: 'About us', n: '08', desc: 'Who keeps the archive, how submissions are read, and what we will not publish.' },
  { key: 'faq', label: 'Questions and answers', n: '09', desc: 'How the portions scale, what q.b. means, and a form for asking an editor anything else.' },
];

export const PURPOSES = [
  { title: 'Keeps recipes in one place', body: 'Written down properly, with real quantities, so they can be cooked again years from now.' },
  { title: 'Credits the cook', body: 'The person who invented a recipe is named, even when somebody else submits it.' },
  { title: 'Searches by what you want', body: 'Nationality, type of meal, tags, author, date, rating, time and difficulty.' },
  { title: 'Checked before publishing', body: 'An editor reads every submission. Only editors can delete a recipe.' },
];

export const TUTORIAL = [
  { n: '01', title: 'Search or browse', body: 'Use the search page. Type a word or just pick filters — the list narrows as you go.', link: 'Go to search', go: 'search' as PageKey },
  { n: '02', title: 'Open a recipe', body: 'Ingredients on the left, steps numbered below. Change the portions and the amounts follow.', link: 'Open an example', recipeId: 'dal' },
  { n: '03', title: 'Rate it and leave a note', body: 'Once you have cooked it, give it stars and tell the next person what you learned.', link: 'See the notes', recipeId: 'bacalhau' },
  { n: '04', title: 'Add your own', body: 'Answer three short pages of questions. An editor reads it before it goes live.', link: 'Add a recipe', go: 'contribute' as PageKey },
];

export const GATE_ROWS = [
  { what: 'Searching and reading', why: 'Every published recipe, in full.', open: true },
  { what: 'Scaling the portions', why: 'Per-step amounts rescale in the page.', open: true },
  { what: 'Printing a recipe', why: 'The one-sheet kitchen version.', open: true },
  { what: 'Shopping list and cupboard', why: 'Kept for this browser only.', open: true },
  { what: 'Submitting a recipe', why: 'So an editor can send comments back.', open: false },
  { what: 'Rating a recipe', why: 'The rating is stored against you.', open: false },
  { what: 'Writing a note', why: 'Notes are signed with your name.', open: false },
  { what: 'My page', why: 'Your submissions, statistics and replies.', open: false },
  { what: 'Questions to an editor', why: 'The reply has to reach you.', open: false },
  { what: 'The approval queue', why: 'Editors only.', open: false },
];

export const ASK_KINDS = [
  { label: 'A question', hint: 'Something you want to know about the archive or a recipe.' },
  { label: 'A suggestion', hint: 'Something the website should do differently.' },
];

export const ACCESS_OPTIONS: { v: 'public' | 'circle' | 'owner'; label: string; hint: string }[] = [
  { v: 'public', label: 'Everyone', hint: 'It appears in search for anybody who comes to the site.' },
  { v: 'circle', label: 'My inner circle', hint: 'Only the people whose emails you list on your page. You can change that list at any time.' },
  { v: 'owner', label: 'Only me', hint: 'Nobody else can find it or open it. Editors still read it before it is published.' },
];

export const SIGN_ROLES: { key: 'reader' | 'editor'; label: string }[] = [
  { key: 'reader', label: 'A reader or cook' },
  { key: 'editor', label: 'An editor' },
];

export const ADMIN_RULES = [
  { n: '1', text: 'Check the quantities make sense for the number of portions given.' },
  { n: '2', text: 'If no author is named, ask the submitter before approving.' },
  { n: '3', text: 'A submitted link is a courtesy, not permission. Recipes copied word for word are rejected.' },
  { n: '4', text: 'If a recipe only needs fixing, send it back with the reason rather than rejecting it.' },
  { n: '5', text: 'Readers report anything wrong — an ingredient, a quantity, a step, a credit. Editors correct it, or reply saying why not.' },
  { n: '6', text: 'Only editors delete, and always with a reply to the person who asked.' },
];

// Non-basic ingredients the cupboard starts out ticked with.
export const INITIAL_PANTRY = [
  'eggs', 'onion', 'garlic', 'olive oil', 'potatoes', 'tomatoes', 'lemon', 'caster sugar',
  'ground almonds', 'ground cinnamon', 'cucumber', 'red onion', 'red wine vinegar', 'basil leaves',
  'icing sugar', 'stale sourdough',
];
