import React, { useState, useEffect } from 'react';
import { Screen, SurfSpot } from '../types';
import { GuestGate } from '@/src/components/GuestGate';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/context/AuthContext';
import { portugalSpots } from '@/src/data/portugalSpots';
import { Preferences } from '@capacitor/preferences';
import { updateUserProfile } from '@/src/services/firestore';
import { ForecastChartSkeleton } from '@/src/components/Skeletons';
import { computeSwellQuality } from '@/src/services/swellQuality';
import { ForecastStrip } from '@/src/components/ForecastStrip';
import { TideMiniChart } from '@/src/components/TideMiniChart';
import { getGeminiInsight } from '@/src/services/geminiInsight';
import type { GeminiInsight } from '@/types';

interface HomeScreenProps {
  onNavigate: (screen: Screen) => void;
  onSelectSpot?: (spot: SurfSpot) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate, onSelectSpot }) => {
  const { homeSpotId, setHomeSpotId, forecasts, isLoadingForecast, forecastError, isGuest, tides, preferredWaveHeight, nearbySpotIds, sessions } = useApp();
  const { user } = useAuth();

  const [showSpotPicker, setShowSpotPicker] = useState(!homeSpotId);
  const [insight, setInsight] = useState<GeminiInsight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  useEffect(() => {
    setShowSpotPicker(!homeSpotId);
  }, [homeSpotId]);

  const homeSpot = portugalSpots.find(s => s.id === homeSpotId);
  const homeForecast = homeSpotId ? forecasts[homeSpotId] : undefined;
  const currentSnap = homeForecast?.[0];

  useEffect(() => {
    if (homeSpotId && homeForecast && !isGuest && homeSpot) {
      setLoadingInsight(true);
      // Dummy break profile for now or extract from real spot
      const breakProfile = (homeSpot as any).breakProfile || {
        breakType: 'beach',
        facingDirection: 'W',
        optimalSwellDirection: 'W-NW',
        optimalTidePhase: 'mid',
        optimalWindDirection: 'E-NE',
      };

      getGeminiInsight(homeForecast, breakProfile, sessions, preferredWaveHeight || { min: 0.5, max: 3.0 })
        .then(setInsight)
        .catch(console.error)
        .finally(() => setLoadingInsight(false));
    }
  }, [homeSpotId, homeForecast, isGuest, sessions, preferredWaveHeight, homeSpot]);

  const handleSpotSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) return;
    setHomeSpotId(val);
    if (isGuest) {
      await Preferences.set({ key: 'guest_homeSpotId', value: val });
    } else if (user) {
      await updateUserProfile(user.uid, { homeSpotId: val });
    }
    setShowSpotPicker(false);
  };

  const getWindIcon = (dir: number) => {
    const dirs = ['north', 'north_east', 'east', 'south_east', 'south', 'south_west', 'west', 'north_west'];
    return dirs[Math.round((dir % 360) / 45) % 8] || 'north';
  };

  const computeWindLabel = (dir: number) => {
    // simplified offshore/onshore logic
    return "Wind"; 
  };

  const qualityScore = currentSnap ? computeSwellQuality(currentSnap, (homeSpot as any)?.breakProfile || {} as any) : null;

  return (
    <div className="pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-primary/10">
        <div className="flex items-center gap-2">
          <div className="bg-primary/20 p-2 rounded-lg">
            <span className="material-icons-round text-primary">location_on</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Current Spot</p>
            <div className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setShowSpotPicker(!showSpotPicker)}>
              <h1 className="text-lg font-bold">{homeSpot?.name || 'Set Home Spot'}</h1>
              <span className="material-icons-round text-sm">{showSpotPicker ? 'expand_less' : 'expand_more'}</span>
            </div>
          </div>
        </div>
        <button className="relative bg-surface p-2.5 rounded-full border border-border hover:bg-surface hover:brightness-110 transition-colors">
          <span className="material-icons-round">notifications</span>
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background-dark"></span>
        </button>
      </header>

      <main className="p-6 space-y-8">
        {/* Set Your Home Break */}
        {showSpotPicker && (
          <section className="bg-surface rounded-xl p-6 border border-border">
            <h2 className="text-lg font-bold text-text mb-2">Set Your Home Break</h2>
            <select 
              onChange={handleSpotSelect}
              className="w-full bg-background text-text rounded p-3 mb-2 outline-none border border-border"
              value={homeSpotId || ''}
            >
              <option value="">Select a spot...</option>
              {portugalSpots.map(s => <option key={s.id} value={s.id}>{s.name} - {s.region}</option>)}
            </select>
            {homeSpotId && (
              <button className="text-sm text-primary" onClick={() => setShowSpotPicker(false)}>Cancel</button>
            )}
          </section>
        )}

        {/* Daily Forecast Hero */}
        {homeSpotId && (
          isLoadingForecast ? (
             <ForecastChartSkeleton />
          ) : (
            <section onClick={() => { if (homeSpot) onSelectSpot?.(homeSpot); }} className="cursor-pointer group space-y-2">
              {forecastError && (
                <div className="bg-amber-900/40 rounded-lg p-2 text-amber-300 text-xs flex items-center gap-2">
                  <span className="material-icons-round text-sm">warning</span>
                  Data may be outdated — tap to retry
                </div>
              )}
              <div className="relative overflow-hidden bg-primary rounded-xl p-6 text-white shadow-xl shadow-primary/20 transition-transform group-hover:scale-[1.02]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-surface hover:brightness-110 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10"></div>
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md">LIVE FORECAST</span>
                      <h2 className="text-4xl font-bold mt-4 tracking-tight">{(currentSnap?.waveHeight ?? 0).toFixed(1)}<span className="text-xl font-normal opacity-80">m</span></h2>
                      <p className="text-white/80 font-medium">{qualityScore?.label || 'FAIR'}</p>
                    </div>
                    <div className="text-right">
                      <span className="material-icons-round text-4xl">tsunami</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/20">
                    <div className="flex flex-col items-center">
                      <span className="material-icons-round text-white/60 text-lg mb-1">timer</span>
                      <p className="text-sm font-bold">{(currentSnap?.wavePeriod ?? 0).toFixed(0)}s</p>
                      <p className="text-[10px] uppercase opacity-60">Swell Period</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="material-icons-round text-white/60 text-lg mb-1">air</span>
                      <p className="text-sm font-bold">{(currentSnap?.windSpeed ?? 0).toFixed(0)}km/h <span className="material-icons-round text-[10px]">{getWindIcon(currentSnap?.windDirection ?? 0)}</span></p>
                      <p className="text-[10px] uppercase opacity-60">{computeWindLabel(currentSnap?.windDirection ?? 0)}</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="material-icons-round text-white/60 text-lg mb-1">water_drop</span>
                      <p className="text-sm font-bold">{(currentSnap?.airTemp ?? 0).toFixed(0)}°C</p>
                      <p className="text-[10px] uppercase opacity-60">Air Temp</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )
        )}

        {/* Forecast Strip */}
        {homeSpotId && (
          <ForecastStrip
            forecasts={homeForecast ?? []}
            onDaySelect={(day) => { if (homeSpot) onSelectSpot?.(homeSpot); }}
            isGuest={isGuest}
            onNavigate={onNavigate}
          />
        )}

        {/* Personalized Recommendations */}
        {homeSpotId && (
          <GuestGate featureName="AI Session Matching" onNavigate={onNavigate}>
            <section onClick={() => onNavigate(Screen.SURF_MATCH)} className="cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Personalized Insight</h3>
                <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase">AI Match</span>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex gap-4 items-start hover:bg-primary/10 transition-colors">
                <div className="bg-primary p-3 rounded-lg text-white">
                  <span className="material-icons-round">{loadingInsight ? 'sync' : 'psychology'}</span>
                </div>
                <div>
                  {loadingInsight ? (
                    <h4 className="font-bold text-primary mb-1 animate-pulse">Analyzing conditions...</h4>
                  ) : (
                    <>
                      <h4 className="font-bold text-primary mb-1">{insight?.bestWindows?.[0]?.startTime ? `Best time: ${new Date(insight.bestWindows[0].startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'No ideal window found yet'}</h4>
                      <p className="text-sm leading-relaxed text-textMuted">{insight?.summary || 'Log more sessions to get personalized matching.'}</p>
                    </>
                  )}
                  <p className="text-xs text-slate-500 mt-2 italic">Powered by Gemini</p>
                </div>
              </div>
            </section>
          </GuestGate>
        )}

        {/* Weather/Tide Quick Glance */}
        {homeSpotId && (
           <TideMiniChart tides={tides[homeSpotId] ?? []} guestMode={isGuest} />
        )}

        {/* Nearby Spots */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-text">Nearby Spots</h3>
            <button onClick={() => onNavigate(Screen.SPOT_LIST)} className="text-primary text-xs font-bold uppercase tracking-wider hover:text-primary/80">View Map</button>
          </div>
          <div className="space-y-3">
            {nearbySpotIds.length === 0 && <p className="text-sm text-textMuted">No spots nearby or loading...</p>}
            {nearbySpotIds.map(nid => {
              const ndata = portugalSpots.find(s => s.id === nid);
              const ncast = forecasts[nid]?.[0];
              const nscore = ncast ? computeSwellQuality(ncast, (ndata as any)?.breakProfile || {} as any) : null;
              
              if (!ndata) return null;
              
              return (
                <div key={nid} onClick={() => { if (ndata) onSelectSpot?.(ndata as any); }} className="bg-surface border border-border rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-surface hover:brightness-110 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-primary/20 flex-shrink-0 flex items-center justify-center">
                      <span className="material-icons-round text-primary opacity-80">waves</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{ndata.name}</h4>
                      <p className="text-xs text-slate-500">{ndata.region}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {nscore ? (
                       <div className={`text-[10px] font-bold px-2 py-1 rounded uppercase mb-1 inline-block text-center border ${
                         nscore.label === 'EPIC' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                         nscore.label === 'GOOD' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                         nscore.label === 'FAIR' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                         'bg-red-500/20 text-red-500 border-red-500/30'
                       }`}>
                         {nscore.label}
                       </div>
                    ) : (
                      <div className="bg-slate-500/20 text-textMuted text-[10px] font-bold px-2 py-1 rounded uppercase mb-1 inline-block text-center border border-slate-700">LDG</div>
                    )}
                    <p className="text-sm font-bold text-text">{ncast ? `${ncast.waveHeight.toFixed(1)}m` : '--'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};