import React from 'react';
import { Screen } from '@/types';
import { useAuth } from '@/src/context/AuthContext';

interface GuestGateProps {
  children: React.ReactNode;
  featureName: string;
  previewLines?: number;
  onNavigate: (screen: Screen) => void;
  /** If true, render a full-screen gate instead of an overlay */
  fullScreen?: boolean;
}

export const GuestGate: React.FC<GuestGateProps> = ({
  children,
  featureName,
  onNavigate,
  fullScreen = false,
}) => {
  const { isGuest } = useAuth();

  if (!isGuest) {
    return <>{children}</>;
  }

  if (fullScreen) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 p-8">
        <div className="w-20 h-20 rounded-full bg-surface border border-border flex items-center justify-center">
          <span className="material-icons-round text-4xl text-textMuted">lock</span>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-text mb-2">{featureName}</h2>
          <p className="text-textMuted text-sm leading-relaxed max-w-xs">
            Create a free account to unlock this feature and access the full SurfTrack Pro experience.
          </p>
        </div>
        <button
          id="guest-gate-signup-btn"
          onClick={() => onNavigate(Screen.SIGN_UP)}
          className="w-full max-w-xs bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-slate-900 font-bold rounded-xl py-4 transition-all"
        >
          Sign Up Free
        </button>
        <button
          onClick={() => onNavigate(Screen.SIGN_IN)}
          className="text-textMuted text-sm hover:text-text transition-colors"
        >
          Already have an account? <span className="text-cyan-400 font-medium">Sign In</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Blurred children */}
      <div className="pointer-events-none select-none blur-sm opacity-60">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 backdrop-blur-sm bg-background/60 rounded-xl z-10 flex flex-col items-center justify-center gap-3 p-4">
        <span className="material-icons-round text-textMuted text-3xl">lock</span>
        <p className="text-sm font-medium text-text text-center">{featureName}</p>
        <button
          id={`guest-gate-${featureName.replace(/\s+/g, '-').toLowerCase()}-btn`}
          onClick={() => onNavigate(Screen.SIGN_UP)}
          className="bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-slate-900 font-bold rounded-xl py-3 px-6 text-sm transition-all"
        >
          Sign Up Free
        </button>
      </div>
    </div>
  );
};
