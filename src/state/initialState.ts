import type { AppState, FormState } from '../types';
import { INITIAL_ACCOUNTS } from '../data/accounts';
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
    signedIn: false, role: 'reader', currentUser: null, authLoading: true,
    pendingPage: '', signRole: 'reader', signMode: 'in',
    accounts: INITIAL_ACCOUNTS,
    signName: '', signEmail: '', signPass: '', signError: '',
    editorDraft: '', editorError: '',
    // Recipes now come from Firestore — see src/lib/recipesRepo.ts and the
    // auth-driven refresh in AppStateContext.tsx. Starts empty/loading;
    // src/data/recipes.ts's RECIPES array is still the seed script's input
    // (scripts/seedFirestoreRecipes.ts), just no longer read directly here.
    recipes: [], recipesLoading: true,
    // The moderation queue (editors only) and "my own submissions" (any
    // signed-in reader) both now come from Firestore — see
    // src/lib/submissionsRepo.ts and the auth-driven refresh in
    // AppStateContext.tsx.
    pending: [],
    mySubmissions: [], submissionsLoading: true,
    // Reports and asks now come from Firestore — see
    // src/lib/reportsRepo.ts, src/lib/asksRepo.ts, and the auth-driven
    // refresh in AppStateContext.tsx.
    takedowns: [],
    f: { q: '', nationality: 'All', meal: 'All', author: 'All', since: 'Any time', rating: 'Any', time: 'Any', difficulty: 'Any', sort: 'Highest rated', tasteList: [] },
    circle: [], circleDraft: '', circleError: '',
    myRatings: {}, extraComments: {}, commentDraft: '', portionsById: {},
    commentReplies: {}, replyDrafts: {}, openReplies: {},
    pantry: INITIAL_PANTRY.slice(),
    pantryQuery: '', pantryOnlyComplete: false,
    rejected: [],
    queueReason: {}, queueNote: {},
    selected: [], ticked: {},
    reportOpen: false, reportText: '', reportKind: 'Wrong ingredient',
    asks: [], myAsks: [], publicAsks: [],
    askKind: 'A question', askSubject: '', askText: '', askError: '', askReply: {}, askPublish: {},
    formStep: 1, formDone: false, formError: '',
    form: freshForm(),
    toast: '', lastTitle: '', openQ: 'q1',
    draftId: 'd' + Date.now(),
    editTarget: null,
  };
}
