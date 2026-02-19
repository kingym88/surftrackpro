import React, { useState, useCallback } from 'react';
import { Screen } from '@/types';
import { ThemeProvider } from '@/src/context/ThemeContext';
import type { SurfSpot, SessionLog } from '@/types';
import { Navigation } from '@/components/Navigation';
import { GuestBanner } from '@/src/components/GuestBanner';
import { HomeScreen } from '@/screens/HomeScreen';
import { SpotDetailScreen } from '@/screens/SpotDetailScreen';
import { LogSessionScreen } from '@/screens/LogSessionScreen';
import { SurfMatchScreen } from '@/screens/SurfMatchScreen';
import { QuiverScreen } from '@/screens/QuiverScreen';
import { SpotListScreen } from '@/screens/SpotListScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { SkillProgressionScreen } from '@/screens/SkillProgressionScreen';
import { CommunityScreen } from '@/screens/CommunityScreen';
import { AddBoardScreen } from '@/screens/AddBoardScreen';
import { SessionDetailScreen } from '@/screens/SessionDetailScreen';
import { SignUpScreen } from '@/src/screens/SignUpScreen';
import { SignInScreen } from '@/src/screens/SignInScreen';
import { ForgotPasswordScreen } from '@/src/screens/ForgotPasswordScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppProvider } from './src/context/AppContext';
import { ToastProvider } from './src/context/ToastContext';

// ─── Screens that should hide the navigation bar ──────────────────────────────
const HIDE_NAV_SCREENS: Screen[] = [
  Screen.LOG_SESSION,
  Screen.SKILL_PROGRESSION,
  Screen.ADD_BOARD,
  Screen.SESSION_DETAIL,
  Screen.SIGN_UP,
  Screen.SIGN_IN,
  Screen.FORGOT_PASSWORD,
];

// ─── Auth Loading Splash ───────────────────────────────────────────────────────
const AuthLoadingSplash: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 gap-6">
    <div className="bg-cyan-500 p-5 rounded-3xl shadow-xl shadow-cyan-500/30 animate-pulse">
      <span className="material-icons-round text-slate-900 text-5xl">waves</span>
    </div>
    <div className="text-center">
      <h1 className="text-2xl font-bold text-white mb-1">SurfTrack Pro</h1>
      <p className="text-slate-400 text-sm">Loading your surf data…</p>
    </div>
    <div className="flex gap-2 mt-2">
      <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  </div>
);

// ─── Inner App (has access to context) ────────────────────────────────────────
const AppInner: React.FC = () => {
  const { isLoadingAuth, isGuest } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.HOME);
  const [selectedSpot, setSelectedSpot] = useState<SurfSpot | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionLog | null>(null);

  const navigate = useCallback((screen: Screen) => setCurrentScreen(screen), []);

  if (isLoadingAuth) {
    return <AuthLoadingSplash />;
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case Screen.HOME:
        return <HomeScreen onNavigate={navigate} />;

      case Screen.SPOT_DETAIL:
        return (
          <SpotDetailScreen
            onNavigate={navigate}
            onBack={() => navigate(Screen.SPOT_LIST)}
            spot={selectedSpot}
          />
        );

      case Screen.LOG_SESSION:
        return (
          <LogSessionScreen
            onBack={() => navigate(Screen.HOME)}
            onComplete={(session?: SessionLog) => {
              if (session) setSelectedSession(session);
              navigate(Screen.SESSION_DETAIL);
            }}
          />
        );

      case Screen.SURF_MATCH:
        return <SurfMatchScreen />;

      case Screen.QUIVER:
        return <QuiverScreen onNavigate={navigate} />;

      case Screen.ADD_BOARD:
        return (
          <AddBoardScreen
            onBack={() => navigate(Screen.QUIVER)}
            onSave={() => navigate(Screen.QUIVER)}
          />
        );

      case Screen.SPOT_LIST:
        return (
          <SpotListScreen
            onNavigate={navigate}
            onSelectSpot={(spot: SurfSpot) => {
              setSelectedSpot(spot);
              navigate(Screen.SPOT_DETAIL);
            }}
          />
        );

      case Screen.PROFILE:
        return <ProfileScreen onNavigate={navigate} />;

      case Screen.SESSION_DETAIL:
        return (
          <SessionDetailScreen
            onBack={() => navigate(Screen.PROFILE)}
            session={selectedSession}
          />
        );

      case Screen.SKILL_PROGRESSION:
        return <SkillProgressionScreen onBack={() => navigate(Screen.PROFILE)} />;

      case Screen.COMMUNITY:
        return <CommunityScreen />;

      case Screen.SIGN_UP:
        return <SignUpScreen onNavigate={navigate} />;

      case Screen.SIGN_IN:
        return <SignInScreen onNavigate={navigate} />;

      case Screen.FORGOT_PASSWORD:
        return <ForgotPasswordScreen onNavigate={navigate} />;

      default:
        return <HomeScreen onNavigate={navigate} />;
    }
  };

  const showNav = !HIDE_NAV_SCREENS.includes(currentScreen);

  return (
    <ThemeProvider>
      <AppProvider isGuest={isGuest}>
        <div className="max-w-md mx-auto min-h-screen relative overflow-hidden">
          {renderScreen()}

        {showNav && isGuest && (
          <GuestBanner onNavigate={navigate} />
        )}

        {showNav && (
          <Navigation currentScreen={currentScreen} onNavigate={navigate} />
        )}
      </div>
    </AppProvider>
    </ThemeProvider>
  );
};

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
       <ToastProvider>
         <AppInner />
       </ToastProvider>
    </AuthProvider>
  );
}