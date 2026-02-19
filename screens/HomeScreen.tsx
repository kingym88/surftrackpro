import React from 'react';
import { Screen } from '../types';
import { GuestGate } from '@/src/components/GuestGate';

interface HomeScreenProps {
  onNavigate: (screen: Screen) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  return (
    <div className="pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-primary/10">
        <div className="flex items-center gap-2">
          <div className="bg-primary/20 p-2 rounded-lg">
            <span className="material-icons-round text-primary">location_on</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Current Spot</p>
            <div className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onNavigate(Screen.SPOT_LIST)}>
              <h1 className="text-lg font-bold">Malibu Surfrider</h1>
              <span className="material-icons-round text-sm">expand_more</span>
            </div>
          </div>
        </div>
        <button className="relative bg-surface p-2.5 rounded-full border border-border hover:bg-surface hover:brightness-110 transition-colors">
          <span className="material-icons-round">notifications</span>
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background-dark"></span>
        </button>
      </header>

      <main className="p-6 space-y-8">
        {/* Daily Forecast Hero */}
        <section onClick={() => onNavigate(Screen.SPOT_DETAIL)} className="cursor-pointer group">
          <div className="relative overflow-hidden bg-primary rounded-xl p-6 text-text shadow-xl shadow-primary/20 transition-transform group-hover:scale-[1.02]">
            {/* Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-surface hover:brightness-110 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10"></div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md">LIVE FORECAST</span>
                  <h2 className="text-4xl font-bold mt-4 tracking-tight">4-6<span className="text-xl font-normal opacity-80">ft</span></h2>
                  <p className="text-text/80 font-medium">Clean & Consistent</p>
                </div>
                <div className="text-right">
                  <span className="material-icons-round text-4xl">tsunami</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/20">
                <div className="flex flex-col items-center">
                  <span className="material-icons-round text-text/60 text-lg mb-1">timer</span>
                  <p className="text-sm font-bold">12s</p>
                  <p className="text-[10px] uppercase opacity-60">Swell Period</p>
                </div>
                <div className="flex flex-col items-center">
                  <span className="material-icons-round text-text/60 text-lg mb-1">air</span>
                  <p className="text-sm font-bold">8mph <span className="material-icons-round text-[10px]">south_east</span></p>
                  <p className="text-[10px] uppercase opacity-60">Offshore</p>
                </div>
                <div className="flex flex-col items-center">
                  <span className="material-icons-round text-text/60 text-lg mb-1">water_drop</span>
                  <p className="text-sm font-bold">64°F</p>
                  <p className="text-[10px] uppercase opacity-60">Water Temp</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Personalized Recommendations */}
        <GuestGate featureName="AI Session Matching" onNavigate={onNavigate}>
          <section onClick={() => onNavigate(Screen.SURF_MATCH)} className="cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Personalized Insight</h3>
              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase">AI Match</span>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex gap-4 items-start hover:bg-primary/10 transition-colors">
              <div className="bg-primary p-3 rounded-lg text-text">
                <span className="material-icons-round">psychology</span>
              </div>
              <div>
                <h4 className="font-bold text-primary mb-1">Best time: 08:30 AM</h4>
                <p className="text-sm leading-relaxed text-textMuted">Conditions today match your <span className="text-text font-medium italic">"Epic Tuesday Session"</span> from last month. High tide push will create those perfect peeling right-handers you love.</p>
              </div>
            </div>
          </section>
        </GuestGate>

        {/* Nearby Spots */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-text">Nearby Spots</h3>
            <button onClick={() => onNavigate(Screen.SPOT_LIST)} className="text-primary text-xs font-bold uppercase tracking-wider hover:text-primary/80">View Map</button>
          </div>
          <div className="space-y-3">
            {/* Spot Card 1 */}
            <div onClick={() => onNavigate(Screen.SPOT_DETAIL)} className="bg-surface border border-border rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-surface hover:brightness-110 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface flex-shrink-0">
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAZSpm8zFQsdey93NiQwCwtU04B810W6M-d9YTW_5F_-WQDNdY1Pro5zTU7qp5_g6wazDoFpvJsIh0WTaXLc2WgDPCYnl8WVxRzTtgTePLl7bWVbmamrdlz0_wKriBArJhr8YXtY5m0A3MhQXxRG7oh7XdqzJzRCntq12VxQ8L7uEy5ON9Bdiyhoq61HEY3dw8cEkx1fUMcVqCsHzCy5anVvyCoW3OiQiJMApIvHq5uMAJxMrHwSADeOTSwl2WQDUL7_yzy08dw21d9" alt="Surf Spot" className="w-full h-full object-cover opacity-80" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Topanga Beach</h4>
                  <p className="text-xs text-slate-500">2.4 miles away • WSW Swell</p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-emerald-500/20 text-emerald-500 text-[10px] font-bold px-2 py-1 rounded uppercase mb-1 inline-block">Epic</div>
                <p className="text-sm font-bold">5-7ft</p>
              </div>
            </div>

            {/* Spot Card 2 */}
            <div onClick={() => onNavigate(Screen.SPOT_DETAIL)} className="bg-surface border border-border rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-surface hover:brightness-110 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface flex-shrink-0">
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuB9YdIhNLYQJKIzz8K3V7vze7tJ6-qGKnczZCkoGG4W3b8W-ivxBkbTlXtX0yXnECzH8p5HVV2TCuNCnEwBFgiWHY6dfrLVVurrtbRFErws_t05DjJUeMsjnXo956428izdfOmyWgHmv3EQl2INZQMB2DPsa06ud5SE-1pzOctsH7Br4vjZjdn1M7SvWJ3zTpYPF5O74HTbVTPtBPw9-oyMV1Nyei8aZ3IjatZu7eJL9wX5WIZOtcH_TzPO5Qyg8FLjqIOH-Kv1oBb-" alt="Surf Spot" className="w-full h-full object-cover opacity-80" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Zuma Beach</h4>
                  <p className="text-xs text-slate-500">8.1 miles away • NW Swell</p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-blue-500/20 text-blue-500 text-[10px] font-bold px-2 py-1 rounded uppercase mb-1 inline-block text-center">Good</div>
                <p className="text-sm font-bold">3-4ft</p>
              </div>
            </div>
            
            {/* Spot Card 3 */}
            <div onClick={() => onNavigate(Screen.SPOT_DETAIL)} className="bg-surface border border-border rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-surface hover:brightness-110 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface flex-shrink-0">
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCrC7aVTRDgJASrP_-KcS4lEpKmi7DU2tg3hd4n-AMx32RmTlDzP7SyeXKyfwRj24dPaNyW0rRxm3iGBkHfSP8YKakQJZYwn1dgDnzvicz8855NgZy7UpQG2CZd4tkUdHw1y3LXhF5cc-0-fCjMsZQk0w-elnBxmetcIk6_IczFqZA8rvMoQtC9g1vDSq6AgbrkOcgZcmYm056480XV4HAEQmLpIVDDWuSS81bcmMy-1jP_rsdUpsfgjUrltqYEVEmFyqtpOTwFlHHM" alt="Surf Spot" className="w-full h-full object-cover opacity-80" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Leo Carrillo</h4>
                  <p className="text-xs text-slate-500">12.5 miles away • W Swell</p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-slate-500/20 text-textMuted text-[10px] font-bold px-2 py-1 rounded uppercase mb-1 inline-block text-center">Fair</div>
                <p className="text-sm font-bold text-textMuted">2-3ft</p>
              </div>
            </div>
          </div>
        </section>

        {/* Weather/Tide Quick Glance */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-surface rounded-xl p-4 border border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-primary uppercase">Tide</p>
              <span className="material-icons-round text-sm text-slate-500">trending_up</span>
            </div>
            <h5 className="text-lg font-bold">High <span className="text-xs font-normal text-slate-500">at 1:42 PM</span></h5>
            <p className="text-xs text-textMuted mt-1">4.2ft rising</p>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-primary uppercase">Sun</p>
              <span className="material-icons-round text-sm text-slate-500">wb_sunny</span>
            </div>
            <h5 className="text-lg font-bold">Sunset <span className="text-xs font-normal text-slate-500">at 7:45 PM</span></h5>
            <p className="text-xs text-textMuted mt-1">11h of daylight</p>
          </div>
        </section>
      </main>
    </div>
  );
};