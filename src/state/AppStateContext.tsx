import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppState, Access, PageKey, PendingSubmission, RejectedSubmission, FormState } from '../types';
import { initialAppState, freshForm } from './initialState';
import { REJECT_REASONS } from '../data/reasons';
import { TODAY } from '../data/taxonomy';
import { me, myEmail, accessOf } from './selectors';

// Pages that hold information about a specific person need an account; the
// queue additionally needs the editor role. Everything else is open.
function needsAccount(page: PageKey): boolean {
  return page === 'me' || page === 'admin' || page === 'contribute';
}

export interface AppActions {
  go(page: PageKey): void;
  openRecipe(id: string): void;
  flash(msg: string): void;

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
  demoteEditor(email: string): void;

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

  // ── my page ──
  setCircleDraft(v: string): void;
  addCircleEmail(): void;
  removeCircleEmail(email: string): void;

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
  loadIntoForm(src: PendingSubmission | AppState['recipes'][number], kind: 'pending' | 'recipe', reportId?: string | null): void;
  pickQueueReason(id: string, label: string): void;
  setQueueNote(id: string, v: string): void;
  approveSubmission(id: string): void;
  rejectSubmission(id: string): void;
  resendSubmission(id: string): void;
  requeueRejected(id: string): void;
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

  const actions = useMemo<AppActions>(() => {
    const flash = (msg: string) => {
      setState((s) => ({ ...s, toast: msg }));
      window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => setState((s) => ({ ...s, toast: '' })), 2600);
    };

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

    const openRecipe = (id: string) => {
      setState((s) => ({ ...s, page: 'recipe', recipeId: id, commentDraft: '' }));
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
          language: anySrc.language || 'English',
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

    // The form's fields, cleaned up into the shape a submission or recipe uses.
    const formFields = (form: FormState, s: AppState) => {
      const filled = form.ingredients.filter((i) => i.n.trim());
      const steps = form.steps.filter((st) => st.text.trim());
      return {
        title: form.title.trim(), author: form.author.trim() || 'unknown',
        submitter: form.submitter.trim() || 'anonymous',
        nationality: form.nationality.trim() || 'Not given', meal: form.meal,
        language: form.language,
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

    const publishSubmission = (p: PendingSubmission) => {
      setState((s) => ({
        ...s,
        recipes: s.recipes.concat([{
          id: p.id.replace('p-', 'r-'), title: p.title, author: p.author, submitter: p.submitter,
          nationality: p.nationality, meal: p.meal, language: p.language || 'English', tastes: p.tastes, time: p.time,
          difficulty: p.difficulty, rating: 0, votes: 0, date: TODAY, portions: p.portions,
          source: p.source, blurb: p.blurb || p.summary, notes: p.notes || '',
          access: p.access || 'public', ownerEmail: p.ownerEmail || '',
          ingredients: p.ingredients?.length ? p.ingredients : [{ q: 0, u: '', n: 'See submitted sheet' }],
          steps: p.steps?.length ? p.steps : ['Method as submitted by the contributor.'],
          uses: p.uses || [], comments: [],
          photos: p.photos || [], stepPhotos: p.stepPhotos || [], photoKey: p.photoKey || '',
        }]),
        pending: s.pending.filter((x) => x.id !== p.id),
        rejected: s.rejected.filter((x) => x.id !== p.id),
      }));
      flash(`“${p.title}” is now live in the archive.`);
    };

    // reject → gone from the site; revise → waits in Pending revision.
    const closeSubmission = (id: string, mode: 'reject' | 'revise') => {
      const s = stateRef.current;
      const p = s.pending.find((x) => x.id === id);
      if (!p) return;
      const reason = s.queueReason[id];
      if (!reason) { flash('Choose a reason first.'); return; }
      const note = (s.queueNote[id] || '').trim();
      const clear = (obj: Record<string, string>) => { const o = { ...obj }; delete o[id]; return o; };
      if (mode === 'reject') {
        setState((s2) => ({ ...s2, pending: s2.pending.filter((x) => x.id !== id), queueReason: clear(s2.queueReason), queueNote: clear(s2.queueNote) }));
        flash(`“${p.title}” rejected — ${reason.toLowerCase()}. ${p.submitter} has been told why.`);
        return;
      }
      const entry: RejectedSubmission = { ...p, status: 'Pending revision', reason, note, rejectedOn: TODAY, by: 'You' };
      setState((s2) => ({ ...s2, pending: s2.pending.filter((x) => x.id !== id),
        rejected: s2.rejected.filter((x) => x.id !== id).concat([entry]),
        queueReason: clear(s2.queueReason), queueNote: clear(s2.queueNote) }));
      flash(`Sent back to ${p.submitter} to revise. It waits in Pending revision.`);
    };

    const saveAmendment = (publishAfter: boolean) => {
      const s = stateRef.current;
      const t = s.editTarget;
      if (!t) return;
      const form = s.form;
      if (!form.title.trim()) { setState((s2) => ({ ...s2, formStep: 1, formError: 'The recipe still needs a title.' })); return; }
      const v = formFields(form, s);
      if (!v.ingCount) { setState((s2) => ({ ...s2, formStep: 2, formError: 'Leave at least one ingredient on the list.' })); return; }
      if (t.kind === 'recipe') {
        setState((s2) => ({
          ...s2,
          recipes: s2.recipes.map((r) => (r.id === t.id ? { ...r, ...v, blurb: r.blurb, editedOn: TODAY, editedBy: 'You' } : r)),
          takedowns: t.reportId ? s2.takedowns.filter((x) => x.id !== t.reportId) : s2.takedowns,
          editTarget: null, formStep: 1, formError: '', page: 'recipe', recipeId: t.id,
        }));
        flash(`New version of “${v.title}” saved.${t.reportId ? ' The reader who reported it has been told.' : ''}`);
        window.scrollTo(0, 0);
        return;
      }
      const base = s.pending.find((x) => x.id === t.id) || ({ id: t.id } as PendingSubmission);
      const updated: PendingSubmission = { ...base, ...v,
        ownerEmail: base.ownerEmail || v.ownerEmail,
        summary: `${v.ingCount} ingredients and ${v.stepCount} steps. ${v.notes || 'No notes added.'}`,
        flag: 'Amended by an editor.' };
      setState((s2) => ({ ...s2, pending: s2.pending.map((x) => (x.id === t.id ? updated : x)),
        editTarget: null, formStep: 1, formError: '', page: 'admin' }));
      if (publishAfter) publishSubmission(updated);
      else flash(`Your changes to “${v.title}” are saved. It is still waiting for approval.`);
      window.scrollTo(0, 0);
    };

    return {
      go, openRecipe, flash,

      setSignName: (v) => setState((s) => ({ ...s, signName: v })),
      setSignEmail: (v) => setState((s) => ({ ...s, signEmail: v })),
      setSignPass: (v) => setState((s) => ({ ...s, signPass: v })),
      toCreate: () => setState((s) => ({ ...s, signMode: 'new', signRole: 'reader', signError: '', signPass: '' })),
      toSignIn: () => setState((s) => ({ ...s, signMode: 'in', signError: '', signPass: '' })),
      pickSignRole: (role) => setState((s) => ({ ...s, signRole: role, signError: '' })),
      doSignIn: () => {
        const s = stateRef.current;
        const email = s.signEmail.trim().toLowerCase();
        const name = s.signName.trim();
        if (!name) { setState((s2) => ({ ...s2, signError: 'Give the name your notes should be signed with.' })); return; }
        if (email.indexOf('@') < 1) { setState((s2) => ({ ...s2, signError: 'That email address does not look complete.' })); return; }
        if (s.signPass.length < 8) { setState((s2) => ({ ...s2, signError: 'The password needs at least eight characters.' })); return; }
        const found = s.accounts.find((a) => a.email === email);
        if (s.signMode === 'new') {
          if (found) { setState((s2) => ({ ...s2, signMode: 'in', signError: 'There is already an account with that email. Sign in instead.' })); return; }
          setState((s2) => ({ ...s2, accounts: s2.accounts.concat([{ email, pass: s2.signPass, name, role: 'reader', joined: TODAY }]),
            signedIn: true, role: 'reader', signMode: 'in', signError: '', signPass: '',
            myRatings: {}, circle: [], circleDraft: '', circleError: '',
            pendingPage: '', page: s2.pendingPage || 'me' }));
          window.scrollTo(0, 0);
          flash(`Account created. You are signed in as ${name}.`);
          return;
        }
        if (!found) { setState((s2) => ({ ...s2, signError: 'There is no account with that email address yet. Choose “Create an account” and you will be given a reader account.' })); return; }
        if (found.pass !== s.signPass) { setState((s2) => ({ ...s2, signError: 'That password does not match the account.' })); return; }
        if (s.signRole === 'editor' && found.role !== 'editor') { setState((s2) => ({ ...s2, signError: 'That is a reader account. Editor accounts are given out by the editors themselves.' })); return; }
        const dest: PageKey = s.pendingPage || (found.role === 'editor' ? 'admin' : 'me');
        setState((s2) => ({ ...s2, signedIn: true, role: found.role, signName: found.name, signError: '', signPass: '',
          myRatings: {}, circle: found.seed ? ['marek@example.pt', 'diogo@example.pt'] : [],
          circleDraft: '', circleError: '', pendingPage: '', page: dest }));
        window.scrollTo(0, 0);
        flash(`Signed in as ${found.name}.`);
      },
      signOut: () => {
        setState((s) => ({ ...s, signedIn: false, role: 'reader', page: 'home', signPass: '', pendingPage: '',
          signName: '', signEmail: '', myRatings: {} }));
        flash('Signed out. You can still search, read and print.');
      },
      setEditorDraft: (v) => setState((s) => ({ ...s, editorDraft: v, editorError: '' })),
      addEditor: () => {
        const s = stateRef.current;
        const v = (s.editorDraft || '').trim().toLowerCase();
        if (!v) { setState((s2) => ({ ...s2, editorError: 'Write the email address of the account first.' })); return; }
        const found = s.accounts.find((a) => a.email.toLowerCase() === v);
        if (!found) { setState((s2) => ({ ...s2, editorError: `No account here uses ${v}. They have to sign up before they can be made an editor.` })); return; }
        if (found.role === 'editor') { setState((s2) => ({ ...s2, editorError: `${found.name} is already an editor.` })); return; }
        setState((s2) => ({ ...s2, accounts: s2.accounts.map((x) => (x.email === found.email ? { ...x, role: 'editor' } : x)), editorDraft: '', editorError: '' }));
        flash(`${found.name} is now an editor.`);
      },
      demoteEditor: (email) => {
        const acc = stateRef.current.accounts.find((a) => a.email === email);
        setState((s) => ({ ...s, accounts: s.accounts.map((x) => (x.email === email ? { ...x, role: 'reader' } : x)) }));
        if (acc) flash(`${acc.name} is a reader again.`);
      },

      setFilter,
      toggleTasteFilter: (taste) => setState((s) => {
        const list = s.f.tasteList || [];
        return { ...s, f: { ...s.f, tasteList: list.indexOf(taste) === -1 ? list.concat([taste]) : list.filter((x) => x !== taste) } };
      }),
      clearFilters: () => setState((s) => ({ ...s, f: { q: '', nationality: 'All', meal: 'All', language: 'All', author: 'All', since: 'Any time', rating: 'Any', time: 'Any', difficulty: 'Any', sort: 'Highest rated', tasteList: [] } })),

      incPortions: (id, base) => setState((s) => ({ ...s, portionsById: { ...s.portionsById, [id]: Math.min(24, (s.portionsById[id] || base) + 1) } })),
      decPortions: (id, base) => setState((s) => ({ ...s, portionsById: { ...s.portionsById, [id]: Math.max(1, (s.portionsById[id] || base) - 1) } })),
      setMyRating: (id, n) => {
        setState((s) => ({ ...s, myRatings: { ...s.myRatings, [id]: n } }));
        flash(`Rating saved — ${n} out of 5. No note needed.`);
      },
      clearMyRating: (id) => {
        setState((s) => { const m = { ...s.myRatings }; delete m[id]; return { ...s, myRatings: m }; });
        flash('Your rating has been removed.');
      },
      setCommentDraft: (v) => setState((s) => ({ ...s, commentDraft: v })),
      postComment: (id) => {
        const s = stateRef.current;
        const t = s.commentDraft.trim();
        if (!t) { flash('Write something first.'); return; }
        setState((s2) => ({ ...s2, extraComments: { ...s2.extraComments, [id]: (s2.extraComments[id] || []).concat([{ by: me(s2).name, when: 'just now', text: t, rating: s2.myRatings[id] || 0 }]) }, commentDraft: '' }));
        flash('Your note has been added.');
      },
      toggleReplyBox: (commentKey) => {
        if (!stateRef.current.signedIn) return;
        setState((s) => ({ ...s, openReplies: { ...s.openReplies, [commentKey]: !s.openReplies[commentKey] } }));
      },
      setReplyDraft: (commentKey, v) => setState((s) => ({ ...s, replyDrafts: { ...s.replyDrafts, [commentKey]: v } })),
      postReply: (commentKey) => {
        const s = stateRef.current;
        if (!s.signedIn) return;
        const t = (s.replyDrafts[commentKey] || '').trim();
        if (!t) { flash('Write something first.'); return; }
        setState((s2) => ({
          ...s2,
          commentReplies: { ...s2.commentReplies, [commentKey]: (s2.commentReplies[commentKey] || []).concat([{ by: me(s2).name, when: 'just now', text: t }]) },
          replyDrafts: { ...s2.replyDrafts, [commentKey]: '' },
          openReplies: { ...s2.openReplies, [commentKey]: false },
        }));
        flash('Your reply has been added.');
      },
      toggleSelect,
      printPage: () => window.print(),
      openReport: () => setState((s) => ({ ...s, reportOpen: true })),
      closeReport: () => setState((s) => ({ ...s, reportOpen: false, reportText: '' })),
      setReportKind: (v) => setState((s) => ({ ...s, reportKind: v })),
      setReportText: (v) => setState((s) => ({ ...s, reportText: v })),
      sendReport: (id) => {
        const s = stateRef.current;
        const r = s.recipes.find((x) => x.id === id);
        const reason = s.reportText.trim() || 'No detail given.';
        const kind = s.reportKind;
        setState((s2) => ({ ...s2, reportOpen: false, reportText: '',
          takedowns: s2.takedowns.concat([{ id: `t${Date.now()}`, recipeId: id, title: r?.title || '', by: me(s2).name || 'A reader', kind, reason }]) }));
        flash(kind === 'Should be taken down'
          ? 'Takedown request sent to the editors.'
          : 'Thank you — the editors will look at this correction.');
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
        const assignedCount = filledIng.length - filledIng.map((i) => i.n).filter((n) => !steps.some((st) => st.uses.some((u) => u.n === n))).length;
        const entry: PendingSubmission = {
          id: `p-${Date.now()}`, title: form.title.trim(), author: form.author.trim() || 'unknown',
          submitter: form.submitter.trim() || 'anonymous', nationality: form.nationality.trim() || 'Not given',
          meal: form.meal, language: form.language, tastes: form.tastes.length ? form.tastes : ['Not given'],
          time: Number(form.time) || 30, difficulty: Number(form.difficulty) || 2,
          portions: Number(form.portions) || 4, source: form.source.trim(), wait: 'Submitted just now',
          access: form.access || 'public', ownerEmail: myEmail(s),
          summary: `${filledIng.length} ingredients and ${steps.length} steps, with per-step amounts on ${assignedCount} of them. ${form.notes.trim() || 'No notes added.'}`,
          flag: form.author.trim() ? '' : 'Needs checking: no author named.',
          ingredients: filledIng.map((i) => (i.qb ? { q: 0, u: '', n: i.n, qb: true } : { q: parseFloat(i.q) || 0, u: i.u, n: i.n })),
          steps: steps.map((st) => st.text.trim()),
          uses: steps.map((st) => (st.uses || []).map((u) => (u.qb ? { q: 0, u: '', n: u.n, qb: true } : { q: parseFloat(u.q) || 0, u: u.u, n: u.n }))),
          notes: form.notes.trim(),
          photos: (form.photos || []).slice(0, 3),
          stepPhotos: steps.map((st, i) => (st.photo ? (st.photoId || `step-${s.draftId}-${i + 1}`) : '')),
          photoKey: s.draftId,
          blurb: form.notes.trim() || `Submitted by ${form.submitter.trim() || 'a reader'}.`,
        };
        setState((s2) => ({ ...s2, pending: s2.pending.concat([entry]), formDone: true, lastTitle: entry.title, formError: '' }));
        window.scrollTo(0, 0);
      },
      resetForm: () => {
        const name = me(stateRef.current).name;
        setState((s) => ({ ...s, formDone: false, formStep: 1, formError: '', form: freshForm(name), draftId: `d${Date.now()}` }));
      },
      cancelEdit: () => {
        const t = stateRef.current.editTarget;
        setState((s) => ({ ...s, editTarget: null, formStep: 1, formError: '',
          page: t && t.kind === 'recipe' ? 'recipe' : 'admin',
          recipeId: t && t.kind === 'recipe' ? t.id : s.recipeId }));
        flash('Nothing was changed.');
        window.scrollTo(0, 0);
      },
      saveEdit: () => saveAmendment(false),
      saveEditAndPublish: () => saveAmendment(true),

      setCircleDraft: (v) => setState((s) => ({ ...s, circleDraft: v, circleError: '' })),
      addCircleEmail: () => {
        const s = stateRef.current;
        const v = (s.circleDraft || '').trim().toLowerCase();
        if (!v || v.indexOf('@') < 1 || v.indexOf('.') < 0) { setState((s2) => ({ ...s2, circleError: 'Please write a full email address.' })); return; }
        if (s.circle.indexOf(v) >= 0) { setState((s2) => ({ ...s2, circleError: `${v} is already on the list.` })); return; }
        setState((s2) => ({ ...s2, circle: s2.circle.concat([v]), circleDraft: '', circleError: '' }));
        flash(`${v} can now see your inner-circle recipes.`);
      },
      removeCircleEmail: (email) => {
        setState((s) => ({ ...s, circle: s.circle.filter((x) => x !== email) }));
        flash(`${email} can no longer see your inner-circle recipes.`);
      },

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
      rejectSubmission: (id) => closeSubmission(id, 'reject'),
      resendSubmission: (id) => closeSubmission(id, 'revise'),
      requeueRejected: (id) => {
        const p = stateRef.current.rejected.find((x) => x.id === id);
        if (!p) return;
        setState((s) => ({ ...s, rejected: s.rejected.filter((x) => x.id !== id),
          pending: s.pending.concat([{ ...p, wait: 'Revised copy received today', flag: `Revised after: ${p.reason}` }]) }));
        flash(`“${p.title}” is back in Waiting for approval for a second read.`);
      },
      dropRejected: (id) => {
        const p = stateRef.current.rejected.find((x) => x.id === id);
        setState((s) => ({ ...s, rejected: s.rejected.filter((x) => x.id !== id) }));
        if (p) flash(`“${p.title}” closed. ${p.submitter} has been told.`);
      },
      dismissTakedown: (id) => { setState((s) => ({ ...s, takedowns: s.takedowns.filter((x) => x.id !== id) })); flash('Report closed with a reply. The recipe stays as it is.'); },
      removeTakedownRecipe: (id, recipeId) => {
        const t = stateRef.current.takedowns.find((x) => x.id === id);
        setState((s) => ({ ...s, takedowns: s.takedowns.filter((x) => x.id !== id), recipes: s.recipes.filter((x) => x.id !== recipeId) }));
        if (t) flash(`“${t.title}” has been deleted from the archive.`);
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
        const subject = s.askSubject.trim() || text.split(/\s+/).slice(0, 6).join(' ');
        setState((s2) => ({ ...s2, askSubject: '', askText: '', askError: '',
          asks: s2.asks.concat([{ id: `a${Date.now()}`, kind: s2.askKind, subject, text, by: me(s2).name, sentOn: TODAY, status: 'Waiting', reply: '', repliedBy: '', repliedOn: '', published: false }]) }));
        flash('Sent to the editors. The reply will appear on your page.');
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
        setState((s2) => ({ ...s2, asks: s2.asks.map((x) => (x.id === id ? { ...x, status: 'Answered', reply: draft.trim(), repliedBy: 'Editor Whitcombe', repliedOn: TODAY, published: !!willPublish } : x)) }));
        flash(willPublish
          ? `Reply sent to ${a.by} and published on the questions page.`
          : `Reply sent to ${a.by}.`);
      },
      unpublishAdminAsk: (id) => {
        const a = stateRef.current.asks.find((x) => x.id === id);
        setState((s) => ({ ...s, asks: s.asks.map((x) => (x.id === id ? { ...x, published: !x.published } : x)), askPublish: { ...s.askPublish, [id]: a ? !a.published : true } }));
        if (a) flash(a.published ? 'Taken off the questions page.' : 'Published on the questions page.');
      },
      closeAdminAsk: (id) => {
        setState((s) => ({ ...s, asks: s.asks.map((x) => (x.id === id ? { ...x, status: 'Closed' } : x)) }));
        flash('Closed without a reply.');
      },
    };
  }, []);

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
