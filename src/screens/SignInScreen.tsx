import React, { useState } from 'react';
import { Screen } from '@/types';
import { useAuth } from '@/src/context/AuthContext';

interface SignInScreenProps {
  onNavigate: (screen: Screen) => void;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({ onNavigate }) => {
  const { signIn, signInWithGoogle, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);
    } catch {
      // Error handled by context
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch {
      // Error handled by context
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Back */}
      <div className="flex items-center px-4 pt-12 pb-2">
        <button
          onClick={() => onNavigate(Screen.HOME)}
          className="p-2 rounded-full hover:bg-surface hover:brightness-110 transition-colors"
        >
          <span className="material-icons-round text-text">arrow_back</span>
        </button>
      </div>

      <div className="flex-1 px-6 pb-12">
        {/* Logo */}
        <div className="text-center mb-10 mt-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="bg-cyan-500 p-3 rounded-2xl">
              <span className="material-icons-round text-slate-900 text-3xl">waves</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-text mb-1">Welcome back</h1>
          <p className="text-textMuted text-sm">Sign in to access your surf data</p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-textMuted uppercase tracking-wider block mb-1.5">
              Email
            </label>
            <input
              id="signin-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-surface border border-border text-text rounded-xl px-4 py-3.5 text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-textMuted uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={() => onNavigate(Screen.FORGOT_PASSWORD)}
                className="text-cyan-400 text-xs hover:text-cyan-300"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                id="signin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
                required
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

          {authError && (
            <p id="signin-error" className="text-red-400 text-sm text-center">
              {authError}
            </p>
          )}

          <button
            id="signin-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-900 font-bold rounded-xl py-4 transition-all active:scale-[0.98]"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="material-icons-round text-base animate-spin">sync</span>
                Signing In…
              </span>
            ) : (
              'Sign In'
            )}
          </button>

          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-surface hover:brightness-110" />
            <span className="text-slate-500 text-xs">or</span>
            <div className="flex-1 h-px bg-surface hover:brightness-110" />
          </div>

          <button
            id="signin-google-btn"
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

        <p className="text-center text-sm text-slate-500 mt-6">
          Don't have an account?{' '}
          <button
            onClick={() => onNavigate(Screen.SIGN_UP)}
            className="text-cyan-400 font-medium hover:text-cyan-300"
          >
            Sign Up Free
          </button>
        </p>
      </div>
    </div>
  );
};
