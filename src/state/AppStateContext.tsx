import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword,
  signOut as firebaseSignOut, updateProfile,
} from 'firebase/auth';
import { Timestamp, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { amendRecipe, loadVisibleRecipes, type VisibilityContext } from '../lib/recipesRepo';
import {
  amendSubmissionContent, contentFromFormFields, createSubmission, discardSubmission,
  publishSubmission as publishSubmissionOp, queryModerationQueue, queryMySubmissions,
  rejectSubmission as rejectSubmissionOp, requestRevision, resubmitSubmission, stepsToFirestore,
} from '../lib/submissionsRepo';
import { clearRating, loadMyRatings, rateRecipe } from '../lib/ratingsRepo';
import { loadComments, postComment as postCommentOp, postReply as postReplyOp } from '../lib/commentsRepo';
import {
  createReport, dismissReport, queryOpenReports, removeReportedRecipe, resolveReport,
} from '../lib/reportsRepo';
import {
  closeAsk, createAsk, queryAllAsksForEditor, queryMyAsks, queryPublicAsks, replyToAsk, setAskPublished,
} from '../lib/asksRepo';
import { findUserByEmail, queryEditors, setMyCircleEmails, setUserRole } from '../lib/usersRepo';
import type { AppState, Access, CurrentUser, PageKey, PendingSubmission, RejectedSubmission, Recipe, FormState, Role } from '../types';
import { initialAppState, freshForm } from './initialState';
import { REJECT_REASONS } from '../data/reasons';
import { TODAY } from '../data/taxonomy';
import { me, myEmail, accessOf } from './selectors';

// Pages that hold information about a specific person need an account; the
// queue additionally needs the editor role. Everything else is open.
function needsAccount(page: PageKey): boolean {
  return page === 'me' || page === 'admin' || page === 'contribute';
}

// What the sign-in form was doing when it called Firebase, so the
// onAuthStateChanged listener (the only place allowed to set
// signedIn/currentUser/role) knows whether to run the one-time
// "just signed in" side effects (navigate, flash a message) or stay quiet
// (a silent session restore on page load looks identical to Firebase).
type PendingAuthIntent = { type: 'signup' | 'signin'; pendingPage: PageKey | '' } | { type: 'signout' } | null;

// Maps a users/{uid} Firestore doc to the app's CurrentUser shape.
// Firestore's `role` is the only source of truth for authorization — the
// sign-in page's reader/editor picker is cosmetic and never reaches here.
function profileFromDoc(uid: string, data: Record<string, unknown>): CurrentUser {
  const role: Role = data.role === 'editor' ? 'editor' : 'reader';
  const createdAt = data.createdAt instanceof Timestamp
    ? data.createdAt.toDate().toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const circleEmails = Array.isArray(data.circleEmails)
    ? data.circleEmails.filter((e): e is string => typeof e === 'string')
    : [];
  return {
    uid,
    email: typeof data.email === 'string' ? data.email : '',
    displayName: typeof data.displayName === 'string' ? data.displayName : '',
    role,
    createdAt,
    circleEmails,
  };
}

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

// Reads users/{uid}. `retryOnMissing` covers the brief, expected window
// right after registration where the auth session exists a moment before
// our own setDoc() call has finished — it is NOT a silent role fallback:
// if the doc still isn't there after retrying (or the read errors), this
// reports failure rather than inventing a role.
async function fetchUserProfile(uid: string, retryOnMissing: boolean): Promise<{ ok: true; profile: CurrentUser } | { ok: false }> {
  const ref = doc(db, 'users', uid);
  const attempts = retryOnMissing ? 6 : 1;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) return { ok: true, profile: profileFromDoc(uid, snap.data()) };
    } catch {
      return { ok: false };
    }
    if (attempt < attempts) await sleep(250);
  }
  return { ok: false };
}

function mapAuthError(e: unknown): string {
  const code = (e as { code?: string } | null)?.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'There is already an account with that email. Sign in instead.';
    case 'auth/invalid-email':
      return 'That email address does not look complete.';
    case 'auth/weak-password':
      return 'The password needs at least eight characters.';
    case 'auth/wrong-password':
      return 'That password does not match the account.';
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return 'There is no account with that email address yet, or the password does not match. Choose “Create an account” if you have not signed up.';
    case 'auth/too-many-requests':
      return 'Too many attempts — please wait a moment and try again.';
    default:
      return 'Something went wrong signing you in. Please try again.';
  }
}

export interface AppActions {
  go(page: PageKey): void;
  openRecipe(id: string): void;
  flash(msg: string): void;
  // Re-runs the visibility-query merge for whoever is currently signed
  // in (or not) and replaces state.recipes. Called automatically on every
  // auth change; later phases (publish/amend/delete) call this directly
  // after their own write succeeds, instead of re-deriving the query
  // selection at each call site — see src/lib/recipesRepo.ts.
  refreshRecipes(): void;
  // Same idea as refreshRecipes: re-runs the moderation-queue / own-
  // submissions load for whoever is currently signed in. Called
  // automatically on auth change; also called directly after any action
  // that changes a submission's state (create, resubmit, discard,
  // request revision, reject, publish) instead of duplicating the query
  // selection at each call site — see src/lib/submissionsRepo.ts.
  refreshSubmissions(): void;

  // ── accounts ──
  setSignName(v: string): void;
  setSignEmail(v: string): void;
  setSignPass(v: string): void;
  toCreate(): void;
  toSignIn(): void;
  pickSignRole(role: 'reader' | 'editor'): void;
  doSignIn(): void;
  signOut(): void;
  setEditorDraft(v: string): void;
  addEditor(): void;
  demoteEditor(uid: string): void;

  // ── search ──
  setFilter<K extends keyof AppState['f']>(key: K, value: AppState['f'][K]): void;
  toggleTasteFilter(taste: string): void;
  clearFilters(): void;

  // ── recipe page ──
  incPortions(id: string, base: number): void;
  decPortions(id: string, base: number): void;
  setMyRating(id: string, n: number): void;
  clearMyRating(id: string): void;
  setCommentDraft(v: string): void;
  postComment(id: string): void;
  toggleReplyBox(commentKey: string): void;
  setReplyDraft(commentKey: string, v: string): void;
  postReply(commentKey: string): void;
  toggleSelect(id: string): void;
  printPage(): void;
  openReport(): void;
  closeReport(): void;
  setReportKind(v: string): void;
  setReportText(v: string): void;
  sendReport(id: string): void;

  // ── contribute form ──
  setFormField<K extends keyof FormState>(key: K, value: FormState[K]): void;
  toggleFormTaste(taste: string): void;
  setIngredient(i: number, patch: Partial<FormState['ingredients'][number]>): void;
  toggleIngredientQb(i: number): void;
  addIngredient(): void;
  removeIngredient(i: number): void;
  setStepText(i: number, text: string): void;
  removeStep(i: number): void;
  addStep(): void;
  toggleStepPhoto(i: number): void;
  addStepUse(i: number, ingredientName: string): void;
  setStepUseQty(i: number, j: number, q: string): void;
  removeStepUse(i: number, j: number): void;
  addPhoto(): void;
  removePhoto(i: number): void;
  nextStep(): void;
  prevStep(): void;
  submitForm(): void;
  resetForm(): void;
  cancelEdit(): void;
  saveEdit(): void;
  saveEditAndPublish(): void;
  resubmitOwnSubmission(): void;

  // ── my page ──
  setCircleDraft(v: string): void;
  addCircleEmail(): void;
  removeCircleEmail(email: string): void;
  discardOwnSubmission(id: string): void;

  // ── cook from my cupboard ──
  setPantryQuery(v: string): void;
  togglePantryOnly(): void;
  clearPantry(): void;
  togglePantryItem(key: string): void;
  addToListFromCupboard(id: string): void;

  // ── shopping list ──
  toggleTicked(key: string): void;
  clearTicks(): void;

  // ── admin queue ──
  publishSubmission(p: PendingSubmission): void;
  loadIntoForm(src: PendingSubmission | AppState['recipes'][number], kind: 'pending' | 'mine' | 'recipe', reportId?: string | null): void;
  pickQueueReason(id: string, label: string): void;
  setQueueNote(id: string, v: string): void;
  approveSubmission(id: string): void;
  rejectSubmission(id: string): void;
  resendSubmission(id: string): void;
  dropRejected(id: string): void;
  dismissTakedown(id: string): void;
  removeTakedownRecipe(id: string, recipeId: string): void;
  fixTakedown(recipeId: string, reportId: string): void;

  // ── questions and answers ──
  toggleFaq(id: string): void;
  setAskKind(v: string): void;
  setAskSubject(v: string): void;
  setAskText(v: string): void;
  sendAsk(): void;
  setAdminAskDraft(id: string, v: string): void;
  toggleAdminAskPublish(id: string): void;
  sendAdminAskReply(id: string): void;
  unpublishAdminAsk(id: string): void;
  closeAdminAsk(id: string): void;
}

export interface AppContextValue {
  state: AppState;
  actions: AppActions;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialAppState);

  // Actions below are created once (empty deps) so their identity is
  // stable across renders. Anything that needs to make a DECISION based
  // on "the state right now" reads it from this ref rather than closing
  // over `state` — the ref is refreshed every render, synchronously,
  // before any event handler can fire. Every action performs its state
  // update via a single functional setState call and runs any side effect
  // (flash, scrollTo, calling another action) as a separate statement
  // afterwards — never nested inside a setState updater, which React 18
  // StrictMode may invoke more than once and would otherwise double-fire.
  const stateRef = useRef(state);
  stateRef.current = state;
  const flashTimer = useRef<number | undefined>(undefined);
  const pendingIntentRef = useRef<PendingAuthIntent>(null);

  // Defined outside the actions useMemo (unlike everything else) because
  // both `actions.refreshRecipes` and the onAuthStateChanged listener
  // below need to call it — the listener already has a freshly-resolved
  // identity in its own local scope at the moment auth changes, and must
  // NOT read it back out of stateRef, which would still hold the
  // *previous* signedIn/role/currentUser until the next render.
  const flash = useCallback((msg: string) => {
    setState((s) => ({ ...s, toast: msg }));
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setState((s) => ({ ...s, toast: '' })), 2600);
  }, []);

  // My own rating on every visible recipe — one get() per recipe rather
  // than a collectionGroup query (see src/lib/ratingsRepo.ts). Chained
  // after recipes finish loading, since it needs to know which recipe
  // IDs are actually visible; a signed-out reader has none.
  const applyMyRatingsFor = useCallback((ctx: VisibilityContext, recipes: Recipe[]) => {
    if (!ctx.signedIn || !ctx.uid) { setState((s) => ({ ...s, myRatings: {} })); return; }
    loadMyRatings(ctx.uid, recipes.map((r) => r.id))
      .then((myRatings) => setState((s) => ({ ...s, myRatings })))
      .catch((e) => console.error('[ratings] failed to load', e));
  }, []);

  const applyRecipesFor = useCallback((ctx: VisibilityContext) => {
    setState((s) => ({ ...s, recipesLoading: true }));
    loadVisibleRecipes(ctx)
      .then((recipes) => {
        setState((s) => ({ ...s, recipes, recipesLoading: false }));
        applyMyRatingsFor(ctx, recipes);
      })
      .catch((e) => {
        console.error('[recipes] failed to load', e);
        setState((s) => ({ ...s, recipesLoading: false }));
        flash('Could not load recipes. Please try refreshing the page.');
      });
  }, [flash, applyMyRatingsFor]);

  // Same shape as applyRecipesFor: signed out clears both, a reader gets
  // only their own submissions (mySubmissions), an editor additionally
  // gets the moderation queue (pending/rejected) — Firestore rules would
  // reject that second query for anyone else, so it's simply not run.
  const applySubmissionsFor = useCallback((ctx: VisibilityContext) => {
    if (!ctx.signedIn || !ctx.uid) {
      setState((s) => ({ ...s, mySubmissions: [], pending: [], rejected: [], submissionsLoading: false }));
      return;
    }
    setState((s) => ({ ...s, submissionsLoading: true }));
    const mine = queryMySubmissions(ctx.uid).then((mySubmissions) => setState((s) => ({ ...s, mySubmissions })));
    const queue = ctx.role === 'editor'
      ? queryModerationQueue().then(({ pending, rejected }) => setState((s) => ({ ...s, pending, rejected })))
      : Promise.resolve(setState((s) => ({ ...s, pending: [], rejected: [] })));
    Promise.all([mine, queue])
      .then(() => setState((s) => ({ ...s, submissionsLoading: false })))
      .catch((e) => {
        console.error('[submissions] failed to load', e);
        setState((s) => ({ ...s, submissionsLoading: false }));
        flash('Could not load your submissions. Please try refreshing the page.');
      });
  }, [flash]);

  // Editor-only: the open reports queue. Unlike submissions/asks, a
  // reader never has their own reports listed anywhere in the UI, so
  // there's no "my reports" slice to load here.
  const applyReportsFor = useCallback((ctx: VisibilityContext) => {
    if (!ctx.signedIn || ctx.role !== 'editor') { setState((s) => ({ ...s, takedowns: [] })); return; }
    queryOpenReports()
      .then((takedowns) => setState((s) => ({ ...s, takedowns })))
      .catch((e) => console.error('[reports] failed to load', e));
  }, []);

  // Editor-only: every real account currently holding the editor role,
  // for the Admin page's "Editors" list — see src/lib/usersRepo.ts.
  const applyEditorsFor = useCallback((ctx: VisibilityContext) => {
    if (!ctx.signedIn || ctx.role !== 'editor') { setState((s) => ({ ...s, editors: [] })); return; }
    queryEditors()
      .then((editors) => setState((s) => ({ ...s, editors })))
      .catch((e) => console.error('[users] failed to load editors', e));
  }, []);

  // Same three-way split as recipes (Phase 1): everyone gets the
  // published-for-everyone asks, a signed-in reader additionally gets
  // their own, and an editor gets the full unconstrained queue instead
  // of "their own" — Firestore rules would reject that query for anyone
  // else. Called on every auth change, signed in or not, since the
  // public slice has to be there for a signed-out FAQ page visit too.
  const applyAsksFor = useCallback((ctx: VisibilityContext) => {
    const pub = queryPublicAsks().then((publicAsks) => setState((s) => ({ ...s, publicAsks })));
    const mine = (ctx.signedIn && ctx.uid)
      ? queryMyAsks(ctx.uid).then((myAsks) => setState((s) => ({ ...s, myAsks })))
      : Promise.resolve(setState((s) => ({ ...s, myAsks: [] })));
    const editorQueue = (ctx.signedIn && ctx.role === 'editor')
      ? queryAllAsksForEditor().then((asks) => setState((s) => ({ ...s, asks })))
      : Promise.resolve(setState((s) => ({ ...s, asks: [] })));
    Promise.all([pub, mine, editorQueue]).catch((e) => console.error('[asks] failed to load', e));
  }, []);

  const actions = useMemo<AppActions>(() => {
    const go = (page: PageKey) => {
      const s = stateRef.current;
      if (needsAccount(page) && (!s.signedIn || (page === 'admin' && s.role !== 'editor'))) {
        setState((s2) => ({ ...s2, page: 'signin', pendingPage: page, signError: '',
          signRole: page === 'admin' ? 'editor' : 'reader', formError: '', editTarget: null }));
      } else {
        setState((s2) => ({ ...s2, page, formError: '', editTarget: null,
          form: (page === 'contribute' && !(s2.form.submitter || '').trim())
            ? { ...s2.form, submitter: me(s2).name } : s2.form }));
      }
      window.scrollTo(0, 0);
    };

    // Firestore-backed comments/replies for one recipe, merged into the
    // same extraComments/commentReplies state the mock used for
    // session-only notes — see src/lib/commentsRepo.ts. Re-fetched (not
    // patched locally) after every post, same convention as
    // refreshRecipes/refreshSubmissions: Firestore is the one source of
    // truth for the real id/timestamp a write produced.
    const loadCommentsForRecipe = (id: string) => {
      loadComments(id)
        .then(({ comments, repliesByComment }) => setState((s) => ({
          ...s,
          extraComments: { ...s.extraComments, [id]: comments },
          commentReplies: { ...s.commentReplies, ...repliesByComment },
        })))
        .catch((e) => console.error('[comments] failed to load', e));
    };

    const openRecipe = (id: string) => {
      setState((s) => ({ ...s, page: 'recipe', recipeId: id, commentDraft: '' }));
      loadCommentsForRecipe(id);
      window.scrollTo(0, 0);
    };

    const setF = <K extends keyof FormState>(key: K, value: FormState[K]) =>
      setState((s) => ({ ...s, form: { ...s.form, [key]: value } }));

    const setFilter = <K extends keyof AppState['f']>(key: K, value: AppState['f'][K]) =>
      setState((s) => ({ ...s, f: { ...s.f, [key]: value } }));

    const toggleSelect = (id: string) => {
      const s = stateRef.current;
      const inList = s.selected.indexOf(id) !== -1;
      const title = s.recipes.find((r) => r.id === id)?.title || 'Recipe';
      setState((s2) => ({ ...s2, selected: inList ? s2.selected.filter((x) => x !== id) : s2.selected.concat([id]) }));
      flash(inList ? `“${title}” removed from your shopping list.` : `“${title}” added to your shopping list.`);
    };

    // A submission or a published recipe, poured back into the submission form.
    const loadIntoForm: AppActions['loadIntoForm'] = (src, kind, reportId = null) => {
      const s = stateRef.current;
      const anySrc = src as PendingSubmission & { photoKey?: string };
      const steps = (anySrc.steps || []).map((t, i) => ({
        text: typeof t === 'string' ? t : '',
        photo: !!((anySrc.stepPhotos || [])[i]),
        photoId: (anySrc.stepPhotos || [])[i] || '',
        uses: (((anySrc.uses || [])[i]) || []).map((u) => ({ q: u.qb ? '' : String(u.q || ''), u: u.qb ? '' : (u.u || ''), n: u.n, qb: !!u.qb })),
      }));
      const draft = (anySrc.photoKey || anySrc.id || 'd1').replace(/^p-/, '');
      setState((s2) => ({
        ...s2, page: 'contribute', formStep: 1, formDone: false, formError: '', draftId: draft,
        editTarget: { kind, id: anySrc.id, title: anySrc.title, reportId: reportId || null },
        form: {
          title: anySrc.title || '', author: anySrc.author === 'unknown' ? '' : (anySrc.author || ''),
          submitter: anySrc.submitter || '', source: anySrc.source || '',
          nationality: anySrc.nationality === 'Not given' ? '' : (anySrc.nationality || ''),
          meal: anySrc.meal || 'Main dish',
          tastes: (anySrc.tastes || []).filter((t) => t !== 'Not given'),
          portions: anySrc.portions || 4, time: anySrc.time || 30, difficulty: anySrc.difficulty || 2,
          notes: anySrc.notes || '', access: accessOf(s, anySrc as never),
          ingredients: (anySrc.ingredients || []).map((i) => ({ q: i.qb ? '' : String(i.q || ''), u: i.qb ? '' : (i.u || ''), n: i.n || '', qb: !!i.qb })).concat([{ q: '', u: '', n: '', qb: false }]),
          steps: steps.length ? steps : [{ text: '', uses: [] }],
          photos: (anySrc.photos && anySrc.photos.length) ? anySrc.photos.slice() : [],
        },
      }));
      window.scrollTo(0, 0);
    };

    // A non-q.b. amount has to be a plain number — parseFloat's own
    // "ignore trailing text" behaviour would otherwise silently accept
    // something like "2 cups" as 2, or "a pinch" as 0.
    const isValidAmount = (q: string) => {
      const t = q.trim();
      return t !== '' && Number.isFinite(Number(t)) && Number(t) >= 0;
    };

    // At least one step, and every non-q.b. amount — an ingredient's own
    // amount, and how much of it each step uses — has to be a real
    // number. Kept separate from the title/ingredient checks already at
    // each call site below (rather than folded into one shared
    // validator) so none of their existing wording has to change.
    const stepsAndAmountsError = (form: FormState): string => {
      if (!form.steps.some((st) => st.text.trim())) return 'Please write at least one step.';
      if (form.ingredients.some((i) => i.n.trim() && !i.qb && !isValidAmount(i.q))) {
        return 'Ingredient amounts must be a number (e.g. 400), unless marked q.b.';
      }
      if (form.steps.some((st) => st.uses.some((u) => !u.qb && !isValidAmount(u.q)))) {
        return 'Step amounts must be a number (e.g. 400), unless marked q.b.';
      }
      return '';
    };

    // The form's fields, cleaned up into the shape a submission or recipe uses.
    const formFields = (form: FormState, s: AppState) => {
      const filled = form.ingredients.filter((i) => i.n.trim());
      const steps = form.steps.filter((st) => st.text.trim());
      return {
        title: form.title.trim(), author: form.author.trim() || 'unknown',
        submitter: form.submitter.trim() || 'anonymous',
        nationality: form.nationality.trim() || 'Not given', meal: form.meal,
        tastes: form.tastes.length ? form.tastes : ['Not given'],
        time: Number(form.time) || 30, difficulty: Number(form.difficulty) || 2,
        portions: Number(form.portions) || 4, source: form.source.trim(),
        notes: form.notes.trim(),
        access: form.access || 'public',
        ownerEmail: myEmail(s),
        ingredients: filled.map((i) => (i.qb ? { q: 0, u: '', n: i.n.trim(), qb: true } : { q: parseFloat(i.q) || 0, u: i.u.trim(), n: i.n.trim() })),
        steps: steps.map((st) => st.text.trim()),
        photos: (form.photos || []).slice(0, 3),
        stepPhotos: steps.map((st, i) => (st.photo ? (st.photoId || `step-${s.draftId}-${i + 1}`) : '')),
        photoKey: s.draftId,
        uses: steps.map((st) => (st.uses || []).map((u) => (u.qb ? { q: 0, u: '', n: u.n, qb: true } : { q: parseFloat(u.q) || 0, u: u.u, n: u.n }))),
        ingCount: filled.length, stepCount: steps.length,
      };
    };

    const refreshRecipesNow = () => {
      const s = stateRef.current;
      applyRecipesFor({ signedIn: s.signedIn, role: s.role, uid: s.currentUser?.uid ?? null, email: s.currentUser?.email ?? null });
    };
    const refreshSubmissionsNow = () => {
      const s = stateRef.current;
      applySubmissionsFor({ signedIn: s.signedIn, role: s.role, uid: s.currentUser?.uid ?? null, email: s.currentUser?.email ?? null });
    };
    const refreshReportsNow = () => {
      const s = stateRef.current;
      applyReportsFor({ signedIn: s.signedIn, role: s.role, uid: s.currentUser?.uid ?? null, email: s.currentUser?.email ?? null });
    };
    const refreshAsksNow = () => {
      const s = stateRef.current;
      applyAsksFor({ signedIn: s.signedIn, role: s.role, uid: s.currentUser?.uid ?? null, email: s.currentUser?.email ?? null });
    };
    const refreshEditorsNow = () => {
      const s = stateRef.current;
      applyEditorsFor({ signedIn: s.signedIn, role: s.role, uid: s.currentUser?.uid ?? null, email: s.currentUser?.email ?? null });
    };

    // Editor-only. Creates the real recipes/{id} doc and removes the
    // submission in one transaction (src/lib/submissionsRepo.ts), then
    // refreshes both the public recipe list and the moderation queue so
    // the change is visible immediately with no page reload.
    const publishSubmission = (p: PendingSubmission) => {
      const ownerUid = p.ownerUid;
      if (!ownerUid) { flash('This submission is missing an owner and cannot be published.'); return; }
      (async () => {
        try {
          await publishSubmissionOp({
            id: p.id, title: p.title, author: p.author, submitter: p.submitter, nationality: p.nationality,
            meal: p.meal, tastes: p.tastes, time: p.time, difficulty: p.difficulty,
            portions: p.portions, source: p.source, notes: p.notes || '', access: p.access || 'public',
            ownerUid, ownerEmail: p.ownerEmail || '',
            ingredients: p.ingredients?.length ? p.ingredients : [{ q: 0, u: '', n: 'See submitted sheet' }],
            steps: stepsToFirestore(
              p.steps?.length ? p.steps : ['Method as submitted by the contributor.'],
              p.uses || [], p.stepPhotos || [],
            ),
            photos: p.photos || [], blurb: p.blurb || p.summary,
          });
          flash(`“${p.title}” is now live in the archive.`);
          refreshRecipesNow();
          refreshSubmissionsNow();
        } catch (e) {
          console.error('[submissions] publish failed', e);
          flash('Could not publish this recipe. Please try again.');
        }
      })();
    };

    // Editor-only. `from` says which queue bucket the item is coming
    // from: 'pending' asks the editor for a reason first (as today);
    // 'rejected' is "close without publishing" on an item already
    // waiting for revision, which carries its existing reason/note
    // through rather than asking again.
    const decideSubmission = (id: string, decision: 'revise' | 'reject', from: 'pending' | 'rejected') => {
      const s = stateRef.current;
      const p = (from === 'pending' ? s.pending : s.rejected).find((x) => x.id === id);
      if (!p) return;
      const decidedBy = me(s).name || 'An editor';
      let reason: string;
      let note: string;
      if (from === 'pending') {
        reason = s.queueReason[id];
        if (!reason) { flash('Choose a reason first.'); return; }
        note = (s.queueNote[id] || '').trim();
      } else {
        reason = (p as RejectedSubmission).reason || 'Not revised';
        note = (p as RejectedSubmission).note || '';
      }
      const clear = (obj: Record<string, string>) => { const o = { ...obj }; delete o[id]; return o; };
      (async () => {
        try {
          if (decision === 'revise') await requestRevision(id, decidedBy, reason, note);
          else await rejectSubmissionOp(id, decidedBy, reason, note);
          setState((s2) => ({ ...s2, queueReason: clear(s2.queueReason), queueNote: clear(s2.queueNote) }));
          flash(decision === 'revise'
            ? `Sent back to ${p.submitter} to revise. It waits in Pending revision.`
            : `“${p.title}” rejected — ${reason.toLowerCase()}. ${p.submitter} has been told why.`);
          refreshSubmissionsNow();
        } catch (e) {
          console.error('[submissions] decision failed', e);
          flash('Could not save that decision. Please try again.');
        }
      })();
    };

    const saveAmendment = (publishAfter: boolean) => {
      const s = stateRef.current;
      const t = s.editTarget;
      if (!t) return;
      const form = s.form;
      if (!form.title.trim()) { setState((s2) => ({ ...s2, formStep: 1, formError: 'The recipe still needs a title.' })); return; }
      const v = formFields(form, s);
      if (!v.ingCount) { setState((s2) => ({ ...s2, formStep: 2, formError: 'Leave at least one ingredient on the list.' })); return; }
      const amendStepsErr = stepsAndAmountsError(form);
      if (amendStepsErr) { setState((s2) => ({ ...s2, formStep: 2, formError: amendStepsErr })); return; }
      if (t.kind === 'recipe') {
        // An editor's content "fix" for an already-published recipe — a
        // real Firestore write now (see src/lib/recipesRepo.ts's
        // amendRecipe). The report this fix was for, if any, is resolved
        // separately once the amend itself has actually succeeded — not
        // one transaction, matching how every other report resolution in
        // this app is just paired with its own real write, not atomic
        // with it.
        const reportId = t.reportId;
        const editedBy = me(s).name || 'An editor';
        const content = {
          title: v.title, author: v.author, submitter: v.submitter, nationality: v.nationality, meal: v.meal,
          tastes: v.tastes, time: v.time, difficulty: v.difficulty, portions: v.portions, source: v.source,
          notes: v.notes, access: v.access, ingredients: v.ingredients,
          steps: stepsToFirestore(v.steps, v.uses, v.stepPhotos),
          photos: v.photos, editedOn: TODAY, editedBy,
        };
        setState((s2) => ({
          ...s2,
          editTarget: null, formStep: 1, formError: '', page: 'recipe', recipeId: t.id,
        }));
        window.scrollTo(0, 0);
        (async () => {
          try {
            await amendRecipe(t.id, content);
            flash(`New version of “${v.title}” saved.${reportId ? ' The reader who reported it has been told.' : ''}`);
            refreshRecipesNow();
            if (reportId) {
              setState((s2) => ({ ...s2, takedowns: s2.takedowns.filter((x) => x.id !== reportId) }));
              resolveReport(reportId, editedBy).catch((e) => { console.error('[reports] resolve failed', e); refreshReportsNow(); });
            }
          } catch (e) {
            console.error('[recipes] amend failed', e);
            flash('Could not save your changes. Please try again.');
          }
        })();
        return;
      }
      // t.kind === 'pending' — an editor amending someone else's queued
      // submission, either keeping it in the queue or publishing it
      // straight away with the amended content.
      const base = s.pending.find((x) => x.id === t.id);
      if (!base) { flash('This submission is no longer in the queue.'); setState((s2) => ({ ...s2, editTarget: null, page: 'admin' })); return; }
      const ownerUid = base.ownerUid;
      if (!ownerUid) { flash('This submission is missing an owner and cannot be amended.'); return; }
      const content = contentFromFormFields(v, `${v.ingCount} ingredients and ${v.stepCount} steps. ${v.notes || 'No notes added.'}`, 'Amended by an editor.');
      setState((s2) => ({ ...s2, editTarget: null, formStep: 1, formError: '', page: 'admin' }));
      window.scrollTo(0, 0);
      (async () => {
        try {
          if (publishAfter) {
            await publishSubmissionOp({
              id: base.id, title: v.title, author: v.author, submitter: v.submitter, nationality: v.nationality,
              meal: v.meal, tastes: v.tastes, time: v.time, difficulty: v.difficulty,
              portions: v.portions, source: v.source, notes: v.notes, access: v.access,
              ownerUid, ownerEmail: base.ownerEmail || v.ownerEmail,
              ingredients: content.ingredients, steps: content.steps, photos: content.photos,
              blurb: v.notes || `Submitted by ${v.submitter}.`,
            });
            flash(`“${v.title}” is now live in the archive.`);
            refreshRecipesNow();
          } else {
            await amendSubmissionContent(base.id, content);
            flash(`Your changes to “${v.title}” are saved. It is still waiting for approval.`);
          }
          refreshSubmissionsNow();
        } catch (e) {
          console.error('[submissions] amend failed', e);
          flash('Could not save your changes. Please try again.');
        }
      })();
    };

    // The reader's own path: editing and resubmitting a needs_revision
    // submission of theirs. Firestore rules only allow this exact
    // needs_revision → pending transition on a document the caller owns.
    const resubmitOwnSubmission = () => {
      const s = stateRef.current;
      const t = s.editTarget;
      if (!t || t.kind !== 'mine') return;
      const form = s.form;
      if (!form.title.trim()) { setState((s2) => ({ ...s2, formStep: 1, formError: 'The recipe still needs a title.' })); return; }
      const v = formFields(form, s);
      if (!v.ingCount) { setState((s2) => ({ ...s2, formStep: 2, formError: 'Leave at least one ingredient on the list.' })); return; }
      const resubmitStepsErr = stepsAndAmountsError(form);
      if (resubmitStepsErr) { setState((s2) => ({ ...s2, formStep: 2, formError: resubmitStepsErr })); return; }
      const content = contentFromFormFields(v, `${v.ingCount} ingredients and ${v.stepCount} steps. ${v.notes || 'No notes added.'}`, '');
      setState((s2) => ({ ...s2, editTarget: null, formStep: 1, formError: '', page: 'me' }));
      window.scrollTo(0, 0);
      (async () => {
        try {
          await resubmitSubmission(t.id, content);
          flash(`“${v.title}” has been sent back for another look.`);
          refreshSubmissionsNow();
        } catch (e) {
          console.error('[submissions] resubmit failed', e);
          flash('Could not send your revised copy. Please try again.');
        }
      })();
    };

    const discardOwnSubmission = (id: string) => {
      const s = stateRef.current;
      const p = s.mySubmissions.find((x) => x.id === id);
      if (!p) return;
      (async () => {
        try {
          await discardSubmission(id);
          flash(`“${p.title}” has been discarded.`);
          refreshSubmissionsNow();
        } catch (e) {
          console.error('[submissions] discard failed', e);
          flash('Could not discard this submission. Please try again.');
        }
      })();
    };

    return {
      go, openRecipe, flash,
      refreshRecipes: refreshRecipesNow,
      refreshSubmissions: refreshSubmissionsNow,

      setSignName: (v) => setState((s) => ({ ...s, signName: v })),
      setSignEmail: (v) => setState((s) => ({ ...s, signEmail: v })),
      setSignPass: (v) => setState((s) => ({ ...s, signPass: v })),
      toCreate: () => setState((s) => ({ ...s, signMode: 'new', signRole: 'reader', signError: '', signPass: '' })),
      toSignIn: () => setState((s) => ({ ...s, signMode: 'in', signError: '', signPass: '' })),
      pickSignRole: (role) => setState((s) => ({ ...s, signRole: role, signError: '' })),
      // Both branches only ever call the Firebase SDK and do up-front
      // client-side validation. The actual signedIn/currentUser/role state
      // is set exactly once, by the onAuthStateChanged listener below —
      // that is what makes it the source of truth rather than this
      // function guessing at the outcome.
      doSignIn: () => {
        const s = stateRef.current;
        const email = s.signEmail.trim().toLowerCase();
        const name = s.signName.trim();
        if (!name) { setState((s2) => ({ ...s2, signError: 'Give the name your notes should be signed with.' })); return; }
        if (email.indexOf('@') < 1) { setState((s2) => ({ ...s2, signError: 'That email address does not look complete.' })); return; }
        if (s.signPass.length < 8) { setState((s2) => ({ ...s2, signError: 'The password needs at least eight characters.' })); return; }
        const password = s.signPass;

        if (s.signMode === 'new') {
          pendingIntentRef.current = { type: 'signup', pendingPage: s.pendingPage };
          setState((s2) => ({ ...s2, signError: '' }));
          (async () => {
            let cred;
            try {
              cred = await createUserWithEmailAndPassword(auth, email, password);
            } catch (e) {
              pendingIntentRef.current = null;
              const code = (e as { code?: string } | null)?.code || '';
              setState((s2) => ({ ...s2, signError: mapAuthError(e), signMode: code === 'auth/email-already-in-use' ? 'in' : s2.signMode }));
              return;
            }
            try {
              await updateProfile(cred.user, { displayName: name });
              // role is hardcoded 'reader' here — never taken from any
              // user input, so the (nonexistent, at signup) role picker
              // can't influence it. The Firestore rules independently
              // enforce the same thing.
              await setDoc(doc(db, 'users', cred.user.uid), {
                displayName: name, email, role: 'reader', createdAt: serverTimestamp(), circleEmails: [],
              });
              setState((s2) => ({ ...s2, signPass: '' }));
            } catch {
              // The Auth account exists but its profile doesn't — leaving
              // it would strand the email as "already in use" with no way
              // to finish setting it up, so undo the account and let them
              // retry cleanly instead.
              pendingIntentRef.current = null;
              await cred.user.delete().catch(() => {});
              setState((s2) => ({ ...s2, signError: 'We could not finish setting up your account. Please try again.' }));
            }
          })();
          return;
        }

        // Existing account. The "Signing in as reader / editor" picker
        // above is purely cosmetic here — Firestore's users/{uid}.role is
        // read fresh in the listener and used regardless of what was
        // picked; a mismatch is never treated as a sign-in failure.
        pendingIntentRef.current = { type: 'signin', pendingPage: s.pendingPage };
        setState((s2) => ({ ...s2, signError: '' }));
        (async () => {
          try {
            await signInWithEmailAndPassword(auth, email, password);
            setState((s2) => ({ ...s2, signPass: '' }));
          } catch (e) {
            pendingIntentRef.current = null;
            setState((s2) => ({ ...s2, signError: mapAuthError(e) }));
          }
        })();
      },
      signOut: () => {
        pendingIntentRef.current = { type: 'signout' };
        firebaseSignOut(auth).catch(() => { pendingIntentRef.current = null; });
      },
      // addEditor/demoteEditor look up and change a real users/{uid}
      // Firestore doc — see src/lib/usersRepo.ts. firestore.rules'
      // isEditorRoleChange() independently re-checks that the caller is
      // an editor and that only the role field moves, so this client code
      // is a convenience, not the actual security boundary.
      setEditorDraft: (v) => setState((s) => ({ ...s, editorDraft: v, editorError: '' })),
      addEditor: () => {
        const s = stateRef.current;
        const v = (s.editorDraft || '').trim().toLowerCase();
        if (!v) { setState((s2) => ({ ...s2, editorError: 'Write the email address of the account first.' })); return; }
        (async () => {
          try {
            const found = await findUserByEmail(v);
            if (!found) { setState((s2) => ({ ...s2, editorError: `No account here uses ${v}. They have to sign up before they can be made an editor.` })); return; }
            if (found.role === 'editor') { setState((s2) => ({ ...s2, editorError: `${found.displayName || v} is already an editor.` })); return; }
            if (found.uid === s.currentUser?.uid) { setState((s2) => ({ ...s2, editorError: 'You cannot change your own role here.' })); return; }
            await setUserRole(found.uid, 'editor');
            setState((s2) => ({ ...s2, editorDraft: '', editorError: '' }));
            flash(`${found.displayName || v} is now an editor.`);
            refreshEditorsNow();
          } catch (e) {
            console.error('[users] promote failed', e);
            setState((s2) => ({ ...s2, editorError: 'Could not update that account. Please try again.' }));
          }
        })();
      },
      demoteEditor: (uid) => {
        const s = stateRef.current;
        const acc = s.editors.find((x) => x.uid === uid);
        if (!acc) return;
        setUserRole(uid, 'reader')
          .then(() => { flash(`${acc.displayName} is a reader again.`); refreshEditorsNow(); })
          .catch((e) => { console.error('[users] demote failed', e); flash('Could not update that account. Please try again.'); });
      },

      setFilter,
      toggleTasteFilter: (taste) => setState((s) => {
        const list = s.f.tasteList || [];
        return { ...s, f: { ...s.f, tasteList: list.indexOf(taste) === -1 ? list.concat([taste]) : list.filter((x) => x !== taste) } };
      }),
      clearFilters: () => setState((s) => ({ ...s, f: { q: '', nationality: 'All', meal: 'All', author: 'All', since: 'Any time', rating: 'Any', time: 'Any', difficulty: 'Any', sort: 'Highest rated', tasteList: [] } })),

      incPortions: (id, base) => setState((s) => ({ ...s, portionsById: { ...s.portionsById, [id]: Math.min(24, (s.portionsById[id] || base) + 1) } })),
      decPortions: (id, base) => setState((s) => ({ ...s, portionsById: { ...s.portionsById, [id]: Math.max(1, (s.portionsById[id] || base) - 1) } })),
      setMyRating: (id, n) => {
        const s = stateRef.current;
        if (!s.currentUser) { flash('Please sign in to rate this recipe.'); return; }
        const uid = s.currentUser.uid;
        (async () => {
          try {
            await rateRecipe(id, uid, n);
            setState((s2) => ({ ...s2, myRatings: { ...s2.myRatings, [id]: n } }));
            flash(`Rating saved — ${n} out of 5. No note needed.`);
            // The recipe's own displayed rating/votes moved too (see
            // src/lib/ratingsRepo.ts's transaction) — refresh so it shows
            // without a reload, same convention as every other mutation.
            refreshRecipesNow();
          } catch (e) {
            console.error('[ratings] save failed', e);
            flash('Could not save your rating. Please try again.');
          }
        })();
      },
      clearMyRating: (id) => {
        const s = stateRef.current;
        if (!s.currentUser) return;
        const uid = s.currentUser.uid;
        (async () => {
          try {
            await clearRating(id, uid);
            setState((s2) => { const m = { ...s2.myRatings }; delete m[id]; return { ...s2, myRatings: m }; });
            flash('Your rating has been removed.');
            refreshRecipesNow();
          } catch (e) {
            console.error('[ratings] remove failed', e);
            flash('Could not remove your rating. Please try again.');
          }
        })();
      },
      setCommentDraft: (v) => setState((s) => ({ ...s, commentDraft: v })),
      postComment: (id) => {
        const s = stateRef.current;
        const t = s.commentDraft.trim();
        if (!t) { flash('Write something first.'); return; }
        if (!s.currentUser) { flash('Please sign in to add a note.'); return; }
        const { uid, displayName } = s.currentUser;
        (async () => {
          try {
            await postCommentOp(id, uid, displayName, t);
            setState((s2) => ({ ...s2, commentDraft: '' }));
            loadCommentsForRecipe(id);
            flash('Your note has been added.');
          } catch (e) {
            console.error('[comments] post failed', e);
            flash('Could not add your note. Please try again.');
          }
        })();
      },
      toggleReplyBox: (commentKey) => {
        if (!stateRef.current.signedIn) return;
        setState((s) => ({ ...s, openReplies: { ...s.openReplies, [commentKey]: !s.openReplies[commentKey] } }));
      },
      setReplyDraft: (commentKey, v) => setState((s) => ({ ...s, replyDrafts: { ...s.replyDrafts, [commentKey]: v } })),
      // `commentKey` is now the comment's real Firestore document ID
      // (see loadComments/toComment in src/lib/commentsRepo.ts) rather
      // than the old `${recipeId}__${index}` synthetic key — replying is
      // only ever offered on the recipe currently open, so its id comes
      // from state.recipeId rather than needing its own parameter.
      postReply: (commentKey) => {
        const s = stateRef.current;
        if (!s.currentUser) return;
        const t = (s.replyDrafts[commentKey] || '').trim();
        if (!t) { flash('Write something first.'); return; }
        const recipeId = s.recipeId;
        const { uid, displayName } = s.currentUser;
        (async () => {
          try {
            await postReplyOp(recipeId, commentKey, uid, displayName, t);
            setState((s2) => ({
              ...s2,
              replyDrafts: { ...s2.replyDrafts, [commentKey]: '' },
              openReplies: { ...s2.openReplies, [commentKey]: false },
            }));
            loadCommentsForRecipe(recipeId);
            flash('Your reply has been added.');
          } catch (e) {
            console.error('[comments] reply failed', e);
            flash('Could not add your reply. Please try again.');
          }
        })();
      },
      toggleSelect,
      printPage: () => window.print(),
      openReport: () => setState((s) => ({ ...s, reportOpen: true })),
      closeReport: () => setState((s) => ({ ...s, reportOpen: false, reportText: '' })),
      setReportKind: (v) => setState((s) => ({ ...s, reportKind: v })),
      setReportText: (v) => setState((s) => ({ ...s, reportText: v })),
      sendReport: (id) => {
        const s = stateRef.current;
        if (!s.currentUser) { flash('Please sign in to send a report.'); return; }
        const r = s.recipes.find((x) => x.id === id);
        const reason = s.reportText.trim() || 'No detail given.';
        const kind = s.reportKind;
        const { uid, displayName } = s.currentUser;
        setState((s2) => ({ ...s2, reportOpen: false, reportText: '' }));
        (async () => {
          try {
            await createReport(id, r?.title || '', uid, displayName, kind, reason);
            refreshReportsNow();
            flash(kind === 'Should be taken down'
              ? 'Takedown request sent to the editors.'
              : 'Thank you — the editors will look at this correction.');
          } catch (e) {
            console.error('[reports] send failed', e);
            flash('Could not send your report. Please try again.');
          }
        })();
      },

      setFormField: setF,
      toggleFormTaste: (taste) => setState((s) => ({ ...s, form: { ...s.form, tastes: s.form.tastes.indexOf(taste) === -1 ? s.form.tastes.concat([taste]) : s.form.tastes.filter((x) => x !== taste) } })),
      setIngredient: (i, patch) => setState((s) => { const a = s.form.ingredients.slice(); a[i] = { ...a[i], ...patch }; return { ...s, form: { ...s.form, ingredients: a } }; }),
      toggleIngredientQb: (i) => setState((s) => { const a = s.form.ingredients.slice(); a[i] = { ...a[i], qb: !a[i].qb, q: '', u: '' }; return { ...s, form: { ...s.form, ingredients: a } }; }),
      addIngredient: () => setState((s) => ({ ...s, form: { ...s.form, ingredients: s.form.ingredients.concat([{ q: '', u: '', n: '' }]) } })),
      removeIngredient: (i) => setState((s) => ({ ...s, form: { ...s.form, ingredients: s.form.ingredients.filter((_, j) => j !== i) } })),
      setStepText: (i, text) => setState((s) => { const a = s.form.steps.slice(); a[i] = { ...a[i], text }; return { ...s, form: { ...s.form, steps: a } }; }),
      removeStep: (i) => setState((s) => ({ ...s, form: { ...s.form, steps: s.form.steps.filter((_, j) => j !== i) } })),
      addStep: () => setState((s) => ({ ...s, form: { ...s.form, steps: s.form.steps.concat([{ text: '', uses: [] }]) } })),
      toggleStepPhoto: (i) => setState((s) => { const a = s.form.steps.slice(); a[i] = { ...a[i], photo: !a[i].photo, photoId: a[i].photoId || `step-${s.draftId}-${i + 1}` }; return { ...s, form: { ...s.form, steps: a } }; }),
      addStepUse: (i, ingredientName) => setState((s) => {
        if (!ingredientName || ingredientName.indexOf('Add an ingredient') === 0) return s;
        const filledIng = s.form.ingredients.filter((x) => x.n.trim());
        const src = filledIng.find((x) => x.n === ingredientName) || { u: '', q: '', qb: false };
        const a = s.form.steps.slice();
        a[i] = { ...a[i], uses: a[i].uses.concat([{ q: src.qb ? '' : (src.q || ''), u: src.qb ? '' : (src.u || ''), n: ingredientName, qb: !!src.qb }]) };
        return { ...s, form: { ...s.form, steps: a } };
      }),
      setStepUseQty: (i, j, q) => setState((s) => { const a = s.form.steps.slice(); const us = a[i].uses.slice(); us[j] = { ...us[j], q }; a[i] = { ...a[i], uses: us }; return { ...s, form: { ...s.form, steps: a } }; }),
      removeStepUse: (i, j) => setState((s) => { const a = s.form.steps.slice(); a[i] = { ...a[i], uses: a[i].uses.filter((_, k) => k !== j) }; return { ...s, form: { ...s.form, steps: a } }; }),
      addPhoto: () => setState((s) => {
        const used = s.form.photos || [];
        if (used.length >= 3) return s;
        const next = [1, 2, 3].map((n) => `photo-${s.draftId}-${n}`).find((id) => used.indexOf(id) < 0);
        return next ? { ...s, form: { ...s.form, photos: used.concat([next]) } } : s;
      }),
      removePhoto: (i) => setState((s) => ({ ...s, form: { ...s.form, photos: s.form.photos.filter((_, j) => j !== i) } })),
      nextStep: () => {
        const s = stateRef.current;
        const filledIng = s.form.ingredients.filter((i) => i.n.trim());
        if (s.formStep === 1 && !s.form.title.trim()) { setState((s2) => ({ ...s2, formError: 'Please give the recipe a title before continuing.' })); return; }
        if (s.formStep === 2 && !filledIng.length) { setState((s2) => ({ ...s2, formError: 'Please list at least one ingredient before continuing.' })); return; }
        if (s.formStep === 2) {
          const stepsErr = stepsAndAmountsError(s.form);
          if (stepsErr) { setState((s2) => ({ ...s2, formError: stepsErr })); return; }
        }
        setState((s2) => ({ ...s2, formStep: s2.formStep + 1, formError: '' }));
        window.scrollTo(0, 0);
      },
      prevStep: () => setState((s) => ({ ...s, formStep: s.formStep - 1, formError: '' })),
      submitForm: () => {
        const s = stateRef.current;
        const form = s.form;
        const filledIng = form.ingredients.filter((i) => i.n.trim());
        const steps = form.steps.filter((st) => st.text.trim());
        if (!form.title.trim()) { setState((s2) => ({ ...s2, formStep: 1, formError: 'Please give the recipe a title.' })); return; }
        if (!filledIng.length) { setState((s2) => ({ ...s2, formStep: 2, formError: 'Please list at least one ingredient.' })); return; }
        const stepsErr = stepsAndAmountsError(form);
        if (stepsErr) { setState((s2) => ({ ...s2, formStep: 2, formError: stepsErr })); return; }
        if (!s.currentUser) { flash('Please sign in to submit a recipe.'); return; }
        const assignedCount = filledIng.length - filledIng.map((i) => i.n).filter((n) => !steps.some((st) => st.uses.some((u) => u.n === n))).length;
        const title = form.title.trim();
        const submitter = form.submitter.trim() || 'anonymous';
        const content = contentFromFormFields(
          formFields(form, s),
          `${filledIng.length} ingredients and ${steps.length} steps, with per-step amounts on ${assignedCount} of them. ${form.notes.trim() || 'No notes added.'}`,
          form.author.trim() ? '' : 'Needs checking: no author named.',
        );
        const owner = { uid: s.currentUser.uid, email: s.currentUser.email };
        (async () => {
          try {
            await createSubmission(owner, submitter, content);
            setState((s2) => ({ ...s2, formDone: true, lastTitle: title, formError: '' }));
            refreshSubmissionsNow();
          } catch (e) {
            console.error('[submissions] create failed', e);
            setState((s2) => ({ ...s2, formError: 'Could not send your recipe. Please try again.' }));
          }
        })();
        window.scrollTo(0, 0);
      },
      resetForm: () => {
        const name = me(stateRef.current).name;
        setState((s) => ({ ...s, formDone: false, formStep: 1, formError: '', form: freshForm(name), draftId: `d${Date.now()}` }));
      },
      cancelEdit: () => {
        const t = stateRef.current.editTarget;
        setState((s) => ({ ...s, editTarget: null, formStep: 1, formError: '',
          page: t && t.kind === 'recipe' ? 'recipe' : t && t.kind === 'mine' ? 'me' : 'admin',
          recipeId: t && t.kind === 'recipe' ? t.id : s.recipeId }));
        flash('Nothing was changed.');
        window.scrollTo(0, 0);
      },
      saveEdit: () => saveAmendment(false),
      saveEditAndPublish: () => saveAmendment(true),
      resubmitOwnSubmission,

      setCircleDraft: (v) => setState((s) => ({ ...s, circleDraft: v, circleError: '' })),
      addCircleEmail: () => {
        const s = stateRef.current;
        if (!s.currentUser) { setState((s2) => ({ ...s2, circleError: 'Please sign in first.' })); return; }
        const v = (s.circleDraft || '').trim().toLowerCase();
        if (!v || v.indexOf('@') < 1 || v.indexOf('.') < 0) { setState((s2) => ({ ...s2, circleError: 'Please write a full email address.' })); return; }
        if (s.circle.indexOf(v) >= 0) { setState((s2) => ({ ...s2, circleError: `${v} is already on the list.` })); return; }
        const next = s.circle.concat([v]);
        setMyCircleEmails(s.currentUser.uid, next)
          .then(() => {
            setState((s2) => ({ ...s2, circle: next, circleDraft: '', circleError: '' }));
            flash(`${v} can now see your inner-circle recipes.`);
            refreshRecipesNow();
          })
          .catch(() => setState((s2) => ({ ...s2, circleError: 'Could not save that just now. Please try again.' })));
      },
      removeCircleEmail: (email) => {
        const s = stateRef.current;
        if (!s.currentUser) return;
        const next = s.circle.filter((x) => x !== email);
        setMyCircleEmails(s.currentUser.uid, next)
          .then(() => {
            setState((s2) => ({ ...s2, circle: next }));
            flash(`${email} can no longer see your inner-circle recipes.`);
            refreshRecipesNow();
          })
          .catch(() => flash('Could not save that just now. Please try again.'));
      },
      discardOwnSubmission,

      setPantryQuery: (v) => setState((s) => ({ ...s, pantryQuery: v })),
      togglePantryOnly: () => setState((s) => ({ ...s, pantryOnlyComplete: !s.pantryOnlyComplete })),
      clearPantry: () => { setState((s) => ({ ...s, pantry: [] })); flash('Cupboard emptied.'); },
      togglePantryItem: (key) => setState((s) => ({ ...s, pantry: s.pantry.indexOf(key) >= 0 ? s.pantry.filter((x) => x !== key) : s.pantry.concat([key]) })),
      addToListFromCupboard: (id) => {
        const r = stateRef.current.recipes.find((x) => x.id === id);
        setState((s) => ({ ...s, selected: s.selected.indexOf(id) < 0 ? s.selected.concat([id]) : s.selected }));
        if (r) flash(`${r.title} added to your shopping list.`);
      },

      toggleTicked: (key) => setState((s) => ({ ...s, ticked: { ...s.ticked, [key]: !s.ticked[key] } })),
      clearTicks: () => setState((s) => ({ ...s, ticked: {} })),

      publishSubmission,
      loadIntoForm,
      pickQueueReason: (id, label) => setState((s) => {
        const reason = REJECT_REASONS.find((k) => k.label === label);
        return { ...s, queueReason: { ...s.queueReason, [id]: label }, queueNote: { ...s.queueNote, [id]: reason?.note || '' } };
      }),
      setQueueNote: (id, v) => setState((s) => ({ ...s, queueNote: { ...s.queueNote, [id]: v } })),
      approveSubmission: (id) => {
        const p = stateRef.current.pending.find((x) => x.id === id);
        if (p) publishSubmission(p);
      },
      rejectSubmission: (id) => decideSubmission(id, 'reject', 'pending'),
      resendSubmission: (id) => decideSubmission(id, 'revise', 'pending'),
      dropRejected: (id) => decideSubmission(id, 'reject', 'rejected'),
      dismissTakedown: (id) => {
        const s = stateRef.current;
        const closedBy = me(s).name || 'An editor';
        setState((s2) => ({ ...s2, takedowns: s2.takedowns.filter((x) => x.id !== id) }));
        dismissReport(id, closedBy)
          .then(() => flash('Report closed with a reply. The recipe stays as it is.'))
          .catch((e) => { console.error('[reports] dismiss failed', e); flash('Could not close that report. Please try again.'); refreshReportsNow(); });
      },
      removeTakedownRecipe: (id, recipeId) => {
        const s = stateRef.current;
        const t = s.takedowns.find((x) => x.id === id);
        const closedBy = me(s).name || 'An editor';
        setState((s2) => ({ ...s2, takedowns: s2.takedowns.filter((x) => x.id !== id) }));
        removeReportedRecipe(id, recipeId, closedBy)
          .then(() => { if (t) flash(`“${t.title}” has been deleted from the archive.`); refreshRecipesNow(); })
          .catch((e) => { console.error('[reports] recipe removal failed', e); flash('Could not delete that recipe. Please try again.'); refreshReportsNow(); });
      },
      fixTakedown: (recipeId, reportId) => {
        const r = stateRef.current.recipes.find((x) => x.id === recipeId);
        if (!r) { flash('That recipe is no longer in the archive.'); return; }
        loadIntoForm(r, 'recipe', reportId);
      },

      toggleFaq: (id) => setState((s) => ({ ...s, openQ: s.openQ === id ? null : id })),
      setAskKind: (v) => setState((s) => ({ ...s, askKind: v })),
      setAskSubject: (v) => setState((s) => ({ ...s, askSubject: v })),
      setAskText: (v) => setState((s) => ({ ...s, askText: v })),
      sendAsk: () => {
        const s = stateRef.current;
        const text = s.askText.trim();
        if (text.length < 10) { setState((s2) => ({ ...s2, askError: 'Write a line or two so an editor can answer properly.' })); return; }
        if (!s.currentUser) { setState((s2) => ({ ...s2, askError: 'Please sign in to send this.' })); return; }
        const subject = s.askSubject.trim() || text.split(/\s+/).slice(0, 6).join(' ');
        const kind = s.askKind;
        const { uid, displayName } = s.currentUser;
        setState((s2) => ({ ...s2, askSubject: '', askText: '', askError: '' }));
        (async () => {
          try {
            await createAsk(uid, displayName, kind, subject, text);
            refreshAsksNow();
            flash('Sent to the editors. The reply will appear on your page.');
          } catch (e) {
            console.error('[asks] send failed', e);
            flash('Could not send your question. Please try again.');
          }
        })();
      },
      setAdminAskDraft: (id, v) => setState((s) => ({ ...s, askReply: { ...s.askReply, [id]: v } })),
      toggleAdminAskPublish: (id) => setState((s) => {
        const ask = s.asks.find((a) => a.id === id);
        const current = s.askPublish[id] === undefined ? !!ask?.published : s.askPublish[id];
        return { ...s, askPublish: { ...s.askPublish, [id]: !current } };
      }),
      sendAdminAskReply: (id) => {
        const s = stateRef.current;
        const a = s.asks.find((x) => x.id === id);
        if (!a) return;
        const draft = s.askReply[id] === undefined ? a.reply : s.askReply[id];
        const willPublish = s.askPublish[id] === undefined ? a.published : s.askPublish[id];
        if (!draft.trim()) { flash('Write the reply first.'); return; }
        const repliedBy = me(s).name || 'An editor';
        replyToAsk(id, repliedBy, draft.trim(), !!willPublish)
          .then(() => {
            refreshAsksNow();
            flash(willPublish ? `Reply sent to ${a.by} and published on the questions page.` : `Reply sent to ${a.by}.`);
          })
          .catch((e) => { console.error('[asks] reply failed', e); flash('Could not send that reply. Please try again.'); });
      },
      unpublishAdminAsk: (id) => {
        const a = stateRef.current.asks.find((x) => x.id === id);
        if (!a) return;
        setAskPublished(id, !a.published)
          .then(() => { refreshAsksNow(); flash(a.published ? 'Taken off the questions page.' : 'Published on the questions page.'); })
          .catch((e) => { console.error('[asks] publish toggle failed', e); flash('Could not update that. Please try again.'); });
      },
      closeAdminAsk: (id) => {
        closeAsk(id)
          .then(() => { refreshAsksNow(); flash('Closed without a reply.'); })
          .catch((e) => { console.error('[asks] close failed', e); flash('Could not close that. Please try again.'); });
      },
    };
  }, [flash, applyRecipesFor, applySubmissionsFor, applyReportsFor, applyAsksFor, applyEditorsFor]);

  // The single source of truth for signed-in state. Fires on explicit
  // sign-in/sign-up/sign-out AND on a silent session restore when the
  // page loads with an existing Firebase session — pendingIntentRef is
  // how we tell those apart, so a page refresh never re-triggers a
  // "Signed in as…" toast or an unwanted redirect.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        const intent = pendingIntentRef.current;
        pendingIntentRef.current = null;
        setState((s) => ({ ...s, currentUser: null, signedIn: false, role: 'reader', authLoading: false }));
        applyRecipesFor({ signedIn: false, role: 'reader', uid: null, email: null });
        applySubmissionsFor({ signedIn: false, role: 'reader', uid: null, email: null });
        applyReportsFor({ signedIn: false, role: 'reader', uid: null, email: null });
        applyAsksFor({ signedIn: false, role: 'reader', uid: null, email: null });
        applyEditorsFor({ signedIn: false, role: 'reader', uid: null, email: null });
        if (intent?.type === 'signout') {
          setState((s) => ({
            ...s, page: 'home', signPass: '', pendingPage: '', signName: '', signEmail: '', myRatings: {},
            // The contribute form and the editor's per-submission review
            // drafts are scoped to whoever is signed in — without this, a
            // second account signing in on the same tab could see the
            // previous account's "sent for review" confirmation (title and
            // all) or half-picked reject reasons.
            formDone: false, formStep: 1, formError: '', lastTitle: '', editTarget: null,
            form: freshForm(), draftId: `d${Date.now()}`, queueReason: {}, queueNote: {},
            // The inner circle is real Firestore state now (see
            // src/lib/usersRepo.ts), but state.circle is still just a
            // local cache of it — cleared here so a second account
            // signing in on the same tab doesn't briefly show the
            // previous account's circle list under "My inner circle"
            // before its own profile has loaded.
            circle: [], circleDraft: '', circleError: '',
          }));
          actions.flash('Signed out. You can still search, read and print.');
        }
        return;
      }

      setState((s) => ({ ...s, authLoading: true }));
      const intent = pendingIntentRef.current;
      pendingIntentRef.current = null;

      fetchUserProfile(user.uid, intent?.type === 'signup').then((result) => {
        if (result.ok) {
          const cu = result.profile;
          setState((s) => ({
            ...s, currentUser: cu, signedIn: true, role: cu.role, authLoading: false, signName: cu.displayName,
            // Inner circle now lives on the user's own profile doc — see
            // src/lib/usersRepo.ts. Populated fresh on every sign-in
            // rather than trusted from whatever was left over locally.
            circle: cu.circleEmails, circleDraft: '', circleError: '',
          }));
          applyRecipesFor({ signedIn: true, role: cu.role, uid: cu.uid, email: cu.email });
          applySubmissionsFor({ signedIn: true, role: cu.role, uid: cu.uid, email: cu.email });
          applyReportsFor({ signedIn: true, role: cu.role, uid: cu.uid, email: cu.email });
          applyAsksFor({ signedIn: true, role: cu.role, uid: cu.uid, email: cu.email });
          applyEditorsFor({ signedIn: true, role: cu.role, uid: cu.uid, email: cu.email });
          if (intent?.type === 'signup') {
            setState((s) => ({ ...s, pendingPage: '', page: intent.pendingPage || 'me' }));
            actions.flash(`Account created. You are signed in as ${cu.displayName}.`);
            window.scrollTo(0, 0);
          } else if (intent?.type === 'signin') {
            const dest: PageKey = intent.pendingPage || (cu.role === 'editor' ? 'admin' : 'me');
            setState((s) => ({ ...s, pendingPage: '', page: dest }));
            actions.flash(`Signed in as ${cu.displayName} (${cu.role}).`);
            window.scrollTo(0, 0);
          }
          return;
        }

        // Authenticated with Firebase, but users/{uid} could not be read
        // or genuinely doesn't exist — do NOT assume a role. Sign back
        // out so the app doesn't sit in a signed-in-but-unknown-role
        // state, and say so plainly.
        if (intent) {
          setState((s) => ({ ...s, signError: 'We could not load your account profile. Please try again, or contact an editor if this keeps happening.' }));
        }
        actions.flash('We could not load your account profile. Please try signing in again.');
        firebaseSignOut(auth).catch(() => {});
      });
    });
    return unsubscribe;
  }, [actions, applyRecipesFor, applySubmissionsFor, applyReportsFor, applyAsksFor, applyEditorsFor]);

  const value = useMemo(() => ({ state, actions }), [state, actions]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppStateProvider');
  return ctx;
}

// Convenience: current signed-in (or anonymous) person.
export { me as currentPerson } from './selectors';
export type { Access };
