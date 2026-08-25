import type { AppState, FormState } from '../types';
import { RECIPES } from '../data/recipes';
import { PENDING, INITIAL_REJECTED, INITIAL_TAKEDOWNS } from '../data/pending';
import { INITIAL_ACCOUNTS } from '../data/accounts';
import { INITIAL_ASKS } from '../data/asks';
import { INITIAL_PANTRY } from '../data/content';

export function freshForm(submitter = ''): FormState {
  return {
    title: '', author: '', submitter, source: '', nationality: '', meal: 'Main dish',
    tastes: [], portions: 4, time: 30, difficulty: 2, notes: '', access: 'public',
    ingredients: [{ q: '', u: '', n: '' }, { q: '', u: '', n: '' }, { q: '', u: '', n: '' }],
    steps: [{ text: '', uses: [] }, { text: '', uses: [] }, { text: '', uses: [] }],
    photos: [],
  };
}

export function initialAppState(): AppState {
  return {
    page: 'home', recipeId: 'bacalhau',
    signedIn: false, role: 'reader', pendingPage: '', signRole: 'reader', signMode: 'in',
    accounts: INITIAL_ACCOUNTS,
    signName: '', signEmail: '', signPass: '', signError: '',
    editorDraft: '', editorError: '',
    recipes: RECIPES, pending: PENDING,
    takedowns: INITIAL_TAKEDOWNS,
    f: { q: '', nationality: 'All', meal: 'All', author: 'All', since: 'Any time', rating: 'Any', time: 'Any', difficulty: 'Any', sort: 'Highest rated', tasteList: [] },
    circle: [], circleDraft: '', circleError: '',
    myRatings: {}, extraComments: {}, commentDraft: '', portionsById: {},
    pantry: INITIAL_PANTRY.slice(),
    pantryQuery: '', pantryOnlyComplete: false,
    rejected: INITIAL_REJECTED,
    queueReason: {}, queueNote: {},
    selected: [], ticked: {},
    reportOpen: false, reportText: '', reportKind: 'Wrong ingredient',
    asks: INITIAL_ASKS,
    askKind: 'A question', askSubject: '', askText: '', askError: '', askReply: {}, askPublish: {},
    formStep: 1, formDone: false, formError: '',
    form: freshForm(),
    toast: '', lastTitle: '', openQ: 'q1',
    draftId: 'd' + Date.now(),
    editTarget: null,
  };
}
