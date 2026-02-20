import React, { useState } from 'react';
import { Screen } from '@/types';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';
import { portugalSpots } from '@/src/data/portugalSpots';

interface SignUpScreenProps {
  onNavigate: (screen: Screen) => void;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({ onNavigate }) => {
  const { signUp, signInWithGoogle, authError, isLoadingAuth } = useAuth();
  const { addToast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [homeSpotId, setHomeSpotId] = useState('');
  const [waveMin, setWaveMin] = useState(0.5);
  const [waveMax, setWaveMax] = useState(2.5);
  const [spotSearch, setSpotSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const filteredSpots = spotSearch.length > 0
    ? portugalSpots.filter(s =>
        s.name.toLowerCase().includes(spotSearch.toLowerCase()) ||
        s.region.toLowerCase().includes(spotSearch.toLowerCase())
      )
    : portugalSpots;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeSpotId) {
      setLocalError('Please select your local surf spot.');
      return;
    }
    setLocalError(null);
    setIsLoading(true);
    try {
      await signUp(email, password, displayName, homeSpotId, { min: waveMin, max: waveMax });
      addToast('Account created successfully!', 'success');
      onNavigate(Screen.HOME);
    } catch {
      // Error is shown via authError from context
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      addToast('Successfully signed in with Google', 'success');
      onNavigate(Screen.HOME);
    } catch {
      // Error handled by context
    } finally {
      setIsLoading(false);
    }
  };

  const errorMessage = localError ?? authError;

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center px-4 pt-12 pb-2">
        <button
          onClick={() => onNavigate(Screen.HOME)}
          className="p-2 rounded-full hover:bg-surface hover:brightness-110 transition-colors"
        >
          <span className="material-icons-round text-text">arrow_back</span>
        </button>
      </div>

      <div className="flex-1 px-6 pb-12">
        {/* Logo + Headline */}
        <div className="text-center mb-8 mt-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="bg-cyan-500 p-3 rounded-2xl">
              <span className="material-icons-round text-slate-900 text-3xl">waves</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-text mb-2 leading-tight">
            Track every session.<br />Never miss a swell.
          </h1>

          {/* Benefit bullets */}
          <div className="flex flex-col gap-2 mt-4 text-left max-w-xs mx-auto">
            {[
              '10-day surf forecasts for any spot',
              'AI-powered session coaching',
              'Smart swell alerts',
            ].map(b => (
              <div key={b} className="flex items-center gap-2">
                <span className="material-icons-round text-cyan-400 text-base">check_circle</span>
                <span className="text-sm text-textMuted">{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSignUp} className="space-y-4">
          {/* Display Name */}
          <div>
            <label className="text-xs font-medium text-textMuted uppercase tracking-wider block mb-1.5">
              Full Name
            </label>
            <input
              id="signup-name"
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
              required
              className="w-full bg-surface border border-border text-text rounded-xl px-4 py-3.5 text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-medium text-textMuted uppercase tracking-wider block mb-1.5">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-surface border border-border text-text rounded-xl px-4 py-3.5 text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-medium text-textMuted uppercase tracking-wider block mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                className="w-full bg-surface border border-border text-text rounded-xl px-4 py-3.5 pr-12 text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-text"
              >
                <span className="material-icons-round text-xl">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Local Spot Selector */}
          <div>
            <label className="text-xs font-medium text-textMuted uppercase tracking-wider block mb-1.5">
              Your Local Surf Spot
            </label>
            <input
              id="signup-spot-search"
              type="text"
              value={spotSearch}
              onChange={e => setSpotSearch(e.target.value)}
              placeholder="Search Portugal spots..."
              className="w-full bg-surface border border-border text-text rounded-xl px-4 py-3 text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors mb-2"
            />
            <div className="max-h-40 overflow-y-auto rounded-xl border border-border bg-surface divide-y divide-white/5">
              {filteredSpots.slice(0, 20).map(spot => (
                <button
                  key={spot.id}
                  type="button"
                  onClick={() => {
                    setHomeSpotId(spot.id);
                    setSpotSearch(spot.name);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    homeSpotId === spot.id
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-text hover:bg-surface'
                  }`}
                >
                  <span className="font-medium">{spot.name}</span>
                  <span className="text-slate-500 text-xs ml-2">{spot.region}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preferred Wave Height */}
          <div>
            <label className="text-xs font-medium text-textMuted uppercase tracking-wider block mb-3">
              Preferred Wave Height
            </label>
            <div className="bg-surface border border-border rounded-xl p-4">
              <div className="flex justify-between text-sm font-bold text-text mb-3">
                <span>{waveMin.toFixed(1)}m</span>
                <span>to</span>
                <span>{waveMax.toFixed(1)}m</span>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-textMuted mb-1">Min</p>
                  <input
                    type="range"
                    min={0.3}
                    max={2.5}
                    step={0.1}
                    value={waveMin}
                    onChange={e => setWaveMin(Math.min(Number(e.target.value), waveMax - 0.3))}
                    className="w-full accent-cyan-500"
                  />
                </div>
                <div>
                  <p className="text-xs text-textMuted mb-1">Max</p>
                  <input
                    type="range"
                    min={0.5}
                    max={5.0}
                    step={0.1}
                    value={waveMax}
                    onChange={e => setWaveMax(Math.max(Number(e.target.value), waveMin + 0.3))}
                    className="w-full accent-cyan-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Error */}
          {errorMessage && (
            <p id="signup-error" className="text-red-400 text-sm text-center">
              {errorMessage}
            </p>
          )}

          {/* Submit */}
          <button
            id="signup-submit-btn"
            type="submit"
            disabled={isLoading || isLoadingAuth}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-900 font-bold rounded-xl py-4 text-base transition-all active:scale-[0.98]"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="material-icons-round text-base animate-spin">sync</span>
                Creating Account…
              </span>
            ) : (
              'Create Free Account'
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-surface hover:brightness-110" />
            <span className="text-slate-500 text-xs">or</span>
            <div className="flex-1 h-px bg-surface hover:brightness-110" />
          </div>

          {/* Google */}
          <button
            id="signup-google-btn"
            type="button"
            onClick={handleGoogle}
            disabled={isLoading}
            className="w-full border border-slate-600 text-text py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-surface active:scale-[0.98] transition-all text-sm font-medium"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </form>

        {/* Sign in link */}
        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <button
            onClick={() => onNavigate(Screen.SIGN_IN)}
            className="text-cyan-400 font-medium hover:text-cyan-300"
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};
