import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { UserProfile } from '@/types';

interface UserProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType | null>(null);

export const UserProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchProfile() {
      if (!user) {
        if (active) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && active) {
          setProfile(docSnap.data() as UserProfile);
        } else if (active) {
          setProfile(null);
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    
    fetchProfile();
    return () => { active = false; };
  }, [user]);

  const updateProfile = async (patch: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      const updated = {
        ...(profile || {
          uid: user.uid,
          displayName: 'Surfer',
          location: 'Lisbon, PT',
          skillLevel: 'intermediate',
          homeBreak: '',
          unitSystem: 'metric'
        }),
        ...patch,
        updatedAt: Date.now()
      };
      
      await setDoc(docRef, updated, { merge: true });
      setProfile(updated as UserProfile);
    } catch (err) {
      console.error('Error updating user profile:', err);
      throw err;
    }
  };

  return (
    <UserProfileContext.Provider value={{ profile, loading, updateProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
};

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error('useUserProfile must be used within UserProfileProvider');
  return ctx;
}
