import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import type { SessionLog } from '../types';
import { useApp } from '@/src/context/AppContext';
import { GuestGate } from '@/src/components/GuestGate';
import { getGeminiInsight } from '@/src/services/geminiInsight';
import { fetchOpenMeteoForecast } from '@/src/services/openMeteo';

interface SessionDetailScreenProps {
  session: SessionLog | null;
  onBack: () => void;
}

export const SessionDetailScreen: React.FC<SessionDetailScreenProps> = ({ session, onBack }) => {
  const { spots, quiver, qualityScores } = useApp();
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

  useEffect(() => {
     const generateAnalysis = async () => {
        if (!session || !session.conditionsSnapshot) return;
        setIsLoadingAnalysis(true);
        try {
           const promptData = {
              waveHeight: session.conditionsSnapshot.waveHeight,
              period: session.conditionsSnapshot.wavePeriod,
              wind: session.conditionsSnapshot.windSpeed,
              rating: session.rating,
              notes: session.notes || 'No notes provided.',
           };
           // Simplified custom prompt for a post session recap
           const request = `You are a surf coach analyzing a session. 
           Conditions: ${promptData.waveHeight}ft @ ${promptData.period}s, ${promptData.wind}kts wind. 
           User Rating: ${promptData.rating}/5. 
           Notes: "${promptData.notes}". 
           Provide a short, punchy 2-sentence encouraging analysis.`;
           
           const result = await getGeminiInsight([{ role: 'user', content: request }], undefined, undefined, undefined);
           // For simplicity, just use the summary field of the returned JSON format since our gemini service expects it
           setAiAnalysis(result.summary || "Solid effort today. Keep charging!");
        } catch (e) {
           console.log("AI analysis failed", e);
        } finally {
           setIsLoadingAnalysis(false);
        }
     };
     generateAnalysis();
  }, [session]);

  if (!session) return null;

  const spot = spots.find(s => s.id === session.spotId);
  const board = quiver.find(b => b.id === session.boardId);

  return (
    <div className="bg-background min-h-screen text-text pb-24 relative selection:bg-primary/20">
      <div className="relative h-64 border-b border-border shadow-sm">
        <img src={spot?.image || "https://lh3.googleusercontent.com/aida-public/AB6AXuDt812q345B5t6u7v8w9x0y1z2A3B4C5D6E7F8G9H0I1J2K3L4M5N6O7P8Q9R0S1T2U3V4W5X6Y7Z8a9b0c1d2e3f4g"} className="w-full h-full object-cover opacity-80 mix-blend-overlay" alt="Session Hero" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"></div>
        <button onClick={onBack} className="absolute top-6 left-4 w-10 h-10 rounded-full bg-surface/50 border border-border backdrop-blur-md flex items-center justify-center hover:bg-surface transition-colors shadow-sm">
          <span className="material-icons-round text-text text-lg">arrow_back_ios_new</span>
        </button>
        <button className="absolute top-6 right-4 w-10 h-10 rounded-full bg-surface/50 border border-border backdrop-blur-md flex items-center justify-center hover:bg-surface transition-colors shadow-sm text-primary">
          <span className="material-icons-round text-lg">share</span>
        </button>
        <div className="absolute bottom-6 left-6">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase mb-2 inline-block border shadow-sm ${session.rating >= 4 ? 'bg-primary/20 text-primary border-primary/30' : 'bg-surface text-textMuted border-border'}`}>
             {session.rating === 5 ? 'Epic Session' : session.rating >= 3 ? 'Good Session' : 'Tough Session'}
          </span>
          <h1 className="text-3xl font-black text-text leading-tight tracking-tight">{spot?.name || 'Unknown Spot'}</h1>
          <p className="text-sm font-medium text-textMuted flex items-center gap-1.5 mt-1">
            <span className="material-icons-round text-sm">calendar_month</span> 
            {new Date(session.timestamp).toLocaleDateString()} • {Math.round(session.durationMinutes / 60)}hrs
          </p>
        </div>
      </div>

      <main className="px-6 -mt-4 relative z-10 space-y-6">
        
        {/* Conditions Replay */}
        {session.conditionsSnapshot && (
          <section className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
             <h3 className="text-xs font-bold text-textMuted uppercase tracking-widest mb-4 flex items-center gap-2">
                 <span className="material-icons-round text-primary text-sm">history</span> Conditions Replay
             </h3>
             <div className="grid grid-cols-2 gap-4">
                 <div className="bg-background rounded-xl p-3 border border-border">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Swell</p>
                    <div className="flex items-baseline gap-1">
                       <span className="text-xl font-black text-primary">{session.conditionsSnapshot.waveHeight.toFixed(1)}</span>
                       <span className="text-[10px] font-bold text-textMuted">ft @ {session.conditionsSnapshot.wavePeriod}s</span>
                    </div>
                 </div>
                 <div className="bg-background rounded-xl p-3 border border-border">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Wind</p>
                    <div className="flex items-baseline gap-1">
                       <span className="text-xl font-black text-text">{session.conditionsSnapshot.windSpeed.toFixed(0)}</span>
                       <span className="text-[10px] font-bold text-textMuted">kts {session.conditionsSnapshot.windDirection}°</span>
                    </div>
                 </div>
             </div>
          </section>
        )}

        {/* AI Post-Session Analysis */}
        <GuestGate featureName="AI Session Analysis">
          <section className="bg-primary/10 border border-primary/20 rounded-2xl p-5">
              <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="material-icons-round text-primary text-sm">psychology</span> Coach's Analysis
              </h3>
              {isLoadingAnalysis ? (
                 <div className="flex items-center gap-3 animate-pulse opacity-60">
                     <span className="material-icons-round animate-spin text-primary">sync</span>
                     <p className="text-sm font-medium text-textMuted">Analyzing conditions & performance...</p>
                 </div>
              ) : aiAnalysis ? (
                 <p className="text-sm text-text leading-relaxed font-medium bg-background/50 p-4 rounded-xl border border-primary/10">
                    "{aiAnalysis}"
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
                <p className="font-bold text-text text-sm">{board?.brand} {board?.model}</p>
              </div>
            </div>
            <span className="material-icons-round text-slate-500">chevron_right</span>
          </div>
        </section>

        {/* Notes */}
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

      </main>
    </div>
  );
};