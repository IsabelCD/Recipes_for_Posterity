// Centralized Firestore access for comments and replies — mirrors
// src/lib/recipesRepo.ts / submissionsRepo.ts. Comments now live at
// recipes/{recipeId}/comments/{commentId} with real Firestore document
// IDs (replacing the old `${recipeId}__${index}` key), and replies live
// under the comment they belong to. The recipe doc's own seeded
// `comments` array (Phase 1) is untouched and keeps displaying
// read-only — this only adds the new, real subcollection alongside it.
import {
  addDoc, collection, getDocs, orderBy, query, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { CommentReply, RecipeComment } from '../types';

interface FirestoreMessageData {
  uid: string;
  displayName: string;
  text: string;
  createdAt: Timestamp;
}

// "3 weeks ago" / "1 month ago" — matches the wording the seeded mock
// comments already use, computed from the real createdAt instead of
// being a hardcoded string.
function relativeLabel(ts: Timestamp | undefined): string {
  if (!(ts instanceof Timestamp)) return 'just now';
  const ms = Date.now() - ts.toDate().getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  if (days < 30) { const weeks = Math.floor(days / 7); return `${weeks} week${weeks === 1 ? '' : 's'} ago`; }
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
}

function toComment(id: string, data: FirestoreMessageData): RecipeComment & { id: string } {
  return { id, by: data.displayName, when: relativeLabel(data.createdAt), text: data.text };
}

function toReply(id: string, data: FirestoreMessageData): CommentReply & { id: string } {
  return { id, by: data.displayName, when: relativeLabel(data.createdAt), text: data.text };
}

export interface LoadedComments {
  comments: (RecipeComment & { id: string })[];
  repliesByComment: Record<string, (CommentReply & { id: string })[]>;
}

export async function loadComments(recipeId: string): Promise<LoadedComments> {
  const q = query(collection(db, 'recipes', recipeId, 'comments'), orderBy('createdAt'));
  const snap = await getDocs(q);
  const comments = snap.docs.map((d) => toComment(d.id, d.data() as FirestoreMessageData));

  const repliesByComment: Record<string, (CommentReply & { id: string })[]> = {};
  await Promise.all(comments.map(async (c) => {
    const rq = query(collection(db, 'recipes', recipeId, 'comments', c.id, 'replies'), orderBy('createdAt'));
    const rsnap = await getDocs(rq);
    repliesByComment[c.id] = rsnap.docs.map((d) => toReply(d.id, d.data() as FirestoreMessageData));
  }));

  return { comments, repliesByComment };
}

export async function postComment(recipeId: string, uid: string, displayName: string, text: string): Promise<void> {
  await addDoc(collection(db, 'recipes', recipeId, 'comments'), {
    uid, displayName, text, createdAt: serverTimestamp(),
  });
}

export async function postReply(recipeId: string, commentId: string, uid: string, displayName: string, text: string): Promise<void> {
  await addDoc(collection(db, 'recipes', recipeId, 'comments', commentId, 'replies'), {
    uid, displayName, text, createdAt: serverTimestamp(),
  });
}
