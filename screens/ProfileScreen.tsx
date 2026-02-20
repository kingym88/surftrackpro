import React, { useMemo } from 'react';
import { Screen } from '../types';
import { useAuth } from '@/src/context/AuthContext';
import { useApp } from '@/src/context/AppContext';
import { useTheme } from '@/src/context/ThemeContext';

interface ProfileScreenProps {
  onNavigate: (screen: Screen) => void;
  onSelectSession?: (session: any) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onNavigate, onSelectSession }) => {
  const { user, signOut } = useAuth();
  const { sessions, quiver, isGuest } = useApp();
  const { theme, toggleTheme } = useTheme();

  // Aggregate user stats
  const stats = useMemo(() => {
    if (isGuest) {
      return { totalSessions: '--', lastSurfDays: '--', topSpotName: '--', topSpotCount: '--', boardUsage: [], wavesLogged: '--', spotsVisited: '--' };
    }

    const totalSessions = sessions.length;
    let lastSurfDays = '--';
    if (totalSessions > 0) {
       const latestSession = Math.max(...sessions.map(s => s.timestamp));
       const days = Math.floor((Date.now() - latestSession) / (1000 * 60 * 60 * 24));
       lastSurfDays = days === 0 ? 'Today' : `${days}d`;
    }
    
    // Most surfed spot
    const spotCounts = sessions.reduce((acc, s) => {
       acc[s.spotName] = (acc[s.spotName] || 0) + 1;
       return acc;
    }, {} as Record<string, number>);
    
    let topSpotName = '--';
    let topSpotCount: number | string = 0;
    Object.entries(spotCounts).forEach(([name, count]) => {
        if (count > (topSpotCount as number)) {
            topSpotCount = count;
            topSpotName = name;
        }
    });

    const spotsVisited = Object.keys(spotCounts).length;
    const wavesLogged = sessions.reduce((sum, s) => sum + (s.waveCount || 0), 0);

    // Board Usage breakdown
    const boardCounts = sessions.reduce((acc, s) => {
       if(s.boardId) {
          acc[s.boardId] = (acc[s.boardId] || 0) + 1;
       }
       return acc;
    }, {} as Record<string, number>);

    // Turn board usage into sorted array mapping to full Board objects
    const boardUsage = Object.entries(boardCounts)
      .map(([id, count]) => {
         const boardInfo = quiver.find(b => b.id === id);
         return {
            id,
            count,
            percentage: totalSessions > 0 ? Math.round((count / totalSessions) * 100) : 0,
            board: boardInfo
         };
      })
      .sort((a,b) => b.count - a.count)
      .slice(0, 3); // Top 3

    return { totalSessions, lastSurfDays, topSpotName, topSpotCount, boardUsage, wavesLogged, spotsVisited };
  }, [sessions, quiver, isGuest]);


  // Find last 2 epic sessions (rating >= 4)
  const epicSessions = useMemo(() => {
     if (isGuest) return [];
     return sessions
        .filter(s => s.rating >= 4)
        .sort((a,b) => b.timestamp - a.timestamp)
        .slice(0, 2);
  }, [sessions, isGuest]);


  return (
    <div className="pb-24 bg-background min-h-screen text-text font-sans selection:bg-primary/20">
      {/* Profile Header Section */}
      <header className="px-6 pt-6 pb-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            {isGuest ? (
              <span className="material-icons-round text-7xl text-slate-500">account_circle</span>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full border border-border flex items-center justify-center bg-surface overflow-hidden shadow-sm">
                    <span className="material-icons-round text-4xl text-textMuted">person</span>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-primary text-white p-1 rounded-full border-2 border-background shadow-sm">
                  <span className="material-icons-round text-[12px]">verified</span>
                </div>
              </>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold tracking-tight text-text">
               {user ? user.displayName || 'Surfer' : 'Guest User'}
            </h1>
            <div className="flex items-center text-textMuted text-sm mt-0.5 font-medium">
              <span className="material-icons-round text-xs mr-1 text-primary">location_on</span>
              {user ? 'Lisbon, PT' : 'Local Break'}
            </div>
            {isGuest ? (
              <button onClick={() => onNavigate(Screen.SIGN_UP)} className="mt-2 text-xs font-bold uppercase tracking-wider bg-primary text-white px-4 py-2 rounded-full border border-primary hover:bg-primary/80 transition-colors shadow-sm">
                Create your profile
              </button>
            ) : (
              <button className="mt-2 text-xs font-bold uppercase tracking-wider bg-surface text-text px-3 py-1.5 rounded-full border border-border hover:bg-border transition-colors shadow-sm">
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-3 gap-3 mt-8">
          <div className="bg-surface p-3 rounded-xl border border-border text-center shadow-sm">
            <p className="text-[10px] text-textMuted font-bold uppercase tracking-wider">Sessions</p>
            <p className="text-2xl font-black text-primary">{stats.totalSessions}</p>
          </div>
          <div className="bg-surface p-3 rounded-xl border border-border text-center shadow-sm">
            <p className="text-[10px] text-textMuted font-bold uppercase tracking-wider">Waves</p>
            <p className="text-2xl font-black text-text">{stats.wavesLogged}</p>
          </div>
          <div className="bg-surface p-3 rounded-xl border border-border text-center shadow-sm">
            <p className="text-[10px] text-textMuted font-bold uppercase tracking-wider">Spots Visited</p>
            <p className="text-2xl font-black text-text border-slate-700/50">{stats.spotsVisited}</p>
          </div>
        </div>
      </header>

      {/* Surf Stats Section */}
      <section className="px-6 py-4">
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-lg font-bold text-text font-display">Activity</h2>
          <span className="text-[10px] text-primary font-bold uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded">All Time</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {/* Most Surfed Spot */}
          <div className="bg-surface p-4 rounded-xl border border-border shadow-sm">
            <div className="w-8 h-8 bg-background border border-border rounded-lg flex items-center justify-center mb-3">
              <span className="material-icons-round text-primary text-lg">explore</span>
            </div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-textMuted mb-0.5">Top Spot</p>
            <h3 className="text-base font-bold truncate text-text">{stats.topSpotName}</h3>
            <p className="text-[10px] font-medium text-primary mt-1">{stats.topSpotCount} SESSIONS</p>
          </div>
          {/* Average Wave Height */}
          <div className="bg-surface p-4 rounded-xl border border-border shadow-sm">
            <div className="w-8 h-8 bg-background border border-border rounded-lg flex items-center justify-center mb-3">
              <span className="material-icons-round text-accent2 text-lg">water</span>
            </div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-textMuted mb-0.5">Avg Height</p>
            <h3 className="text-base font-bold text-text">{isGuest ? '--' : '3 - 5 FT'}</h3>
            {!isGuest && (
              <div className="flex items-center space-x-1 mt-1">
                <div className="h-1.5 w-full bg-background rounded-full overflow-hidden border border-border">
                  <div className="h-full bg-accent2" style={{ width: '65%' }}></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Board Usage */}
        {stats.boardUsage.length > 0 && (
            <div onClick={() => onNavigate(Screen.QUIVER)} className="mt-4 bg-surface p-5 rounded-2xl border border-border shadow-sm cursor-pointer hover:border-primary/50 transition-colors">
            <div className="flex justify-between items-center mb-4">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Quiver Usage</p>
                <span className="material-icons-round text-slate-400 text-sm">chevron_right</span>
            </div>
            <div className="space-y-4">
                {stats.boardUsage.map((usage, idx) => (
                    <div key={usage.id} className="flex items-center">
                        <div className="w-8 mr-3 opacity-60 flex items-center justify-center">
                            <span className="material-icons-round text-textMuted text-lg">{idx === 0 ? 'surfing' : 'waves'}</span>
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between text-xs mb-1 font-bold">
                                <span className="text-text truncate w-32">{usage.board?.brand || 'Board'} {usage.board?.model}</span>
                                <span className={idx === 0 ? 'text-primary' : 'text-textMuted'}>{usage.percentage}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-background border border-border rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${idx === 0 ? 'bg-primary' : 'bg-textMuted/40'}`} style={{ width: `${usage.percentage}%` }}></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            </div>
        )}
      </section>

      {/* Skill Progression Visualizer */}
      <section className="px-6 py-4" onClick={() => onNavigate(Screen.SKILL_PROGRESSION)}>
        <div className="bg-primary/5 p-6 rounded-2xl border border-primary/20 relative overflow-hidden shadow-inner cursor-pointer hover:bg-primary/10 transition-all group">
          <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-primary font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                   <span className="material-icons-round text-[12px]">psychology</span> AI Coached Mode
                </p>
                <h3 className="text-2xl font-black text-text tracking-tight font-display group-hover:text-primary transition-colors">Skill Progression</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center shadow-sm">
                 <span className="material-icons-round text-text">arrow_forward</span>
              </div>
          </div>
        </div>
      </section>

      {/* Epic Sessions */}
      {epicSessions.length > 0 && (
          <section className="py-4">
          <div className="px-6 flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-text font-display">Epic Sessions</h2>
              <button className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded">View All</button>
          </div>
          <div className="flex overflow-x-auto gap-4 px-6 pb-2 hide-scrollbar">
              {epicSessions.map(session => (
                 <div 
                    key={session.id}
                    onClick={() => {
                        if (onSelectSession) onSelectSession(session);
                        onNavigate(Screen.SESSION_DETAIL);
                    }} 
                    className="min-w-[280px] h-44 relative rounded-2xl overflow-hidden group cursor-pointer border border-border shadow-sm"
                  >
                  <img src={session.image || 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'} alt="Session Wave" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80 mix-blend-overlay" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"></div>
                  <div className="absolute top-3 left-3 bg-primary text-[10px] font-bold px-2 py-0.5 rounded shadow-sm text-white">
                      {session.rating.toFixed(1)} RATING
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-[10px] text-textMuted font-bold uppercase tracking-widest">
                          {new Date(session.timestamp).toLocaleDateString()}
                      </p>
                      <h4 className="text-xl font-black text-text">{session.spotName || 'Local Break'}</h4>
                      
                      {session.conditionsSnapshot && (
                         <div className="flex items-center space-x-3 mt-1.5">
                            <span className="text-xs text-textMuted font-bold flex items-center">
                               {session.conditionsSnapshot.waveHeight.toFixed(1)}ft @ {session.conditionsSnapshot.wavePeriod}s
                            </span>
                         </div>
                      )}
                  </div>
                  </div>
              ))}
          </div>
          </section>
      )}

      {/* Settings Section */}
      <section className="px-6 py-4 mb-2">
         <h2 className="text-lg font-bold text-text font-display mb-4">Settings</h2>
         <div className="bg-surface rounded-2xl border border-border overflow-hidden">
            <div className="p-4 flex justify-between items-center border-b border-border">
               <div className="flex items-center gap-3">
                  <span className="material-icons-round text-textMuted">{theme === 'dark' ? 'dark_mode' : 'light_mode'}</span>
                  <span className="text-sm font-bold text-text">Dark Mode</span>
               </div>
               <button 
                  onClick={toggleTheme}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-slate-300'}`}
               >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}></div>
               </button>
            </div>
         </div>
      </section>

      {/* Sign Out */}
      {!isGuest && (
        <div className="px-6 py-4">
           <button 
              onClick={() => {
                 signOut();
                 onNavigate(Screen.HOME);
              }} 
              className="w-full bg-red-500/10 text-red-500 font-bold py-4 rounded-full shadow-sm hover:bg-red-500/20 transition-colors"
           >
              SIGN OUT
           </button>
        </div>
      )}
    </div>
  );
};