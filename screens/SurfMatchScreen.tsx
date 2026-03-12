import React, { useState, useEffect } from 'react';
import * as SunCalc from 'suncalc';
import { useAuth } from '@/src/context/AuthContext';
import { useApp } from '@/src/context/AppContext';
import { useUnits } from '@/src/hooks/useUnits';
import { getSpots, getUserProfile, addSession } from '@/src/services/firestore';
import { fetchOpenMeteoForecast } from '@/src/services/openMeteo';
import { computeSwellQuality } from '@/src/services/swellQuality';
import { PORTUGAL_SPOTS } from '@/src/data/portugalSpots';
import { getGeminiInsight, getSurfMatchInsights } from '@/src/services/geminiInsight';
import { getGeminiCache, setGeminiCache } from '@/src/utils/geminiCache';
import type { SurfSpot, ForecastSnapshot, SwellQualityScore } from '@/types';
import { Screen } from '@/types';

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface MatchResult {
  spot: SurfSpot;
  forecast: ForecastSnapshot;
  score: SwellQualityScore;
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface SurfMatchScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
}

export const SurfMatchScreen: React.FC<SurfMatchScreenProps> = ({ onNavigate }) => {
    const { user } = useAuth();
    const { spots, tides, homeSpotId, forecastFetchedAt, isForecastStale } = useApp();
    const units = useUnits();

    const [selectedDayIndex, setSelectedDayIndex] = useState(0);
    const [matches, setMatches] = useState<MatchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [personalInsight, setPersonalInsight] = useState<string | null>(null);
    const [allDayInsights, setAllDayInsights] = useState<Record<string, string>>({});
    const [topSpotId, setTopSpotId] = useState<string | null>(null);
    const [radiusKm, setRadiusKm] = useState<25 | 50 | 100>(25);

    // Initialise 7 days starting from today
    const [days] = useState<Date[]>(() => {
        const today = new Date();
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(today.getTime());
            d.setDate(today.getDate() + i);
            return d;
        });
    });

    const fetchMatches = async () => {
        if (!user) {
            setError('Please sign in to view tailored Surf Matches.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setMatches([]);

        try {
            const profile = await getUserProfile(user.uid);
            const userPrefs = profile ? { min: profile.preferredWaveHeightMin, max: profile.preferredWaveHeightMax } : undefined;

            let fetchedSpots = await getSpots();
            if (!fetchedSpots || fetchedSpots.length === 0) {
                fetchedSpots = spots;
            }

            const homeSpot = PORTUGAL_SPOTS.find(s => s.id === homeSpotId);

            const nearbySpots = homeSpot
              ? fetchedSpots.filter(s =>
                  getDistanceKm(
                    homeSpot.latitude,
                    homeSpot.longitude,
                    s.coordinates.lat,
                    s.coordinates.lng
                  ) <= radiusKm
                )
              : fetchedSpots; // no home spot set — show all spots

            // Use nearby spots filtered by radius; fall back to all if radius returns 0
            // Hard cap at 10 to prevent excessive forecast API calls
            const targetSpots = (nearbySpots.length > 0 ? nearbySpots : fetchedSpots).slice(0, 10);
            
            if (targetSpots.length === 0) {
                throw new Error('No spots available to verify conditions against.');
            }

            const activeDatePrefix = days[selectedDayIndex].toISOString().slice(0, 10);
            const localSpotRanks: MatchResult[] = [];

            for (const s of targetSpots) {
                try {
                    const localForecastLogs = await fetchOpenMeteoForecast(s.coordinates.lat, s.coordinates.lng);
                    const matchingDaySlices = localForecastLogs.filter(f => f.forecastHour.startsWith(activeDatePrefix));
                    
                    let optimizedWindow: MatchResult | null = null;
                    
                    const sunTimes = SunCalc.getTimes(new Date(`${activeDatePrefix}T12:00:00Z`), s.coordinates.lat, s.coordinates.lng);
                    const daylightSlices = matchingDaySlices.filter(snap => {
                        const t = new Date(snap.forecastHour);
                        return t >= sunTimes.sunrise && t <= sunTimes.sunset;
                    });
                    
                    const candidates = daylightSlices.length > 0 ? daylightSlices : matchingDaySlices;

                    for (const snap of candidates) {
                        const computedScore = computeSwellQuality(snap, s.breakProfile, s.coordinates, { skipDaylightCheck: true }, tides[s.id]);
                        if (!optimizedWindow || computedScore.score > optimizedWindow.score.score) {
                            optimizedWindow = { spot: s, forecast: snap, score: computedScore };
                        }
                    }

                    if (optimizedWindow) {
                        localSpotRanks.push(optimizedWindow);
                    }
                } catch (e) {
                    console.warn(`Forecast lookup bypass. Rate limit or region gap on spot: ${s.id}`, e);
                }
            }

            if (localSpotRanks.length === 0) {
                throw new Error('No favorable condition windows matched your criteria for this date.');
            }

            localSpotRanks.sort((a,b) => b.score.score - a.score.score);
            setMatches(localSpotRanks);

            const newTopSpotId = localSpotRanks[0]?.spot.id ?? null;
            setTopSpotId(prev => prev !== newTopSpotId ? newTopSpotId : prev);

        } catch (fatalObj: any) {
            console.error('Core match resolution failed:', fatalObj);
            setError(fatalObj.message || 'We could not fetch your matches right now.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMatches();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDayIndex, user, radiusKm]);

    useEffect(() => {
        const loadInsights = async () => {
            if (!topSpotId || !user) return;

            const today = new Date().toISOString().slice(0, 10);
            const cacheKey = `surfmatch_insights_${topSpotId}_${today}`;

            // Check cache first
            const cached = await getGeminiCache(user.uid, cacheKey);
            if (cached) {
                setAllDayInsights(JSON.parse(cached));
                return;
            }

            // Fetch all 7 days of forecast for the top spot
            try {
                const topSpot = spots.find(s => s.id === topSpotId);
                if (!topSpot) return;

                const profile = await getUserProfile(user.uid);
                const userPrefs = profile 
                    ? { min: profile.preferredWaveHeightMin, max: profile.preferredWaveHeightMax } 
                    : undefined;

                const fullForecasts = await fetchOpenMeteoForecast(
                    topSpot.coordinates.lat, 
                    topSpot.coordinates.lng
                );

                const insights = await getSurfMatchInsights(
                    fullForecasts,
                    topSpot.breakProfile,
                    userPrefs,
                    topSpot.coordinates
                );

                await setGeminiCache(user.uid, cacheKey, JSON.stringify(insights));
                setAllDayInsights(insights);
            } catch(e) {
                console.warn('Surf match insights failed:', e);
            }
        };

        loadInsights();
    }, [topSpotId, user]);

    // -- Handlers -- 
    const handleBookmarkCondition = async (matchPayload: MatchResult, bookmarkFormat: 'history' | 'wishlist') => {
        if (!user) return;
        try {
            await addSession(user.uid, {
                spotName: matchPayload.spot.name,
                spotId: matchPayload.spot.id,
                date: matchPayload.forecast.forecastHour,
                rating: Math.max(1, Math.floor(matchPayload.score.score / 20)),
                height: matchPayload.forecast.waveHeight.toString(),
                image: matchPayload.spot.image || '',
                timestamp: Date.now(),
                notes: bookmarkFormat === 'wishlist' ? 'Future Wishlist Condition' : '',
                conditionsSnapshot: {
                    waveHeight: matchPayload.forecast.waveHeight,
                    wavePeriod: matchPayload.forecast.wavePeriod,
                    windSpeed: matchPayload.forecast.windSpeed,
                    windDirection: matchPayload.forecast.windDirection,
                    tide: 0,
                } as any
            });
            alert('Condition archived to your progression timeline.');
        } catch(e) {
            console.error('Failed to snapshot timeline action:', e);
        }
    };

    // -- Component UI Render Logic --
    const getCalendarRef = (d: Date, idx: number) => {
        if (idx === 0) return "Today's";
        return d.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + d.getDate();
    };

    const getWindowLabel = (iso: string) => {
        const pivot = new Date(iso);
        const pivotStr = pivot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const close = new Date(pivot.getTime() + 3 * 60 * 60 * 1000);
        return `${pivotStr} — ${close.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

    const getWindColor = (speed: number) => {
        return speed < 15 ? 'text-green-500' : speed < 25 ? 'text-amber-500' : 'text-red-500';
    };

    return (
        <div className="pb-24">
            <header className="px-6 py-4 sticky top-0 z-30 bg-background/80 backdrop-blur-md">
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-primary/80">Tailored Forecast</p>
                        <h1 className="text-3xl font-bold tracking-tight text-text">Surf Match</h1>
                        
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="material-icons-round text-textMuted text-sm">my_location</span>
                          {homeSpotId ? (
                            <>
                              <span className="text-xs text-textMuted font-medium">Within</span>
                              {([25, 50, 100] as const).map(r => (
                                <button
                                  key={r}
                                  onClick={() => setRadiusKm(r)}
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase 
                                    transition-colors ${
                                      radiusKm === r
                                        ? 'bg-primary text-white'
                                        : 'bg-surface border border-border text-textMuted hover:border-primary/40'
                                    }`}
                                >
                                  {r}km
                                </button>
                              ))}
                            </>
                          ) : (
                            <button
                              onClick={() => onNavigate(Screen.EDIT_PROFILE)}
                              className="text-[10px] text-primary font-bold underline underline-offset-2"
                            >
                              Set home break for local matches
                            </button>
                          )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="px-6 pb-32">
                <div className="flex gap-4 overflow-x-auto py-6" style={{ scrollbarWidth: 'none' }}>
                    {days.map((d, index) => {
                        const isSelected = selectedDayIndex === index;
                        return (
                            <button 
                                key={index} 
                                onClick={() => setSelectedDayIndex(index)}
                                className={`flex flex-col flex-shrink-0 items-center min-w-[56px] p-3 rounded-2xl cursor-pointer transition-colors ${isSelected ? 'bg-primary text-white shadow-lg shadow-primary/30 transform scale-105' : 'bg-primary/10 border border-border hover:bg-primary/20 text-textMuted'}`}
                            >
                                <span className={`text-xs font-medium ${isSelected ? 'opacity-90 text-white' : ''}`}>
                                    {dayNames[d.getDay()]}
                                </span>
                                <span className={`text-xl font-bold ${isSelected ? 'text-white' : 'text-text'}`}>
                                    {d.getDate()}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-text">
                    <span className="material-icons-round text-primary text-sm">stars</span>
                    {getCalendarRef(days[selectedDayIndex], selectedDayIndex)} Best Matches
                </h2>

                {isLoading && (
                    <div className="flex justify-center items-center py-12">
                        <span className="material-icons-round text-4xl text-primary animate-spin">sync</span>
                    </div>
                )}

                {error && !isLoading && (
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-center">
                        <p className="text-red-400 text-sm mb-3">{error}</p>
                        <button onClick={fetchMatches} className="px-4 py-2 bg-red-500/20 text-red-500 rounded-lg text-xs font-bold uppercase border border-red-500/30 hover:bg-red-500/30 transition-colors">Retry Matching</button>
                    </div>
                )}

                {!isLoading && !error && (
                    <div className="space-y-6">
                        {homeSpotId && isForecastStale(homeSpotId, 180) && (
                          <div className="bg-amber-900/40 rounded-lg p-2 text-amber-300 text-xs flex items-center gap-2 mb-3">
                            <span className="material-icons-round text-sm">schedule</span>
                            Forecast data may be outdated — results based on last fetch
                          </div>
                        )}
                        {matches.map((match, idx) => {
                            const isTopMatch = idx === 0;
                            const dtPoint = new Date(match.forecast.forecastHour);
                            const phase = dtPoint.getUTCHours() < 12 ? 'Morning' : 'Afternoon';
                            const matchTitle = `${dayNames[dtPoint.getDay()]} ${phase}`;

                            return (
                                <div key={match.spot.id} className="rounded-xl p-5 bg-surface border border-border shadow-sm relative overflow-hidden group hover:border-primary/30 transition-colors">
                                    {isTopMatch && <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/20 transition-colors"></div>}
                                    
                                    <div className="flex gap-4 items-start mb-6 relative z-10">
                                        <div className={`w-16 h-16 flex-shrink-0 rounded-2xl flex flex-col items-center justify-center text-text ${isTopMatch ? 'bg-primary shadow-lg shadow-primary/30 text-white' : 'bg-background border border-border shadow-md'}`}>
                                             <span className="text-xl font-bold">{match.score.score}%</span>
                                             <span className={`text-[10px] uppercase font-bold ${isTopMatch ? 'text-white/80' : 'text-textMuted'}`}>Match</span>
                                        </div>
                                        
                                        <div>
                                            <h3 className="text-xl font-bold mb-1 text-text">{matchTitle}</h3>
                                            <p className="text-sm text-textMuted flex items-center gap-1">
                                                <span className="material-icons-round text-xs">location_on</span>
                                                {match.spot.name}
                                            </p>
                                            {homeSpotId && (() => {
                                              const homeSpot = PORTUGAL_SPOTS.find(s => s.id === homeSpotId);
                                              if (!homeSpot) return null;
                                              const dist = getDistanceKm(
                                                homeSpot.latitude,
                                                homeSpot.longitude,
                                                match.spot.coordinates.lat,
                                                match.spot.coordinates.lng
                                              );
                                              return (
                                                <p className="text-[10px] text-textMuted font-medium mt-0.5 flex items-center gap-0.5">
                                                  <span className="material-icons-round text-[10px]">near_me</span>
                                                  {dist.toFixed(0)}km away
                                                </p>
                                              );
                                            })()}
                                            <p className="text-xs font-medium text-primary mt-1">{getWindowLabel(match.forecast.forecastHour)}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 mb-6 relative z-10">
                                        <div className="bg-background pt-2 pb-2 rounded-lg text-center border border-border">
                                            <span className="block text-[10px] uppercase tracking-tighter text-textMuted">Swell</span>
                                            <span className="text-sm font-bold text-text">{units.height(match.forecast.waveHeight)}</span>
                                        </div>
                                        <div className="bg-background pt-2 pb-2 rounded-lg text-center border border-border">
                                            <span className="block text-[10px] uppercase tracking-tighter text-textMuted">Period</span>
                                            <span className="text-sm font-bold text-text">{match.forecast.wavePeriod.toFixed(0)}s</span>
                                        </div>
                                        <div className="bg-background pt-2 pb-2 rounded-lg text-center border border-border">
                                            <span className="block text-[10px] uppercase tracking-tighter text-textMuted">Wind</span>
                                            <span className={`text-sm font-bold ${getWindColor(match.forecast.windSpeed)}`}>
                                                {units.speed(match.forecast.windSpeed)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-6 relative z-10">
                                        <p className="text-xs font-bold text-textMuted uppercase tracking-widest">Why it's a match</p>
                                        <ul className="space-y-2">
                                            {match.score.reasons.map((r, i) => (
                                                <li key={i} className="flex items-center gap-2 text-sm text-textMuted">
                                                    <span className="material-icons-round text-primary text-xs">check_circle</span>
                                                    <span>{r}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    
                                    {selectedDayIndex === 0 ? (
                                        <button 
                                            onClick={() => handleBookmarkCondition(match, 'history')} 
                                            className="relative z-10 w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                                        >
                                            <span className="material-icons-round text-sm">calendar_today</span>
                                            Save to My Sessions
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleBookmarkCondition(match, 'wishlist')} 
                                            className="relative z-10 w-full py-3 bg-background border border-border hover:border-primary/40 text-primary font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                                        >
                                            <span className="material-icons-round text-sm">bookmark_border</span>
                                            Add to Wishlist
                                        </button>
                                    )}
                                </div>
                            );
                        })}

                        {matches.length > 0 && (
                            <div className="bg-gradient-to-br from-primary to-blue-700 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden mt-6">
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="material-icons-round text-sm text-white/80">psychology</span>
                                        <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/80">Personal Insight</span>
                                    </div>
                                    <h4 className="text-lg font-bold mb-3 text-white">AI Coach</h4>
                                    
                                    {(() => {
                                        const activeDatePrefix = days[selectedDayIndex].toISOString().slice(0, 10);
                                        const todayInsight = allDayInsights[activeDatePrefix] ?? null;
                                        
                                        return todayInsight === null ? (
                                            <div className="animate-pulse space-y-2 mb-2">
                                                <div className="h-3 bg-white/30 rounded w-full"></div>
                                                <div className="h-3 bg-white/30 rounded w-5/6"></div>
                                            </div>
                                        ) : (
                                            <p className="text-sm opacity-95 leading-relaxed font-medium">
                                                {todayInsight}
                                            </p>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};