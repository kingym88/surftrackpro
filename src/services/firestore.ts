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
import { PORTUGAL_SPOTS } from '@/src/data/portugalSpots';

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
  runAt: Timestamp,
  validTo: Timestamp
): Promise<void> {
  const runId = Date.now().toString();
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
  const baseSpot = PORTUGAL_SPOTS.find(s => s.id === baseSpotId);
  if (!baseSpot) return [];

  const others = PORTUGAL_SPOTS.filter(s => s.id !== baseSpotId);

  const withDistance = others.map(s => ({
    spot: s,
    dist: haversine(baseSpot.latitude, baseSpot.longitude, s.latitude, s.longitude),
  }));

  withDistance.sort((a, b) => a.dist - b.dist);
  
  // Transform PortugalSpotSeed to SurfSpot
  return withDistance.slice(0, limit).map(w => ({
    id: w.spot.id,
    name: w.spot.name,
    distance: `${w.dist.toFixed(1)} km`,
    swellDirection: '', 
    height: '',
    condition: 'FAIR',
    image: '',
    coordinates: { lat: w.spot.latitude, lng: w.spot.longitude },
    region: w.spot.region,
    country: w.spot.country
  }));
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
