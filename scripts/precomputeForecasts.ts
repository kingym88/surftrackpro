/**
 * scripts/precomputeForecasts.ts
 */

import * as admin from 'firebase-admin';
import { portugalSpots } from '../src/data/portugalSpots.js';

const PROJECT_ID    = process.env.FIREBASE_PROJECT_ID;
const CLIENT_EMAIL  = process.env.FIREBASE_CLIENT_EMAIL;
const PRIVATE_KEY   = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!PROJECT_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
  console.error('ERROR: Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY env vars.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId:   PROJECT_ID,
    clientEmail: CLIENT_EMAIL,
    privateKey:  PRIVATE_KEY,
  }),
});

const db = admin.firestore();

interface ForecastSnapshot {
  modelName:      string;
  runTime:        string;
  forecastHour:   string;
  waveHeight:     number;
  wavePeriod:     number;
  swellDirection: number;
  swellHeight:    number;
  windSpeed:      number;
  windDirection:  number;
  windGust:       number;
  airTemp:        number;
  precipitation:  number;
  cloudCover:     number;
  pressure:       number;
}

async function fetchForecast(lat: number, lon: number): Promise<ForecastSnapshot[]> {
  const ATM_URL    = 'https://api.open-meteo.com/v1/forecast';
  const MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';

  const base = {
    latitude:      lat.toString(),
    longitude:     lon.toString(),
    timezone:      'UTC',
    forecast_days: '7',
  };

  const atmParams = new URLSearchParams({
    ...base,
    hourly: 'temperature_2m,precipitation,cloudcover,pressure_msl,windspeed_10m,winddirection_10m,windgusts_10m',
  });

  const marineParams = new URLSearchParams({
    ...base,
    hourly: 'wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction',
  });

  const [atmRes, marineRes] = await Promise.all([
    fetch(`${ATM_URL}?${atmParams}`),
    fetch(`${MARINE_URL}?${marineParams}`),
  ]);

  if (!atmRes.ok)    throw new Error(`ATM API ${atmRes.status} for ${lat},${lon}`);
  if (!marineRes.ok) throw new Error(`Marine API ${marineRes.status} for ${lat},${lon}`);

  const atm    = await atmRes.json()    as Record<string, any>;
  const marine = await marineRes.json() as Record<string, any>;

  const ah    = atm.hourly    as Record<string, any[]>;
  const mh    = marine.hourly as Record<string, any[]>;
  const times = (ah?.time ?? []) as string[];
  const now   = new Date().toISOString();

  return times.map((t, i) => ({
    modelName:      'open-meteo',
    runTime:        now,
    forecastHour:   t,
    waveHeight:     n(mh?.wave_height?.[i]),
    wavePeriod:     n(mh?.wave_period?.[i]),
    swellDirection: n(mh?.swell_wave_direction?.[i]),
    swellHeight:    n(mh?.swell_wave_height?.[i]),
    windSpeed:      n(ah?.windspeed_10m?.[i]),
    windDirection:  n(ah?.winddirection_10m?.[i]),
    windGust:       n(ah?.windgusts_10m?.[i]),
    airTemp:        n(ah?.temperature_2m?.[i]),
    precipitation:  n(ah?.precipitation?.[i]),
    cloudCover:     n(ah?.cloudcover?.[i]),
    pressure:       n(ah?.pressure_msl?.[i]),
  }));
}

function n(v: any): number {
  const x = Number(v);
  return isNaN(x) ? 0 : x;
}

async function writeToFirestore(
  spotId:  string,
  data:    ForecastSnapshot[],
): Promise<void> {
  const runId  = Date.now().toString();
  const runAt  = admin.firestore.Timestamp.now();
  const validTo = admin.firestore.Timestamp.fromMillis(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  );
  await db
    .collection('precomputed_forecasts')
    .doc(spotId)
    .collection('runs')
    .doc(runId)
    .set({ data, runAt, validTo });
}

async function run(): Promise<void> {
  const BATCH   = 5;
  const DELAY   = 1100;

  console.log(`Precomputing forecasts for ${portugalSpots.length} spots...`);

  let ok = 0, fail = 0;

  for (let i = 0; i < portugalSpots.length; i += BATCH) {
    const batch = portugalSpots.slice(i, i + BATCH);

    await Promise.all(batch.map(async spot => {
      try {
        const data = await fetchForecast(spot.latitude, spot.longitude);
        await writeToFirestore(spot.id, data);
        console.log(`✅ ${spot.name}`);
        ok++;
      } catch (err) {
        console.error(`❌ ${spot.name}:`, (err as Error).message);
        fail++;
      }
    }));

    if (i + BATCH < portugalSpots.length) {
      await new Promise(r => setTimeout(r, DELAY));
    }
  }

  console.log(`\nFinished: ${ok} ok, ${fail} failed.`);
  if (fail > 0) process.exit(1);
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
