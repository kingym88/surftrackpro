import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../firebase';
import { createUserProfile, getUserProfile } from './firestore';
import { Preferences } from '@capacitor/preferences';

// ─── Error message mapper ──────────────────────────────────────────────────────
export function mapFirebaseAuthError(code: string): string {
  const errorMap: Record<string, string> = {
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
    'auth/cancelled-popup-request': 'Sign-in was cancelled.',
    'auth/account-exists-with-different-credential':
      'An account with this email exists using a different sign-in method.',
  };
  return errorMap[code] ?? 'An unexpected error occurred. Please try again.';
}

// ─── Sign Up ──────────────────────────────────────────────────────────────────
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
  homeSpotId: string,
  preferredWaveHeight: { min: number; max: number },
): Promise<FirebaseUser> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  // Update Firebase Auth profile with display name
  await updateProfile(user, { displayName });

  // Create Firestore user document
  await createUserProfile(user.uid, {
    displayName,
    email,
    photoURL: null,
    homeSpotId,
    preferredWaveHeightMin: preferredWaveHeight.min,
    preferredWaveHeightMax: preferredWaveHeight.max,
    alertPreferences: {
      minWaveHeight: preferredWaveHeight.min,
      maxWindSpeed: 30,
      preferredSwellDirections: [],
    },
  });

  return user;
}

// ─── Sign In ──────────────────────────────────────────────────────────────────
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<FirebaseUser> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

// ─── Google OAuth ─────────────────────────────────────────────────────────────
export async function signInWithGoogle(): Promise<FirebaseUser> {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  const user = credential.user;

  // Check if user doc already exists; if not, create it
  const profile = await getUserProfile(user.uid);
  if (!profile) {
    await createUserProfile(user.uid, {
      displayName: user.displayName ?? 'Surfer',
      email: user.email ?? '',
      photoURL: user.photoURL,
      homeSpotId: null,
      preferredWaveHeightMin: 0.5,
      preferredWaveHeightMax: 3.0,
      alertPreferences: {
        minWaveHeight: 0.5,
        maxWindSpeed: 30,
        preferredSwellDirections: [],
      },
    });
  }

  return user;
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

// ─── Password Reset ───────────────────────────────────────────────────────────
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

// ─── Auth State Listener ──────────────────────────────────────────────────────
export function subscribeToAuthState(
  callback: (user: FirebaseUser | null) => void,
): () => void {
  return onAuthStateChanged(auth, callback);
}

// ─── Guest Data Migration ─────────────────────────────────────────────────────
/**
 * After a guest user creates an account, migrate any locally stored temp data
 * (sessions, boards) into Firestore under their new uid.
 */
export async function migrateGuestDataToAccount(uid: string): Promise<boolean> {
  let migrated = false;

  try {
    // Check for temporary sessions
    const { value: tempSessionsJson } = await Preferences.get({
      key: 'guest_temp_sessions',
    });
    if (tempSessionsJson) {
      const tempSessions = JSON.parse(tempSessionsJson);
      if (Array.isArray(tempSessions) && tempSessions.length > 0) {
        // Dynamically import to avoid circular deps
        const { addSession } = await import('./firestore');
        for (const session of tempSessions) {
          await addSession(uid, session);
        }
        await Preferences.remove({ key: 'guest_temp_sessions' });
        migrated = true;
      }
    }

    // Check for temporary boards
    const { value: tempBoardsJson } = await Preferences.get({
      key: 'guest_temp_boards',
    });
    if (tempBoardsJson) {
      const tempBoards = JSON.parse(tempBoardsJson);
      if (Array.isArray(tempBoards) && tempBoards.length > 0) {
        const { addBoard } = await import('./firestore');
        for (const board of tempBoards) {
          await addBoard(uid, board);
        }
        await Preferences.remove({ key: 'guest_temp_boards' });
        migrated = true;
      }
    }
  } catch (error) {
    console.error('Error migrating guest data:', error);
  }

  return migrated;
}
