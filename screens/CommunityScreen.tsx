import React from 'react';

export const CommunityScreen: React.FC = () => {
  return (
    <div className="pb-24">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 bg-background-dark/80 backdrop-blur-md border-b border-primary/10 px-6 py-4">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold tracking-tight text-text">Community</h1>
          <div className="flex gap-4">
            <button className="p-2 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors">
              <span className="material-icons-round text-xl">search</span>
            </button>
            <button className="p-2 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors">
              <span className="material-icons-round text-xl">person_add</span>
            </button>
          </div>
        </div>
        {/* Segmented Control */}
        <div className="max-w-md mx-auto mt-6 bg-primary/10 p-1 rounded-xl flex">
          <button className="flex-1 py-2 text-sm font-semibold rounded-lg bg-primary text-text shadow-lg">Friends</button>
          <button className="flex-1 py-2 text-sm font-semibold text-textMuted hover:text-text transition-colors">Leaderboard</button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 pb-24 pt-6 space-y-8">
        {/* Privacy & Sharing Section */}
        <section className="bg-background/50 p-5 rounded-xl border border-primary/10 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Broadcast Stats</h2>
            <span className="material-icons-round text-primary/40 text-sm">settings</span>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-text">Match Score Visibility</p>
                <p className="text-xs text-slate-500">Show how well you fit today's swell</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input defaultChecked className="sr-only peer" type="checkbox" />
                <div className="w-11 h-6 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-text">Epic Sessions Feed</p>
                <p className="text-xs text-slate-500">Auto-share your top 5% rated sessions</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input className="sr-only peer" type="checkbox" />
                <div className="w-11 h-6 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </section>

        {/* Live Friends Feed */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text">Activity Feed</h2>
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">3 LIVE NOW</span>
          </div>
          {/* Feed Item 1 (Live) */}
          <div className="bg-background/50 rounded-xl p-4 border-l-4 border-primary shadow-sm hover:bg-background/70 transition-colors cursor-pointer">
            <div className="flex gap-4">
              <div className="relative">
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuALluRxxMPHrVo0HeB8og15On-a4bVgWeEfUYNcW4W8r043WSVqd3yivel1Fgcb0jg68dghamYD0ITgqoIgFWy01ZFVD45SJiOUCjFM62w8fpwBFpRb-7hqJul8e2z_14USJKYODQo3ElzSeQIVg1R_r8OKoBMNDUBy1hmORijC6Z2CPRzPEr6MrU1TrbQ8hCJYXiK6Zj_Tb2vjY0y4yoBuBNA-hUiPkr7x_YhYam-GCdUBEeC-qWVp21bdZTX9uWrKY4iAaNZMG4px" alt="Profile" className="w-12 h-12 rounded-full object-cover" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary border-2 border-slate-900 rounded-full animate-pulse"></div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-text">Sarah Jenkins</h3>
                  <span className="text-[10px] text-slate-500">2m ago</span>
                </div>
                <p className="text-sm mt-1 text-textMuted">
                  Charging at <span className="text-primary font-semibold">Lower Trestles</span>
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase">Match 94%</span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <span className="material-icons-round text-xs">water</span> 4-6ft
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* Feed Item 2 (Epic Session) */}
          <div className="bg-background/50 rounded-xl p-4 border border-primary/5 shadow-sm hover:bg-background/70 transition-colors">
            <div className="flex gap-4">
              <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDFhnRN9t9FPTlyYjuY8rCiyyRvq4mENhyGtTrcis93VmL7VlmHI10P05Kbe56uwBTb65bP2GjqkJ3e5cJLLyfvZtDvKXCmwcrTVQDkNbdHaIief68PLZRUhX1y3Ik_0nXm6XZ0Pz9YTT0cJ-Oy5RZxkSSypGzlCRJaOeygZLVeEX6h_eje4_9W9FfCTfImXkPE7K7MRMTsR_KD3Ocs_2TdPbVZUmv7FpkCiyi2bumKfw7XZ7D7pLfRIpneaeNtNJVL50uzdHTNhDdb" alt="Profile" className="w-12 h-12 rounded-full object-cover" />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-text">Kai Alana</h3>
                  <span className="text-[10px] text-slate-500">4h ago</span>
                </div>
                <p className="text-sm mt-1 text-textMuted italic">
                  "Best swell of the season. Long lines at Rincon."
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 bg-primary/5 p-2 rounded-lg">
                  <div className="text-center">
                    <p className="text-[10px] uppercase text-slate-500 font-bold tracking-tighter">Waves</p>
                    <p className="text-lg font-bold text-primary leading-tight">18</p>
                  </div>
                  <div className="text-center border-l border-primary/10">
                    <p className="text-[10px] uppercase text-slate-500 font-bold tracking-tighter">Rating</p>
                    <div className="flex justify-center items-center gap-0.5 text-yellow-500">
                      <span className="material-icons-round text-sm">star</span>
                      <span className="text-sm font-bold">4.9</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Community Leaderboard Preview */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text">Local Legends</h2>
            <button className="text-sm font-bold text-primary">View Full</button>
          </div>
          <div className="bg-background/50 rounded-xl overflow-hidden border border-primary/10">
            <div className="p-4 bg-primary/10 flex justify-between items-center">
              <span className="text-xs font-bold text-primary tracking-widest uppercase">Rank • Surfer</span>
              <span className="text-xs font-bold text-primary tracking-widest uppercase">Epic Sessions</span>
            </div>
            {/* Rank 1 */}
            <div className="flex items-center justify-between p-4 border-b border-primary/5 hover:bg-surface/30 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-primary w-5">1</span>
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuB4lqF5TokaQqaW44-TTM2bHIxGRwYWLdSmaALW-J4_53pLyAQ939mtIQny3UntmUUsJgeQ38_4XdukEzLleYX6LL-9w3hwijYvQFOUKuHMEkgxYFFWuV2Fivn4SEqzhBdhA3jXYfgGX6qmv1-q0Zdyf11JudyXxHYTsxAryOOMnm5FnfpNUgIRXHNa_cci8nRnNhM2YNjv31W4NMduINB8K3f2_yK72yycJ2C-zyNslOEWHjHWsSSaIDlkn0HWblkDDq78wXpzW98a" alt="Profile" className="w-8 h-8 rounded-full" />
                <span className="font-medium text-text">Marcus V.</span>
              </div>
              <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full">
                <span className="material-icons-round text-xs">auto_awesome</span>
                <span className="text-sm font-bold">42</span>
              </div>
            </div>
            {/* Rank 2 */}
            <div className="flex items-center justify-between p-4 border-b border-primary/5 hover:bg-surface/30 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-textMuted w-5">2</span>
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuD8tw4B9JNI19OizOUwQWVCiMkF8HA-SGcHb-YGRdxlfZEf9NpkBMBdmQTs7v2jeiI0ur4AFwohDEBMzVx_RAbsdH-Mus31VpqxUm1YJB5eOvHj3Pp_JNvuC0gjQb75qmpsRBquMvDN-yQZSb9bzqxGJVsUYM_6jLd9KantwJNpezQhX5mJT5dHu6HR-wCkoTkxV47Vs25fGd98Oc6vipvz65utFj5L-4CZZwHD1vxELjEUWBY1CrQgYg-VaKDyKXN3cDf4XjW9O4x4" alt="Profile" className="w-8 h-8 rounded-full" />
                <span className="font-medium text-text">Elena S.</span>
              </div>
              <div className="flex items-center gap-1 bg-primary/5 text-primary px-2 py-0.5 rounded-full">
                <span className="material-icons-round text-xs">auto_awesome</span>
                <span className="text-sm font-bold">38</span>
              </div>
            </div>
            {/* User Sticky Rank */}
            <div className="bg-primary p-4 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-text w-5">24</span>
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary font-bold text-xs border-2 border-white/20">ME</div>
                <span className="font-bold text-text">You</span>
              </div>
              <div className="flex items-center gap-1 bg-white/20 text-text px-3 py-1 rounded-full">
                <span className="material-icons-round text-xs">auto_awesome</span>
                <span className="text-sm font-bold">12</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};