import React from 'react';
import { Screen } from '../types';

interface NavigationProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentScreen, onNavigate }) => {
  const getTabClass = (screen: Screen) => {
    const isActive = currentScreen === screen || 
      (screen === Screen.HOME && currentScreen === Screen.SURF_MATCH) ||
      (screen === Screen.SPOT_LIST && currentScreen === Screen.SPOT_DETAIL) ||
      (screen === Screen.PROFILE && (currentScreen === Screen.QUIVER || currentScreen === Screen.SKILL_PROGRESSION));
      
    return isActive ? "text-primary" : "text-slate-500 hover:text-primary transition-colors";
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background-dark/95 backdrop-blur-lg border-t border-border px-6 pt-3 pb-8">
      <div className="flex items-center justify-between max-w-md mx-auto">
        <button onClick={() => onNavigate(Screen.HOME)} className={`flex flex-col items-center ${getTabClass(Screen.HOME)}`}>
          <span className="material-icons-round">dashboard</span>
          <span className="text-[10px] font-medium mt-1">Home</span>
        </button>
        <button onClick={() => onNavigate(Screen.SPOT_LIST)} className={`flex flex-col items-center ${getTabClass(Screen.SPOT_LIST)}`}>
          <span className="material-icons-round">explore</span>
          <span className="text-[10px] font-medium mt-1">Spots</span>
        </button>
        <button 
          onClick={() => onNavigate(Screen.LOG_SESSION)}
          className="flex items-center justify-center bg-primary text-text w-14 h-14 rounded-full -mt-10 shadow-lg shadow-primary/40 border-4 border-background-dark transform active:scale-95 transition-transform"
        >
          <span className="material-icons-round text-3xl">add</span>
        </button>
        <button onClick={() => onNavigate(Screen.COMMUNITY)} className={`flex flex-col items-center ${getTabClass(Screen.COMMUNITY)}`}>
          <span className="material-icons-round">groups</span>
          <span className="text-[10px] font-medium mt-1">Social</span>
        </button>
        <button onClick={() => onNavigate(Screen.PROFILE)} className={`flex flex-col items-center ${getTabClass(Screen.PROFILE)}`}>
          <span className="material-icons-round">person</span>
          <span className="text-[10px] font-medium mt-1">Profile</span>
        </button>
      </div>
    </nav>
  );
};