import React, { useState, useEffect } from 'react';
import * as SunCalc from 'suncalc';
import { useAuth } from '@/src/context/AuthContext';
import { useApp } from '@/src/context/AppContext';
import { useUnits } from '@/src/hooks/useUnits';
import { getSpots, getUserProfile, addSession } from '@/src/services/firestore';
import { fetchOpenMeteoForecast } from '@/src/services/openMeteo';
import { computeSwellQuality } from '@/src/services/swellQuality';
import { getGeminiInsight } from '@/src/services/geminiInsight';
import type { SurfSpot, ForecastSnapshot, SwellQualityScore } from '@/types';

interface MatchResult {
  spot: SurfSpot;
  forecast: ForecastSnapshot;
  score: SwellQualityScore;
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const SurfMatchScreen: React.FC = () => {
    const { user } = useAuth();
    const { spots } = useApp();
    const units = useUnits();

    const [selectedDayIndex, setSelectedDayIndex] = useState(0);
    const [matches, setMatches] = useState<MatchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [personalInsight, setPersonalInsight] = useState<string | null>(null);

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
        setPersonalInsight(null);

        try {
            const profile = await getUserProfile(user.uid);
            const userPrefs = profile ? { min: profile.preferredWaveHeightMin, max: profile.preferredWaveHeightMax } : undefined;

            let fetchedSpots = await getSpots();
            if (!fetchedSpots || fetchedSpots.length === 0) {
                fetchedSpots = spots;
            }

            const targetSpots = fetchedSpots.slice(0, 5); 
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
                        const computedScore = computeSwellQuality(snap, s.breakProfile, s.coordinates, { skipDaylightCheck: true });
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

            try {
                const highestMatchTier = localSpotRanks[0];
                const genAI = await getGeminiInsight([highestMatchTier.forecast], highestMatchTier.spot.breakProfile, [], userPrefs, highestMatchTier.spot.coordinates);
                setPersonalInsight(genAI.summary);
            } catch (aiErr) {
                console.warn('AI Parsing skipped for offline.', aiErr);
                setPersonalInsight('AI coach analysis is temporarily delayed today.');
            }

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
    }, [selectedDayIndex, user]);

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
                }
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
                                    
                                    {personalInsight === null ? (
                                        <div className="animate-pulse space-y-2 mb-2">
                                            <div className="h-3 bg-white/30 rounded w-full"></div>
                                            <div className="h-3 bg-white/30 rounded w-5/6"></div>
                                            <div className="h-3 bg-white/30 rounded w-4/6"></div>
                                        </div>
                                    ) : (
                                        <p className="text-sm opacity-95 leading-relaxed font-medium">
                                            {personalInsight}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};