import React, { useState, useMemo, useEffect } from 'react';
import { Screen } from '../types';
import type { SurfSpot, ForecastSnapshot, GeminiInsight, SwellQualityScore } from '../types';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/context/AuthContext';
import { GuestGate } from '@/src/components/GuestGate';
import { TideMiniChart } from '@/src/components/TideMiniChart';
import { getPrecomputedForecast } from '@/src/services/firestore';
import { fetchOpenMeteoForecast } from '@/src/services/openMeteo';
import { computeSwellQuality } from '@/src/services/swellQuality';
import { getGeminiInsight } from '@/src/services/geminiInsight';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface SpotDetailScreenProps {
  spot: SurfSpot | null;
  onNavigate: (screen: Screen) => void;
  onBack: () => void;
}

type Tab = 'FORECAST' | 'ANALYSIS' | 'CAMS' | 'LOGS';

export const SpotDetailScreen: React.FC<SpotDetailScreenProps> = ({ spot, onNavigate, onBack }) => {
  const [activeTab, setActiveTab] = useState<Tab>('FORECAST');
  const { isGuest, sessions, preferredWaveHeight } = useApp();
  
  const [localForecasts, setLocalForecasts] = useState<ForecastSnapshot[]>([]);
  const [isStale, setIsStale] = useState(false);
  const [loadingForecast, setLoadingForecast] = useState(false);
  
  const [insight, setInsight] = useState<GeminiInsight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  // 7.1 Precomputed Forecast Loading Strategy
  useEffect(() => {
    if (!spot) return;
    
    const loadForecasts = async () => {
      setLoadingForecast(true);
      try {
        const cached = await getPrecomputedForecast(spot.id);
        const now = new Date();
        
        let fetchedFresh = false;
        if (cached && (now.getTime() - cached.runAt.toDate().getTime()) / 3600000 < 12) {
          setLocalForecasts(cached.data);
          setIsStale(false);
          fetchedFresh = true;
        } else {
          try {
            const live = await fetchOpenMeteoForecast(spot.coordinates.lat, spot.coordinates.lng);
            setLocalForecasts(live);
            setIsStale(false);
            fetchedFresh = true;
          } catch (err) {
            console.error('Failed live fetch', err);
          }
        }
        
        if (!fetchedFresh && cached) {
          setLocalForecasts(cached.data);
          setIsStale(true);
        }
      } catch (e) {
        console.error('Error loading forecast', e);
      } finally {
        setLoadingForecast(false);
      }
    };
    
    loadForecasts();
  }, [spot]);

  // 7.6 Best Session Windows
  useEffect(() => {
    if (activeTab === 'ANALYSIS' && localForecasts.length > 0 && spot && !isGuest) {
      setLoadingInsight(true);
      getGeminiInsight(localForecasts, spot.breakProfile!, sessions, preferredWaveHeight || { min: 0.5, max: 3.0 })
        .then(setInsight)
        .catch(console.error)
        .finally(() => setLoadingInsight(false));
    }
  }, [activeTab, localForecasts, spot, isGuest, sessions, preferredWaveHeight]);

  const currentCondition = localForecasts[0] ? computeSwellQuality(localForecasts[0], spot?.breakProfile!) : null;

  const chartData = useMemo(() => {
    if (!localForecasts.length) return [];
    const daily: Record<string, { waveHt: number[], period: number[] }> = {};
    localForecasts.forEach(f => {
      const day = new Date(f.forecastHour).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      if (!daily[day]) daily[day] = { waveHt: [], period: [] };
      daily[day].waveHt.push(f.waveHeight);
      daily[day].period.push(f.wavePeriod);
    });

    return Object.keys(daily).slice(0, 7).map(day => ({
      day,
      waveHeight: Math.max(...daily[day].waveHt),
      period: Math.round(daily[day].period.reduce((a, b) => a + b, 0) / daily[day].period.length),
    }));
  }, [localForecasts]);

  if (!spot) return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 h-screen bg-background">
      <span className="material-icons-round text-6xl text-textMuted mb-4">location_off</span>
      <h2 className="text-xl font-bold mb-2 text-text">No Spot Selected</h2>
      <button onClick={onBack} className="mt-8 px-6 py-2 rounded-full border border-border text-text hover:bg-surface transition-colors">
        Go Back
      </button>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'ANALYSIS':
        return (
          <div className="space-y-4 animate-fadeIn">
            {/* 7.6 AI Post-Session / Best Windows */}
            <GuestGate featureName="AI Best Session Windows" onNavigate={onNavigate}>
              <section className="bg-primary/10 backdrop-blur-md border border-primary/20 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-icons-round text-primary">psychology</span>
                    <h3 className="text-sm font-bold tracking-tight uppercase text-text">AI Best Windows</h3>
                  </div>
                </div>
                {insight ? (
                  <div className="space-y-3">
                    <p className="text-sm text-text leading-relaxed tracking-wide font-medium border-b border-primary/10 pb-3">{insight.summary}</p>
                    {insight.bestWindows.map((win, idx) => (
                      <div key={idx} className="bg-surface/50 p-3 rounded-xl border border-border">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="material-icons-round text-primary text-sm">schedule</span>
                          <span className="text-xs font-bold text-text">
                            {new Date(win.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                            {new Date(win.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <p className="text-xs text-textMuted leading-relaxed">{win.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 flex flex-col items-center justify-center opacity-50">
                     <span className="material-icons-round text-3xl mb-2 animate-spin">sync</span>
                     <p className="text-xs text-textMuted uppercase tracking-widest">{loadingInsight ? 'Generating Insight...' : 'No Insight yet'}</p>
                  </div>
                )}
              </section>
            </GuestGate>
          </div>
        );

      case 'FORECAST':
      default:
        return (
          <div className="space-y-6 animate-fadeIn">
            
            {isStale && (
              <div className="bg-amber-900/40 rounded-lg p-2 text-amber-300 text-xs flex items-center gap-2">
                <span className="material-icons-round text-sm">warning</span>
                Data may be outdated — live fetch failed.
              </div>
            )}
            
            {/* 7.2 Swell Quality Score Card */}
            {currentCondition && (
               <div className="flex flex-col items-center justify-center bg-surface border border-border rounded-xl p-6 text-center shadow-lg relative overflow-hidden">
                 <div className={`absolute -top-10 -right-10 w-32 h-32 blur-3xl opacity-20 rounded-full ${currentCondition.label === 'EPIC' ? 'bg-accent1' : currentCondition.label === 'GOOD' ? 'bg-primary' : currentCondition.label === 'FAIR' ? 'bg-accent2' : 'bg-red-500'}`}></div>
                 <p className="text-[10px] font-bold tracking-widest uppercase text-textMuted mb-2">Live Condition</p>
                 <h2 className={`text-4xl font-black tracking-tight mb-2 ${currentCondition.label === 'EPIC' ? 'text-accent1' : currentCondition.label === 'GOOD' ? 'text-primary' : currentCondition.label === 'FAIR' ? 'text-accent2' : 'text-red-500'}`}>
                   {currentCondition.label}
                 </h2>
                 {currentCondition.confidence === 'LOW' && (
                    <p className="text-xs text-amber-400 font-bold mb-2">Uncertain — models disagree</p>
                 )}
                 <div className="flex flex-col items-center gap-1 mt-2">
                   {currentCondition.reasons.map((reason, i) => (
                     <span key={i} className="text-textMuted text-xs font-medium bg-background px-3 py-1 rounded-full border border-border flex items-center gap-1">
                       <span className="w-1.5 h-1.5 rounded-full bg-primary/50"></span> {reason}
                     </span>
                   ))}
                 </div>
               </div>
            )}

            {/* 7.4 7-Day Composed Chart */}
            <section className="bg-surface/50 border border-border rounded-xl p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold tracking-tight uppercase text-text">7-Day Trend</h3>
              </div>
              
              <GuestGate featureName="7-day forecast chart" onNavigate={onNavigate}>
                <div className="h-48 w-full mt-4 text-[10px] font-mono font-bold">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: 'var(--color-text-muted)'}} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: 'var(--color-primary)'}} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: 'var(--color-accent2)'}} />
                        <Tooltip 
                           contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '12px', color: 'var(--color-text)' }}
                           itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                        />
                        <Bar yAxisId="left" dataKey="waveHeight" fill="var(--color-primary)" radius={[4, 4, 0, 0]} name="Wave Ht (ft)" barSize={20} />
                        <Line yAxisId="right" type="monotone" dataKey="period" stroke="var(--color-accent2)" strokeWidth={3} dot={{r:4, fill: 'var(--color-surface)', strokeWidth: 2}} name="Period (s)" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center animate-pulse bg-background/50 rounded-lg"></div>
                  )}
                </div>
              </GuestGate>
            </section>

            {/* Tide Chart */}
            <section className="bg-surface/50 border border-border rounded-xl p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold tracking-tight uppercase text-text">Tide Cycle</h3>
              </div>
              <TideMiniChart guestMode={isGuest} tides={[]} />
            </section>

            {/* 7.3 Detailed Breakdown Table */}
            <section>
              <h3 className="text-sm font-bold tracking-tight uppercase mb-4 text-text">Hourly Breakdown</h3>
              <div className="bg-surface border border-border rounded-xl overflow-y-auto max-h-96">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-background/90 backdrop-blur-md z-10">
                    <tr className="text-textMuted font-medium text-left">
                      <th className="py-2 px-3 uppercase text-[10px] tracking-wider">Time</th>
                      <th className="py-2 px-3 uppercase text-[10px] tracking-wider">Wave Ht</th>
                      <th className="py-2 px-3 uppercase text-[10px] tracking-wider">Period</th>
                      <th className="py-2 px-3 uppercase text-[10px] tracking-wider">Swell Dir</th>
                      <th className="py-2 px-3 uppercase text-[10px] tracking-wider">Wind</th>
                      <th className="py-2 px-3 uppercase text-[10px] tracking-wider">Gust</th>
                      <th className="py-2 px-3 uppercase text-[10px] tracking-wider">Quality</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-text">
                    {localForecasts.map((f, i) => {
                      const time = new Date(f.forecastHour).toLocaleTimeString([], { hour: 'numeric' });
                      const isGuestBlur = isGuest && i > 24; 
                      
                      const qScore = computeSwellQuality(f, spot?.breakProfile || {} as any);
                      
                      const RowContent = (
                        <tr key={i} className="hover:bg-background/50 transition-colors">
                          <td className="py-3 px-3 font-bold whitespace-nowrap">{time}</td>
                          <td className="py-3 px-3 font-bold text-primary">{f.waveHeight.toFixed(1)}m</td>
                          <td className="py-3 px-3 text-textMuted">{f.wavePeriod.toFixed(0)}s</td>
                          <td className="py-3 px-3">
                            <span className="material-icons-round text-sm" style={{ rotate: `${f.swellDirection}deg` }}>north</span>
                          </td>
                          <td className="py-3 px-3 font-bold">{f.windSpeed.toFixed(0)}km/h</td>
                          <td className="py-3 px-3 text-textMuted">{f.windGust.toFixed(0)}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${qScore.label === 'EPIC' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : qScore.label === 'GOOD' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : qScore.label === 'FAIR' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-red-500/20 text-red-500 border-red-500/30'}`}>
                              {qScore.label}
                            </span>
                          </td>
                        </tr>
                      );

                      if (isGuestBlur) {
                        return (
                           <div key={i} className="contents relative">
                              {i === 25 ? <tr className="relative">
                                 <td colSpan={7} className="p-0">
                                   <GuestGate featureName="Full hourly forecast" onNavigate={onNavigate}>
                                     <div className="h-32 blur-sm opacity-40 bg-surface"></div>
                                   </GuestGate>
                                 </td>
                              </tr> : null}
                           </div>
                        );
                      }
                      return RowContent;
                    })}
                  </tbody>
                </table>
              </div>
            </section>
            
            {/* 7.5 Multi-Model Confidence Panel */}
            <section className="bg-surface/50 border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Forecast Confidence</h3>
              <GuestGate featureName="Multi-model confidence" onNavigate={onNavigate}>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 p-2 bg-background rounded-lg border border-amber-500/20">
                    <span className="material-icons-round text-amber-500 text-sm">warning</span>
                    <p className="text-xs text-amber-400 font-medium tracking-wide">Single model — confidence limited</p>
                  </div>
                </div>
              </GuestGate>
            </section>
            
          </div>
        );
    }
  };

  return (
    <div className="pb-24 bg-background min-h-screen relative selection:bg-primary/20">
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border shadow-sm">
        
        {/* Dynamic Image Hero bg */}
        <div className="absolute inset-0 h-24 overflow-hidden -z-10 opacity-30">
           <img src={spot.image || 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'} alt={spot.name} className="w-full h-full object-cover blur-sm brightness-50" />
           <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent"></div>
        </div>

        <div className="px-4 pt-6 pb-2 flex items-center justify-between relative z-10">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full bg-surface/50 border border-border hover:bg-surface transition-colors">
            <span className="material-icons-round text-text text-sm">arrow_back_ios_new</span>
          </button>
          <div className="text-center flex-1">
            <h1 className="text-xl font-bold tracking-tight text-text">{spot.name}</h1>
            <p className="text-[10px] text-primary font-bold tracking-widest uppercase">
              {spot.region || 'Portugal'}
            </p>
          </div>
          <button className="p-2 -mr-2 rounded-full bg-surface/50 border border-border hover:bg-surface transition-colors text-red-500">
            <span className="material-icons-round text-sm">favorite_border</span>
          </button>
        </div>
        {/* Segmented Control */}
        <div className="flex px-4 py-3 gap-2">
          {(['FORECAST', 'ANALYSIS'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === tab 
                  ? 'bg-text text-background shadow-soft' 
                  : 'bg-surface text-textMuted hover:bg-surface/80 border border-border'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-6">
        {renderTabContent()}
      </main>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-background via-background/90 to-transparent z-40">
        <button onClick={() => onNavigate(Screen.LOG_SESSION)} className="w-full bg-text text-background font-bold py-4 rounded-full shadow-soft flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-transform">
          <span className="material-icons-round text-lg">history_edu</span>
          <span className="tracking-wide">LOG SESSION</span>
        </button>
      </div>
    </div>
  );
};