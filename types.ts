// ─── Screen Enum ──────────────────────────────────────────────────────────────
export enum Screen {
  HOME = 'HOME',
  SPOT_DETAIL = 'SPOT_DETAIL',
  LOG_SESSION = 'LOG_SESSION',
  SURF_MATCH = 'SURF_MATCH',
  QUIVER = 'QUIVER',
  SPOT_LIST = 'SPOT_LIST',
  PROFILE = 'PROFILE',
  SKILL_PROGRESSION = 'SKILL_PROGRESSION',
  COMMUNITY = 'COMMUNITY',
  ADD_BOARD = 'ADD_BOARD',
  SESSION_DETAIL = 'SESSION_DETAIL',
  // Auth screens
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  FORGOT_PASSWORD = 'FORGOT_PASSWORD',
}

// ─── Existing Domain Types (extended for backwards compatibility) ──────────────
export interface SurfSpot {
  id: string;
  name: string;
  distance: string;
  swellDirection: string;
  height: string;
  condition: 'EPIC' | 'GOOD' | 'FAIR' | 'POOR';
  image: string;
  coordinates: { lat: number; lng: number };
  // Extended fields
  region?: string;
  country?: string;
  breakProfile?: SpotBreakProfile;
}

export interface SessionLog {
  id: string;
  spotName: string;
  spotId?: string;
  date: string;
  rating: number;
  height: string;
  image: string;
  // Extended fields
  duration?: number; // minutes
  waveCount?: number;
  topSpeed?: number; // km/h
  longestRide?: number; // metres
  notes?: string;
  boardId?: string;
  uid?: string;
  timestamp: number;
  conditionsSnapshot?: {
    waveHeight: number;
    wavePeriod: number;
    windSpeed: number;
    windDirection: number;
    tide: number;
  };
}

// ─── Board (for Quiver) ────────────────────────────────────────────────────────
export interface Board {
  id: string;
  brand: string;
  model: string;
  length: number; // feet
  width: number;  // inches
  thickness: number; // inches
  volume: number; // litres
  boardType: 'shortboard' | 'longboard' | 'fish' | 'funboard' | 'gun' | 'foilboard';
  photo?: string;
  uid?: string;
}

// ─── Forecast Types ────────────────────────────────────────────────────────────
export interface ForecastSnapshot {
  modelName: string;
  runTime: string;
  forecastHour: string;
  waveHeight: number;    // metres
  wavePeriod: number;    // seconds
  swellDirection: number; // degrees
  swellHeight: number;   // metres
  windSpeed: number;     // km/h
  windDirection: number; // degrees
  windGust: number;      // km/h
  airTemp: number;       // °C
  precipitation: number; // mm
  cloudCover: number;    // %
  pressure: number;      // hPa
}

export interface TidePoint {
  time: string;
  height: number; // metres
  type: 'HIGH' | 'LOW' | null;
}

export interface SpotBreakProfile {
  breakType: 'beach' | 'reef' | 'point';
  facingDirection: string;       // e.g. "NW"
  optimalSwellDirection: string; // e.g. "W-NW"
  optimalTidePhase: 'low' | 'mid' | 'high' | 'any';
  optimalWindDirection: string;  // e.g. "E-NE (offshore)"
}

export interface SwellQualityScore {
  spotId: string;
  forecastHour: string;
  score: number; // 0–100
  label: 'EPIC' | 'GOOD' | 'FAIR' | 'POOR';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasons: string[];
}

export interface GeminiInsight {
  bestWindows: Array<{ startTime: string; endTime: string; reason: string }>;
  summary: string;
}

export interface ForecastState {
  [spotId: string]: {
    forecasts: ForecastSnapshot[];
    tides: TidePoint[];
    qualityScores: SwellQualityScore[];
    lastFetchedAt: string | null;
  };
}

// ─── Portugal Spot Seed ────────────────────────────────────────────────────────
export interface PortugalSpotSeed {
  id: string;
  name: string;
  region: string;
  country: 'PT';
  latitude: number;
  longitude: number;
  breakProfile: SpotBreakProfile; // Now required for all seeds
}