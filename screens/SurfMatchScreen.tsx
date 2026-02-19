import React from 'react';

interface SurfMatchScreenProps {
    //
}

export const SurfMatchScreen: React.FC<SurfMatchScreenProps> = () => {
  return (
    <div className="pb-24">
        {/* Header */}
        <header className="px-6 py-4 sticky top-0 z-30 bg-background-dark/80 backdrop-blur-md">
            <div className="flex justify-between items-end">
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-primary/80">Tailored Forecast</p>
                    <h1 className="text-3xl font-bold tracking-tight text-text">Surf Match</h1>
                </div>
                <button className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    <span className="material-icons-round">tune</span>
                </button>
            </div>
        </header>

        <main className="px-6 pb-32">
            {/* Week Selector */}
            <div className="flex gap-4 overflow-x-auto py-6 no-scrollbar">
                <div className="flex flex-col items-center min-w-[56px] p-3 rounded-2xl bg-primary text-text shadow-lg shadow-primary/30 transform scale-105">
                    <span className="text-xs font-medium opacity-80">Sat</span>
                    <span className="text-xl font-bold">14</span>
                    <div className="w-1 h-1 bg-white rounded-full mt-1"></div>
                </div>
                {['Sun 15', 'Mon 16', 'Tue 17', 'Wed 18'].map((d) => {
                    const [day, num] = d.split(' ');
                    return (
                        <div key={d} className="flex flex-col items-center min-w-[56px] p-3 rounded-2xl bg-primary/10 border border-primary/10 cursor-pointer hover:bg-primary/20 transition-colors">
                            <span className="text-xs font-medium opacity-60 text-textMuted">{day}</span>
                            <span className="text-xl font-bold text-text">{num}</span>
                        </div>
                    );
                })}
            </div>

            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-text">
                <span className="material-icons-round text-primary text-sm">stars</span>
                Today's Best Matches
            </h2>

            {/* Match Cards List */}
            <div className="space-y-6">
                {/* Card 1: 95% Match */}
                <div className="rounded-xl p-5 bg-background/50 border border-border shadow-sm relative overflow-hidden group hover:border-primary/30 transition-colors">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-colors"></div>
                    
                    <div className="flex gap-4 items-start mb-6 relative z-10">
                        {/* Match Percentage Box (Left Aligned) */}
                        <div className="w-16 h-16 rounded-2xl bg-primary flex flex-col items-center justify-center text-text shadow-lg shadow-primary/20 flex-shrink-0">
                             <span className="text-xl font-bold">95%</span>
                             <span className="text-[10px] uppercase font-bold text-text/80">Match</span>
                        </div>
                        
                        <div>
                            <h3 className="text-xl font-bold mb-1 text-text">Saturday Morning</h3>
                            <p className="text-sm text-textMuted flex items-center gap-1">
                                <span className="material-icons-round text-xs">location_on</span>
                                Malibu First Point
                            </p>
                            <p className="text-xs font-medium text-primary mt-1">7:00 AM — 10:30 AM</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-6 relative z-10">
                        <div className="bg-primary/10 p-2 rounded-lg text-center">
                            <span className="block text-[10px] uppercase tracking-tighter text-textMuted">Swell</span>
                            <span className="text-sm font-bold text-text">4.2ft</span>
                        </div>
                        <div className="bg-primary/10 p-2 rounded-lg text-center">
                            <span className="block text-[10px] uppercase tracking-tighter text-textMuted">Period</span>
                            <span className="text-sm font-bold text-text">12s</span>
                        </div>
                        <div className="bg-primary/10 p-2 rounded-lg text-center">
                            <span className="block text-[10px] uppercase tracking-tighter text-textMuted">Wind</span>
                            <span className="text-sm font-bold text-green-500">Offshore</span>
                        </div>
                    </div>
                    <div className="space-y-2 mb-6 relative z-10">
                        <p className="text-xs font-bold text-textMuted uppercase tracking-widest">Why it's a match</p>
                        <ul className="space-y-2">
                            <li className="flex items-center gap-2 text-sm text-textMuted">
                                <span className="material-icons-round text-primary text-xs">check_circle</span>
                                <span>Swell height aligns with your "Sweet Spot"</span>
                            </li>
                            <li className="flex items-center gap-2 text-sm text-textMuted">
                                <span className="material-icons-round text-primary text-xs">check_circle</span>
                                <span>Glassy offshore conditions predicted</span>
                            </li>
                            <li className="flex items-center gap-2 text-sm text-textMuted">
                                <span className="material-icons-round text-primary text-xs">check_circle</span>
                                <span>Tide is pushing, your favorite state</span>
                            </li>
                        </ul>
                    </div>
                    <button className="relative z-10 w-full py-3 bg-primary hover:bg-primary/90 text-text font-bold rounded-lg transition-all flex items-center justify-center gap-2">
                        <span className="material-icons-round text-sm">calendar_today</span>
                        Save to My Sessions
                    </button>
                </div>

                {/* Card 2: 82% Match */}
                <div className="rounded-xl p-5 bg-background/50 border border-border shadow-sm relative overflow-hidden group hover:border-primary/30 transition-colors">
                    <div className="flex gap-4 items-start mb-6">
                        {/* Match Percentage Box (Left Aligned) */}
                        <div className="w-16 h-16 rounded-2xl bg-surface border border-slate-700 flex flex-col items-center justify-center text-text shadow-lg flex-shrink-0">
                             <span className="text-xl font-bold">82%</span>
                             <span className="text-[10px] uppercase font-bold text-textMuted">Match</span>
                        </div>
                        
                        <div>
                            <h3 className="text-xl font-bold mb-1 text-text">Sunday Sunset</h3>
                            <p className="text-sm text-textMuted flex items-center gap-1">
                                <span className="material-icons-round text-xs">location_on</span>
                                Zuma Beach
                            </p>
                            <p className="text-xs font-medium text-primary mt-1">4:30 PM — 7:00 PM</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-6">
                        <div className="bg-primary/10 p-2 rounded-lg text-center">
                            <span className="block text-[10px] uppercase tracking-tighter text-textMuted">Swell</span>
                            <span className="text-sm font-bold text-text">3.1ft</span>
                        </div>
                        <div className="bg-primary/10 p-2 rounded-lg text-center">
                            <span className="block text-[10px] uppercase tracking-tighter text-textMuted">Period</span>
                            <span className="text-sm font-bold text-text">10s</span>
                        </div>
                        <div className="bg-primary/10 p-2 rounded-lg text-center">
                            <span className="block text-[10px] uppercase tracking-tighter text-textMuted">Wind</span>
                            <span className="text-sm font-bold text-amber-500">Cross</span>
                        </div>
                    </div>
                    <button className="w-full py-3 border-2 border-primary/20 hover:border-primary/40 text-primary font-bold rounded-lg transition-all flex items-center justify-center gap-2">
                        <span className="material-icons-round text-sm">bookmark_border</span>
                        Add to Wishlist
                    </button>
                </div>

                {/* Suggestion Card */}
                <div className="bg-gradient-to-br from-primary to-blue-700 p-6 rounded-2xl text-text shadow-xl relative overflow-hidden cursor-pointer hover:shadow-2xl transition-shadow">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="material-icons-round text-sm">psychology</span>
                            <span className="text-[10px] uppercase font-bold tracking-[0.2em]">Personal Insight</span>
                        </div>
                        <h4 className="text-lg font-bold mb-2">Feeling brave?</h4>
                        <p className="text-sm opacity-90 leading-relaxed mb-4">
                            We noticed you performed best at El Porto when it's 5ft+. A massive swell hits Tuesday. Should we alert you if it hits 90%?
                        </p>
                        <button className="bg-white text-primary px-4 py-2 rounded-full text-xs font-bold hover:bg-white/90 transition-colors">Notify Me</button>
                    </div>
                    <div className="absolute inset-0 opacity-20 pointer-events-none">
                        <img className="w-full h-full object-cover mix-blend-overlay" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCamFjkk5DUgoJoqZpPSnVI_MWzfqcaiex0k6QsYKZKKsLEj80YhgJ6gbl7iHKESm2xSyV5JdzceNJCyiVT5DiN8iqiT8J-3ehPLwLqeEiU_tzPBQpDBNNjr1EKd_cUdfwNO8i-1frLOqVVHZ7Bfz7JA0pcROR7EeyVsL3IT-uUJ8snIWeQO8f_WCh7K2gBPPXUyt1WuofbOrw0Tde4vnmuv3Vt-wJdhBVc3bValyWStPyeJ1bdEbPBVINjMZYttCGSMrK5OBo48cZO" alt="Abstract Pattern" />
                    </div>
                </div>
            </div>
        </main>
    </div>
  );
};