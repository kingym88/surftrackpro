import { doc, getDoc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export async function getGeminiCache(uid: string, key: string): Promise<string | null> {
  if (!uid) return null;
  
  try {
    const docRef = doc(db, 'users', uid, 'geminiCache', key);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    const data = snap.data();
    if (!data.value || !data.createdAt) return null;

    // Check TTL — 24 hours
    const now = Date.now();
    const created = data.createdAt.toMillis();
    const ttlMs = 24 * 60 * 60 * 1000;

    if (now - created > ttlMs) {
      await deleteDoc(docRef);
      return null;
    }

    return data.value as string;
  } catch (err) {
    console.error('Failed reading Gemini cache from Firestore:', err);
    return null;
  }
}

export async function setGeminiCache(uid: string, key: string, value: string): Promise<void> {
  if (!uid) return;

  try {
    const docRef = doc(db, 'users', uid, 'geminiCache', key);
    await setDoc(docRef, {
      value,
      createdAt: Timestamp.now(),
    });
  } catch (err) {
    console.error('Failed writing Gemini cache to Firestore:', err);
  }
}

export function buildHomeCacheKey(spotId: string): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `home_${spotId}_${today}`;
}

export function buildCoachCacheKey(
  homeSpotId: string,
  sessionCount: number,
  timeframe: string
): string {
  const today = new Date().toISOString().slice(0, 10);
  return `coach_${homeSpotId}_${today}_${sessionCount}_${timeframe}`;
}
