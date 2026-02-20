import React from 'react';
import { Screen } from '@/types';
import { useAuth } from '@/src/context/AuthContext';

interface GuestBannerProps {
  onNavigate: (screen: Screen) => void;
}

export const GuestBanner: React.FC<GuestBannerProps> = ({ onNavigate }) => {
  const { isGuest } = useAuth();

  if (!isGuest) return null;

  return (
    <div className="fixed bottom-32 left-0 right-0 z-20 max-w-md mx-auto">
      <div className="flex items-center justify-between px-4 py-2.5 bg-cyan-500/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="material-icons-round text-slate-900 text-base">wb_sunny</span>
          <span className="text-sm font-medium text-slate-900">
            Join to unlock full forecasts
          </span>
        </div>
        <button
          id="guest-banner-signup-btn"
          onClick={() => onNavigate(Screen.SIGN_UP)}
          className="bg-background text-cyan-400 text-sm font-bold px-4 py-1.5 rounded-lg hover:bg-surface active:scale-[0.97] transition-all"
        >
          Sign Up Free
        </button>
      </div>
    </div>
  );
};
