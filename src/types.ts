export type Access = 'public' | 'circle' | 'owner';
export type Role = 'reader' | 'editor';
export type Language = 'Portuguese' | 'English';

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
}

export interface CommentReply {
  by: string;
  when: string;
  text: string;
}

export interface Recipe {
  id: string;
  title: string;
  author: string;
  submitter: string;
  nationality: string;
  meal: string;
  language: Language;
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
  ownerEmail?: string;
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
  language: Language;
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

export interface Account {
  email: string;
  pass: string;
  name: string;
  role: Role;
  joined: string;
  seed?: boolean;
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
  language: Language;
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
  language: string;
  author: string;
  since: string;
  rating: string;
  time: string;
  difficulty: string;
  sort: string;
  tasteList: string[];
}

export type EditTarget = {
  kind: 'pending' | 'recipe';
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

export interface AppState {
  page: PageKey;
  recipeId: string;
  signedIn: boolean;
  role: Role;
  pendingPage: PageKey | '';
  signRole: Role;
  signMode: 'in' | 'new';
  accounts: Account[];
  signName: string;
  signEmail: string;
  signPass: string;
  signError: string;
  editorDraft: string;
  editorError: string;
  recipes: Recipe[];
  pending: PendingSubmission[];
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
  asks: Ask[];
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
