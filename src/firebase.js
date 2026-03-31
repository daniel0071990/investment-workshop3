// ============================================================
// FIREBASE — Replace placeholder values with your credentials
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

// --- Settings (real-time sync from presenter to all) ---
export async function saveSettings(data) {
  await set(ref(db, "workshop-settings"), data);
}
export function onSettingsChanged(callback) {
  return onValue(ref(db, "workshop-settings"), (snapshot) => {
    if (snapshot.exists()) callback(snapshot.val());
  });
}

// --- Quiz scores ---
export async function submitQuizScore(name, score, total) {
  await set(push(ref(db, "quiz-scores")), { name, score, total, ts: Date.now() });
}
export async function loadAllScores() {
  const snap = await get(ref(db, "quiz-scores"));
  if (!snap.exists()) return [];
  return Object.values(snap.val()).sort((a, b) => b.score - a.score || a.ts - b.ts);
}
export function onScoresChanged(cb) {
  return onValue(ref(db, "quiz-scores"), (snap) => {
    cb(snap.exists() ? Object.values(snap.val()).sort((a, b) => b.score - a.score || a.ts - b.ts) : []);
  });
}
export async function clearAllScores() { await remove(ref(db, "quiz-scores")); }

// --- Portfolio scores ---
export async function submitPortfolio(data) {
  await set(push(ref(db, "portfolio-scores")), { ...data, ts: Date.now() });
}
export async function loadAllPortfolios() {
  const snap = await get(ref(db, "portfolio-scores"));
  if (!snap.exists()) return [];
  return Object.values(snap.val()).sort((a, b) => b.totalReturn - a.totalReturn);
}
export function onPortfoliosChanged(cb) {
  return onValue(ref(db, "portfolio-scores"), (snap) => {
    cb(snap.exists() ? Object.values(snap.val()) : []);
  });
}
export async function clearAllPortfolios() { await remove(ref(db, "portfolio-scores")); }

// --- Market timing scores ---
export async function submitTimingScore(data) {
  await set(push(ref(db, "timing-scores")), { ...data, ts: Date.now() });
}
export async function loadAllTimingScores() {
  const snap = await get(ref(db, "timing-scores"));
  if (!snap.exists()) return [];
  return Object.values(snap.val()).sort((a, b) => b.finalValue - a.finalValue);
}
export function onTimingScoresChanged(cb) {
  return onValue(ref(db, "timing-scores"), (snap) => {
    cb(snap.exists() ? Object.values(snap.val()) : []);
  });
}
export async function clearAllTimingScores() { await remove(ref(db, "timing-scores")); }
