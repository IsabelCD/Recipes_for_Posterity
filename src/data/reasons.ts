import type { RejectReason, ReportKind } from '../types';

// Picking a reason fills the note to the submitter, which the editor can edit.
export const REJECT_REASONS: RejectReason[] = [
  { label: 'Not a good enough recipe',
    note: 'Thank you for sending this in. As written it is too thin for someone else to cook from, so we are not going to publish it.' },
  { label: 'Already in the archive',
    note: 'We already have a recipe very close to this one, so we will keep the published version rather than run both.' },
  { label: 'Copied word for word',
    note: 'This appears to be copied word for word from elsewhere. We can only publish recipes written in your own words, with the original cook credited.' },
  { label: 'Quantities or method incomplete',
    note: 'The recipe cannot be cooked as written — some quantities and steps are missing. Please add them and send it again.' },
  { label: 'No author or source given',
    note: 'Please tell us whose recipe this is, or where you learned it, so we can credit the cook properly.' },
  { label: 'Not a recipe',
    note: 'This does not look like a recipe, so we have not put it in the archive.' },
];

export const REPORT_KINDS: ReportKind[] = [
  { label: 'Wrong ingredient', hint: 'Something listed that does not belong, or one that is missing.',
    placeholder: 'It asks for plain flour, but it only works with self-raising.' },
  { label: 'Quantity should be amended', hint: 'An amount that does not work as written.',
    placeholder: '500 ml of water makes it soup. Nearer 300 ml.' },
  { label: 'A step is wrong or missing', hint: 'The method skips something, or the order is off.',
    placeholder: 'The butter has to be rubbed in before the buttermilk goes near it.' },
  { label: 'Wrong credit or source', hint: 'The wrong cook is named, or the origin is wrong.',
    placeholder: 'This came from my grandmother, not the named author.' },
  { label: 'Time or difficulty is off', hint: 'It takes much longer or is harder than stated.',
    placeholder: 'Forty minutes is not enough — the dal needs an hour.' },
  { label: 'Should be taken down', hint: 'Copied word for word, a duplicate, or your own recipe used without permission.',
    placeholder: 'It is my recipe from a 2019 newsletter and I would like it credited or removed.' },
];
