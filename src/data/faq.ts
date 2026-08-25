import type { FaqGroup } from '../types';

export const FAQ: FaqGroup[] = [
  { heading: 'Adding a recipe',
    items: [
      { id: 'q1', q: 'Who is allowed to add one?',
        a: 'Anyone. You do not need an account for this version — you write your name in the form as the person submitting it. An editor reads every submission before it appears, usually within three days.' },
      { id: 'q2', q: 'What if I do not know who invented it?',
        a: 'Leave the author blank and say where you learned it, if you can. The submission is flagged so an editor asks you before it goes live rather than crediting the wrong cook.' },
      { id: 'q3', q: 'Why does it ask for the amount used in each step?',
        a: 'Because you rarely use the whole amount at once — half the oil now, the rest at the end. Recording it per step is what lets the quantities rescale correctly when another cook changes the portions.' },
      { id: 'q4', q: 'What does q.b. mean?',
        a: 'Quanto basta: as much as the cook likes. Mark salt, cinnamon, sugar for dusting or chilli as q.b. and the line stays as it is however the portions change.' },
      { id: 'q5', q: 'Can I restrict access to certain people?',
        a: 'When you submit a new recipe, you can choose to restrict access so only you can see it, share only with your inner circle or share with everyone who visits the site. The "inner circle" can be modified at any time in "My page".' },
    ] },
  { heading: 'Cooking from the archive',
    items: [
      { id: 'q6', q: 'How do the portions work?',
        a: 'Every recipe is written for a number of portions. Change it on the recipe page and both the ingredient list and the amounts under each step are recalculated, apart from the q.b. lines.' },
      { id: 'q7', q: 'Why is salt missing from my shopping list?',
        a: 'Salt, pepper and water are assumed to be in your kitchen already, so they are left off. Where two recipes need the same thing, the amounts are added together instead of listed twice.' },
      { id: 'q8', q: 'What is Cook from my cupboard?',
        a: 'Tick what you have in and the archive is ranked by how much of each recipe you can already make. Basics are not counted as missing, so a recipe you can cook tonight comes out on top.' },
      { id: 'q9', q: 'Does anything I do get saved?',
        a: 'Your ratings and shopping list stay on this device for now. My page adds them up: what you have rated, and how you rate against everybody else.' },
    ] },
  { heading: 'Editors and corrections',
    items: [
      { id: 'q10', q: 'What happens after I send a recipe?',
        a: 'It waits in the approval queue. An editor either publishes it, corrects a small thing themselves and then publishes it, or sends it back to you with the reason and a note about what is missing.' },
      { id: 'q11', q: 'A published recipe is incorrect or I want to change the access of my own recipe. What do I do?',
        a: 'Use "Tell an editor something is wrong" on the recipe. Pick what is wrong — an ingredient, an amount, a step, a credit — and an editor amends the recipe or replies saying why not.' },
      { id: 'q12', q: 'Can I have my own recipe taken down?',
        a: 'Yes. Report it as a takedown request and say it is yours. Only editors can delete a recipe, and nothing is deleted automatically.' },
    ] },
];
