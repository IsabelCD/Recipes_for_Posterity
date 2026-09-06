export type Access = 'public' | 'circle' | 'owner';
export type Role = 'reader' | 'editor';

export interface Ingredient {
  q: number;
  u: string;
  n: string;
  qb?: boolean;
}

export interface RecipeComment {
  by: string;
  when: string;
  text: string;
  rating?: number;
  // Present only for a Firestore-backed comment (Phase 3+) — its real
  // document ID, used to key its replies and drafts. Absent on the
  // recipe's seeded `comments` array, which has no document behind it
  // and so cannot receive new replies.
  id?: string;
}

export interface CommentReply {
  by: string;
  when: string;
  text: string;
  id?: string;
}

export interface Recipe {
  id: string;
  title: string;
  author: string;
  submitter: string;
  nationality: string;
  meal: string;
  tastes: string[];
  time: number;
  difficulty: number;
  rating: number;
  votes: number;
  date: string;
  portions: number;
  source: string;
  blurb: string;
  notes: string;
  ingredients: Ingredient[];
  steps: string[];
  uses: Ingredient[][];
  comments: RecipeComment[];
  access?: Access;
  ownerUid?: string | null;
  ownerEmail?: string;
  circleEmails?: string[];
  photos?: string[];
  stepPhotos?: string[];
  photoKey?: string;
  editedOn?: string;
  editedBy?: string;
}

export interface PendingSubmission {
  id: string;
  title: string;
  author: string;
  submitter: string;
  nationality: string;
  meal: string;
  tastes: string[];
  time: number;
  difficulty: number;
  portions: number;
  source: string;
  wait: string;
  summary: string;
  flag: string;
  ingredients: Ingredient[];
  steps: string[];
  uses: Ingredient[][];
  access?: Access;
  ownerUid?: string;
  ownerEmail?: string;
  notes?: string;
  blurb?: string;
  photos?: string[];
  stepPhotos?: string[];
  photoKey?: string;
}

export interface RejectedSubmission extends PendingSubmission {
  status: string;
  reason: string;
  note: string;
  rejectedOn: string;
  by: string;
}

// A submission's real state in Firestore — see src/lib/submissionsRepo.ts.
// 'pending' waits in the editor queue; 'needs_revision' has been sent back
// to the submitter to fix; 'rejected' is a terminal editor decision the
// submitter may still discard. Nothing is ever silently deleted by an
// editor — only the owner discards a needs_revision/rejected submission.
export type SubmissionStatus = 'pending' | 'needs_revision' | 'rejected';

// The single Firestore-backed shape used everywhere a submission is read
// as "my own", across all three statuses — MyPage filters one array of
// these into its buckets instead of trusting a submitter-name string
// match. The editor's moderation queue (state.pending / state.rejected)
// still uses PendingSubmission/RejectedSubmission, unchanged, since that
// UI already branches on which array an item is in rather than a status
// field.
export interface Submission extends PendingSubmission {
  ownerUid: string;
  status: SubmissionStatus;
  reason?: string;
  note?: string;
  decidedBy?: string;
  decidedOn?: string;
}

// A real users/{uid} account, as looked up or listed by an editor
// managing roles — see src/lib/usersRepo.ts's findUserByEmail/queryEditors.
export interface EditorAccount {
  uid: string;
  displayName: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface Ask {
  id: string;
  kind: string;
  subject: string;
  by: string;
  sentOn: string;
  text: string;
  status: 'Waiting' | 'Answered' | 'Closed';
  reply: string;
  repliedBy: string;
  repliedOn: string;
  published: boolean;
}

export interface Takedown {
  id: string;
  recipeId: string;
  title: string;
  by: string;
  kind: string;
  reason: string;
}

export interface FaqItem {
  id: string;
  q: string;
  a: string;
}

export interface FaqGroup {
  heading: string;
  items: FaqItem[];
}

export interface RejectReason {
  label: string;
  note: string;
}

export interface ReportKind {
  label: string;
  hint: string;
  placeholder: string;
}

export interface FormIngredient {
  q: string;
  u: string;
  n: string;
  qb?: boolean;
}

export interface FormUse {
  q: string;
  u: string;
  n: string;
  qb?: boolean;
}

export interface FormStep {
  text: string;
  uses: FormUse[];
  photo?: boolean;
  photoId?: string;
}

export interface FormState {
  title: string;
  author: string;
  submitter: string;
  source: string;
  nationality: string;
  meal: string;
  tastes: string[];
  portions: number | string;
  time: number | string;
  difficulty: number | string;
  notes: string;
  access: Access;
  ingredients: FormIngredient[];
  steps: FormStep[];
  photos: string[];
}

export interface Filters {
  q: string;
  nationality: string;
  meal: string;
  author: string;
  since: string;
  rating: string;
  time: string;
  difficulty: string;
  sort: string;
  tasteList: string[];
}

export type EditTarget = {
  // 'pending' — an editor amending someone else's queued submission.
  // 'mine' — the owning reader editing their own needs_revision submission
  // to resubmit it. 'recipe' — amending an already-published recipe.
  kind: 'pending' | 'mine' | 'recipe';
  id: string;
  title: string;
  reportId: string | null;
} | null;

export type PageKey =
  | 'signin' | 'home' | 'search' | 'recipe' | 'contribute'
  | 'list' | 'me' | 'cupboard' | 'about' | 'faq' | 'admin';

export interface Me {
  name: string;
  joined: string;
  ratingsGiven: Record<string, number>;
}

// The signed-in identity, sourced from Firebase Auth + the user's own
// users/{uid} Firestore doc. Firestore's `role` is the single source of
// truth for authorization — see src/state/AppStateContext.tsx.
export interface CurrentUser {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  createdAt: string;
  circleEmails: string[];
}

export interface AppState {
  page: PageKey;
  recipeId: string;
  signedIn: boolean;
  role: Role;
  currentUser: CurrentUser | null;
  authLoading: boolean;
  pendingPage: PageKey | '';
  signRole: Role;
  signMode: 'in' | 'new';
  // The Admin page's real, Firestore-backed list of current editors — see
  // src/lib/usersRepo.ts's queryEditors. Only ever populated for a
  // signed-in editor; firestore.rules' users/{userId} list rule would
  // reject the underlying query for anyone else.
  editors: EditorAccount[];
  signName: string;
  signEmail: string;
  signPass: string;
  signError: string;
  editorDraft: string;
  editorError: string;
  recipes: Recipe[];
  recipesLoading: boolean;
  // The editor moderation queue — everyone's pending/needs_revision
  // submissions. Only ever populated for a signed-in editor; Firestore
  // rules would reject the underlying query for anyone else. See
  // src/lib/submissionsRepo.ts.
  pending: PendingSubmission[];
  // The current reader's OWN submissions, any status — used by MyPage.
  // Loaded via where('ownerUid','==',uid), which is what a reader is
  // actually allowed to query.
  mySubmissions: Submission[];
  submissionsLoading: boolean;
  // The editor moderation queue for reports — open ones only, everyone's.
  // Only ever populated for a signed-in editor. See src/lib/reportsRepo.ts.
  takedowns: Takedown[];
  f: Filters;
  circle: string[];
  circleDraft: string;
  circleError: string;
  myRatings: Record<string, number>;
  extraComments: Record<string, RecipeComment[]>;
  commentReplies: Record<string, CommentReply[]>;
  replyDrafts: Record<string, string>;
  openReplies: Record<string, boolean>;
  commentDraft: string;
  portionsById: Record<string, number>;
  pantry: string[];
  pantryQuery: string;
  pantryOnlyComplete: boolean;
  rejected: RejectedSubmission[];
  queueReason: Record<string, string>;
  queueNote: Record<string, string>;
  selected: string[];
  ticked: Record<string, boolean>;
  reportOpen: boolean;
  reportText: string;
  reportKind: string;
  // The editor's unconstrained view of every ask (AdminPage) — unchanged
  // shape/name from the mock. "My own asks" and "published for everyone"
  // are now separate Firestore-backed slices, since a reader is never
  // allowed the unconstrained query this one relies on. See
  // src/lib/asksRepo.ts.
  asks: Ask[];
  myAsks: Ask[];
  publicAsks: Ask[];
  askKind: string;
  askSubject: string;
  askText: string;
  askError: string;
  askReply: Record<string, string>;
  askPublish: Record<string, boolean>;
  formStep: number;
  formDone: boolean;
  formError: string;
  form: FormState;
  toast: string;
  lastTitle: string;
  openQ: string | null;
  draftId: string;
  editTarget: EditTarget;
}
