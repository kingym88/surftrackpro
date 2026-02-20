import React, { useState, useMemo } from 'react';
import { Screen } from '@/types';
import type { SurfSpot } from '@/types';
import { useApp } from '@/src/context/AppContext';
import { GuestGate } from '@/src/components/GuestGate';
import { SpotCardSkeleton } from '@/src/components/Skeletons';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';

interface SpotListScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
}

export const SpotListScreen: React.FC<SpotListScreenProps> = ({ onNavigate }) => {
  const { spots, qualityScores, homeSpotId } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  const homeSpotRegion = useMemo(() => {
    if (!homeSpotId) return 'All Regions';
    const hs = spots.find(s => s.id === homeSpotId);
    return hs ? hs.name : 'All Regions';
  }, [homeSpotId, spots]);

  const filteredSpots = useMemo(() => {
    return spots
      .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [spots, searchQuery]);

  const getSpotQuality = (spotId: string) => {
    const scores = qualityScores[spotId];
    if (!scores || scores.length === 0) return null;
    return scores[0]; // Return the first (current/next) score
  };

  return (
    <div className="pb-24 min-h-screen bg-background relative selection:bg-primary/20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md px-6 pt-6 pb-4 border-b border-border">
        <div className="flex justify-between items-end mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Explore</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-text">Surf Spots</h1>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative mb-2">
          <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-textMuted text-sm">search</span>
          <input 
            className="w-full bg-surface border border-border rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-text placeholder-textMuted transition-all shadow-sm" 
            placeholder="Search by spot name..." 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <main className="px-6 space-y-4 mt-6">
        <ErrorBoundary>
          {spots.length === 0 ? (
            <>
              <SpotCardSkeleton />
              <SpotCardSkeleton />
              <SpotCardSkeleton />
              <SpotCardSkeleton />
            </>
          ) : filteredSpots.length === 0 ? (
            <div className="text-center py-12 text-textMuted">
              <span className="material-icons-round text-4xl mb-2 opacity-50">search_off</span>
              <p>No spots found matching "{searchQuery}"</p>
            </div>
          ) : (
          filteredSpots.map((spot) => {
             const currentQuality = getSpotQuality(spot.id);
             
             // Dynamic condition badge colors based on label
             let labelStyles = "bg-surface text-textMuted"; 
             if (currentQuality?.label === 'EPIC') labelStyles = "bg-accent1/20 text-accent1 border border-accent1/30";
             else if (currentQuality?.label === 'GOOD') labelStyles = "bg-primary/20 text-primary border border-primary/30";
             else if (currentQuality?.label === 'FAIR') labelStyles = "bg-accent2/20 text-accent2 border border-accent2/30";
             else if (currentQuality?.label === 'POOR') labelStyles = "bg-red-500/20 text-red-400 border border-red-500/30";

             return (
              <div 
                key={spot.id}
                onClick={() => onNavigate(Screen.SPOT_DETAIL, { spot })} 
                className="group bg-surface border border-border hover:border-primary/40 rounded-2xl p-4 cursor-pointer transition-all shadow-sm hover:shadow-md"
              >
                <div className="flex gap-4">
                  {/* Spot Image Thumbnail */}
                  <div className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-background">
                    <img 
                      src={spot.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDt812q345B5t6u7v8w9x0y1z2A3B4C5D6E7F8G9H0I1J2K3L4M5N6O7P8Q9R0S1T2U3V4W5X6Y7Z8a9b0c1d2e3f4g'} 
                      alt={spot.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  
                  {/* Spot Details */}
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <h3 className="text-lg font-bold mb-0.5 text-text group-hover:text-primary transition-colors">{spot.name}</h3>
                      <p className="text-xs text-textMuted">{spot.distance || '0'} miles away</p>
                    </div>
                    
                    {/* Live Conditions Mini Ribbon */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        {currentQuality ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${labelStyles}`}>
                            {currentQuality.label}
                          </span>
                        ) : (
                           <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-surface border border-border text-textMuted">
                             --
                           </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-textMuted">
                         <span className="text-sm font-bold text-text">{spot.height || '--'}</span>
                         <span className="text-[10px]">ft</span>
                         <span className="material-icons-round text-sm ml-1 transform" style={{ rotate: `${typeof spot.swellDirection === 'number' ? spot.swellDirection : 0}deg` }}>
                           north
                         </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        </ErrorBoundary>
      </main>

      {/* Add Custom Spot FAB */}
      <GuestGate featureName="Add Custom Spot" previewLines={0} onNavigate={onNavigate}>
        <button className="fixed bottom-24 right-4 bg-primary hover:bg-primary/90 text-white w-14 h-14 rounded-full shadow-lg shadow-primary/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-30">
          <span className="material-icons-round text-2xl">add_location</span>
        </button>
      </GuestGate>
    </div>
  );
};