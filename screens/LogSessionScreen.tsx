import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import type { SessionLog, SurfSpot, Board } from '../types';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';
import { GuestGate } from '@/src/components/GuestGate';
import { addSession as addSessionFirestore } from '@/src/services/firestore';

interface LogSessionScreenProps {
  onBack: () => void;
  onComplete: (session?: SessionLog) => void;
}

export const LogSessionScreen: React.FC<LogSessionScreenProps> = ({ onBack, onComplete }) => {
  const { spots, quiver, addSession, forecasts, isGuest } = useApp();
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [step, setStep] = useState(1);
  const [selectedSpotId, setSelectedSpotId] = useState<string>('');
  const [rating, setRating] = useState(3);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [durationHours, setDurationHours] = useState(1.5);
  const [notes, setNotes] = useState('');
  
  // Auto-filled conditions state
  const [waveHeight, setWaveHeight] = useState('');
  const [wavePeriod, setWavePeriod] = useState('');

  const selectedSpot = spots.find(s => s.id === selectedSpotId);
  const recentForecast = (selectedSpot && forecasts[selectedSpotId]) ? forecasts[selectedSpotId][0] : null;

  useEffect(() => {
    if (recentForecast) {
      setWaveHeight(recentForecast.waveHeight.toFixed(1));
      setWavePeriod(recentForecast.wavePeriod.toFixed(0));
    }
  }, [recentForecast, selectedSpotId]);

  const handleComplete = async () => {
    if (!selectedSpot || !selectedBoardId) return;

    const newSession: SessionLog = {
      id: `session_${Date.now()}`,
      uid: user?.uid || 'guest',
      spotId: selectedSpot.id,
      spotName: selectedSpot.name,
      date: new Date().toISOString(),
      timestamp: Date.now(),
      duration: durationHours * 60,
      boardId: selectedBoardId,
      rating,
      height: waveHeight || (recentForecast?.waveHeight.toString() || '0'),
      image: selectedSpot.image || '',
      notes,
      conditionsSnapshot: recentForecast ? {
        waveHeight: recentForecast.waveHeight,
        wavePeriod: recentForecast.wavePeriod,
        windSpeed: recentForecast.windSpeed,
        windDirection: recentForecast.windDirection,
        tide: 0, 
      } : undefined,
    };

    if (user?.uid) {
      try {
        await addSessionFirestore(user.uid, newSession);
      } catch (e) {
        console.error("Failed to save to firestore", e);
      }
    }
    
    addSession(newSession);
    addToast('Session logged successfully!', 'success');
    onComplete(newSession);
  };

  if (isGuest) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 h-screen bg-background">
        <GuestGate featureName="Log your surf sessions">
          <div className="h-64 w-full" />
        </GuestGate>
        <button onClick={onBack} className="mt-8 px-6 py-2 rounded-full border border-border text-textMuted hover:text-text transition-colors">
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen text-text font-sans relative selection:bg-primary/20">
       <main className="max-w-md mx-auto px-6 pb-24 pt-12">
         {/* Navigation & Progress */}
         <header className="flex items-center justify-between mb-8">
           <button onClick={() => step > 1 ? setStep(step - 1) : onBack()} className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center hover:bg-surface/80 transition-colors">
             <span className="material-icons-round text-text text-sm">arrow_back_ios_new</span>
           </button>
           <div className="flex gap-2">
             <div className={`w-12 h-1.5 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-surface'}`}></div>
             <div className={`w-12 h-1.5 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-surface'}`}></div>
             <div className={`w-12 h-1.5 rounded-full transition-colors ${step >= 3 ? 'bg-primary' : 'bg-surface'}`}></div>
           </div>
           <button onClick={onBack} className="w-10 h-10 flex items-center justify-center text-textMuted hover:text-text transition-colors">
             <span className="material-icons-round text-xl">close</span>
           </button>
         </header>

         {/* STEP 1: Spot Selection */}
         {step === 1 && (
           <div className="animate-fadeIn">
             <h1 className="text-3xl font-display font-bold tracking-tight text-text mb-2">Where did you surf?</h1>
             <p className="text-textMuted mb-8 text-sm">Select a spot to link real-time environmental data.</p>
             
             <div className="space-y-3 max-h-96 overflow-y-auto">
               {spots.map(spot => (
                 <div 
                   key={spot.id} 
                   onClick={() => setSelectedSpotId(spot.id)}
                   className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${selectedSpotId === spot.id ? 'bg-primary/10 border-primary' : 'bg-surface border-border hover:border-primary/50'}`}
                 >
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-lg bg-background overflow-hidden border border-border">
                       <img src={spot.image || 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'} alt="" className="w-full h-full object-cover" />
                     </div>
                     <div>
                       <p className="font-bold text-text">{spot.name}</p>
                       <p className="text-xs text-textMuted">{spot.region}</p>
                     </div>
                   </div>
                   {selectedSpotId === spot.id && <span className="material-icons-round text-primary">check_circle</span>}
                 </div>
               ))}
             </div>

             {selectedSpotId && (
               <div className="mt-6 bg-surface p-4 rounded-xl border border-border">
                  <h3 className="text-sm font-bold text-text mb-2">Conditions Preview</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-textMuted">Wave Height (m)</label>
                      <input 
                        type="number" 
                        value={waveHeight}
                        onChange={(e) => setWaveHeight(e.target.value)}
                        className="w-full bg-background text-text rounded p-2 mt-1 border border-border outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-textMuted">Wave Period (s)</label>
                      <input 
                        type="number" 
                        value={wavePeriod}
                        onChange={(e) => setWavePeriod(e.target.value)}
                        className="w-full bg-background text-text rounded p-2 mt-1 border border-border outline-none focus:border-primary"
                      />
                    </div>
                  </div>
               </div>
             )}
           </div>
         )}

         {/* STEP 2: Session Details Board */}
         {step === 2 && (
           <div className="animate-fadeIn">
             <h1 className="text-3xl font-display font-bold tracking-tight text-text mb-8">How was it?</h1>
             
             {/* Rating Section */}
             <section className="mb-8">
               <h2 className="text-[10px] font-bold uppercase tracking-widest text-textMuted mb-4">Overall Vibe</h2>
               <div className="bg-surface border border-border p-6 rounded-xl flex flex-col items-center gap-4">
                 <div className="flex gap-2">
                   {[1, 2, 3, 4, 5].map((star) => (
                     <button key={star} onClick={() => setRating(star)} className={`text-4xl material-icons-round transition-all hover:scale-110 ${star <= rating ? 'text-primary' : 'text-slate-400'}`}>
                       star
                     </button>
                   ))}
                 </div>
                 <p className="text-xs font-bold text-textMuted uppercase tracking-wider">
                   {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Great' : 'Epic'}
                 </p>
               </div>
             </section>

             {/* Duration Slider */}
             <section className="mb-8">
               <div className="flex justify-between items-end mb-4">
                 <h2 className="text-[10px] font-bold uppercase tracking-widest text-textMuted">Time in Water</h2>
                 <span className="text-primary font-bold text-lg">{durationHours} <span className="text-xs font-medium text-textMuted">hrs</span></span>
               </div>
               <input 
                 type="range" 
                 min="0.5" 
                 max="4" 
                 step="0.5" 
                 value={durationHours}
                 onChange={(e) => setDurationHours(parseFloat(e.target.value))}
                 className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
               />
               <div className="flex justify-between text-[10px] text-textMuted mt-2 font-bold">
                 <span>30m</span>
                 <span>4h</span>
               </div>
             </section>

             {/* Board Selector */}
             <section className="mb-8">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-textMuted mb-2">Quiver Used</h2>
                <select 
                  className="w-full bg-slate-800 text-white rounded-xl p-3 border border-slate-700 outline-none focus:border-cyan-500"
                  value={selectedBoardId}
                  onChange={(e) => setSelectedBoardId(e.target.value)}
                >
                  <option value="">Select a board...</option>
                  {quiver.map(b => (
                    <option key={b.id} value={b.id}>{b.brand} {b.model} {b.volume}L</option>
                  ))}
                </select>
             </section>
           </div>
         )}

         {/* STEP 3: Notes */}
         {step === 3 && (
           <div className="animate-fadeIn">
             <h1 className="text-3xl font-display font-bold tracking-tight text-text mb-8">Almost done.</h1>
             
             {/* Personal Notes */}
             <section className="mb-8">
               <h2 className="text-[10px] font-bold uppercase tracking-widest text-textMuted mb-4">Personal Notes</h2>
               <textarea 
                 value={notes}
                 onChange={(e) => setNotes(e.target.value)}
                 className="w-full bg-surface border border-border rounded-xl p-4 text-sm text-text placeholder-textMuted focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none h-32"
                 placeholder="How did the board feel? Any memorable waves?"
               ></textarea>
             </section>
           </div>
         )}
         
         {/* Footer Action */}
         <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/95 to-transparent z-40 backdrop-blur-sm">
           <div className="max-w-md mx-auto">
             {step < 3 ? (
               <button 
                 disabled={(step === 1 && !selectedSpotId) || (step === 2 && !selectedBoardId)}
                 onClick={() => setStep(step + 1)} 
                 className={`w-full font-bold py-4 rounded-full shadow-soft transition-all flex items-center justify-center gap-2 ${((step===1 && !selectedSpotId) || (step===2 && !selectedBoardId)) ? 'bg-surface text-textMuted cursor-not-allowed' : 'bg-text text-background hover:scale-[1.02] active:scale-95'}`}
               >
                 NEXT STEP
                 <span className="material-icons-round text-sm">arrow_forward_ios</span>
               </button>
             ) : (
               <button 
                 onClick={handleComplete} 
                 disabled={!selectedBoardId}
                 className={`w-full font-bold py-4 rounded-full shadow-soft transition-all flex items-center justify-center gap-2 block ${!selectedBoardId ? 'bg-surface text-textMuted cursor-not-allowed' : 'bg-primary text-white hover:scale-[1.02] active:scale-95'}`}
               >
                 <span className="material-icons-round text-lg">check_circle</span>
                 SAVE SESSION
               </button>
             )}
           </div>
         </div>
       </main>
    </div>
  );
};