import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { SurfSpot, SessionLog, Board, ForecastSnapshot, TidePoint } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface UserProfile {
  displayName: string;
  email: string;
  photoURL: string | null;
  homeSpotId: string | null;
  preferredWaveHeightMin: number;
  preferredWaveHeightMax: number;
  alertPreferences: {
    minWaveHeight: number;
    maxWindSpeed: number;
    preferredSwellDirections: string[];
  };
  createdAt?: Timestamp;
}

// ─── User Profile ─────────────────────────────────────────────────────────────
export async function createUserProfile(uid: string, data: Omit<UserProfile, 'createdAt'>): Promise<void> {
  await setDoc(doc(db, 'users', uid), {
    ...data,
    createdAt: Timestamp.now(),
  });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  await updateDoc(doc(db, 'users', uid), data as Record<string, unknown>);
}

// ─── Sessions ─────────────────────────────────────────────────────────────────
export async function getSessions(uid: string): Promise<SessionLog[]> {
  const q = query(
    collection(db, 'users', uid, 'sessions'),
    orderBy('date', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as SessionLog));
}

export async function addSession(uid: string, session: Omit<SessionLog, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'users', uid, 'sessions'), {
    ...session,
    uid,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function deleteSession(uid: string, sessionId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'sessions', sessionId));
}

// ─── Quiver (Boards) ──────────────────────────────────────────────────────────
export async function getQuiver(uid: string): Promise<Board[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'quiver'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Board));
}

export async function addBoard(uid: string, board: Omit<Board, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'users', uid, 'quiver'), {
    ...board,
    uid,
  });
  return ref.id;
}

export async function deleteBoard(uid: string, boardId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'quiver', boardId));
}

// ─── Spots ────────────────────────────────────────────────────────────────────
export async function getSpots(): Promise<SurfSpot[]> {
  const snap = await getDocs(collection(db, 'spots'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as SurfSpot));
}

export async function getSpotById(id: string): Promise<SurfSpot | null> {
  const snap = await getDoc(doc(db, 'spots', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as SurfSpot) : null;
}

export async function addCustomSpot(uid: string, spot: Omit<SurfSpot, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'spots'), {
    ...spot,
    createdBy: uid,
    isCustom: true,
  });
  return ref.id;
}

// ─── Cached Forecast (per-user) ────────────────────────────────────────────────
export async function getCachedForecast(
  uid: string,
  spotId: string,
): Promise<{ data: ForecastSnapshot[]; fetchedAt: Timestamp } | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'forecasts', spotId));
  return snap.exists()
    ? (snap.data() as { data: ForecastSnapshot[]; fetchedAt: Timestamp })
    : null;
}

export async function setCachedForecast(
  uid: string,
  spotId: string,
  data: ForecastSnapshot[],
): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'forecasts', spotId), {
    data,
    fetchedAt: Timestamp.now(),
  });
}

// ─── Precomputed Forecast (global, by spotId) ──────────────────────────────────
export async function getPrecomputedForecast(
  spotId: string,
): Promise<{ data: ForecastSnapshot[]; runAt: Timestamp; validTo: Timestamp } | null> {
  // Get the latest run - query the runs subcollection ordered by runAt desc
  const q = query(
    collection(db, 'precomputed_forecasts', spotId, 'runs'),
    orderBy('runAt', 'desc'),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as { data: ForecastSnapshot[]; runAt: Timestamp; validTo: Timestamp };
}

export async function setPrecomputedForecast(
  spotId: string,
  data: ForecastSnapshot[],
): Promise<void> {
  const runId = Date.now().toString();
  const runAt = Timestamp.now();
  const validTo = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  await setDoc(doc(db, 'precomputed_forecasts', spotId, 'runs', runId), {
    data,
    runAt,
    validTo,
  });
}

// ─── Nearest Spots (by distance from a base spot) ─────────────────────────────
export async function getNearestSpots(
  baseSpotId: string,
  limit: number = 5,
): Promise<SurfSpot[]> {
  // This implementation fetches all spots and sorts by distance client-side.
  // For production, a geospatial query (GeoFirestore) would be more efficient.
  const baseSnap = await getDoc(doc(db, 'spots', baseSpotId));
  if (!baseSnap.exists()) return [];

  const baseData = baseSnap.data() as SurfSpot;
  const baseLat = baseData.coordinates?.lat ?? 0;
  const baseLng = baseData.coordinates?.lng ?? 0;

  const allSpots = await getSpots();
  const others = allSpots.filter(s => s.id !== baseSpotId);

  // Haversine distance
  const withDistance = others.map(s => ({
    spot: s,
    dist: haversine(baseLat, baseLng, s.coordinates?.lat ?? 0, s.coordinates?.lng ?? 0),
  }));

  withDistance.sort((a, b) => a.dist - b.dist);
  return withDistance.slice(0, limit).map(w => w.spot);
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
