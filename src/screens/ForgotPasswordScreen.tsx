import React, { useState } from 'react';
import { Screen } from '@/types';
import { resetPassword } from '@/src/services/auth';

interface ForgotPasswordScreenProps {
  onNavigate: (screen: Screen) => void;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: unknown) {
      setError('Could not send reset email. Please check the address and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center px-4 pt-12 pb-2">
        <button
          onClick={() => onNavigate(Screen.SIGN_IN)}
          className="p-2 rounded-full hover:bg-surface hover:brightness-110 transition-colors"
        >
          <span className="material-icons-round text-text">arrow_back</span>
        </button>
      </div>

      <div className="flex-1 px-6 pb-12 flex flex-col">
        <div className="text-center mb-10 mt-8">
          <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="material-icons-round text-cyan-400 text-3xl">lock_reset</span>
          </div>
          <h1 className="text-2xl font-bold text-text mb-2">Reset Password</h1>
          <p className="text-textMuted text-sm">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
              <span className="material-icons-round text-emerald-400 text-3xl">check_circle</span>
            </div>
            <p className="text-cyan-400 font-medium">Reset link sent!</p>
            <p className="text-textMuted text-sm">
              Check your inbox at <span className="text-text font-medium">{email}</span>
            </p>
            <button
              onClick={() => onNavigate(Screen.SIGN_IN)}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl py-4 mt-4 transition-all active:scale-[0.98]"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-textMuted uppercase tracking-wider block mb-1.5">
                Email Address
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-surface border border-border text-text rounded-xl px-4 py-3.5 text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              id="forgot-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-900 font-bold rounded-xl py-4 transition-all active:scale-[0.98]"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-icons-round text-base animate-spin">sync</span>
                  Sending…
                </span>
              ) : (
                'Send Reset Link'
              )}
            </button>

            <button
              type="button"
              onClick={() => onNavigate(Screen.SIGN_IN)}
              className="w-full text-textMuted text-sm hover:text-text transition-colors py-2"
            >
              Back to Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
