import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/context/AuthContext';
import { getSkillCoachAnalysis } from '@/src/services/geminiInsight';
import { GuestGate } from '@/src/components/GuestGate';
import { PORTUGAL_SPOTS } from '@/src/data/portugalSpots';
import { useUnits } from '@/src/hooks/useUnits';
import { getGeminiCache, setGeminiCache, buildCoachCacheKey } from '@/src/utils/geminiCache';
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
  const { isGuest, sessions, homeSpotId, forecasts, preferredWaveHeight, quiver } = useApp();
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<'30' | '90' | 'ALL'>('30');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const units = useUnits();

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
       return { total: 0, waveRate: '--', avgEnergy: '--', avgCrowd: '--', bestScore: 0 };
    }
    const total = filteredSessions.length;
    
    const totalWaves = filteredSessions.reduce((acc, s) => acc + (s.waveCount || 0), 0);
    const totalHours = filteredSessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 60;
    const waveRate = totalHours > 0 ? (totalWaves / totalHours).toFixed(1) : '--';

    const energySessions = filteredSessions.filter(s => s.energyLevel && s.energyLevel > 0);
    const avgEnergy = energySessions.length > 0
      ? (energySessions.reduce((acc, s) => acc + (s.energyLevel || 0), 0) / energySessions.length).toFixed(1)
      : '--';

    const crowdSessions = filteredSessions.filter(s => s.crowdFactor && s.crowdFactor > 0);
    const avgCrowd = crowdSessions.length > 0
      ? (crowdSessions.reduce((acc, s) => acc + (s.crowdFactor || 0), 0) / crowdSessions.length).toFixed(1)
      : '--';
      
    const bestScore = Math.max(...filteredSessions.map(s => s.rating));
    
    return { total, waveRate, avgEnergy, avgCrowd, bestScore };
  }, [filteredSessions]);

  // 9.1 & 9.2 Compute rolling score
  const skillOverTime = useMemo(() => {
     // Group sessions by date
     const groupedByDate: Record<string, { ratings: number[], waveHeights: number[], energyLevels: number[], crowdFactors: number[], count: number }> = {};
     filteredSessions.forEach(s => {
       const dateStr = new Date(s.timestamp).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
       if (!groupedByDate[dateStr]) groupedByDate[dateStr] = { ratings: [], waveHeights: [], energyLevels: [], crowdFactors: [], count: 0 };
       groupedByDate[dateStr].ratings.push(s.rating);
       groupedByDate[dateStr].waveHeights.push(parseFloat(s.height) || 0);
       groupedByDate[dateStr].energyLevels.push(s.energyLevel || 3);
       groupedByDate[dateStr].crowdFactors.push(s.crowdFactor || 3);
       groupedByDate[dateStr].count += 1;
     });

     const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
     
     const result: Array<{ date: string; score: number }> = [];
     let rollingScore = 50; // default starting point
     
     sortedDates.forEach(date => {
       const group = groupedByDate[date];
       const avgRating = group.ratings.reduce((a,b) => a+b,0) / group.count; // 1-5
       const maxHt = Math.max(...group.waveHeights); // mostly 0.5 - 3.0
       const avgEnergy = group.energyLevels?.length > 0
         ? group.energyLevels.reduce((a: number, b: number) => a + b, 0) / group.energyLevels.length
         : 3;
       const avgCrowd = group.crowdFactors?.length > 0
         ? group.crowdFactors.reduce((a: number, b: number) => a + b, 0) / group.crowdFactors.length
         : 3;
       
       // complex formula based on frequency (count), rating, wave height, energy, and crowd
       const bump = (avgRating - 3) * 4          // rating contribution
         + (maxHt > 0.8 ? 3 : 0)                // wave height contribution (lowered from 1.5m)
         + (group.count > 1 ? 3 : 0)            // frequency bonus
         + (avgEnergy - 3) * 2                  // energy contribution
         + (avgCrowd <= 2 ? 2 : 0)              // quiet lineup bonus
         + 1;                                   // baseline: +1 just for showing up
       rollingScore = Math.min(100, Math.max(0, rollingScore + bump));
       
       result.push({
         date,
         score: Math.round(rollingScore)
       });
     });
     
     return result;
  }, [filteredSessions]);

  // 9.3 Fetch AI Coaching
  const lastCacheKey = useRef<string>('');

  useEffect(() => {
    const getCoaching = async () => {
      if (filteredSessions.length === 0 || !homeSpotId || !homeSpot || isGuest || !user) return;

      const cacheKey = buildCoachCacheKey(homeSpotId, filteredSessions.length, timeframe);

      // Skip if we already loaded this exact cache key this session
      if (cacheKey === lastCacheKey.current) return;
      lastCacheKey.current = cacheKey;

      // Check cache first
      const cached = await getGeminiCache(user.uid, cacheKey);
      if (cached) {
        setAiAnalysis(cached);
        return;
      }

      // Cache miss — call Gemini
      setIsLoadingAnalysis(true);
      try {
        const result = await getSkillCoachAnalysis(
          filteredSessions,
          quiver,
          homeSpot.name,
          timeframe
        );
        await setGeminiCache(user.uid, cacheKey, result);
        setAiAnalysis(result);
      } catch(e) {
        console.error('Gemini coaching failed:', e);
      } finally {
        setIsLoadingAnalysis(false);
      }
    };

    const timeoutId = setTimeout(getCoaching, 800);
    return () => clearTimeout(timeoutId);
  }, [filteredSessions.length, homeSpotId, timeframe, isGuest, homeSpot, forecasts, preferredWaveHeight, user, quiver]);


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
              <span className="text-[10px] font-bold uppercase tracking-widest text-textMuted block mb-1">Wave Rate</span>
              <span className="text-2xl font-black text-text">{stats.waveRate}<span className="text-xs font-medium text-textMuted ml-1">/hr</span></span>
            </div>
            <div className="bg-surface border border-border p-4 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-widest text-textMuted block mb-1">Best Score</span>
              <span className="text-2xl font-black text-primary">{stats.bestScore > 0 ? `${stats.bestScore}/5` : '--'}</span>
            </div>
            <div className="bg-surface border border-border p-4 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-widest text-textMuted block mb-1">Avg Energy</span>
              <span className="text-2xl font-black text-amber-400">{stats.avgEnergy !== '--' ? `${stats.avgEnergy}/5` : '--'}</span>
            </div>
            <div className="bg-surface border border-border p-4 rounded-xl shadow-sm col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-textMuted block mb-1">Avg Crowd</span>
              <span className="text-2xl font-black text-text">{stats.avgCrowd !== '--' ? `${stats.avgCrowd}/5` : '--'}</span>
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
                    <h3 className="font-bold text-text">Progression Coaching</h3>
                    <p className="text-[10px] text-primary font-bold uppercase tracking-widest">AI Coach · Gemini</p>
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