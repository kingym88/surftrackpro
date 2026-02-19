import React from 'react';

export const SpotCardSkeleton: React.FC = () => (
  <div className="bg-surface/50 border border-border rounded-2xl overflow-hidden mb-4 animate-pulse">
    <div className="relative h-40 bg-slate-800"></div>
    <div className="p-4 grid grid-cols-3 gap-4 border-t border-border">
      <div className="flex flex-col gap-2">
        <div className="h-2 w-12 bg-slate-700 rounded"></div>
        <div className="h-6 w-full bg-slate-700 rounded"></div>
        <div className="h-2 w-8 bg-slate-700 rounded"></div>
      </div>
      <div className="flex flex-col gap-2 border-l border-border pl-4">
        <div className="h-2 w-12 bg-slate-700 rounded"></div>
        <div className="h-6 w-full bg-slate-700 rounded"></div>
        <div className="h-2 w-10 bg-slate-700 rounded"></div>
      </div>
      <div className="flex flex-col gap-2 border-l border-border pl-4">
        <div className="h-2 w-12 bg-slate-700 rounded"></div>
        <div className="h-6 w-16 bg-slate-700 rounded"></div>
        <div className="h-2 w-12 bg-slate-700 rounded"></div>
      </div>
    </div>
  </div>
);

export const ForecastChartSkeleton: React.FC = () => (
  <div className="h-48 w-full mt-4 bg-surface/50 rounded-xl animate-pulse flex items-end space-x-2 p-4">
    {[...Array(7)].map((_, i) => (
      <div 
        key={i} 
        className="flex-1 bg-slate-700 rounded-t-md" 
        style={{ height: `${Math.max(20, Math.random() * 100)}%` }}
      ></div>
    ))}
  </div>
);

export const AiAnalysisSkeleton: React.FC = () => (
   <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 animate-pulse">
       <div className="flex items-center gap-2 mb-4">
           <div className="w-4 h-4 rounded-full bg-primary/40"></div>
           <div className="h-3 w-32 bg-primary/40 rounded"></div>
       </div>
       <div className="space-y-2">
           <div className="h-2 w-full bg-slate-700 rounded"></div>
           <div className="h-2 w-[90%] bg-slate-700 rounded"></div>
           <div className="h-2 w-[70%] bg-slate-700 rounded"></div>
       </div>
   </div>
);
