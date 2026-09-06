// Centralized Firestore access for questions/suggestions ("asks") —
// mirrors src/lib/submissionsRepo.ts's shape. Three distinct queries for
// three distinct audiences, same reasoning as recipes' public/own/editor
// split in Phase 1: a reader can only ever ask for their own asks or the
// published-for-everyone ones; only an editor's unconstrained query is
// provable safe by firestore.rules.
import {
  collection, doc, getDocs, query, serverTimestamp, setDoc, Timestamp, updateDoc, where,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Ask } from '../types';

const ASKS_COLLECTION = 'asks';

interface FirestoreAskData {
  uid: string;
  by: string;
  kind: string;
  subject: string;
  text: string;
  status: 'Waiting' | 'Answered' | 'Closed';
  reply: string;
  repliedBy: string;
  published: boolean;
  createdAt: Timestamp;
  repliedAt: Timestamp | null;
}

function toDateString(ts: Timestamp | null | undefined): string {
  return ts instanceof Timestamp ? ts.toDate().toISOString().slice(0, 10) : '';
}

function toAsk(id: string, data: FirestoreAskData): Ask {
  return {
    id, kind: data.kind, subject: data.subject, by: data.by, sentOn: toDateString(data.createdAt),
    text: data.text, status: data.status, reply: data.reply, repliedBy: data.repliedBy,
    repliedOn: toDateString(data.repliedAt), published: data.published,
  };
}

export async function createAsk(uid: string, by: string, kind: string, subject: string, text: string): Promise<void> {
  const ref = doc(collection(db, ASKS_COLLECTION));
  const data: FirestoreAskData = {
    uid, by, kind, subject, text, status: 'Waiting', reply: '', repliedBy: '', published: false,
    createdAt: serverTimestamp() as unknown as Timestamp, repliedAt: null,
  };
  await setDoc(ref, data);
}

export async function queryMyAsks(uid: string): Promise<Ask[]> {
  const q = query(collection(db, ASKS_COLLECTION), where('uid', '==', uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toAsk(d.id, d.data() as FirestoreAskData));
}

export async function queryPublicAsks(): Promise<Ask[]> {
  const q = query(collection(db, ASKS_COLLECTION), where('status', '==', 'Answered'), where('published', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toAsk(d.id, d.data() as FirestoreAskData));
}

export async function queryAllAsksForEditor(): Promise<Ask[]> {
  const snap = await getDocs(collection(db, ASKS_COLLECTION));
  return snap.docs.map((d) => toAsk(d.id, d.data() as FirestoreAskData));
}

export async function replyToAsk(id: string, repliedBy: string, reply: string, published: boolean): Promise<void> {
  await updateDoc(doc(db, ASKS_COLLECTION, id), {
    status: 'Answered', reply, repliedBy, published, repliedAt: serverTimestamp(),
  });
}

export async function setAskPublished(id: string, published: boolean): Promise<void> {
  await updateDoc(doc(db, ASKS_COLLECTION, id), { published });
}

export async function closeAsk(id: string): Promise<void> {
  await updateDoc(doc(db, ASKS_COLLECTION, id), { status: 'Closed' });
}
