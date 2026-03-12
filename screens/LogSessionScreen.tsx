import React, { useState, useEffect, useMemo } from 'react';
import { Screen } from '../types';
import type { SessionLog, SurfSpot, Board, ForecastSnapshot, TidePoint, ConditionsSnapshot } from '../types';

const parseSafeTime = (dateStr: string): number => {
  if (!dateStr) return 0;
  if (dateStr.includes('Z') || dateStr.includes('+')) return new Date(dateStr).getTime();
  const safeStr = dateStr.length === 16 ? `${dateStr}:00Z` : `${dateStr}Z`;
  return new Date(safeStr).getTime();
};

const findClosestForecast = (forecasts: ForecastSnapshot[], isoDatetime: string): ForecastSnapshot | null => {
  if (!forecasts?.length) return null;
  const targetTime = parseSafeTime(isoDatetime);
  return forecasts.reduce((prev, curr) => {
    return Math.abs(parseSafeTime(curr.forecastHour) - targetTime) < Math.abs(parseSafeTime(prev.forecastHour) - targetTime) ? curr : prev;
  });
};

const findClosestTide = (tides: TidePoint[], isoDatetime: string): TidePoint | null => {
  if (!tides?.length) return null;
  const targetTime = parseSafeTime(isoDatetime);
  return tides.reduce((prev, curr) => {
    return Math.abs(parseSafeTime(curr.time) - targetTime) < Math.abs(parseSafeTime(prev.time) - targetTime) ? curr : prev;
  });
};

const buildConditionsSnapshot = (forecast: ForecastSnapshot, tide: TidePoint | null, timestamp: string): ConditionsSnapshot => ({
  timestamp,
  forecastHour: forecast.forecastHour,
  waveHeight: forecast.waveHeight,
  wavePeriod: forecast.wavePeriod,
  swellHeight: forecast.swellHeight,
  swellDirection: forecast.swellDirection,
  windSpeed: forecast.windSpeed,
  windDirection: forecast.windDirection,
  windGust: forecast.windGust,
  tide: tide?.height ?? 0,
  tideType: tide?.type ?? 'MID',
  airTemp: forecast.airTemp,
  cloudCover: forecast.cloudCover,
  pressure: forecast.pressure,
});

const buildConditionsRange = (forecasts: ForecastSnapshot[], tides: TidePoint[], sessionStart: string, durationHours: number): ConditionsSnapshot[] => {
  if (!forecasts?.length) return [];
  const startMs = parseSafeTime(sessionStart);
  const endMs = startMs + durationHours * 3600000;
  
  const inWindow = forecasts.filter(f => {
    const fTime = parseSafeTime(f.forecastHour);
    return fTime >= startMs && fTime <= endMs;
  });

  if (inWindow.length === 0) {
    // Math logic based around string ISO with Z attached
    const midpoint = new Date(startMs + (durationHours * 3600000) / 2).toISOString();
    const closest = findClosestForecast(forecasts, midpoint);
    if (!closest) return [];
    return [buildConditionsSnapshot(closest, findClosestTide(tides, closest.forecastHour) || findClosestTide(tides, midpoint), midpoint)];
  }

  return inWindow.sort((a, b) => parseSafeTime(a.forecastHour) - parseSafeTime(b.forecastHour))
    .map(f => buildConditionsSnapshot(f, findClosestTide(tides, f.forecastHour), sessionStart));
};

const degreesToCompass = (deg: number): string => {
  const val = Math.floor((deg / 22.5) + 0.5);
  const arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return arr[(val % 16)];
};
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';
import { GuestGate } from '@/src/components/GuestGate';
import { addSession as addSessionFirestore } from '@/src/services/firestore';
import { useUnits } from '@/src/hooks/useUnits';

interface LogSessionScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
}

export const LogSessionScreen: React.FC<LogSessionScreenProps> = ({ onNavigate }) => {
  const { spots, quiver, addSession, forecasts, tides, isGuest } = useApp();
  const { user } = useAuth();
  const { addToast } = useToast();
  const units = useUnits();
  
  const [step, setStep] = useState(1);
  const [sessionDatetime, setSessionDatetime] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [selectedSpotId, setSelectedSpotId] = useState<string>('');
  const [spotSearch, setSpotSearch] = useState('');
  const [rating, setRating] = useState(3);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [durationHours, setDurationHours] = useState(1.5);
  const [notes, setNotes] = useState('');
  const [crowdFactor, setCrowdFactor] = useState(3);
  const [energyLevel, setEnergyLevel] = useState(3);
  
  // Auto-filled conditions state
  const [waveHeight, setWaveHeight] = useState('');
  const [wavePeriod, setWavePeriod] = useState('');
  const [waveCount, setWaveCount] = useState(0);
  const [topSpeed, setTopSpeed] = useState('');
  const [longestRide, setLongestRide] = useState('');

  const filteredSpots = spots.filter(spot => 
    spot.name.toLowerCase().includes(spotSearch.toLowerCase()) || 
    (spot.region && spot.region.toLowerCase().includes(spotSearch.toLowerCase()))
  );

  const selectedSpot = spots.find(s => s.id === selectedSpotId);
  const spotForecasts = forecasts[selectedSpotId] || [];
  const spotTides = tides[selectedSpotId] || [];

  const sessionEndDatetime = useMemo(() => {
    return new Date(parseSafeTime(sessionDatetime) + durationHours * 3600000).toISOString();
  }, [sessionDatetime, durationHours]);

  const matchedForecast = useMemo(() => {
    const midpointMs = parseSafeTime(sessionDatetime) + (durationHours * 3600000) / 2;
    return findClosestForecast(spotForecasts, new Date(midpointMs).toISOString());
  }, [spotForecasts, sessionDatetime, durationHours]);

  const matchedTide = useMemo(() => {
    const midpointMs = parseSafeTime(sessionDatetime) + (durationHours * 3600000) / 2;
    return findClosestTide(spotTides, new Date(midpointMs).toISOString());
  }, [spotTides, sessionDatetime, durationHours]);

  const conditionsRange = useMemo(() => {
    return buildConditionsRange(spotForecasts, spotTides, new Date(sessionDatetime).toISOString(), durationHours);
  }, [spotForecasts, spotTides, sessionDatetime, durationHours]);

  useEffect(() => {
    if (matchedForecast) {
      setWaveHeight(matchedForecast.waveHeight.toFixed(1));
      setWavePeriod(matchedForecast.wavePeriod.toFixed(0));
    }
  }, [matchedForecast, selectedSpotId]);

  const handleComplete = async () => {
    if (!selectedSpot || !selectedBoardId) return;

    const startISO = new Date(sessionDatetime).toISOString();
    const midpointISO = new Date(parseSafeTime(sessionDatetime) + (durationHours * 3600000) / 2).toISOString();

    const newSession: SessionLog = {
      id: `session_${Date.now()}`,
      uid: user?.uid || 'guest',
      spotId: selectedSpot.id,
      spotName: selectedSpot.name,
      date: startISO,
      timestamp: parseSafeTime(sessionDatetime),
      duration: durationHours * 60,
      waveCount,
      topSpeed: parseFloat(topSpeed) || 0,
      longestRide: parseFloat(longestRide) || 0,
      boardId: selectedBoardId,
      rating,
      height: waveHeight || (matchedForecast?.waveHeight.toString() || '0'),
      image: selectedSpot.image || '',
      notes,
      conditionsSnapshot: matchedForecast ? buildConditionsSnapshot(matchedForecast, matchedTide, midpointISO) : undefined,
      conditionsRange,
      crowdFactor,
      energyLevel,
    };

    if (user?.uid) {
      try {
        await addSessionFirestore(user.uid, newSession);
      } catch (e) {
        console.error("Failed to save to firestore", e);
      }
    }
    
    addSession(newSession);
    addToast('Session logged successfully!', 'success');
    onNavigate(Screen.SESSION_DETAIL, { session: newSession });
  };

  if (isGuest) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 h-screen bg-background">
        <GuestGate featureName="Log your surf sessions">
          <div className="h-64 w-full" />
        </GuestGate>
        <button onClick={() => onNavigate(Screen.HOME)} className="mt-8 px-6 py-2 rounded-full border border-border text-textMuted hover:text-text transition-colors">
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen text-text font-sans relative selection:bg-primary/20">
       <main className="max-w-md mx-auto px-6 pb-24 pt-12">
         {/* Navigation & Progress */}
         <header className="flex items-center justify-between mb-8">
           <button onClick={() => step > 1 ? setStep(step - 1) : onNavigate(Screen.HOME)} className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center hover:bg-surface/80 transition-colors">
             <span className="material-icons-round text-text text-sm">arrow_back_ios_new</span>
           </button>
           <div className="flex gap-2">
             <div className={`w-10 h-1.5 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-surface'}`}></div>
             <div className={`w-10 h-1.5 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-surface'}`}></div>
             <div className={`w-10 h-1.5 rounded-full transition-colors ${step >= 3 ? 'bg-primary' : 'bg-surface'}`}></div>
             <div className={`w-10 h-1.5 rounded-full transition-colors ${step >= 4 ? 'bg-primary' : 'bg-surface'}`}></div>
           </div>
           <button onClick={() => onNavigate(Screen.HOME)} className="w-10 h-10 flex items-center justify-center text-textMuted hover:text-text transition-colors">
             <span className="material-icons-round text-xl">close</span>
           </button>
         </header>

         {/* STEP 1: Spot Selection */}
         {step === 1 && (
           <div className="animate-fadeIn">
             <h1 className="text-3xl font-display font-bold tracking-tight text-text mb-2">Where & When?</h1>
             <p className="text-textMuted mb-8 text-sm">Select a spot and time to link real-time environmental data.</p>
             
             <div className="mb-6">
               <label className="text-xs font-bold text-textMuted uppercase tracking-widest flex items-center gap-2 mb-2">
                 <span className="material-icons-round text-sm">schedule</span> Session Date & Time
               </label>
               <input
                 type="datetime-local"
                 value={sessionDatetime}
                 onChange={(e) => setSessionDatetime(e.target.value)}
                 className="w-full bg-surface border border-border text-text rounded-xl p-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
               />
             </div>

             <div className="relative mb-4">
               <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-textMuted text-lg">search</span>
               <input
                 type="text"
                 placeholder="Search spots..."
                 value={spotSearch}
                 onChange={(e) => setSpotSearch(e.target.value)}
                 className="w-full bg-surface border border-border rounded-xl py-3 pl-12 pr-12 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary"
               />
               {spotSearch && (
                 <button 
                   onClick={() => setSpotSearch('')}
                   className="absolute right-4 top-1/2 -translate-y-1/2 text-textMuted hover:text-text flex items-center justify-center p-1"
                 >
                   <span className="material-icons-round text-lg">close</span>
                 </button>
               )}
             </div>

             <div className="space-y-3 max-h-96 overflow-y-auto">
               {filteredSpots.length === 0 ? (
                 <p className="text-textMuted text-sm text-center py-6">No spots match your search.</p>
               ) : (
                 filteredSpots.map(spot => (
                   <div 
                     key={spot.id} 
                     onClick={() => {
                       setSelectedSpotId(spot.id);
                       setSpotSearch('');
                     }}
                     className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${selectedSpotId === spot.id ? 'bg-primary/10 border-primary' : 'bg-surface border-border hover:border-primary/50'}`}
                   >
                     <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-lg bg-background overflow-hidden border border-border">
                         <img src={spot.image || 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'} alt="" className="w-full h-full object-cover" />
                       </div>
                       <div>
                         <p className="font-bold text-text">{spot.name}</p>
                         <p className="text-xs text-textMuted">{spot.region}</p>
                       </div>
                     </div>
                     {selectedSpotId === spot.id && <span className="material-icons-round text-primary">check_circle</span>}
                   </div>
                 ))
               )}
             </div>

             {selectedSpotId && (
               <div className="mt-6 bg-surface p-4 rounded-xl border border-border">
                  <h3 className="text-sm font-bold text-text mb-4">Conditions Preview</h3>
                  {(!conditionsRange.length || !matchedForecast) ? (
                    <p className="text-sm text-textMuted">No forecast data available for this time.</p>
                  ) : (
                    <div className="space-y-4">
                      {/* Waves */}
                      <div>
                        <h4 className="text-[10px] uppercase font-bold text-primary mb-2">Waves</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <label className="text-[10px] text-textMuted block">Height (m)</label>
                            <input type="number" step="0.1" value={waveHeight} onChange={e => setWaveHeight(e.target.value)} className="w-full bg-background p-1.5 rounded border border-border text-text" />
                          </div>
                          <div>
                            <label className="text-[10px] text-textMuted block">Period (s)</label>
                            <input type="number" step="0.5" value={wavePeriod} onChange={e => setWavePeriod(e.target.value)} className="w-full bg-background p-1.5 rounded border border-border text-text" />
                          </div>
                          <div className="bg-background p-1.5 rounded border border-border"><span className="text-[10px] text-textMuted block">Swell</span>{matchedForecast.swellHeight.toFixed(1)}m</div>
                          <div className="bg-background p-1.5 rounded border border-border"><span className="text-[10px] text-textMuted block">Dir</span>{degreesToCompass(matchedForecast.swellDirection)}</div>
                        </div>
                      </div>
                      
                      {/* Wind */}
                      <div>
                        <h4 className="text-[10px] uppercase font-bold text-primary mb-2">Wind</h4>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="bg-background p-1.5 rounded border border-border"><span className="text-[10px] text-textMuted block">Speed</span>{matchedForecast.windSpeed.toFixed(0)} km/h</div>
                          <div className="bg-background p-1.5 rounded border border-border"><span className="text-[10px] text-textMuted block">Dir</span>{degreesToCompass(matchedForecast.windDirection)}</div>
                          <div className="bg-background p-1.5 rounded border border-border"><span className="text-[10px] text-textMuted block">Gust</span>{matchedForecast.windGust.toFixed(0)} km/h</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Tide */}
                        <div>
                          <h4 className="text-[10px] uppercase font-bold text-primary mb-2">Tide</h4>
                          <div className="bg-background p-1.5 rounded border border-border text-sm">
                            {matchedTide ? `${matchedTide.height.toFixed(1)}m (${matchedTide.type || 'MID'})` : '—'}
                          </div>
                        </div>
                        {/* Atmosphere */}
                        <div>
                          <h4 className="text-[10px] uppercase font-bold text-primary mb-2">Atmosphere</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-background p-1.5 rounded border border-border text-center">{matchedForecast.airTemp.toFixed(0)}°C</div>
                            <div className="bg-background p-1.5 rounded border border-border text-center">{matchedForecast.cloudCover}% ☁️</div>
                          </div>
                        </div>
                      </div>

                      {/* Session Coverage */}
                      <div className="mt-2 text-[10px] text-textMuted">
                        <span className="font-bold text-primary">{conditionsRange.length}</span> hourly snapshots captured ({conditionsRange[0]?.forecastHour.slice(11, 16)} → {conditionsRange[conditionsRange.length - 1]?.forecastHour.slice(11, 16)})
                      </div>
                    </div>
                  )}
               </div>
             )}
           </div>
         )}

         {/* STEP 2: Session Details Board */}
         {step === 2 && (
           <div className="animate-fadeIn">
             <h1 className="text-3xl font-display font-bold tracking-tight text-text mb-8">How was it?</h1>
             
             {/* Rating Section */}
             <section className="mb-8">
               <h2 className="text-[10px] font-bold uppercase tracking-widest text-textMuted mb-4">Overall Vibe</h2>
               <div className="bg-surface border border-border p-6 rounded-xl flex flex-col items-center gap-4">
                 <div className="flex gap-2">
                   {[1, 2, 3, 4, 5].map((star) => (
                     <button key={star} onClick={() => setRating(star)} className={`text-4xl material-icons-round transition-all hover:scale-110 ${star <= rating ? 'text-primary' : 'text-slate-400'}`}>
                       star
                     </button>
                   ))}
                 </div>
                 <p className="text-xs font-bold text-textMuted uppercase tracking-wider">
                   {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Great' : 'Epic'}
                 </p>
               </div>
             </section>

             {/* Duration Slider */}
             <section className="mb-8">
               <div className="flex justify-between items-end mb-4">
                 <h2 className="text-[10px] font-bold uppercase tracking-widest text-textMuted">Time in Water</h2>
                 <span className="text-primary font-bold text-lg">{durationHours} <span className="text-xs font-medium text-textMuted">hrs</span></span>
               </div>
               <input 
                 type="range" 
                 min="0.5" 
                 max="4" 
                 step="0.5" 
                 value={durationHours}
                 onChange={(e) => setDurationHours(parseFloat(e.target.value))}
                 className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
               />
               <div className="flex justify-between text-[10px] text-textMuted mt-2 font-bold">
                 <span>30m</span>
                 <span>4h</span>
               </div>
             </section>

             {/* Crowd Factor */}
             <section className="mb-8">
               <h2 className="text-[10px] font-bold uppercase tracking-widest text-textMuted mb-2">Crowd Factor</h2>
               <p className="text-xs text-textMuted mb-4">1 = empty lineup, 5 = packed</p>
               <div className="bg-surface border border-border p-6 rounded-xl flex flex-col items-center gap-4">
                 <div className="flex gap-2">
                   {[1, 2, 3, 4, 5].map((level) => (
                     <button key={`crowd-${level}`} onClick={() => setCrowdFactor(level)} className={`text-4xl material-icons-round transition-all hover:scale-110 ${level <= crowdFactor ? 'text-primary' : 'text-slate-400'}`}>
                       group
                     </button>
                   ))}
                 </div>
               </div>
             </section>

             {/* Energy Level */}
             <section className="mb-8">
               <h2 className="text-[10px] font-bold uppercase tracking-widest text-textMuted mb-2">Energy Level</h2>
               <p className="text-xs text-textMuted mb-4">1 = exhausted, 5 = firing on all cylinders</p>
               <div className="bg-surface border border-border p-6 rounded-xl flex flex-col items-center gap-4">
                 <div className="flex gap-2">
                   {[1, 2, 3, 4, 5].map((level) => (
                     <button key={`energy-${level}`} onClick={() => setEnergyLevel(level)} className={`text-4xl material-icons-round transition-all hover:scale-110 ${level <= energyLevel ? 'text-amber-400' : 'text-slate-400'}`}>
                       bolt
                     </button>
                   ))}
                 </div>
               </div>
             </section>

             {/* Board Selector */}
             <section className="mb-8">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-textMuted mb-2">Quiver Used</h2>
                <select 
                  className="w-full bg-slate-800 text-white rounded-xl p-3 border border-slate-700 outline-none focus:border-cyan-500"
                  value={selectedBoardId}
                  onChange={(e) => setSelectedBoardId(e.target.value)}
                >
                  <option value="">Select a board...</option>
                  {quiver.map(b => (
                    <option key={b.id} value={b.id}>{b.brand} {b.model} {b.volume}L</option>
                  ))}
                </select>
             </section>
           </div>
         )}

         {/* STEP 3: Performance Metrics */}
         {step === 3 && (
           <div className="animate-fadeIn">
             <h1 className="text-3xl font-display font-bold tracking-tight text-text mb-8">Performance</h1>
             
             <section className="mb-8">
               <h2 className="text-[10px] font-bold uppercase tracking-widest text-textMuted mb-2">Wave Count</h2>
               <div className="flex items-center gap-4 bg-surface p-4 rounded-xl border border-border">
                 <button 
                   onClick={() => setWaveCount(Math.max(0, waveCount - 1))}
                   className="w-12 h-12 flex items-center justify-center rounded-full bg-background border border-border hover:bg-border/50 transition-colors"
                 >
                   <span className="material-icons-round">remove</span>
                 </button>
                 <div className="flex-1 text-center text-3xl font-black text-text">{waveCount}</div>
                 <button 
                   onClick={() => setWaveCount(waveCount + 1)}
                   className="w-12 h-12 flex items-center justify-center rounded-full bg-background border border-border hover:bg-border/50 transition-colors"
                 >
                   <span className="material-icons-round">add</span>
                 </button>
               </div>
             </section>

             <section className="grid grid-cols-2 gap-4 mb-4">
               <div>
                  <h2 className="text-[10px] font-bold uppercase tracking-widest text-textMuted mb-2">Top Speed ({units.system === 'imperial' ? 'mph' : 'km/h'})</h2>
                  <input 
                    type="number" 
                    value={topSpeed}
                    onChange={(e) => setTopSpeed(e.target.value)}
                    placeholder="e.g. 25.4"
                    className="w-full bg-surface text-text rounded-xl p-4 border border-border outline-none focus:border-primary"
                  />
               </div>
               <div>
                  <h2 className="text-[10px] font-bold uppercase tracking-widest text-textMuted mb-2">Longest Ride ({units.system === 'imperial' ? 'yd' : 'm'})</h2>
                  <input 
                    type="number" 
                    value={longestRide}
                    onChange={(e) => setLongestRide(e.target.value)}
                    placeholder="e.g. 120"
                    className="w-full bg-surface text-text rounded-xl p-4 border border-border outline-none focus:border-primary"
                  />
               </div>
             </section>
           </div>
         )}

         {/* STEP 4: Notes */}
         {step === 4 && (
           <div className="animate-fadeIn">
             <h1 className="text-3xl font-display font-bold tracking-tight text-text mb-8">Almost done.</h1>
             
             {/* Conditions Range Overview */}
             {conditionsRange.length > 0 && (
               <section className="mb-8">
                 <h2 className="text-[10px] font-bold uppercase tracking-widest text-textMuted mb-4">Conditions Range</h2>
                 <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                   {conditionsRange.map((snap, i) => (
                     <div key={i} className="min-w-[120px] bg-surface border border-border rounded-xl p-3 shrink-0">
                       <p className="text-xs font-bold text-text mb-2 border-b border-border pb-1">{snap.forecastHour.slice(11, 16)}</p>
                       <p className="text-[10px] text-textMuted"><span className="font-medium text-text">{snap.waveHeight.toFixed(1)}m</span> Waves</p>
                       <p className="text-[10px] text-textMuted"><span className="font-medium text-text">{snap.windSpeed.toFixed(0)}</span> km/h {degreesToCompass(snap.windDirection)}</p>
                       <p className="text-[10px] text-textMuted"><span className="font-medium text-text">{snap.tide.toFixed(1)}m</span> Tide</p>
                     </div>
                   ))}
                 </div>
               </section>
             )}

             {/* Personal Notes */}
             <section className="mb-8">
               <h2 className="text-[10px] font-bold uppercase tracking-widest text-textMuted mb-4">Personal Notes</h2>
               <textarea 
                 value={notes}
                 onChange={(e) => setNotes(e.target.value)}
                 className="w-full bg-surface border border-border rounded-xl p-4 text-sm text-text placeholder-textMuted focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none h-32"
                 placeholder="How did the board feel? Any memorable waves?"
               ></textarea>
             </section>
           </div>
         )}
         
         {/* Footer Action */}
         <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/95 to-transparent z-40 backdrop-blur-sm">
           <div className="max-w-md mx-auto">
             {step < 4 ? (
               <button 
                 disabled={(step === 1 && !selectedSpotId) || (step === 2 && !selectedBoardId)}
                 onClick={() => setStep(step + 1)} 
                 className={`w-full font-bold py-4 rounded-full shadow-soft transition-all flex items-center justify-center gap-2 ${((step===1 && !selectedSpotId) || (step===2 && !selectedBoardId)) ? 'bg-surface text-textMuted cursor-not-allowed' : 'bg-text text-background hover:scale-[1.02] active:scale-95'}`}
               >
                 NEXT STEP
                 <span className="material-icons-round text-sm">arrow_forward_ios</span>
               </button>
             ) : (
               <button 
                 onClick={handleComplete} 
                 disabled={!selectedBoardId}
                 className={`w-full font-bold py-4 rounded-full shadow-soft transition-all flex items-center justify-center gap-2 block ${!selectedBoardId ? 'bg-surface text-textMuted cursor-not-allowed' : 'bg-primary text-white hover:scale-[1.02] active:scale-95'}`}
               >
                 <span className="material-icons-round text-lg">check_circle</span>
                 SAVE SESSION
               </button>
             )}
           </div>
         </div>
       </main>
    </div>
  );
};