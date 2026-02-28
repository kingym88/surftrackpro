import React, { useState, useEffect } from 'react';
import { Screen, SurfSpot } from '../types';
import { GuestGate } from '@/src/components/GuestGate';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/context/AuthContext';
import { PORTUGAL_SPOTS } from '@/src/data/portugalSpots';
import { Preferences } from '@capacitor/preferences';
import { updateUserProfile } from '@/src/services/firestore';
import { ForecastChartSkeleton } from '@/src/components/Skeletons';
import { computeSwellQuality } from '@/src/services/swellQuality';
import { ForecastStrip } from '@/src/components/ForecastStrip';
import { TideMiniChart } from '@/src/components/TideMiniChart';
import { getGeminiInsight } from '@/src/services/geminiInsight';
import * as SunCalc from 'suncalc';
import { useUnits } from '@/src/hooks/useUnits';
import type { GeminiInsight } from '@/types';

interface HomeScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const { homeSpotId, setHomeSpotId, forecasts, isLoadingForecast, forecastError, isGuest, tides, preferredWaveHeight, nearbySpotIds, sessions } = useApp();
  const { user } = useAuth();
  const units = useUnits();

  const [showSpotPicker, setShowSpotPicker] = useState(!homeSpotId);
  const [insight, setInsight] = useState<GeminiInsight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    setShowSpotPicker(!homeSpotId);
  }, [homeSpotId]);

  const homeSpot = PORTUGAL_SPOTS.find(s => s.id === homeSpotId);
  const homeForecast = homeSpotId ? forecasts[homeSpotId] : undefined;
  const currentSnap = homeForecast && homeForecast.length > 0
    ? homeForecast.reduce((closest, snap) => {
        const now = Date.now();
        const closestDiff = Math.abs(new Date(closest.forecastHour).getTime() - now);
        const snapDiff    = Math.abs(new Date(snap.forecastHour).getTime() - now);
        return snapDiff < closestDiff ? snap : closest;
      })
    : undefined;

  useEffect(() => {
    if (homeSpotId && homeForecast && !isGuest && homeSpot) {
      setLoadingInsight(true);
      const breakProfile = homeSpot.breakProfile;

      getGeminiInsight(homeForecast, breakProfile, sessions, preferredWaveHeight || { min: 0.5, max: 3.0 }, { lat: homeSpot.latitude, lng: homeSpot.longitude })
        .then(setInsight)
        .catch(console.error)
        .finally(() => setLoadingInsight(false));
    }
  }, [homeSpotId, homeForecast, isGuest, sessions, preferredWaveHeight, homeSpot]);

  const handleSpotSelect = async (spotId: string) => {
    setHomeSpotId(spotId);
    if (isGuest) {
      await Preferences.set({ key: 'guest_homeSpotId', value: spotId });
    } else if (user) {
      await updateUserProfile(user.uid, { homeSpotId: spotId });
    }
    setShowSpotPicker(false);
    setSearchQuery('');
    setTimeout(() => setShowSuggestions(false), 200); // small delay to allow click
  };

  const toSurfSpot = (seed: typeof PORTUGAL_SPOTS[0]): SurfSpot => ({
    id: seed.id,
    name: seed.name,
    distance: '— km',
    swellDirection: 'W',
    height: '— m',
    condition: 'FAIR',
    image: '',
    coordinates: { lat: seed.latitude, lng: seed.longitude },
    region: seed.region,
    country: seed.country,
    breakProfile: seed.breakProfile
  });

  const filteredSuggestions = searchQuery.length >= 1 
    ? PORTUGAL_SPOTS.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5)
    : [];

  const getWindIcon = (dir: number) => {
    const dirs = ['north', 'north_east', 'east', 'south_east', 'south', 'south_west', 'west', 'north_west'];
    return dirs[Math.round(((dir + 180) % 360) / 45) % 8] || 'north';
  };

  const computeWindLabel = (dir: number) => {
    if (!homeSpot || !homeSpot.breakProfile) return "Wind";
    
    // Convert compass facing to degrees
    const compassToDeg = (c: string): number => {
      const map: Record<string, number> = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };
      return map[c.toUpperCase()] ?? 0;
    };
    
    const facingDeg = compassToDeg(homeSpot.breakProfile.facingDirection);
    const offshoreDeg = (facingDeg + 180) % 360;
    
    // Calculate smallest difference between wind dir and perfect offshore
    const diff = Math.abs(dir - offshoreDeg) % 360;
    const finalDiff = diff > 180 ? 360 - diff : diff;
    
    if (finalDiff <= 45) return "Offshore";
    if (finalDiff <= 135) return "Cross-shore";
    return "Onshore";
  };

  const qualityScore = currentSnap ? computeSwellQuality(currentSnap, (homeSpot as any)?.breakProfile || {} as any, { lat: homeSpot?.latitude ?? 0, lng: homeSpot?.longitude ?? 0 }) : null;

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
        <button className="relative bg-white/5 p-2.5 rounded-full border border-white/10 hover:bg-white/10 transition-colors">
          <span className="material-icons-round">notifications</span>
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background-dark"></span>
        </button>
      </header>

      <main className="p-6 space-y-8">
        {/* Set Your Home Break */}
        {showSpotPicker && (
          <section className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h2 className="text-lg font-bold text-slate-200 mb-4">Set Your Home Break</h2>
            <div className="relative">
              <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">search</span>
              <input 
                type="text"
                placeholder="Search spots (e.g. Carcavelos)..."
                className="w-full bg-background text-slate-200 rounded-xl py-3 pl-10 pr-4 outline-none border border-white/10 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
              />
              
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                  {filteredSuggestions.map(s => (
                    <div 
                      key={s.id}
                      onClick={() => handleSpotSelect(s.id)}
                      className="p-4 hover:bg-white/10 cursor-pointer flex justify-between items-center border-b border-white/5 last:border-0"
                    >
                      <div>
                        <p className="font-bold text-sm text-slate-200">{s.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase">{s.region}</p>
                      </div>
                      <span className="material-icons-round text-primary text-sm">arrow_forward_ios</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {homeSpotId && (
              <button className="text-sm text-slate-500 mt-4 hover:text-slate-200 transition-colors" onClick={() => setShowSpotPicker(false)}>Cancel</button>
            )}
          </section>
        )}

        {/* Daily Forecast Hero */}
        {homeSpotId && (
          isLoadingForecast ? (
             <ForecastChartSkeleton />
          ) : (
            <section onClick={() => { if (homeSpot) onNavigate(Screen.SPOT_DETAIL, { spot: toSurfSpot(homeSpot) }); }} className="cursor-pointer group space-y-2">
              {forecastError && (
                <div className="bg-amber-900/40 rounded-lg p-2 text-amber-300 text-xs flex items-center gap-2">
                  <span className="material-icons-round text-sm">warning</span>
                  Data may be outdated — tap to retry
                </div>
              )}
              <div className="relative overflow-hidden bg-primary rounded-xl p-6 text-white shadow-xl shadow-primary/20 transition-transform group-hover:scale-[1.02]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10"></div>
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md">LIVE FORECAST</span>
                      <h2 className="text-4xl font-bold mt-4 tracking-tight">{units.height(currentSnap?.waveHeight ?? 0)}</h2>
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
                      <p className="text-sm font-bold">{units.speed(currentSnap?.windSpeed ?? 0)} <span className="material-icons-round text-[10px]">{getWindIcon(currentSnap?.windDirection ?? 0)}</span></p>
                      <p className="text-[10px] uppercase opacity-60">{computeWindLabel(currentSnap?.windDirection ?? 0)}</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="material-icons-round text-white/60 text-lg mb-1">water_drop</span>
                      <p className="text-sm font-bold">{units.temp(currentSnap?.airTemp ?? 0)}</p>
                      <p className="text-[10px] uppercase opacity-60">Water Temp</p>
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
            onDaySelect={(day) => { if (homeSpot) onNavigate(Screen.SPOT_DETAIL, { spot: toSurfSpot(homeSpot) }); }}
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
                      <p className="text-sm leading-relaxed text-slate-400">{insight?.summary || 'Log more sessions to get personalized matching.'}</p>
                    </>
                  )}
                  <p className="text-xs text-slate-500 mt-2 italic">Powered by Gemini</p>
                </div>
              </div>
            </section>
          </GuestGate>
        )}

        {/* Weather/Tide Quick Glance */}
        {homeSpotId && (() => {
           const tidesArray = tides[homeSpotId] ?? [];
           const spotDetail = PORTUGAL_SPOTS.find(s => s.id === homeSpotId);
           const now = new Date();
           
           // Upcoming Tide Info
           const upcomingTide = tidesArray.find(t => new Date(t.time) > now && (t.type === 'HIGH' || t.type === 'LOW'));
           
           const tideTimeText = upcomingTide 
             ? new Date(upcomingTide.time).toLocaleTimeString([], { timeZone: 'Europe/Lisbon', hour: '2-digit', minute:'2-digit'}) 
             : '--';
           
           const tideHeightText = upcomingTide 
             ? units.height(upcomingTide.height) 
             : '--';
           
           const tideLabel = upcomingTide?.type === 'HIGH' ? 'High' : 'Low';
           const tideTrendLabel = upcomingTide?.type === 'HIGH' ? 'rising' : 'falling';
           const tideIcon = upcomingTide?.type === 'HIGH' ? 'trending_up' : 'trending_down';

           // Sunset Info
           let sunsetTimeText = '--';
           let sunlightHours = 0;
           if (spotDetail) {
             const sunTimes = SunCalc.getTimes(now, spotDetail.latitude, spotDetail.longitude);
             sunsetTimeText = sunTimes.sunset.toLocaleTimeString([], { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit' });
             
             // Calculate daylight hours
             const msDiff = sunTimes.sunset.getTime() - sunTimes.sunrise.getTime();
             sunlightHours = Math.round(msDiff / 3600000);
           }

           return (
            <section className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-primary uppercase">Tide</p>
                  <span className="material-icons-round text-sm text-slate-500">{tideIcon}</span>
                </div>
                <h5 className="text-lg font-bold">{tideLabel} <span className="text-xs font-normal text-slate-500">at {tideTimeText}</span></h5>
                <p className="text-xs text-slate-400 mt-1">{tideHeightText} {tideTrendLabel}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-primary uppercase">Sun</p>
                  <span className="material-icons-round text-sm text-slate-500">wb_sunny</span>
                </div>
                <h5 className="text-lg font-bold">Sunset <span className="text-xs font-normal text-slate-500">at {sunsetTimeText}</span></h5>
                <p className="text-xs text-slate-400 mt-1">{sunlightHours}h of daylight</p>
              </div>
            </section>
           );
        })()}

        {/* Nearby Spots */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-slate-200">Nearby Spots</h3>
            <button onClick={() => onNavigate(Screen.SPOT_LIST)} className="text-primary text-xs font-bold uppercase tracking-wider hover:text-primary/80">View Map</button>
          </div>
          <div className="space-y-3">
            {nearbySpotIds.length === 0 && <p className="text-sm text-slate-500">No spots nearby or loading...</p>}
            {nearbySpotIds.map(nid => {
              const ndata = PORTUGAL_SPOTS.find(s => s.id === nid);
              const ncast = forecasts[nid]?.[0];
              const nscore = ncast ? computeSwellQuality(ncast, (ndata as any)?.breakProfile || {} as any, { lat: ndata?.latitude ?? 0, lng: ndata?.longitude ?? 0 }) : null;
              
              if (!ndata) return null;
              
              return (
                <div key={nid} onClick={() => { if (ndata) onNavigate(Screen.SPOT_DETAIL, { spot: toSurfSpot(ndata) }); }} className="bg-white/5 border border-white/5 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                      <img src={'https://lh3.googleusercontent.com/aida-public/AB6AXuDt812q345B5t6u7v8w9x0y1z2A3B4C5D6E7F8G9H0I1J2K3L4M5N6O7P8Q9R0S1T2U3V4W5X6Y7Z8a9b0c1d2e3f4g'} alt={ndata.name} className="w-full h-full object-cover opacity-80" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-200">{ndata.name}</h4>
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
                      <div className="bg-slate-500/20 text-slate-400 text-[10px] font-bold px-2 py-1 rounded uppercase mb-1 inline-block text-center border border-slate-700">LDG</div>
                    )}
                    <p className="text-sm font-bold text-slate-200">{ncast ? units.height(ncast.waveHeight) : '--'}</p>
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