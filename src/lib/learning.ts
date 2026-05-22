import type { Question } from "./cppCourse";

// Co ile lekcji robimy mini-recap quiz (5 pytań)
export const RECAP_EVERY = 5;
// Co ile lekcji kończymy rozdział → egzamin (10 pytań)
export const CHAPTER_SIZE = 10;

export function isRecapAfter(n: number) {
  return n % RECAP_EVERY === 0 && n % CHAPTER_SIZE !== 0;
}
export function isChapterExamAfter(n: number) {
  return n % CHAPTER_SIZE === 0;
}
export function chapterOf(n: number) {
  return Math.ceil(n / CHAPTER_SIZE);
}

// Weak questions tracker (spaced repetition, lokalnie per user)
const KEY = (uid: string) => `cppquest:weak:${uid}`;

interface WeakEntry { lesson: number; addedAt: number; }

export function getWeak(uid: string): WeakEntry[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY(uid)) ?? "[]"); } catch { return []; }
}
export function addWeak(uid: string, lesson: number) {
  const list = getWeak(uid).filter(w => w.lesson !== lesson);
  list.push({ lesson, addedAt: Date.now() });
  localStorage.setItem(KEY(uid), JSON.stringify(list.slice(-30)));
}
export function removeWeak(uid: string, lesson: number) {
  const list = getWeak(uid).filter(w => w.lesson !== lesson);
  localStorage.setItem(KEY(uid), JSON.stringify(list));
}
/** Zwraca lekcję do przypomnienia: dodaną >= 1h temu, najstarsza pierwsza. */
export function pickReview(uid: string): number | null {
  const now = Date.now();
  const due = getWeak(uid).filter(w => now - w.addedAt > 60 * 60 * 1000);
  if (!due.length) return null;
  due.sort((a, b) => a.addedAt - b.addedAt);
  return due[0].lesson;
}

export interface ChainQuiz {
  title: string;
  subtitle: string;
  questions: Question[];
  recapNumber: number; // quiz_number do zapisu
}
