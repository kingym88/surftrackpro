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
import { EditProfileScreen } from '@/screens/EditProfileScreen';
import { UserProfileProvider } from '@/src/context/UserProfileContext';
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
  Screen.EDIT_PROFILE,
];

// ─── Auth Loading Splash ───────────────────────────────────────────────────────
const AuthLoadingSplash: React.FC = () => (
  <div className="bg-slate-900 h-screen w-screen flex items-center justify-center">
    <span className="material-icons-round text-5xl text-cyan-500 animate-pulse">waves</span>
  </div>
);

// ─── Inner App (has access to context) ────────────────────────────────────────
const AppInner: React.FC = () => {
  const { isLoadingAuth, isGuest, user } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.HOME);
  const [selectedSpot, setSelectedSpot] = useState<SurfSpot | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionLog | null>(null);

  const navigate = useCallback((screen: Screen, params?: any) => {
    if (params?.spot) setSelectedSpot(params.spot);
    if (params?.session) setSelectedSession(params.session);
    setCurrentScreen(screen);
  }, []);

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
          <LogSessionScreen onNavigate={navigate} />
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
          <SpotListScreen onNavigate={navigate} />
        );

      case Screen.PROFILE:
        return (
          <ProfileScreen onNavigate={navigate} />
        );

      case Screen.EDIT_PROFILE:
        return <EditProfileScreen onNavigate={navigate} />;

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
    <AppProvider isGuest={isGuest} uid={user?.uid}>
      <ToastProvider>
        {/*
          NOTE: No overflow or scroll property here — the browser window is the scroll root.
          This is required for `position: sticky` on headers (e.g. SpotDetailScreen) to work.
          Do NOT add overflow-hidden, overflow-auto, or overflow-scroll to this div;
          any of those would create a new scroll context and silently break sticky headers.

          Screens audited for scroll/height dependencies (none rely on this div as scroll root):
          - LogSessionScreen: uses h-screen only on its empty-state guard div — safe.
          - SessionDetailScreen: uses h-screen only on its empty-state guard div — safe.
          - SpotDetailScreen: uses h-screen only on its no-spot guard div — safe.
          - SignUpScreen: self-manages scroll with its own overflow-y-auto — safe.
          - All other screens: min-h-screen only, scroll naturally via the window — safe.
        */}
        <div className="max-w-md mx-auto min-h-screen">
          {renderScreen()}

          {showNav && isGuest && (
            <GuestBanner onNavigate={navigate} />
          )}

          {showNav && (
            <Navigation currentScreen={currentScreen} onNavigate={navigate} />
          )}
        </div>
      </ToastProvider>
    </AppProvider>
  );
};

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UserProfileProvider>
          <AppInner />
        </UserProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}