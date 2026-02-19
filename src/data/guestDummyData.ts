import type { SurfSpot, SessionLog, ForecastSnapshot, Board, TidePoint } from '@/types';

/**
 * Guest dummy data — realistic, enticing data to show the value of the app
 * without requiring real API calls. All data is static — no network requests.
 */

// ─── Dummy Spots ──────────────────────────────────────────────────────────────
export const dummySpots: SurfSpot[] = [
  {
    id: 'supertubos',
    name: 'Supertubos',
    distance: '— km',
    swellDirection: 'W',
    height: '1.8–2.2m',
    condition: 'EPIC',
    image: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400&q=80',
    coordinates: { lat: 39.3441, lng: -9.3885 },
    region: 'Centro / Oeste',
    country: 'PT',
  },
  {
    id: 'carcavelos',
    name: 'Carcavelos',
    distance: '— km',
    swellDirection: 'SW',
    height: '1.2–1.5m',
    condition: 'GOOD',
    image: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=400&q=80',
    coordinates: { lat: 38.6793, lng: -9.3281 },
    region: 'Lisboa / Cascais / Estoril',
    country: 'PT',
  },
  {
    id: 'ribeira-dilhas',
    name: "Ribeira d'Ilhas",
    distance: '— km',
    swellDirection: 'NW',
    height: '0.8–1.2m',
    condition: 'FAIR',
    image: 'https://images.unsplash.com/photo-1456930266018-fda42f7404a7?w=400&q=80',
    coordinates: { lat: 39.4226, lng: -9.4164 },
    region: 'Centro / Oeste',
    country: 'PT',
  },
];

// ─── Dummy 48h Forecast (Supertubos — realistic 3-star swell) ────────────────
function makeForecastHour(
  offsetHours: number,
  overrides?: Partial<ForecastSnapshot>,
): ForecastSnapshot {
  const base = new Date('2024-01-15T06:00:00Z');
  base.setHours(base.getHours() + offsetHours);
  return {
    modelName: 'open-meteo',
    runTime: '2024-01-15T00:00:00Z',
    forecastHour: base.toISOString(),
    waveHeight: 1.8,
    wavePeriod: 12,
    swellDirection: 275,
    swellHeight: 1.6,
    windSpeed: 15,
    windDirection: 90, // E = offshore for west-facing beach
    windGust: 20,
    airTemp: 16,
    precipitation: 0,
    cloudCover: 20,
    pressure: 1018,
    ...overrides,
  };
}

export const dummyForecast: ForecastSnapshot[] = [
  makeForecastHour(0, { waveHeight: 1.8, wavePeriod: 12, windSpeed: 12 }),
  makeForecastHour(3, { waveHeight: 1.9, wavePeriod: 13, windSpeed: 10 }),
  makeForecastHour(6, { waveHeight: 2.1, wavePeriod: 14, windSpeed: 8 }), // peak
  makeForecastHour(9, { waveHeight: 2.0, wavePeriod: 13, windSpeed: 14 }),
  makeForecastHour(12, { waveHeight: 1.8, wavePeriod: 12, windSpeed: 18, windDirection: 270 }),
  makeForecastHour(15, { waveHeight: 1.6, wavePeriod: 11, windSpeed: 22, windDirection: 250 }),
  makeForecastHour(18, { waveHeight: 1.5, wavePeriod: 11, windSpeed: 20, windDirection: 240 }),
  makeForecastHour(21, { waveHeight: 1.4, wavePeriod: 10, windSpeed: 15, windDirection: 260 }),
  // Day 2
  makeForecastHour(24, { waveHeight: 1.5, wavePeriod: 10, windSpeed: 18 }),
  makeForecastHour(27, { waveHeight: 1.6, wavePeriod: 11, windSpeed: 16 }),
  makeForecastHour(30, { waveHeight: 1.7, wavePeriod: 12, windSpeed: 12 }),
  makeForecastHour(33, { waveHeight: 1.8, wavePeriod: 12, windSpeed: 10 }),
  makeForecastHour(36, { waveHeight: 1.9, wavePeriod: 13, windSpeed: 14 }),
  makeForecastHour(39, { waveHeight: 1.8, wavePeriod: 12, windSpeed: 18 }),
  makeForecastHour(42, { waveHeight: 1.6, wavePeriod: 11, windSpeed: 20 }),
  makeForecastHour(45, { waveHeight: 1.4, wavePeriod: 10, windSpeed: 15 }),
];

// ─── Dummy Tide Data ──────────────────────────────────────────────────────────
export const dummyTides: TidePoint[] = [
  { time: '2024-01-15T03:24:00Z', height: 0.4, type: 'LOW' },
  { time: '2024-01-15T06:00:00Z', height: 1.1, type: null },
  { time: '2024-01-15T09:42:00Z', height: 2.8, type: 'HIGH' },
  { time: '2024-01-15T12:00:00Z', height: 2.1, type: null },
  { time: '2024-01-15T15:58:00Z', height: 0.5, type: 'LOW' },
  { time: '2024-01-15T19:00:00Z', height: 1.3, type: null },
  { time: '2024-01-15T22:14:00Z', height: 2.6, type: 'HIGH' },
  { time: '2024-01-16T01:30:00Z', height: 1.8, type: null },
  { time: '2024-01-16T04:06:00Z', height: 0.5, type: 'LOW' },
];

// ─── Dummy Session (shown blurred to guests) ──────────────────────────────────
export const dummySession: SessionLog = {
  id: 'dummy-session-1',
  spotName: 'Supertubos',
  spotId: 'supertubos',
  date: '2024-01-12T09:00:00Z',
  rating: 5,
  height: '2.0m',
  image: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=400&q=80',
  duration: 120,
  waveCount: 18,
  topSpeed: 42,
  longestRide: 87,
  notes: 'Perfect offshore conditions. The mid-tide push was incredible — longest session ever at Tubos.',
};

// ─── Dummy Board (shown in guest Quiver) ─────────────────────────────────────
export const dummyBoard: Board = {
  id: 'dummy-board-1',
  brand: 'Channel Islands',
  model: 'Fever',
  length: 6.2,
  width: 19.5,
  thickness: 2.5,
  volume: 30.5,
  boardType: 'shortboard',
  photo: undefined,
};
