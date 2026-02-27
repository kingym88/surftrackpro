import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import type { SessionLog, ForecastSnapshot } from '../types';
import { useApp } from '@/src/context/AppContext';
import { useUnits } from '@/src/hooks/useUnits';
import { GuestGate } from '@/src/components/GuestGate';
import { getGeminiInsight } from '@/src/services/geminiInsight';
import { fetchOpenMeteoForecast } from '@/src/services/openMeteo';

interface SessionDetailScreenProps {
  session: SessionLog | null;
  onBack: () => void;
}

export const SessionDetailScreen: React.FC<SessionDetailScreenProps> = ({ session, onBack }) => {
  const { spots, quiver, forecasts, preferredWaveHeight } = useApp();
  const units = useUnits();
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [nearestForecast, setNearestForecast] = useState<ForecastSnapshot | null>(null);

  const spot = spots.find(s => s.id === session?.spotId);
  const board = quiver.find(b => b.id === session?.boardId);

  useEffect(() => {
    if (!session || !spot) return;
    
    const fetchForecast = async () => {
      let snaps = forecasts[spot.id];
      if (!snaps || snaps.length === 0) {
        try {
          snaps = await fetchOpenMeteoForecast(spot.coordinates.lat, spot.coordinates.lng);
        } catch (e) {
          console.error("Failed to fetch openmeteo fallback", e);
          snaps = [];
        }
      }
      
      if (snaps.length > 0) {
        const sessionTime = session.timestamp;
        const nearest = snaps.reduce((prev, curr) => {
          return Math.abs(new Date(curr.forecastHour).getTime() - sessionTime) < Math.abs(new Date(prev.forecastHour).getTime() - sessionTime) ? curr : prev;
        });
        setNearestForecast(nearest);
      }
    };
    
    fetchForecast();
  }, [session, spot, forecasts]);

  useEffect(() => {
     const generateAnalysis = async () => {
        if (!session || !nearestForecast) return;
        setIsLoadingAnalysis(true);
        try {
           const breakProfile = spot?.breakProfile || { breakType: 'beach', facingDirection: 'W', optimalSwellDirection: 'W-NW', optimalTidePhase: 'mid', optimalWindDirection: 'E-NE' } as any;
           const result = await getGeminiInsight(
             [nearestForecast], 
             breakProfile, 
             [session], 
             preferredWaveHeight || { min: 0.5, max: 3.0 },
             spot?.coordinates
           );
           setAiAnalysis(result.summary);
        } catch (e) {
           console.error("AI analysis failed", e);
        } finally {
           setIsLoadingAnalysis(false);
        }
     };
     generateAnalysis();
  }, [session, nearestForecast, spot, preferredWaveHeight]);

  if (!session) return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 h-screen bg-background">
      <span className="material-icons-round text-6xl text-textMuted mb-4">history_toggle_off</span>
      <h2 className="text-xl font-bold mb-2 text-text">Session Not Found</h2>
      <button onClick={onBack} className="mt-8 px-6 py-2 rounded-full border border-border text-text hover:bg-surface transition-colors">
        Go Back
      </button>
    </div>
  );

  const loggedHeight = parseFloat(session.height);
  let deltaIndicator = null;
  let isAccurate = false;
  if (!isNaN(loggedHeight) && nearestForecast) {
     const delta = loggedHeight - nearestForecast.waveHeight;
     isAccurate = Math.abs(delta) <= 0.2;
     deltaIndicator = `${delta > 0 ? '+' : ''}${units.height(delta)}`;
  }

  return (
    <div className="bg-background min-h-screen text-text pb-24 relative selection:bg-primary/20">
      <div className="relative h-64 border-b border-border shadow-sm">
        <img src={spot?.image || "https://images.unsplash.com/photo-1502680390469-be75c86b636f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"} className="w-full h-full object-cover opacity-80 mix-blend-overlay" alt="Session Hero" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"></div>
        <button onClick={onBack} className="absolute top-6 left-4 w-10 h-10 rounded-full bg-surface/50 border border-border backdrop-blur-md flex items-center justify-center hover:bg-surface transition-colors shadow-sm">
          <span className="material-icons-round text-text text-sm">arrow_back_ios_new</span>
        </button>
        <button className="absolute top-6 right-4 w-10 h-10 rounded-full bg-surface/50 border border-border backdrop-blur-md flex items-center justify-center hover:bg-surface transition-colors shadow-sm text-primary">
          <span className="material-icons-round text-sm">share</span>
        </button>
        <div className="absolute bottom-6 left-6">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase mb-2 inline-block border shadow-sm ${session.rating >= 4 ? 'bg-primary/20 text-primary border-primary/30' : 'bg-surface text-textMuted border-border'}`}>
             {session.rating === 5 ? 'Epic Session' : session.rating >= 3 ? 'Good Session' : 'Tough Session'}
          </span>
          <h1 className="text-3xl font-black text-text leading-tight tracking-tight">{spot?.name || session.spotName || 'Unknown Spot'}</h1>
          <p className="text-sm font-medium text-textMuted flex items-center gap-1.5 mt-1">
            <span className="material-icons-round text-sm">calendar_month</span> 
            {new Date(session.timestamp).toLocaleDateString()} • {session.duration || 60}m
          </p>
        </div>
      </div>

      <main className="px-6 -mt-4 relative z-10 space-y-6">
        
        {/* Conditions Replay */}
        {nearestForecast && (
          <section className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
             <h3 className="text-xs font-bold text-textMuted uppercase tracking-widest mb-4 flex items-center gap-2">
                 <span className="material-icons-round text-primary text-sm">history</span> Conditions at Session Time
             </h3>
             <div className="grid grid-cols-2 gap-4">
                 <div className="bg-background rounded-xl p-3 border border-border">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Forecast Wave</p>
                    <div className="flex items-baseline gap-1">
                       <span className="text-xl font-black text-primary">{units.height(nearestForecast.waveHeight)}</span>
                       <span className="text-[10px] font-bold text-textMuted">@ {nearestForecast.wavePeriod}s</span>
                    </div>
                    {deltaIndicator && (
                       <p className={`text-[10px] font-bold mt-1 ${isAccurate ? 'text-emerald-400' : 'text-amber-400'}`}>
                         {deltaIndicator} vs logged
                       </p>
                    )}
                 </div>
                 <div className="bg-background rounded-xl p-3 border border-border">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Wind & Swell Dir</p>
                    <div className="flex flex-col gap-1">
                       <span className="text-sm font-black text-text">{units.speed(nearestForecast.windSpeed)} <span className="material-icons-round text-[10px]" style={{rotate: `${nearestForecast.windDirection}deg`}}>north</span></span>
                       <span className="text-[10px] font-bold text-textMuted">Swell {nearestForecast.swellDirection}°</span>
                    </div>
                 </div>
             </div>
          </section>
        )}

        {/* AI Post-Session Analysis */}
        {/* Session Notes placed above AI Coach to satisfy prompt */}
        {session.notes && (
          <section>
            <h3 className="text-xs font-bold text-text uppercase tracking-widest mb-3">Session Notes</h3>
            <div className="bg-background p-5 rounded-xl border border-border shadow-inner">
              <p className="text-sm text-textMuted leading-relaxed italic">
                "{session.notes}"
              </p>
            </div>
          </section>
        )}

        <GuestGate featureName="AI Post-Session Coaching">
          <section className="bg-primary/10 border border-primary/20 rounded-2xl p-5">
              <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="material-icons-round text-primary text-sm">smart_toy</span> AI Coach:
              </h3>
              {isLoadingAnalysis ? (
                 <div className="flex items-center gap-3 animate-pulse opacity-60">
                     <span className="material-icons-round animate-spin text-primary">sync</span>
                     <p className="text-sm font-medium text-textMuted">Analyzing conditions & performance...</p>
                 </div>
              ) : aiAnalysis ? (
                 <p className="text-sm text-text leading-relaxed font-medium bg-background/50 p-4 rounded-xl border border-primary/10">
                    {aiAnalysis}
                 </p>
              ) : (
                 <p className="text-sm text-textMuted italic">No AI analysis available for this session.</p>
              )}
          </section>
        </GuestGate>

        {/* Board Used */}
        <section>
          <div className="bg-surface p-4 rounded-xl border border-border flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-background border border-border rounded-lg flex items-center justify-center">
                 <span className="material-icons-round text-textMuted">surfing</span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">Quiver Used</p>
                <p className="font-bold text-text text-sm">{board ? `${board.brand} ${board.model}` : 'Unknown Board'}</p>
              </div>
            </div>
            <span className="material-icons-round text-slate-500">chevron_right</span>
          </div>
        </section>

      </main>
    </div>
  );
};