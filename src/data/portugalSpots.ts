import type { PortugalSpotSeed, SpotBreakProfile } from '@/types';

/**
 * Portugal surf spots from north to south.
 */
export const portugalSpots: PortugalSpotSeed[] = [
  {
    id: 'viana-do-castelo',
    name: 'Viana do Castelo',
    region: 'Viana do Castelo Area',
    country: 'PT',
    latitude: 41.69,
    longitude: -8.83,
    breakProfile: { breakType: 'beach', facingDirection: 'W', optimalSwellDirection: 'W-NW', optimalTidePhase: 'mid', optimalWindDirection: 'E' },
  },
  {
    id: 'vila-praia-de-ancora',
    name: 'Vila Praia de Âncora',
    region: 'Viana do Castelo Area',
    country: 'PT',
    latitude: 41.68,
    longitude: -8.825,
    breakProfile: { breakType: 'beach', facingDirection: 'W', optimalSwellDirection: 'W-NW', optimalTidePhase: 'mid', optimalWindDirection: 'E' },
  },
  {
    id: 'afife',
    name: 'Afife',
    region: 'Viana do Castelo Area',
    country: 'PT',
    latitude: 41.67,
    longitude: -8.82,
    breakProfile: { breakType: 'beach', facingDirection: 'W', optimalSwellDirection: 'W-NW', optimalTidePhase: 'mid', optimalWindDirection: 'E' },
  },
  {
    id: 'moledo',
    name: 'Moledo',
    region: 'Viana do Castelo Area',
    country: 'PT',
    latitude: 41.66,
    longitude: -8.815,
    breakProfile: { breakType: 'beach', facingDirection: 'W', optimalSwellDirection: 'W-NW', optimalTidePhase: 'mid', optimalWindDirection: 'E' },
  },
  {
    id: 'sauve-mar',
    name: 'Sauve Mar',
    region: 'Minho / Braga Coast',
    country: 'PT',
    latitude: 41.5,
    longitude: -8.8,
    breakProfile: { breakType: 'beach', facingDirection: 'W', optimalSwellDirection: 'W-NW', optimalTidePhase: 'mid', optimalWindDirection: 'E' },
  },
  {
    id: 'fao',
    name: 'Fão',
    region: 'Minho / Braga Coast',
    country: 'PT',
    latitude: 41.49,
    longitude: -8.795,
    breakProfile: { breakType: 'beach', facingDirection: 'W', optimalSwellDirection: 'W-NW', optimalTidePhase: 'mid', optimalWindDirection: 'E' },
  },
  {
    id: 'ofir',
    name: 'Ofir',
    region: 'Minho / Braga Coast',
    country: 'PT',
    latitude: 41.48,
    longitude: -8.79,
    breakProfile: { breakType: 'beach', facingDirection: 'W', optimalSwellDirection: 'W-NW', optimalTidePhase: 'mid', optimalWindDirection: 'E' },
  },
  {
    id: 'praia-nova',
    name: 'Praia Nova',
    region: 'Minho / Braga Coast',
    country: 'PT',
    latitude: 41.47,
    longitude: -8.785,
    breakProfile: { breakType: 'beach', facingDirection: 'W', optimalSwellDirection: 'W-NW', optimalTidePhase: 'mid', optimalWindDirection: 'E' },
  },
  {
    id: 'apulia',
    name: 'Apulia',
    region: 'Minho / Braga Coast',
    country: 'PT',
    latitude: 41.46,
    longitude: -8.78,
    breakProfile: { breakType: 'beach', facingDirection: 'W', optimalSwellDirection: 'W-NW', optimalTidePhase: 'mid', optimalWindDirection: 'E' },
  },
  {
    id: 'agucadoura',
    name: 'Agucadoura',
    region: 'Minho / Braga Coast',
    country: 'PT',
    latitude: 41.45,
    longitude: -8.775,
    breakProfile: { breakType: 'beach', facingDirection: 'W', optimalSwellDirection: 'W-NW', optimalTidePhase: 'mid', optimalWindDirection: 'E' },
  },
  // Porto Region
  {
    id: 'matosinhos',
    name: 'Matosinhos',
    region: 'Porto Region',
    country: 'PT',
    latitude: 41.08,
    longitude: -8.645,
    breakProfile: { breakType: 'beach', facingDirection: 'W', optimalSwellDirection: 'W-NW', optimalTidePhase: 'any', optimalWindDirection: 'E' },
  },
  {
    id: 'espinho',
    name: 'Espinho',
    region: 'Porto Region',
    country: 'PT',
    latitude: 41.03,
    longitude: -8.62,
    breakProfile: { breakType: 'beach', facingDirection: 'W', optimalSwellDirection: 'W-NW', optimalTidePhase: 'mid', optimalWindDirection: 'E' },
  },
  // Nazaré
  {
    id: 'nazare',
    name: 'Nazaré',
    region: 'Leiria / Oeste',
    country: 'PT',
    latitude: 39.6,
    longitude: -9.07,
    breakProfile: { breakType: 'beach', facingDirection: 'W', optimalSwellDirection: 'W-NW', optimalTidePhase: 'mid', optimalWindDirection: 'E' },
  },
  // Peniche Hub
  {
    id: 'baleal',
    name: 'Baleal',
    region: 'Peniche',
    country: 'PT',
    latitude: 39.35,
    longitude: -9.38,
    breakProfile: { breakType: 'beach', facingDirection: 'NW', optimalSwellDirection: 'W', optimalTidePhase: 'any', optimalWindDirection: 'S' },
  },
  {
    id: 'supertubos',
    name: 'Supertubos',
    region: 'Peniche',
    country: 'PT',
    latitude: 39.34,
    longitude: -9.375,
    breakProfile: { breakType: 'beach', facingDirection: 'S-SW', optimalSwellDirection: 'W-NW', optimalTidePhase: 'mid', optimalWindDirection: 'N-NE' },
  },
  // Ericeira Hub
  {
    id: 'ribeira-d-ilhas',
    name: 'Ribeira D\'Ilhas',
    region: 'Ericeira',
    country: 'PT',
    latitude: 38.96,
    longitude: -9.42,
    breakProfile: { breakType: 'point', facingDirection: 'W', optimalSwellDirection: 'W-NW', optimalTidePhase: 'mid', optimalWindDirection: 'E' },
  },
  {
    id: 'coxos',
    name: 'Coxos',
    region: 'Ericeira',
    country: 'PT',
    latitude: 38.94,
    longitude: -9.41,
    breakProfile: { breakType: 'point', facingDirection: 'W', optimalSwellDirection: 'W-NW', optimalTidePhase: 'low', optimalWindDirection: 'E' },
  },
  {
    id: 'reef',
    name: 'Reef',
    region: 'Ericeira',
    country: 'PT',
    latitude: 38.93,
    longitude: -9.405,
    breakProfile: { breakType: 'reef', facingDirection: 'W', optimalSwellDirection: 'W-NW', optimalTidePhase: 'mid', optimalWindDirection: 'E' },
  },
  // Lisbon/Cascais
  {
    id: 'carcavelos',
    name: 'Carcavelos',
    region: 'Lisboa / Cascais / Estoril',
    country: 'PT',
    latitude: 38.59,
    longitude: -9.345,
    breakProfile: { breakType: 'beach', facingDirection: 'S', optimalSwellDirection: 'SW', optimalTidePhase: 'mid', optimalWindDirection: 'N' },
  },
  {
    id: 'praia-do-guincho',
    name: 'Praia do Guincho',
    region: 'Lisboa / Cascais / Estoril',
    country: 'PT',
    latitude: 38.55,
    longitude: -9.325,
    breakProfile: { breakType: 'beach', facingDirection: 'W', optimalSwellDirection: 'W-NW', optimalTidePhase: 'any', optimalWindDirection: 'E' },
  },
  // Costa da Caparica Hub
  {
    id: 'costa-da-caparica',
    name: 'Costa da Caparica',
    region: 'Costa da Caparica',
    country: 'PT',
    latitude: 38.57,
    longitude: -9.185,
    breakProfile: { breakType: 'beach', facingDirection: 'W', optimalSwellDirection: 'W-NW', optimalTidePhase: 'any', optimalWindDirection: 'E' },
  },
  // Sagres Area Hub
  {
    id: 'tonel',
    name: 'Tonel',
    region: 'Sagres Area',
    country: 'PT',
    latitude: 36.94,
    longitude: -8.87,
    breakProfile: { breakType: 'beach', facingDirection: 'W', optimalSwellDirection: 'W-NW', optimalTidePhase: 'any', optimalWindDirection: 'E' },
  },
  {
    id: 'mareta',
    name: 'Mareta',
    region: 'Sagres Area',
    country: 'PT',
    latitude: 36.92,
    longitude: -8.86,
    breakProfile: { breakType: 'beach', facingDirection: 'S', optimalSwellDirection: 'S', optimalTidePhase: 'any', optimalWindDirection: 'N' },
  }
];

// Mapper for default profiles (used in build time to ensure 100+ spots remain reachable)
const defaultProfile: SpotBreakProfile = { breakType: 'beach', facingDirection: 'W', optimalSwellDirection: 'W-NW', optimalTidePhase: 'mid', optimalWindDirection: 'E' };

/**
 * Haversine distance between two lat/lon points, returns km.
 */
export function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Return the N nearest spots to a given home spot, excluding the home spot itself.
 */
export function getNearestSpots(
  allSpots: PortugalSpotSeed[],
  homeSpotId: string,
  limit = 5,
): PortugalSpotSeed[] {
  const home = allSpots.find(s => s.id === homeSpotId);
  if (!home) return allSpots.slice(0, limit);

  return allSpots
    .filter(s => s.id !== homeSpotId)
    .map(s => ({
      spot: s,
      dist: haversineKm(home.latitude, home.longitude, s.latitude, s.longitude),
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, limit)
    .map(w => w.spot);
}
