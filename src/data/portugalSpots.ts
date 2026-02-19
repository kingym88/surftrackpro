import type { PortugalSpotSeed } from '@/types';

/**
 * Portugal surf spots from north to south.
 * Coordinates verified against OpenStreetMap / Google Maps.
 * Marked [NEEDS VERIFICATION] where approximate.
 */
export const portugalSpots: PortugalSpotSeed[] = [
  // ── Minho / Viana region ─────────────────────────────────────────────────
  {
    id: 'viana-do-castelo',
    name: 'Viana do Castelo',
    region: 'Minho / Viana',
    country: 'PT',
    latitude: 41.6913,
    longitude: -8.8365,
  },
  {
    id: 'vila-praia-de-ancora',
    name: 'Vila Praia de Âncora',
    region: 'Minho / Viana',
    country: 'PT',
    latitude: 41.8052,
    longitude: -8.8605,
  },
  {
    id: 'afife',
    name: 'Afife',
    region: 'Minho / Viana',
    country: 'PT',
    latitude: 41.7669,
    longitude: -8.8665,
  },
  {
    id: 'moledo',
    name: 'Moledo',
    region: 'Minho / Viana',
    country: 'PT',
    latitude: 41.8448,
    longitude: -8.8721,
  },

  // ── Porto region ──────────────────────────────────────────────────────────
  {
    id: 'matosinhos',
    name: 'Matosinhos',
    region: 'Porto',
    country: 'PT',
    latitude: 41.1831,
    longitude: -8.7017,
  },
  {
    id: 'espinho',
    name: 'Espinho',
    region: 'Porto',
    country: 'PT',
    latitude: 40.9987,
    longitude: -8.6440,
  },

  // ── Centro / Oeste region ─────────────────────────────────────────────────
  {
    id: 'figueira-da-foz',
    name: 'Figueira da Foz',
    region: 'Centro / Oeste',
    country: 'PT',
    latitude: 40.1508,
    longitude: -8.8609,
  },
  {
    id: 'peniche',
    name: 'Peniche',
    region: 'Centro / Oeste',
    country: 'PT',
    latitude: 39.3557,
    longitude: -9.3788,
  },
  {
    id: 'supertubos',
    name: 'Supertubos',
    region: 'Centro / Oeste',
    country: 'PT',
    latitude: 39.3441,
    longitude: -9.3885,
  },
  {
    id: 'baleal',
    name: 'Baleal',
    region: 'Centro / Oeste',
    country: 'PT',
    latitude: 39.3760,
    longitude: -9.3453,
  },
  {
    id: 'ribeira-dilhas',
    name: "Ribeira d'Ilhas",
    region: 'Centro / Oeste',
    country: 'PT',
    latitude: 39.4226,
    longitude: -9.4164,
  },
  {
    id: 'sao-lourenco',
    name: 'São Lourenço',
    region: 'Centro / Oeste',
    country: 'PT',
    latitude: 39.4450,
    longitude: -9.4215, // [NEEDS VERIFICATION]
  },
  {
    id: 'nazare',
    name: 'Nazaré',
    region: 'Centro / Oeste',
    country: 'PT',
    latitude: 39.6029,
    longitude: -9.0700,
  },
  {
    id: 'sao-pedro-de-moel',
    name: 'São Pedro de Moel',
    region: 'Centro / Oeste',
    country: 'PT',
    latitude: 39.7571,
    longitude: -9.0320, // [NEEDS VERIFICATION]
  },

  // ── Lisboa / Cascais / Estoril region ─────────────────────────────────────
  {
    id: 'carcavelos',
    name: 'Carcavelos',
    region: 'Lisboa / Cascais / Estoril',
    country: 'PT',
    latitude: 38.6793,
    longitude: -9.3281,
  },
  {
    id: 'guincho',
    name: 'Guincho',
    region: 'Lisboa / Cascais / Estoril',
    country: 'PT',
    latitude: 38.7293,
    longitude: -9.4731,
  },
  {
    id: 'costa-da-caparica',
    name: 'Costa da Caparica',
    region: 'Lisboa / Cascais / Estoril',
    country: 'PT',
    latitude: 38.6505,
    longitude: -9.2370,
  },
  {
    id: 'sesimbra',
    name: 'Sesimbra',
    region: 'Lisboa / Cascais / Estoril',
    country: 'PT',
    latitude: 38.4441,
    longitude: -9.1013,
  },
  {
    id: 'portinho-da-arrabida',
    name: 'Portinho da Arrábida',
    region: 'Lisboa / Cascais / Estoril',
    country: 'PT',
    latitude: 38.4904,
    longitude: -8.9722, // [NEEDS VERIFICATION]
  },

  // ── Alentejo coast ────────────────────────────────────────────────────────
  {
    id: 'comporta',
    name: 'Comporta',
    region: 'Alentejo',
    country: 'PT',
    latitude: 38.3790,
    longitude: -8.7773,
  },
  {
    id: 'melides',
    name: 'Melides',
    region: 'Alentejo',
    country: 'PT',
    latitude: 38.2125,
    longitude: -8.7286, // [NEEDS VERIFICATION]
  },
  {
    id: 'porto-covo',
    name: 'Porto Covo',
    region: 'Alentejo',
    country: 'PT',
    latitude: 37.8485,
    longitude: -8.7855,
  },
  {
    id: 'zambujeira-do-mar',
    name: 'Zambujeira do Mar',
    region: 'Alentejo',
    country: 'PT',
    latitude: 37.5251,
    longitude: -8.7861,
  },

  // ── Sagres / Algarve west ─────────────────────────────────────────────────
  {
    id: 'amado',
    name: 'Praia do Amado',
    region: 'Sagres / Algarve',
    country: 'PT',
    latitude: 37.2082,
    longitude: -8.8131,
  },
  {
    id: 'castelejo',
    name: 'Praia do Castelejo',
    region: 'Sagres / Algarve',
    country: 'PT',
    latitude: 37.1246,
    longitude: -8.8497, // [NEEDS VERIFICATION]
  },
  {
    id: 'cordoama',
    name: 'Praia da Cordoama',
    region: 'Sagres / Algarve',
    country: 'PT',
    latitude: 37.1140,
    longitude: -8.8671, // [NEEDS VERIFICATION]
  },
  {
    id: 'tonel',
    name: 'Praia do Tonel',
    region: 'Sagres / Algarve',
    country: 'PT',
    latitude: 37.0077,
    longitude: -8.9409,
  },
  {
    id: 'beliche',
    name: 'Praia do Beliche',
    region: 'Sagres / Algarve',
    country: 'PT',
    latitude: 37.0215,
    longitude: -8.9558, // [NEEDS VERIFICATION]
  },
  {
    id: 'sagres',
    name: 'Sagres',
    region: 'Sagres / Algarve',
    country: 'PT',
    latitude: 37.0146,
    longitude: -8.9371,
  },
];

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
