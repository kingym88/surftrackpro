/**
 * scripts/precomputeForecasts.ts
 *
 * MISSION: Automated high-precision surf forecast pipeline for all 100+ Portugal spots.
 * Runs every 12 hours via GitHub Actions.
 *
 * ENSEMBLE MERGE STRATEGY:
 * - 0-48h: Priority on High-Res models (simulated here via ECMWF/BestMatch).
 * - 49-168h: Consensus between GFS and Open-Meteo.
 */

import admin from 'firebase-admin';
import { portugalSpots } from '../src/data/portugalSpots.js';

const PROJECT_ID    = process.env.FIREBASE_PROJECT_ID;
const CLIENT_EMAIL  = process.env.FIREBASE_CLIENT_EMAIL;
const PRIVATE_KEY   = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!PROJECT_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
  console.error('ERROR: Missing FIREBASE secrets.');
  process.exit(1);
}

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: PROJECT_ID,
    clientEmail: CLIENT_EMAIL,
    privateKey: PRIVATE_KEY,
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
  tideHeight?:    number; // Added as per Step 2
  confidence?:    'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * Fetches multiple models from Open-Meteo and merges them using the Consensus Algorithm.
 */
async function fetchEnsembleForecast(lat: number, lon: number): Promise<ForecastSnapshot[]> {
  const MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';
  const ATM_URL    = 'https://api.open-meteo.com/v1/forecast';

  const base = {
    latitude: lat.toString(),
    longitude: lon.toString(),
    timezone: 'UTC',
    forecast_days: '7',
  };

  // Fetch Marine data (Waves)
  // We request multiple models: best_match (weighted ensemble) and meteofrance_wave (Copernicus/High-Res)
  const marineParams = new URLSearchParams({
    ...base,
    hourly: 'wave_height,wave_period,swell_wave_height,swell_wave_direction',
    models: 'best_match,meteofrance_wave',
  });

  // Fetch Atmos data
  const atmParams = new URLSearchParams({
    ...base,
    hourly: 'temperature_2m,precipitation,cloudcover,pressure_msl,windspeed_10m,winddirection_10m,windgusts_10m',
  });

  const [marineRes, atmRes] = await Promise.all([
    fetch(`${MARINE_URL}?${marineParams}`),
    fetch(`${ATM_URL}?${atmParams}`),
  ]);

  if (!marineRes.ok || !atmRes.ok) {
    const mErr = !marineRes.ok ? await marineRes.text() : 'OK';
    const aErr = !atmRes.ok ? await atmRes.text() : 'OK';
    throw new Error(`API Failure: Marine=${marineRes.status} (${mErr}), ATM=${atmRes.status} (${aErr})`);
  }

  const marine = await marineRes.json();
  const atm = await atmRes.json();

  const mHourly = marine.hourly;
  const aHourly = atm.hourly;
  const times = mHourly.time;
  const now = new Date().toISOString();

  return times.map((t: string, i: number) => {
    const hourDiff = Math.floor((new Date(t).getTime() - Date.now()) / 3600000);

    // CONSENSUS ALGORITHM
    // Format is variable_marine_best_match and variable_meteofrance_wave
    const whBest = mHourly.wave_height_marine_best_match?.[i] || 0;
    const whMF = mHourly.wave_height_meteofrance_wave?.[i] || whBest;

    let finalWaveHeight: number;
    if (hourDiff <= 48) {
      // Prioritize High-Res (MeteoFrance/Copernicus)
      finalWaveHeight = whMF;
    } else {
      // Consensus
      finalWaveHeight = (whMF + whBest) / 2;
    }

    // CONFIDENCE CALCULATION
    const avg = (whMF + whBest) / 2 || 1;
    const divergence = Math.abs(whMF - whBest) / avg;
    const confidence = divergence > 0.20 ? 'LOW' : divergence > 0.10 ? 'MEDIUM' : 'HIGH';

    return {
      modelName: 'ensemble-consensus',
      runTime: now,
      forecastHour: t,
      waveHeight: parseFloat(finalWaveHeight.toFixed(2)),
      wavePeriod: mHourly.wave_period_marine_best_match?.[i] || 0,
      swellDirection: mHourly.swell_wave_direction_marine_best_match?.[i] || 0,
      swellHeight: mHourly.swell_wave_height_marine_best_match?.[i] || 0,
      windSpeed: aHourly.windspeed_10m?.[i] || 0,
      windDirection: aHourly.winddirection_10m?.[i] || 0,
      windGust: aHourly.windgusts_10m?.[i] || 0,
      airTemp: aHourly.temperature_2m?.[i] || 0,
      precipitation: aHourly.precipitation?.[i] || 0,
      cloudCover: aHourly.cloudcover?.[i] || 0,
      pressure: aHourly.pressure_msl?.[i] || 0,
      confidence,
    };
  });
}

async function writeToFirestore(spotId: string, data: ForecastSnapshot[]): Promise<void> {
  const runId = Date.now().toString();
  const runAt = admin.firestore.Timestamp.now();
  const validTo = admin.firestore.Timestamp.fromMillis(Date.now() + 12 * 60 * 60 * 1000);

  await db
    .collection('precomputed_forecasts')
    .doc(spotId)
    .collection('runs')
    .doc(runId)
    .set({ data, runAt, validTo });
  
  console.log(`✅ ${spotId} cached.`);
}

async function run() {
  console.log('--- SURFTRACK PRO PRECOMPUTATION RUN ---');
  const BATCH_SIZE = 5;
  const DELAY_MS = 1100;

  for (let i = 0; i < portugalSpots.length; i += BATCH_SIZE) {
    const batch = portugalSpots.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (spot) => {
      try {
        const ensembleData = await fetchEnsembleForecast(spot.latitude, spot.longitude);
        await writeToFirestore(spot.id, ensembleData);
      } catch (err) {
        console.error(`❌ Error on ${spot.id}:`, (err as Error).message);
      }
    }));

    if (i + BATCH_SIZE < portugalSpots.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }
}

run().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
