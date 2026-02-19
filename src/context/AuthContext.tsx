import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { subscribeToAuthState, signUpWithEmail, signInWithEmail, signInWithGoogle as googleSignIn, signOut as authSignOut, mapFirebaseAuthError, migrateGuestDataToAccount } from '@/src/services/auth';
import { Screen } from '@/types';

// ─── Context Types ────────────────────────────────────────────────────────────
interface AuthContextType {
  user: FirebaseUser | null;
  isLoggedIn: boolean;
  isGuest: boolean;
  isLoadingAuth: boolean;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    homeSpotId: string,
    preferredWaveHeight: { min: number; max: number },
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
interface AuthProviderProps {
  children: React.ReactNode;
  onNavigate?: (screen: Screen) => void;
  onSignUpSuccess?: (uid: string) => void;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  onNavigate,
  onSignUpSuccess,
}) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Subscribe to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = subscribeToAuthState(firebaseUser => {
      setUser(firebaseUser);
      setIsLoadingAuth(false);
    });
    return unsubscribe;
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  // ── Sign Up ─────────────────────────────────────────────────────────────────
  const signUp = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
      homeSpotId: string,
      preferredWaveHeight: { min: number; max: number },
    ) => {
      setAuthError(null);
      try {
        const newUser = await signUpWithEmail(email, password, displayName, homeSpotId, preferredWaveHeight);
        // Migrate any guest data the user may have created
        const migrated = await migrateGuestDataToAccount(newUser.uid);
        if (migrated) {
          console.log('Guest data migrated to new account.');
        }
        onSignUpSuccess?.(newUser.uid);
        onNavigate?.(Screen.HOME);
      } catch (error: unknown) {
        const code = (error as { code?: string })?.code ?? '';
        setAuthError(mapFirebaseAuthError(code));
        throw error;
      }
    },
    [onNavigate, onSignUpSuccess],
  );

  // ── Sign In ─────────────────────────────────────────────────────────────────
  const signIn = useCallback(
    async (email: string, password: string) => {
      setAuthError(null);
      try {
        await signInWithEmail(email, password);
        onNavigate?.(Screen.HOME);
      } catch (error: unknown) {
        const code = (error as { code?: string })?.code ?? '';
        setAuthError(mapFirebaseAuthError(code));
        throw error;
      }
    },
    [onNavigate],
  );

  // ── Google Sign In ──────────────────────────────────────────────────────────
  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await googleSignIn();
      onNavigate?.(Screen.HOME);
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code ?? '';
      setAuthError(mapFirebaseAuthError(code));
      throw error;
    }
  }, [onNavigate]);

  // ── Sign Out ────────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await authSignOut();
    onNavigate?.(Screen.HOME);
  }, [onNavigate]);

  const value: AuthContextType = {
    user,
    isLoggedIn: !!user,
    isGuest: !user,
    isLoadingAuth,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    authError,
    clearAuthError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
