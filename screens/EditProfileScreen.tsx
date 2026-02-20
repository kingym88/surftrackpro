import React, { useState, useEffect } from 'react';
import { Screen } from '@/types';
import { useUserProfile } from '@/src/context/UserProfileContext';

interface EditProfileScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
}

export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ onNavigate }) => {
  const { profile, updateProfile, loading } = useUserProfile();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formState, setFormState] = useState({
    displayName: '',
    location: '',
    skillLevel: 'intermediate' as 'beginner' | 'intermediate' | 'advanced' | 'pro',
    homeBreak: '',
  });

  useEffect(() => {
    if (profile) {
      setFormState({
        displayName: profile.displayName || '',
        location: profile.location || 'Lisbon, PT',
        skillLevel: profile.skillLevel || 'intermediate',
        homeBreak: profile.homeBreak || '',
      });
    }
  }, [profile]);

  const handleUnitToggle = async (system: 'metric' | 'imperial') => {
    if (profile?.unitSystem === system) return;
    try {
      await updateProfile({ unitSystem: system });
    } catch (err) {
      console.error('Failed to change unit system', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await updateProfile(formState);
      onNavigate(Screen.PROFILE);
    } catch (err) {
      setError('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center p-6"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div></div>;
  }

  const currentSystem = profile?.unitSystem || 'metric';

  return (
    <div className="min-h-screen bg-background pb-24 text-text selection:bg-primary/20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-6 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <button onClick={() => onNavigate(Screen.PROFILE)} className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-surface transition-colors">
            <span className="material-icons-round text-text">arrow_back_ios_new</span>
          </button>
          <h1 className="text-xl font-extrabold tracking-tight">Edit Profile</h1>
          <div className="w-10"></div>
        </div>
      </header>
      
      <main className="px-6 mt-6 space-y-6">
        {error && (
          <div className="bg-red-500/20 text-red-400 p-4 rounded-xl text-sm border border-red-500/30">
            {error}
          </div>
        )}

        {/* Display Name */}
        <div className="bg-surface rounded-2xl border border-border p-4">
          <label className="text-xs font-bold uppercase tracking-widest text-textMuted mb-2 block">Display Name</label>
          <input 
            type="text" 
            className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            value={formState.displayName}
            onChange={(e) => setFormState({...formState, displayName: e.target.value})}
          />
        </div>

        {/* Location */}
        <div className="bg-surface rounded-2xl border border-border p-4">
          <label className="text-xs font-bold uppercase tracking-widest text-textMuted mb-2 block">Location</label>
          <input 
            type="text" 
            className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            value={formState.location}
            onChange={(e) => setFormState({...formState, location: e.target.value})}
          />
        </div>

        {/* Home Break */}
        <div className="bg-surface rounded-2xl border border-border p-4">
          <label className="text-xs font-bold uppercase tracking-widest text-textMuted mb-2 block">Home Break</label>
          <input 
            type="text" 
            className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            value={formState.homeBreak}
            placeholder="e.g. Carcavelos"
            onChange={(e) => setFormState({...formState, homeBreak: e.target.value})}
          />
        </div>

        {/* Skill Level */}
        <div className="bg-surface rounded-2xl border border-border p-4">
          <label className="text-xs font-bold uppercase tracking-widest text-textMuted mb-3 block">Skill Level</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'beginner', label: 'Beginner' },
              { id: 'intermediate', label: 'Intermediate' },
              { id: 'advanced', label: 'Advanced' },
              { id: 'pro', label: 'Pro' }
            ].map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => setFormState({...formState, skillLevel: lvl.id as any})}
                className={`py-2 px-3 rounded-lg text-sm font-bold border transition-all ${formState.skillLevel === lvl.id ? 'bg-primary text-white border-primary' : 'bg-background text-textMuted border-border'}`}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Units */}
        <div className="bg-surface rounded-2xl border border-border p-4">
           <label className="text-xs font-bold uppercase tracking-widest text-textMuted mb-3 block">Units</label>
           <div className="flex gap-2">
             <button 
               onClick={() => handleUnitToggle('imperial')}
               className={`flex-1 py-3 rounded-lg text-sm font-bold border transition-colors ${currentSystem === 'imperial' ? 'bg-primary text-white border-primary' : 'bg-background text-textMuted border-border'}`}
             >
               Imperial <span className="block text-[10px] font-normal opacity-70 mt-0.5">(ft, °F, mph)</span>
             </button>
             <button 
               onClick={() => handleUnitToggle('metric')}
               className={`flex-1 py-3 rounded-lg text-sm font-bold border transition-colors ${currentSystem === 'metric' ? 'bg-primary text-white border-primary' : 'bg-background text-textMuted border-border'}`}
             >
               Metric <span className="block text-[10px] font-normal opacity-70 mt-0.5">(m, °C, km/h)</span>
             </button>
           </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white font-bold text-base py-4 rounded-xl flex items-center justify-center transition-all mt-4"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>

      </main>
    </div>
  );
};
