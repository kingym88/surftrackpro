import React, { useState } from 'react';

interface AddBoardScreenProps {
  onBack: () => void;
  onSave: () => void;
}

export const AddBoardScreen: React.FC<AddBoardScreenProps> = ({ onBack, onSave }) => {
  const [volume, setVolume] = useState(28);

  return (
    <div className="bg-background-dark min-h-screen text-text pb-24 relative">
       <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-background-dark z-20">
         <button onClick={onBack} className="text-textMuted hover:text-text font-medium text-sm">Cancel</button>
         <h1 className="text-lg font-bold">Add Board</h1>
         <button onClick={onSave} className="text-primary font-bold text-sm">Save</button>
       </header>

       <main className="px-6 mt-4 space-y-6">
         {/* Photo Upload */}
         <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-700 rounded-2xl bg-background/50 hover:bg-background transition-colors cursor-pointer">
           <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-3">
             <span className="material-icons-round text-primary text-2xl">add_a_photo</span>
           </div>
           <p className="text-sm font-bold text-textMuted">Upload Photo</p>
           <p className="text-xs text-slate-500 mt-1">Support for JPG, PNG</p>
         </div>

         {/* Basic Info */}
         <div className="space-y-4">
           <div>
             <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Brand</label>
             <input type="text" placeholder="e.g. Channel Islands" className="w-full bg-surface border-none rounded-xl p-4 text-text placeholder-slate-500 focus:ring-2 focus:ring-primary outline-none" />
           </div>
           <div>
             <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Model</label>
             <input type="text" placeholder="e.g. Happy Everyday" className="w-full bg-surface border-none rounded-xl p-4 text-text placeholder-slate-500 focus:ring-2 focus:ring-primary outline-none" />
           </div>
         </div>

         {/* Dimensions Grid */}
         <div className="grid grid-cols-2 gap-4">
           <div>
             <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Length</label>
             <div className="flex gap-2">
               <input type="number" placeholder="5" className="w-full bg-surface border-none rounded-xl p-4 text-text placeholder-slate-500 focus:ring-2 focus:ring-primary outline-none text-center" />
               <span className="self-center font-bold text-slate-600">'</span>
               <input type="number" placeholder="10" className="w-full bg-surface border-none rounded-xl p-4 text-text placeholder-slate-500 focus:ring-2 focus:ring-primary outline-none text-center" />
               <span className="self-center font-bold text-slate-600">"</span>
             </div>
           </div>
           <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Volume</label>
              <div className="bg-surface rounded-xl p-4 flex items-center justify-between">
                <span className="text-xl font-bold text-text">{volume} <span className="text-sm text-slate-500 font-normal">L</span></span>
                <div className="flex gap-2">
                  <button onClick={() => setVolume(v => v - 0.5)} className="w-8 h-8 rounded-full bg-surface flex items-center justify-center hover:bg-slate-600 text-text">-</button>
                  <button onClick={() => setVolume(v => v + 0.5)} className="w-8 h-8 rounded-full bg-surface flex items-center justify-center hover:bg-slate-600 text-text">+</button>
                </div>
              </div>
           </div>
         </div>

         {/* Board Type */}
         <div>
           <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Board Type</label>
           <div className="flex gap-3 overflow-x-auto py-2 hide-scrollbar">
             {['Shortboard', 'Fish', 'Groveler', 'Step-up', 'Longboard', 'Mid-length'].map(type => (
               <button key={type} className="px-4 py-2 bg-surface rounded-full text-sm font-bold text-textMuted hover:bg-primary hover:text-text transition-colors whitespace-nowrap">
                 {type}
               </button>
             ))}
           </div>
         </div>
       </main>
    </div>
  );
};