import React, { useState, useMemo, useEffect } from 'react';
import { Screen, SurfSpot } from '@/types';
import { useApp } from '@/src/context/AppContext';
import { GuestGate } from '@/src/components/GuestGate';
import { SpotCardSkeleton } from '@/src/components/Skeletons';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { REGIONS, haversineKm } from '@/src/data/portugalSpots';
import { Geolocation } from '@capacitor/geolocation';

interface SpotListScreenProps {
  onNavigate: (screen: Screen, params?: any) => void;
}

export const SpotListScreen: React.FC<SpotListScreenProps> = ({ onNavigate }) => {
  const { spots, qualityScores, homeSpotId } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  
  // View mode
  const [viewMode, setViewMode] = useState<'nearby' | 'regions'>('nearby');
  // Device coords, null if unsupported/refused
  const [deviceCoords, setDeviceCoords] = useState<{lat: number; lng: number} | null>(null);

  useEffect(() => {
    async function getLoc() {
      try {
        const perm = await Geolocation.checkPermissions();
        if (perm.location !== 'granted') await Geolocation.requestPermissions();
        
        const pos = await Geolocation.getCurrentPosition();
        setDeviceCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch (e) {
        // Fallback or permission denied
      }
    }
    getLoc();
  }, []);

  // Determine reference location for distance formatting & sorting
  const referenceCoords = useMemo(() => {
    if (deviceCoords) return deviceCoords;
    const home = spots.find(s => s.id === homeSpotId);
    if (home) return { lat: home.coordinates.lat, lng: home.coordinates.lng };
    // fallback center of Portugal loosely
    return { lat: 39.5, lng: -8.0 };
  }, [deviceCoords, homeSpotId, spots]);

  // Pre-calculate distance strings for everything in real-time
  const spotsWithDistance = useMemo(() => {
    return spots.map(spot => {
      const dist = haversineKm(
        referenceCoords.lat, referenceCoords.lng,
        spot.coordinates.lat, spot.coordinates.lng
      );
      // convert km to miles loosely or just keep km. App uses "miles away" previously, let's stick to miles (0.621371)
      const miles = dist * 0.621371;
      return { ...spot, computedDistance: miles };
    });
  }, [spots, referenceCoords]);

  const filteredSpots = useMemo(() => {
    let result = spotsWithDistance;
    if (searchQuery.trim()) {
      result = result.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return result;
  }, [spotsWithDistance, searchQuery]);

  const nearbySpots = useMemo(() => {
    return [...filteredSpots].sort((a, b) => a.computedDistance - b.computedDistance);
  }, [filteredSpots]);

  const regionalSpots = useMemo(() => {
    // Group them
    const groups: Record<string, SurfSpot[]> = {};
    filteredSpots.forEach(s => {
      const r = s.region || 'Unknown Region';
      if (!groups[r]) groups[r] = [];
      groups[r].push(s);
    });

    // Sort regions north-to-south via REGIONS constant
    return Object.entries(groups).sort((a, b) => {
      let idxA = REGIONS.indexOf(a[0]);
      let idxB = REGIONS.indexOf(b[0]);
      if (idxA === -1) idxA = 999;
      if (idxB === -1) idxB = 999;
      return idxA - idxB;
    });
  }, [filteredSpots]);

  const getSpotQuality = (spotId: string) => {
    const scores = qualityScores[spotId];
    return scores && scores.length > 0 ? scores[0] : null;
  };

  const renderSpotCard = (spot: any) => {
    const currentQuality = getSpotQuality(spot.id);

    let labelStyles = "bg-surface text-textMuted"; 
    if (currentQuality?.label === 'EPIC') labelStyles = "bg-accent1/20 text-accent1 border border-accent1/30";
    else if (currentQuality?.label === 'GOOD') labelStyles = "bg-primary/20 text-primary border border-primary/30";
    else if (currentQuality?.label === 'FAIR') labelStyles = "bg-accent2/20 text-accent2 border border-accent2/30";
    else if (currentQuality?.label === 'POOR') labelStyles = "bg-red-500/20 text-red-400 border border-red-500/30";

    return (
      <div 
        key={spot.id}
        onClick={() => onNavigate(Screen.SPOT_DETAIL, { spot })} 
        className="group bg-surface border border-border hover:border-primary/40 rounded-2xl p-4 cursor-pointer transition-all shadow-sm hover:shadow-md mt-3"
      >
        <div className="flex gap-4">
          <div className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-background">
            <img 
              src={spot.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDt812q345B5t6u7v8w9x0y1z2A3B4C5D6E7F8G9H0I1J2K3L4M5N6O7P8Q9R0S1T2U3V4W5X6Y7Z8a9b0c1d2e3f4g'} 
              alt={spot.name} 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          </div>
          <div className="flex-1 flex flex-col justify-between py-1">
            <div>
              <h3 className="text-lg font-bold mb-0.5 text-text group-hover:text-primary transition-colors">{spot.name}</h3>
              <p className="text-xs text-textMuted">{spot.computedDistance.toFixed(1)} miles away</p>
            </div>
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
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-24 min-h-screen bg-background relative selection:bg-primary/20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md px-6 pt-6 pb-4 border-b border-border">
        <div className="flex justify-between items-end mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Explore</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-text">Surf Spots</h1>
          </div>
        </div>
        
        <div className="relative mb-4">
          <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-textMuted text-sm">search</span>
          <input 
            className="w-full bg-surface border border-border rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-text placeholder-textMuted transition-all shadow-sm" 
            placeholder="Search by spot name..." 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <button 
            onClick={() => setViewMode('nearby')} 
            className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-colors ${viewMode === 'nearby' ? 'bg-primary text-background' : 'bg-surface text-textMuted'}`}
          >
            Nearby
          </button>
          <button 
             onClick={() => setViewMode('regions')} 
            className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-colors ${viewMode === 'regions' ? 'bg-primary text-background' : 'bg-surface text-textMuted'}`}
          >
            All Spots
          </button>
        </div>
      </header>

      <main className="px-6 space-y-4 mt-6">
        <ErrorBoundary>
          {spots.length === 0 ? (
            <>
              <SpotCardSkeleton />
              <SpotCardSkeleton />
              <SpotCardSkeleton />
            </>
          ) : filteredSpots.length === 0 ? (
            <div className="text-center py-12 text-textMuted">
              <span className="material-icons-round text-4xl mb-2 opacity-50">search_off</span>
              <p>No spots found matching "{searchQuery}"</p>
            </div>
          ) : viewMode === 'nearby' ? (
            // Nearby Mode
            <div className="space-y-1">
               {nearbySpots.map(renderSpotCard)}
            </div>
          ) : (
            // Region Mode
            <div className="space-y-8">
              {regionalSpots.map(([regionName, spotsInRegion]) => (
                <div key={regionName}>
                  <h2 className="text-sm font-bold text-textMuted uppercase tracking-widest mb-1 border-b border-border pb-2">{regionName}</h2>
                  <div>
                    {spotsInRegion.map(renderSpotCard)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ErrorBoundary>
      </main>

      <GuestGate featureName="Add Custom Spot" previewLines={0} onNavigate={onNavigate}>
        <button className="fixed bottom-24 right-4 bg-primary hover:bg-primary/90 text-white w-14 h-14 rounded-full shadow-lg shadow-primary/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-30">
          <span className="material-icons-round text-2xl">add_location</span>
        </button>
      </GuestGate>
    </div>
  );
};