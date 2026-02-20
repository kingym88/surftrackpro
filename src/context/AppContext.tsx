import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { SurfSpot, SessionLog, Board, ForecastSnapshot, TidePoint, SwellQualityScore, GeminiInsight } from '@/types';
import { dummySpots, dummyForecast, dummyTides } from '@/src/data/guestDummyData';
import { getNearestSpots, portugalSpots } from '@/src/data/portugalSpots';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { fetchOpenMeteoForecast } from '@/src/services/openMeteo';

// ─── State shape ──────────────────────────────────────────────────────────────
interface AppState {
  spots: SurfSpot[];
  sessions: SessionLog[];
  quiver: Board[];
  forecasts: Record<string, ForecastSnapshot[]>;  // key: spotId
  tides: Record<string, TidePoint[]>;              // key: spotId
  qualityScores: Record<string, SwellQualityScore[]>;
  geminiInsights: Record<string, GeminiInsight>;
  isLoadingForecast: boolean;
  forecastError: string | null;
  homeSpotId: string | null;
  preferredWaveHeight: { min: number; max: number } | null;
  nearbySpotIds: string[];
}

// ─── Actions ──────────────────────────────────────────────────────────────────
type Action =
  | { type: 'SET_SPOTS'; payload: SurfSpot[] }
  | { type: 'ADD_SESSION'; payload: SessionLog }
  | { type: 'SET_SESSIONS'; payload: SessionLog[] }
  | { type: 'ADD_BOARD'; payload: Board }
  | { type: 'SET_QUIVER'; payload: Board[] }
  | { type: 'SET_FORECAST'; payload: { spotId: string; data: ForecastSnapshot[] } }
  | { type: 'SET_TIDES'; payload: { spotId: string; data: TidePoint[] } }
  | { type: 'SET_QUALITY_SCORE'; payload: { spotId: string; data: SwellQualityScore[] } }
  | { type: 'SET_GEMINI_INSIGHT'; payload: { spotId: string; data: GeminiInsight } }
  | { type: 'SET_LOADING_FORECAST'; payload: boolean }
  | { type: 'SET_FORECAST_ERROR'; payload: string | null }
  | { type: 'SET_HOME_SPOT_ID'; payload: string }
  | { type: 'SET_PREFERRED_WAVE_HEIGHT'; payload: { min: number; max: number } }
  | { type: 'SET_NEARBY_SPOTS'; payload: string[] }
  | { type: 'LOAD_GUEST_DATA' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_SPOTS':
      return { ...state, spots: action.payload };
    case 'ADD_SESSION':
      return { ...state, sessions: [action.payload, ...state.sessions] };
    case 'SET_SESSIONS':
      return { ...state, sessions: action.payload };
    case 'ADD_BOARD':
      return { ...state, quiver: [...state.quiver, action.payload] };
    case 'SET_QUIVER':
      return { ...state, quiver: action.payload };
    case 'SET_FORECAST':
      return {
        ...state,
        forecasts: { ...state.forecasts, [action.payload.spotId]: action.payload.data },
      };
    case 'SET_TIDES':
      return {
        ...state,
        tides: { ...state.tides, [action.payload.spotId]: action.payload.data },
      };
    case 'SET_QUALITY_SCORE':
      return {
        ...state,
        qualityScores: { ...state.qualityScores, [action.payload.spotId]: action.payload.data },
      };
    case 'SET_GEMINI_INSIGHT':
      return {
        ...state,
        geminiInsights: { ...state.geminiInsights, [action.payload.spotId]: action.payload.data },
      };
    case 'SET_LOADING_FORECAST':
      return { ...state, isLoadingForecast: action.payload };
    case 'SET_FORECAST_ERROR':
      return { ...state, forecastError: action.payload };
    case 'SET_HOME_SPOT_ID': {
      const nearest = getNearestSpots(portugalSpots, action.payload, 5).map(s => s.id);
      return { ...state, homeSpotId: action.payload, nearbySpotIds: nearest };
    }
    case 'SET_PREFERRED_WAVE_HEIGHT':
      return { ...state, preferredWaveHeight: action.payload };
    case 'SET_NEARBY_SPOTS':
      return { ...state, nearbySpotIds: action.payload };
    case 'LOAD_GUEST_DATA':
      return {
        ...state,
        spots: dummySpots,
        forecasts: {
          supertubos: dummyForecast,
          carcavelos: dummyForecast.map(f => ({ ...f, waveHeight: f.waveHeight * 0.7 })),
          'ribeira-dilhas': dummyForecast.map(f => ({ ...f, waveHeight: f.waveHeight * 0.5 })),
        },
        tides: {
          supertubos: dummyTides,
          carcavelos: dummyTides,
          'ribeira-dilhas': dummyTides,
        },
      };
    default:
      return state;
  }
}

const initialState: AppState = {
  spots: [],
  sessions: [],
  quiver: [],
  forecasts: {},
  tides: {},
  qualityScores: {},
  geminiInsights: {},
  isLoadingForecast: false,
  forecastError: null,
  homeSpotId: 'carcavelos',
  preferredWaveHeight: null,
  nearbySpotIds: getNearestSpots(portugalSpots, 'carcavelos', 5).map(s => s.id),
};

// ─── Context ──────────────────────────────────────────────────────────────────
interface AppContextType extends AppState {
  isGuest: boolean;
  dispatch: React.Dispatch<Action>;
  addSession: (session: SessionLog) => void;
  addBoard: (board: Board) => void;
  setForecast: (spotId: string, data: ForecastSnapshot[]) => void;
  setTides: (spotId: string, data: TidePoint[]) => void;
  setQualityScore: (spotId: string, data: SwellQualityScore[]) => void;
  setGeminiInsight: (spotId: string, data: GeminiInsight) => void;
  setHomeSpotId: (spotId: string) => void;
  setPreferredWaveHeight: (prefs: { min: number; max: number }) => void;
}

const AppContext = createContext<AppContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
interface AppProviderProps {
  children: React.ReactNode;
  isGuest: boolean;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children, isGuest }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load guest data or initial forecasts
  useEffect(() => {
    async function initApp() {
      if (isGuest) {
        dispatch({ type: 'LOAD_GUEST_DATA' });
        
        // Load persisted guest data
        const { value: sess } = await Preferences.get({ key: 'guest_temp_sessions' });
        if (sess) dispatch({ type: 'SET_SESSIONS', payload: JSON.parse(sess) });
        
        const { value: quiv } = await Preferences.get({ key: 'guest_temp_boards' });
        if (quiv) dispatch({ type: 'SET_QUIVER', payload: JSON.parse(quiv) });
      } else {
        const normalizedSpots: SurfSpot[] = portugalSpots.map(s => ({
          id: s.id,
          name: s.name,
          distance: '— km',
          swellDirection: 'W',
          height: '— m',
          condition: 'FAIR',
          image: '',
          coordinates: { lat: s.latitude, lng: s.longitude },
          region: s.region,
          country: s.country,
          breakProfile: s.breakProfile
        }));
        dispatch({ type: 'SET_SPOTS', payload: normalizedSpots });
        // Attempt geolocation if native
        let lat = 0, lng = 0;
        if (Capacitor.isNativePlatform()) {
          try {
            const permission = await Geolocation.checkPermissions();
            if (permission.location !== 'granted') {
              await Geolocation.requestPermissions();
            }
            const pos = await Geolocation.getCurrentPosition();
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
          } catch (e) {
            console.error('Geolocation failed', e);
          }
        }
        
        // Let's rely on state.homeSpotId + state.nearbySpotIds for which spots to fetch
        // (This effect triggers when isGuest changes, we will handle fetching in a separate effect below depending on spots)
      }
      
      // Restore homeSpotId preference
      const homeKey = isGuest ? 'guest_homeSpotId' : 'user_homeSpotId';
      const { value: homeId } = await Preferences.get({ key: homeKey });
      if (homeId) {
        dispatch({ type: 'SET_HOME_SPOT_ID', payload: homeId });
      }
    }
    initApp();
  }, [isGuest]);

  // Handle saving homeSpotId preference
  useEffect(() => {
    async function saveHomeSpot() {
      if (state.homeSpotId) {
        const homeKey = isGuest ? 'guest_homeSpotId' : 'user_homeSpotId';
        await Preferences.set({ key: homeKey, value: state.homeSpotId });
      }
    }
    saveHomeSpot();
  }, [state.homeSpotId, isGuest]);

  // Fetch forecast for homeSpotId and nearbySpotIds when they change, for logged in users
  useEffect(() => {
    if (isGuest) return;
    async function fetchAllForecasts() {
      if (!state.homeSpotId) return;
      
      const spotsToFetch = [state.homeSpotId, ...state.nearbySpotIds];
      
      dispatch({ type: 'SET_LOADING_FORECAST', payload: true });
      dispatch({ type: 'SET_FORECAST_ERROR', payload: null });
      
      try {
        await Promise.all(
          spotsToFetch.map(async (spotId) => {
            const spotData = portugalSpots.find(s => s.id === spotId);
            if (!spotData) return;
            // Fetch live OpenMeteo forecast if not cached or we need fresh data
            const live = await fetchOpenMeteoForecast(spotData.latitude, spotData.longitude);
            dispatch({ type: 'SET_FORECAST', payload: { spotId, data: live } });
          })
        );
      } catch (e) {
        dispatch({ type: 'SET_FORECAST_ERROR', payload: 'Failed to fully load forecasts. Data may be outdated.' });
      } finally {
        dispatch({ type: 'SET_LOADING_FORECAST', payload: false });
      }
    }
    
    fetchAllForecasts();
  }, [isGuest, state.homeSpotId, state.nearbySpotIds]);

  // Persist sessions and quiver to Preferences
  useEffect(() => {
    const saveState = async () => {
      const sessKey = isGuest ? 'guest_temp_sessions' : 'user_sessions';
      const quivKey = isGuest ? 'guest_temp_boards' : 'user_quiver';
      await Preferences.set({ key: sessKey, value: JSON.stringify(state.sessions) });
      await Preferences.set({ key: quivKey, value: JSON.stringify(state.quiver) });
    };
    saveState();
  }, [state.sessions, state.quiver, isGuest]);

  const addSession = useCallback(
    (session: SessionLog) => dispatch({ type: 'ADD_SESSION', payload: session }),
    [],
  );
  const addBoard = useCallback(
    (board: Board) => dispatch({ type: 'ADD_BOARD', payload: board }),
    [],
  );
  const setForecast = useCallback(
    (spotId: string, data: ForecastSnapshot[]) =>
      dispatch({ type: 'SET_FORECAST', payload: { spotId, data } }),
    [],
  );
  const setTides = useCallback(
    (spotId: string, data: TidePoint[]) =>
      dispatch({ type: 'SET_TIDES', payload: { spotId, data } }),
    [],
  );
  const setQualityScore = useCallback(
    (spotId: string, data: SwellQualityScore[]) =>
      dispatch({ type: 'SET_QUALITY_SCORE', payload: { spotId, data } }),
    [],
  );
  const setGeminiInsight = useCallback(
    (spotId: string, data: GeminiInsight) =>
      dispatch({ type: 'SET_GEMINI_INSIGHT', payload: { spotId, data } }),
    [],
  );
  const setHomeSpotId = useCallback(
    (spotId: string) => dispatch({ type: 'SET_HOME_SPOT_ID', payload: spotId }),
    [],
  );
  const setPreferredWaveHeight = useCallback(
    (prefs: { min: number; max: number }) =>
      dispatch({ type: 'SET_PREFERRED_WAVE_HEIGHT', payload: prefs }),
    [],
  );

  const value: AppContextType = {
    ...state,
    isGuest,
    dispatch,
    addSession,
    addBoard,
    setForecast,
    setTides,
    setQualityScore,
    setGeminiInsight,
    setHomeSpotId,
    setPreferredWaveHeight,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
