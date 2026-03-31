// ============================================================
// FIREBASE CONFIGURATION — Replace the values below with yours
// ============================================================
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, set, get, remove, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyA_49WDIDT7MkRqv5TFsDTx9Q_xj-JyChk",
  authDomain: "investment-team-workshop-1.firebaseapp.com",
  databaseURL: "https://investment-team-workshop-1-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "investment-team-workshop-1",
  storageBucket: "investment-team-workshop-1.firebasestorage.app",
  messagingSenderId: "1048724444277",
  appId: "1:1048724444277:web:f8f6b7ba0b7575d16cd43c"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- Quiz scores ---
export async function submitQuizScore(userName, score, total) {
  const newRef = push(ref(db, "quiz-scores"));
  await set(newRef, { name: userName, score, total, ts: Date.now() });
  return true;
}
export async function loadAllScores() {
  const snapshot = await get(ref(db, "quiz-scores"));
  if (!snapshot.exists()) return [];
  return Object.values(snapshot.val()).sort((a, b) => b.score - a.score || a.ts - b.ts);
}
export function onScoresChanged(callback) {
  return onValue(ref(db, "quiz-scores"), (snapshot) => {
    if (!snapshot.exists()) { callback([]); return; }
    callback(Object.values(snapshot.val()).sort((a, b) => b.score - a.score || a.ts - b.ts));
  });
}
export async function clearAllScores() { await remove(ref(db, "quiz-scores")); }

// --- Portfolio scores ---
export async function submitPortfolio(data) {
  const newRef = push(ref(db, "portfolio-scores"));
  await set(newRef, { ...data, ts: Date.now() });
  return true;
}
export async function loadAllPortfolios() {
  const snapshot = await get(ref(db, "portfolio-scores"));
  if (!snapshot.exists()) return [];
  return Object.values(snapshot.val()).sort((a, b) => b.totalReturn - a.totalReturn);
}
export function onPortfoliosChanged(callback) {
  return onValue(ref(db, "portfolio-scores"), (snapshot) => {
    if (!snapshot.exists()) { callback([]); return; }
    callback(Object.values(snapshot.val()));
  });
}
export async function clearAllPortfolios() { await remove(ref(db, "portfolio-scores")); }

// --- Do-nothing / market timing scores ---
export async function submitTimingScore(data) {
  const newRef = push(ref(db, "timing-scores"));
  await set(newRef, { ...data, ts: Date.now() });
  return true;
}
export async function loadAllTimingScores() {
  const snapshot = await get(ref(db, "timing-scores"));
  if (!snapshot.exists()) return [];
  return Object.values(snapshot.val()).sort((a, b) => b.finalValue - a.finalValue);
}
export function onTimingScoresChanged(callback) {
  return onValue(ref(db, "timing-scores"), (snapshot) => {
    if (!snapshot.exists()) { callback([]); return; }
    callback(Object.values(snapshot.val()));
  });
}
export async function clearAllTimingScores() { await remove(ref(db, "timing-scores")); }
