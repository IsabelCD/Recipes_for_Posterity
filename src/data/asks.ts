import type { Ask } from '../types';

export const INITIAL_ASKS: Ask[] = [
  { id: 'a1', kind: 'A question', subject: 'Converting cups to grams', by: 'Ana Ribeiro', sentOn: '2026-08-11',
    text: 'My grandmother wrote everything in cups. Should I convert before submitting, or leave it as she wrote it?',
    status: 'Answered', reply: 'Leave the cups in the method if that is how she wrote it, but give grams in the ingredient list — the amounts have to scale when somebody changes the portions. Both can sit on the same page.',
    repliedBy: 'Editor Whitcombe', repliedOn: '2026-08-12', published: true },
  { id: 'a2', kind: 'A suggestion', subject: 'A print sheet for the kitchen', by: 'Marek Nowak', sentOn: '2026-08-14',
    text: 'It would help to print one recipe on a single sheet, with the amounts as I have scaled them, so I am not carrying a laptop to the stove.',
    status: 'Answered', reply: 'Agreed, and it is being built. It will print whatever portions you have set, with the per-step amounts beside each step.',
    repliedBy: 'Editor Whitcombe', repliedOn: '2026-08-15', published: true },
  { id: 'a3', kind: 'A question', subject: 'Two cooks, one recipe', by: 'Ana Ribeiro', sentOn: '2026-08-20',
    text: 'The recipe came from my mother but my aunt changed the filling. Can both of them be credited?',
    status: 'Waiting', reply: '', repliedBy: '', repliedOn: '', published: false },
  { id: 'a4', kind: 'A suggestion', subject: 'Filter by what is in season', by: 'Elena Bruni', sentOn: '2026-08-22',
    text: 'A filter for the month would help — asparagus in April, quince in October.',
    status: 'Waiting', reply: '', repliedBy: '', repliedOn: '', published: false },
];
