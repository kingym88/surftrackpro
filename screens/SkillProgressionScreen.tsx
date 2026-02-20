import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/src/context/AppContext';
import { getGeminiInsight } from '@/src/services/geminiInsight';
import { GuestGate } from '@/src/components/GuestGate';
import { PORTUGAL_SPOTS } from '@/src/data/portugalSpots';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface SkillProgressionScreenProps {
  onBack: () => void;
}

export const SkillProgressionScreen: React.FC<SkillProgressionScreenProps> = ({ onBack }) => {
  const { isGuest, sessions, homeSpotId, forecasts, preferredWaveHeight } = useApp();
  const [timeframe, setTimeframe] = useState<'30' | '90' | 'ALL'>('30');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

  const homeSpot = useMemo(() => PORTUGAL_SPOTS.find(s => s.id === homeSpotId), [homeSpotId]);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    if (timeframe === 'ALL') return sessions;
    const now = Date.now();
    const days = timeframe === '30' ? 30 : 90;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return sessions.filter(s => s.timestamp >= cutoff);
  }, [sessions, timeframe]);

  // Compute aggregate stats
  const stats = useMemo(() => {
    if (filteredSessions.length === 0) {
       return { total: 0, topSpeed: 0, avgWaveTime: 0, bestScore: 0 };
    }
    const total = filteredSessions.length;
    const topSpeed = Math.max(...filteredSessions.map(s => s.topSpeed || 0));
    const totalDuration = filteredSessions.reduce((acc, s) => acc + (s.duration || 0), 0);
    const avgWaveTime = totalDuration > 0 ? (totalDuration / total) * 0.1 : 0; 
    const bestScore = Math.max(...filteredSessions.map(s => s.rating));
    return { 
        total, 
        topSpeed: topSpeed > 0 ? topSpeed : '--', 
        avgWaveTime: avgWaveTime > 0 ? avgWaveTime.toFixed(1) : '--',
        bestScore 
    };
  }, [filteredSessions]);

  // 9.1 & 9.2 Compute rolling score
  const skillOverTime = useMemo(() => {
     // Group sessions by date
     const groupedByDate: Record<string, { ratings: number[], waveHeights: number[], count: number }> = {};
     filteredSessions.forEach(s => {
       const dateStr = new Date(s.timestamp).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
       if (!groupedByDate[dateStr]) groupedByDate[dateStr] = { ratings: [], waveHeights: [], count: 0 };
       groupedByDate[dateStr].ratings.push(s.rating);
       groupedByDate[dateStr].waveHeights.push(parseFloat(s.height) || 0);
       groupedByDate[dateStr].count += 1;
     });

     const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
     
     const result: Array<{ date: string; score: number }> = [];
     let rollingScore = 50; // default starting point
     
     sortedDates.forEach(date => {
       const group = groupedByDate[date];
       const avgRating = group.ratings.reduce((a,b) => a+b,0) / group.count; // 1-5
       const maxHt = Math.max(...group.waveHeights); // mostly 0.5 - 3.0
       
       // complex formula based on frequency (count), rating, and wave height
       const bump = (avgRating - 3) * 5 + (maxHt > 1.5 ? 5 : 0) + (group.count > 1 ? 5 : 0);
       rollingScore = Math.min(100, Math.max(0, rollingScore + bump));
       
       result.push({
         date,
         score: Math.round(rollingScore)
       });
     });
     
     return result;
  }, [filteredSessions]);

  // 9.3 Fetch AI Coaching
  useEffect(() => {
      const getCoaching = async () => {
         if (filteredSessions.length === 0 || !homeSpotId || !homeSpot || isGuest) return;
         setIsLoadingAnalysis(true);
         try {
             const result = await getGeminiInsight(
               forecasts[homeSpotId] || [], 
               homeSpot.breakProfile || {} as any, 
               filteredSessions, 
               preferredWaveHeight || { min: 0.5, max: 3.0 }
             );
             setAiAnalysis(result.summary);
         } catch(e) {
             console.log(e);
         } finally {
             setIsLoadingAnalysis(false);
         }
      };
      
      const timeoutId = setTimeout(getCoaching, 500); // debounce slightly
      return () => clearTimeout(timeoutId);
  }, [filteredSessions, homeSpotId, homeSpot, forecasts, preferredWaveHeight, isGuest]);


  return (
    <div className="pb-20 min-h-screen bg-background relative selection:bg-primary/20">
      {/* Header Navigation */}
      <nav className="px-6 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-40 border-b border-border shadow-sm">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface border border-border text-text hover:bg-surface/80 transition-colors">
          <span className="material-icons-round text-lg">arrow_back_ios_new</span>
        </button>
        <h1 className="text-xl font-bold tracking-tight text-text">Skill Progression</h1>
        <div className="w-10"></div> {/* Spacer */}
      </nav>

      {isGuest ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 mt-24">
          <GuestGate featureName="Your skill progression tracking starts when you create an account">
            <div className="h-64 w-full" />
          </GuestGate>
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 mt-24 text-center">
          <span className="material-icons-round text-6xl text-primary/40 mb-4 animate-bounce">surfing</span>
          <h2 className="text-xl font-bold mb-2 text-text">No Sessions Yet</h2>
          <p className="text-textMuted text-sm mb-6 max-w-xs leading-relaxed">Log your first session to start tracking your skill progression and get AI coaching.</p>
        </div>
      ) : (
        <main className="px-6 space-y-8 mt-6">
          {/* Timeframe Selector */}
          <div className="flex p-1 bg-surface border border-border rounded-xl">
            <button 
               onClick={() => setTimeframe('30')}
               className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${timeframe === '30' ? 'bg-primary text-white shadow-sm' : 'text-textMuted hover:text-text'}`}>
               30 Days
            </button>
            <button 
               onClick={() => setTimeframe('90')}
               className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${timeframe === '90' ? 'bg-primary text-white shadow-sm' : 'text-textMuted hover:text-text'}`}>
               90 Days
            </button>
            <button 
               onClick={() => setTimeframe('ALL')}
               className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${timeframe === 'ALL' ? 'bg-primary text-white shadow-sm' : 'text-textMuted hover:text-text'}`}>
               All Time
            </button>
          </div>

          {/* Stats Grid */}
          <section className="grid grid-cols-2 gap-4">
            <div className="bg-surface border border-border p-4 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-widest text-textMuted block mb-1">Sessions</span>
              <span className="text-2xl font-black text-text">{stats.total}</span>
            </div>
            <div className="bg-surface border border-border p-4 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-widest text-textMuted block mb-1">Top Speed</span>
              <span className="text-2xl font-black text-text">{stats.topSpeed}<span className="text-xs font-medium text-textMuted ml-1">km/h</span></span>
            </div>
            <div className="bg-surface border border-border p-4 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-widest text-textMuted block mb-1">Best Score</span>
              <span className="text-2xl font-black text-primary">{stats.bestScore > 0 ? `${stats.bestScore}/5` : '--'}</span>
            </div>
            <div className="bg-surface border border-border p-4 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-widest text-textMuted block mb-1">Avg Wave</span>
              <span className="text-2xl font-black text-text">{stats.avgWaveTime}<span className="text-xs font-medium text-textMuted ml-1">sec</span></span>
            </div>
          </section>

          {/* Performance Chart */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold text-text uppercase tracking-widest flex items-center gap-2">
                <span className="material-icons-round text-primary text-sm">trending_up</span> Trajectory
            </h2>
            <div className="bg-surface border border-border p-4 rounded-2xl shadow-sm mt-4">
                {skillOverTime.length > 1 ? (
                   <div className="h-48 w-full">
                       <ResponsiveContainer width="100%" height="100%">
                         <LineChart data={skillOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                           <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                           <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                           <Tooltip 
                              contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
                              itemStyle={{ color: 'var(--color-text)', fontSize: '12px', fontWeight: 'bold' }}
                           />
                           <Line 
                              type="monotone" 
                              dataKey="score"
                              name="Skill Score"
                              stroke="#06b6d4" 
                              strokeWidth={2} 
                              dot={false}
                           />
                         </LineChart>
                       </ResponsiveContainer>
                   </div>
                ) : (
                   <div className="h-48 w-full flex items-center justify-center">
                       <p className="text-sm text-textMuted italic">Log more sessions to see your trends.</p>
                   </div>
                )}
            </div>
          </section>

          {/* Coach's Tip Section */}
          <section className="pb-8">
            <div className="bg-primary/5 border border-primary/20 p-6 rounded-2xl relative shadow-inner">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30">
                    <span className="material-icons-round">psychology</span>
                    </div>
                    <div>
                    <h3 className="font-bold text-text">Coach's Analysis</h3>
                    <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Gemini Powered</p>
                    </div>
                </div>
                
                <div className="space-y-3">
                    {isLoadingAnalysis ? (
                        <div className="flex items-center gap-2 text-primary opacity-60">
                           <span className="material-icons-round animate-spin">sync</span>
                           <span className="text-sm font-medium">Analyzing history...</span>
                        </div>
                    ) : aiAnalysis ? (
                        <p className="text-sm text-text leading-relaxed font-medium">
                            {aiAnalysis}
                        </p>
                    ) : (
                       <p className="text-sm text-textMuted italic">
                            Log some sessions for the Coach to analyze your progression.
                        </p>
                    )}
                </div>
            </div>
          </section>
        </main>
      )}
    </div>
  );
};