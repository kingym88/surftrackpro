import React, { useState, useMemo, useEffect } from 'react';
import { Screen } from '../types';
import type { SurfSpot } from '../types';
import { useApp } from '@/src/context/AppContext';
import { GuestGate } from '@/src/components/GuestGate';
import { TideMiniChart } from '@/src/components/TideMiniChart';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface SpotDetailScreenProps {
  spot: SurfSpot | null;
  onNavigate: (screen: Screen) => void;
  onBack: () => void;
}

type Tab = 'FORECAST' | 'ANALYSIS' | 'CAMS' | 'LOGS';

export const SpotDetailScreen: React.FC<SpotDetailScreenProps> = ({ spot, onNavigate, onBack }) => {
  const [activeTab, setActiveTab] = useState<Tab>('FORECAST');
  const { forecasts, qualityScores, geminiInsights } = useApp();
  
  // Fetch on mount if missing
  useEffect(() => {
    if (spot && !forecasts[spot.id]) {
      (() => {})(spot.id, spot.coordinates.lat, spot.coordinates.lon);
    }
  }, [spot, forecasts, (() => {})]);

  const rawForecasts = spot ? forecasts[spot.id]?.forecasts || [] : [];
  const scores = spot ? qualityScores[spot.id] || [] : [];
  const currentInsight = spot ? geminiInsights[spot.id] : null;

  const currentCondition = scores[0];

  // Prep Recharts data (aggregate to daily max/avg points)
  const chartData = useMemo(() => {
    if (!rawForecasts.length) return [];
    const daily: Record<string, { waveHt: number[], period: number[] }> = {};
    rawForecasts.forEach(f => {
      const day = new Date(f.runTime).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      if (!daily[day]) daily[day] = { waveHt: [], period: [] };
      daily[day].waveHt.push(f.waveHeight);
      daily[day].period.push(f.wavePeriod);
    });

    return Object.keys(daily).slice(0, 7).map(day => ({
      day,
      waveHeight: Math.max(...daily[day].waveHt),
      period: Math.round(daily[day].period.reduce((a, b) => a + b, 0) / daily[day].period.length),
    }));
  }, [rawForecasts]);

  if (!spot) return null;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'ANALYSIS':
        return (
          <div className="space-y-4 animate-fadeIn">
            {/* Gemini Insights Card */}
            <GuestGate featureName="AI Smart Analysis" onNavigate={onNavigate}>
              <section className="bg-primary/10 backdrop-blur-md border border-primary/20 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-icons-round text-primary animate-pulse">psychology</span>
                    <h3 className="text-sm font-bold tracking-tight uppercase text-text">AI Best Windows</h3>
                  </div>
                </div>
                {currentInsight ? (
                  <div className="space-y-3">
                    <p className="text-sm text-text leading-relaxed tracking-wide font-medium border-b border-primary/10 pb-3">{currentInsight.summary}</p>
                    {currentInsight.bestWindows.map((win, idx) => (
                      <div key={idx} className="bg-surface/50 p-3 rounded-xl border border-border">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="material-icons-round text-primary text-sm">schedule</span>
                          <span className="text-xs font-bold text-text">{new Date(win.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(win.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <p className="text-xs text-textMuted leading-relaxed">{win.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 flex flex-col items-center justify-center opacity-50">
                     <span className="material-icons-round text-3xl mb-2 animate-spin">sync</span>
                     <p className="text-xs text-textMuted uppercase tracking-widest">Generating Insight</p>
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
            
            {/* Swell Quality Header */}
            {currentCondition && (
               <div className="flex flex-col items-center justify-center bg-surface border border-border rounded-xl p-6 text-center shadow-lg relative overflow-hidden">
                 <div className={`absolute -top-10 -right-10 w-32 h-32 blur-3xl opacity-20 rounded-full ${currentCondition.label === 'EPIC' ? 'bg-accent1' : currentCondition.label === 'GOOD' ? 'bg-primary' : currentCondition.label === 'FAIR' ? 'bg-accent2' : 'bg-red-500'}`}></div>
                 <p className="text-[10px] font-bold tracking-widest uppercase text-textMuted mb-2">Live Condition</p>
                 <h2 className={`text-4xl font-black tracking-tight mb-4 ${currentCondition.label === 'EPIC' ? 'text-accent1' : currentCondition.label === 'GOOD' ? 'text-primary' : currentCondition.label === 'FAIR' ? 'text-accent2' : 'text-red-500'}`}>
                   {currentCondition.label}
                 </h2>
                 <div className="flex flex-wrap justify-center gap-2">
                   {currentCondition.reasons.map((reason, i) => (
                     <span key={i} className="bg-background text-textMuted text-[10px] uppercase font-bold px-2 py-1 rounded-full border border-border">{reason}</span>
                   ))}
                 </div>
               </div>
            )}

            {/* 7-Day Composed Chart */}
            <section className="bg-surface/50 border border-border rounded-xl p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold tracking-tight uppercase text-text">7-Day Trend</h3>
              </div>
              
              <GuestGate featureName="7-Day Charts" onNavigate={onNavigate}>
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
              <TideMiniChart />
            </section>

            {/* Detailed Breakdown Table */}
            <section>
              <h3 className="text-sm font-bold tracking-tight uppercase mb-4 text-text">Hourly Breakdown</h3>
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-background text-textMuted font-medium text-left">
                      <th className="py-3 px-4 uppercase text-[10px] tracking-wider">Time</th>
                      <th className="py-3 px-4 uppercase text-[10px] tracking-wider">Surf</th>
                      <th className="py-3 px-4 uppercase text-[10px] tracking-wider">Wind</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-text">
                    {rawForecasts.slice(0, 8).map((f, i) => {
                      const time = new Date(f.runTime).toLocaleTimeString([], { hour: 'numeric' });
                      const isGuestBlur = i > 3; // Blur after first 4 rows for guests
                      
                      const RowContent = (
                        <tr key={i} className="hover:bg-background/50 transition-colors">
                          <td className="py-4 px-4 font-bold">{time}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-black text-primary">{f.waveHeight}</span>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-textMuted font-bold uppercase">ft</span>
                                <span className="text-[10px] text-textMuted">{f.wavePeriod}s</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1">
                              <span className="material-icons-round text-sm text-textMuted" style={{ rotate: `${f.windDirection}deg` }}>north</span>
                              <span className="font-bold">{f.windSpeed}kts</span>
                            </div>
                          </td>
                        </tr>
                      );

                      if (isGuestBlur) {
                        return (
                          <GuestGate key={i} featureName="Extended Hours" previewLines={0} onNavigate={onNavigate}>
                            {RowContent}
                          </GuestGate>
                        );
                      }
                      return RowContent;
                    })}
                  </tbody>
                </table>
              </div>
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
           <img src={spot.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDt812q345B5t6u7v8w9x0y1z2A3B4C5D6E7F8G9H0I1J2K3L4M5N6O7P8Q9R0S1T2U3V4W5X6Y7Z8a9b0c1d2e3f4g'} alt={spot.name} className="w-full h-full object-cover blur-sm brightness-50" />
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