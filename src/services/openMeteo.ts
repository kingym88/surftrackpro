import type { ForecastSnapshot } from '@/types';

// ─── Open-Meteo API endpoints ─────────────────────────────────────────────────
const ATMOSPHERIC_URL = 'https://api.open-meteo.com/v1/forecast';
const MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';

// ─── Fetch atmospheric + marine forecasts and merge ──────────────────────────
export async function fetchOpenMeteoForecast(
  lat: number,
  lon: number,
): Promise<ForecastSnapshot[]> {
  const commonParams = {
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: '',
    timezone: 'UTC',
    forecast_days: '7',
  };

  const atmParams = new URLSearchParams({
    ...commonParams,
    hourly:
      'temperature_2m,precipitation,cloudcover,pressure_msl,windspeed_10m,winddirection_10m,windgusts_10m',
  });

  const marineParams = new URLSearchParams({
    ...commonParams,
    hourly:
      'wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction',
  });

  const [atmRes, marineRes] = await Promise.all([
    fetch(`${ATMOSPHERIC_URL}?${atmParams}`),
    fetch(`${MARINE_URL}?${marineParams}`),
  ]);

  if (!atmRes.ok) throw new Error(`Atmospheric API error: ${atmRes.status}`);
  if (!marineRes.ok) throw new Error(`Marine API error: ${marineRes.status}`);

  const atmData = await atmRes.json();
  const marineData = await marineRes.json();

  return mergeToForecastSnapshots(atmData, marineData);
}

// ─── Bulk fetch for multiple spots (Portugal pre-computation) ─────────────────
export async function fetchOpenMeteoForecastBulk(
  spots: { id: string; lat: number; lon: number }[],
  delayMs = 300,
): Promise<Record<string, ForecastSnapshot[]>> {
  const results: Record<string, ForecastSnapshot[]> = {};

  for (const spot of spots) {
    try {
      results[spot.id] = await fetchOpenMeteoForecast(spot.lat, spot.lon);
    } catch (error) {
      console.error(`Failed to fetch forecast for spot ${spot.id}:`, error);
      results[spot.id] = [];
    }
    // Rate-limiting delay between requests
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

// ─── Internal: merge atmospheric + marine JSON into ForecastSnapshot[] ────────
function mergeToForecastSnapshots(
  atm: Record<string, unknown>,
  marine: Record<string, unknown>,
): ForecastSnapshot[] {
  const atmHourly = atm.hourly as Record<string, unknown[]>;
  const marineHourly = marine.hourly as Record<string, unknown[]>;

  const times: string[] = (atmHourly?.time as string[]) ?? [];
  const snapshots: ForecastSnapshot[] = [];

  for (let i = 0; i < times.length; i++) {
    snapshots.push({
      modelName: 'open-meteo',
      runTime: new Date().toISOString(),
      forecastHour: times[i],
      // Atmospheric
      windSpeed: safeNum(atmHourly?.windspeed_10m?.[i]),
      windDirection: safeNum(atmHourly?.winddirection_10m?.[i]),
      windGust: safeNum(atmHourly?.windgusts_10m?.[i]),
      airTemp: safeNum(atmHourly?.temperature_2m?.[i]),
      precipitation: safeNum(atmHourly?.precipitation?.[i]),
      cloudCover: safeNum(atmHourly?.cloudcover?.[i]),
      pressure: safeNum(atmHourly?.pressure_msl?.[i]),
      // Marine
      waveHeight: safeNum(marineHourly?.wave_height?.[i]),
      wavePeriod: safeNum(marineHourly?.wave_period?.[i]),
      swellDirection: safeNum(marineHourly?.swell_wave_direction?.[i]),
      swellHeight: safeNum(marineHourly?.swell_wave_height?.[i]),
    });
  }

  return snapshots;
}

function safeNum(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}
