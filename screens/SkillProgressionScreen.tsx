import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/src/context/AppContext';
import { getGeminiInsight } from '@/src/services/geminiInsight';
import { GuestGate } from '@/src/components/GuestGate';
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
  const { sessions } = useApp();
  const [timeframe, setTimeframe] = useState<'30' | '90' | 'ALL'>('30');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

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
    // Rough mockup calculation for avg wave time
    const avgWaveTime = totalDuration > 0 ? (totalDuration / total) * 0.1 : 0; 
    const bestScore = Math.max(...filteredSessions.map(s => s.rating));
    return { 
        total, 
        topSpeed: topSpeed > 0 ? topSpeed : '--', 
        avgWaveTime: avgWaveTime > 0 ? avgWaveTime.toFixed(1) : '--',
        bestScore 
    };
  }, [filteredSessions]);

  // Chart Data
  const chartData = useMemo(() => {
    // Group by day for simple progression over time based on ratings
    const grouped = [...filteredSessions].sort((a, b) => a.timestamp - b.timestamp).map(s => {
       const d = new Date(s.timestamp);
       return {
          date: `${d.getMonth()+1}/${d.getDate()}`,
          rating: s.rating * 20, // Scale 1-5 to 0-100 for graph aesthetics
          waves: s.waveCount || Math.floor(Math.random() * 15) + 5 // mock wave count if missing
       };
    });
    return grouped;
  }, [filteredSessions]);

  // Fetch AI Coaching
  useEffect(() => {
      const getCoaching = async () => {
         if (filteredSessions.length === 0) return;
         setIsLoadingAnalysis(true);
         try {
             // Basic prompt passing session metrics
             const request = `I am a surfer. In the last ${timeframe} days, I had ${stats.total} sessions. 
             My best session rating was ${stats.bestScore}/5. My top speed was ${stats.topSpeed}km/h. 
             Provide a highly encouraging 3-sentence coach analysis and one specific recommendation for what to practice next.`;
             const result = await getGeminiInsight([{ role: 'user', content: request }], undefined, undefined, undefined);
             setAiAnalysis(result.summary || "Keep up the good work! Getting in the water is half the battle.");
         } catch(e) {
             console.log(e);
         } finally {
             setIsLoadingAnalysis(false);
         }
      };
      
      const timeoutId = setTimeout(getCoaching, 500); // debounce slightly
      return () => clearTimeout(timeoutId);
  }, [stats.total, timeframe]);


  return (
    <div className="pb-20 min-h-screen bg-background">
      {/* Header Navigation */}
      <nav className="px-6 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-40 border-b border-border shadow-sm">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface border border-border text-textMuted hover:text-text transition-colors">
          <span className="material-icons-round text-lg">arrow_back_ios_new</span>
        </button>
        <h1 className="text-xl font-bold tracking-tight text-text font-display">Skill Progression</h1>
        <div className="w-10"></div> {/* Spacer */}
      </nav>

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
        <GuestGate featureName="Performance Trends">
            <section className="space-y-4">
            <h2 className="text-sm font-bold text-text uppercase tracking-widest flex items-center gap-2">
                <span className="material-icons-round text-primary text-sm">trending_up</span> Trajectory
            </h2>
            <div className="bg-surface border border-border p-4 rounded-2xl shadow-sm mt-4">
                {chartData.length > 1 ? (
                   <div className="h-48 w-full">
                       <ResponsiveContainer width="100%" height="100%">
                         <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                           <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                           <YAxis stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                           <Tooltip 
                              contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
                              itemStyle={{ color: 'var(--color-text)', fontSize: '12px', fontWeight: 'bold' }}
                           />
                           <Line 
                              type="monotone" 
                              dataKey="rating" 
                              name="Session Score"
                              stroke="var(--color-primary)" 
                              strokeWidth={3} 
                              dot={{ r: 4, fill: 'var(--color-primary)', strokeWidth: 2, stroke: 'var(--color-background)' }}
                              activeDot={{ r: 6 }} 
                           />
                           <Line 
                              type="monotone" 
                              dataKey="waves" 
                              name="Wave Count"
                              stroke="var(--color-accent2)" 
                              strokeWidth={2} 
                              strokeDasharray="4 4"
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
        </GuestGate>

        {/* Coach's Tip Section */}
        <GuestGate featureName="AI Coach Analysis">
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
        </GuestGate>
      </main>
    </div>
  );
};