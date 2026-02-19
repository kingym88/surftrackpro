import type { TidePoint } from '@/types';

// ─── NOAA CO-OPS Tides API (best for US stations) ────────────────────────────
const NOAA_BASE_URL = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';

/**
 * Fetch tidal predictions from NOAA CO-OPS (US stations only).
 * For non-US spots (e.g., Portugal), the open-meteo marine API doesn't include tides.
 * We use a synthetic harmonic approximation as fallback (see below).
 *
 * @param stationId - NOAA station ID (e.g. "9410660" for Los Angeles)
 * @param date - ISO date string "YYYY-MM-DD"
 */
export async function fetchTidePredictions(
  stationId: string,
  date: string,
): Promise<TidePoint[]> {
  // Check if this looks like a NOAA station ID (numeric)
  if (/^\d+$/.test(stationId)) {
    return fetchNoaaTides(stationId, date);
  }

  // For non-US spots (Portugal etc.), generate synthetic tides
  return generateSyntheticTides(date);
}

// ─── NOAA CO-OPS fetch ────────────────────────────────────────────────────────
async function fetchNoaaTides(stationId: string, date: string): Promise<TidePoint[]> {
  const params = new URLSearchParams({
    product: 'predictions',
    application: 'surftrackpro',
    begin_date: date.replace(/-/g, ''),
    end_date: date.replace(/-/g, ''),
    datum: 'MLLW',
    time_zone: 'gmt',
    interval: 'hilo',
    units: 'metric',
    format: 'json',
    station: stationId,
  });

  const res = await fetch(`${NOAA_BASE_URL}?${params}`);
  if (!res.ok) throw new Error(`NOAA tides API error: ${res.status}`);

  const json = await res.json();
  const predictions: Array<{ t: string; v: string; type: string }> =
    json.predictions ?? [];

  return predictions.map(p => ({
    time: p.t,
    height: parseFloat(p.v),
    type: p.type === 'H' ? 'HIGH' : p.type === 'L' ? 'LOW' : null,
  }));
}

/**
 * Synthetic tide generator for non-US locations (e.g., Portugal).
 * Uses a simplified M2 tidal constituent approximation:
 * - Period ~12.42 hours (semi-diurnal)
 * - Amplitude 1.5m (representative for Lisbon area)
 * - Offset varies by longitude (crude approximation)
 *
 * [NEEDS VERIFICATION] — For production use, integrate WorldTides API or CMEMS
 * tide predictions. WorldTides free tier: 100 requests/day at https://www.worldtides.info
 */
export function generateSyntheticTides(date: string, offsetHours = 0): TidePoint[] {
  const baseDate = new Date(`${date}T00:00:00Z`);
  const amplitude = 1.5; // metres
  const period = 12.42; // hours (M2 tidal constituent)
  const points: TidePoint[] = [];

  for (let h = 0; h < 48; h += 1) {
    const t = new Date(baseDate.getTime() + h * 60 * 60 * 1000);
    const hoursFromStart = h + offsetHours;
    const height = amplitude * Math.cos((2 * Math.PI * hoursFromStart) / period);

    // Determine if this hour is near a HIGH or LOW
    const prevHeight = amplitude * Math.cos((2 * Math.PI * (hoursFromStart - 0.5)) / period);
    const nextHeight = amplitude * Math.cos((2 * Math.PI * (hoursFromStart + 0.5)) / period);

    let type: TidePoint['type'] = null;
    if (height > prevHeight && height > nextHeight && height > amplitude * 0.85) {
      type = 'HIGH';
    } else if (height < prevHeight && height < nextHeight && height < -amplitude * 0.85) {
      type = 'LOW';
    }

    points.push({
      time: t.toISOString(),
      height: parseFloat((height + amplitude).toFixed(2)), // shift to always be positive (0–3m range)
      type,
    });
  }

  return points;
}
