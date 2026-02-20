# SURFTRACK PRO — DATA PIPELINE + 4 CRITICAL FIXES
# Repository: https://github.com/kingym88/surftrackpro

You are implementing four focused fixes to an existing React + Vite + TypeScript +
Firebase app. Work through TASK A, B, C, and D in order. Do not skip ahead. Read
every referenced file in full before writing a single line of code. Do not modify
any file that is not explicitly listed in a task.

───────────────────────────────────────────────────────────────────────────────
## FILES TO READ BEFORE STARTING (read all of these first)
───────────────────────────────────────────────────────────────────────────────

- src/data/portugalSpots.ts         — source of truth for all 100 spot IDs, lat/lons
- src/services/firestore.ts         — has getPrecomputedForecast / setPrecomputedForecast
- src/services/openMeteo.ts         — has fetchOpenMeteoForecast(lat, lon)
- src/services/tides.ts             — currently returns fake synthetic tides for Portugal
- src/context/AppContext.tsx         — homeSpotId is null in initialState; forecast fetch
                                       is gated on homeSpotId being set
- App.tsx                           — navigate() only accepts (screen: Screen), no params
- types.ts                          — Screen enum, all shared interfaces
- screens/HomeScreen.tsx            — calls onNavigate(Screen.SPOT_DETAIL) with no spot
- screens/SpotDetailScreen.tsx      — receives spot as prop (SurfSpot | null)
- vite.config.ts                    — uses loadEnv + define block to inject env vars
- package.json                      — check existing scripts and devDependencies
- firebase.json                     — confirm there is no \"functions\" key

───────────────────────────────────────────────────────────────────────────────
## TASK A — SERVER-SIDE FORECAST PRE-COMPUTATION JOB
───────────────────────────────────────────────────────────────────────────────

### What this does
A GitHub Actions workflow runs every 12 hours. It reads every spot from
src/data/portugalSpots.ts (the single source of truth — do NOT read from any
other file), fetches a 7-day forecast from the free OpenMeteo API for each spot,
and writes the results into Firestore at:
  precomputed_forecasts/{spotId}/runs/{runId}

This is the same Firestore path already used by getPrecomputedForecast() and
setPrecomputedForecast() in src/services/firestore.ts. Do not change the schema.

The job uses only OpenMeteo for forecasts (free, no API key needed). It uses the
Firebase Admin SDK — NOT the client-side firebase SDK used in the React app.

---

### A.1 — Create .github/workflows/precompute-forecasts.yml

```yaml
name: Precompute Surf Forecasts

on:
  schedule:
    - cron: '0 4,16 * * *'  # 04:00 and 16:00 UTC daily
  workflow_dispatch:          # allow manual trigger from GitHub Actions UI

jobs:
  precompute:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run precomputation script
        env:
          FIREBASE_PROJECT_ID:    ${{ secrets.FIREBASE_PROJECT_ID }}
          FIREBASE_CLIENT_EMAIL:  ${{ secrets.FIREBASE_CLIENT_EMAIL }}
          FIREBASE_PRIVATE_KEY:   ${{ secrets.FIREBASE_PRIVATE_KEY }}
        run: npx ts-node --esm scripts/precomputeForecasts.ts
```

---

### A.2 — Create scripts/precomputeForecasts.ts (complete file)

```typescript
/**
 * scripts/precomputeForecasts.ts
 */

import * as admin from 'firebase-admin';
import { portugalSpots } from '../src/data/portugalSpots.js';

const PROJECT_ID    = process.env.FIREBASE_PROJECT_ID;
const CLIENT_EMAIL  = process.env.FIREBASE_CLIENT_EMAIL;
const PRIVATE_KEY   = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\\
/g, '\
');

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

  console.log(`\
Finished: ${ok} ok, ${fail} failed.`);
  if (fail > 0) process.exit(1);
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
```

---

### A.3 — Create scripts/tsconfig.json

```json
{
  \"extends\": \"../tsconfig.json\",
  \"compilerOptions\": {
    \"module\": \"ESNext\",
    \"moduleResolution\": \"bundler\",
    \"esModuleInterop\": true,
    \"paths\": { \"@/*\": [\"../*\"] }
  },
  \"ts-node\": {
    \"esm\": true,
    \"experimentalSpecifierResolution\": \"node\"
  }
}
```

---

### A.4 — Update package.json scripts block

```json
\"precompute\": \"npx ts-node --esm scripts/precomputeForecasts.ts\"
```

---

### A.5 — Update README.md with Secrets list

Go to: Settings → Secrets and variables → Actions → New repository secret

| Secret name            | Where to find it                                                        |
|------------------------|-------------------------------------------------------------------------|
| FIREBASE_PROJECT_ID    | Firebase Console → Project Settings → General → Project ID             |
| FIREBASE_CLIENT_EMAIL  | Firebase Console → Project Settings → Service Accounts → Generate key  |
| FIREBASE_PRIVATE_KEY   | Same JSON file → private_key field (copy full string)                  |

---

───────────────────────────────────────────────────────────────────────────────
## TASK B — REAL TIDE DATA FOR PORTUGAL (src/services/tides.ts)
───────────────────────────────────────────────────────────────────────────────

### The problem
fetchTidePredictions(stationId, date) currently returns fake synthetic tides for
Portugal.

### The fix
Replace the ENTIRE contents of src/services/tides.ts with the implementation below.

Strategy:
- Primary:  Stormglass.io (free: 10 req/day). Key: process.env.STORMGLASS_API_KEY
- Fallback: WorldTides (free: 100 credits). Key: process.env.WORLDTIDES_API_KEY
- Final:    generateSyntheticTides() with a console.warn

New signature: fetchTidePredictions(lat: number, lon: number, date: string)

```typescript
import { TidePoint } from '@/types';

const STORMGLASS_URL = 'https://api.stormglass.io/v2/tide/extremes/point';
const WORLDTIDES_URL = 'https://www.worldtides.info/api/v3';

export async function fetchTidePredictions(
  lat:  number,
  lon:  number,
  date: string,
): Promise<TidePoint[]> {

  const sgKey = process.env.STORMGLASS_API_KEY;
  if (sgKey && sgKey !== 'PLACEHOLDER_STORMGLASS_API_KEY') {
    try {
      const start = new Date(`${date}T00:00:00Z`).toISOString();
      const end   = new Date(`${date}T23:59:59Z`).toISOString();
      const res = await fetch(`${STORMGLASS_URL}?lat=${lat}&lng=${lon}&start=${start}&end=${end}`, {
        headers: { Authorization: sgKey }
      });
      if (res.ok) {
        const json = await res.json();
        return json.data.map((p: any) => ({
          time:   p.time,
          height: parseFloat(p.height.toFixed(2)),
          type:   p.type === 'high' ? 'HIGH' : p.type === 'low' ? 'LOW' : null,
        }));
      }
    } catch (e) { console.warn('SG fail', e); }
  }

  const wtKey = process.env.WORLDTIDES_API_KEY;
  if (wtKey && wtKey !== 'PLACEHOLDER_WORLDTIDES_API_KEY') {
    try {
      const unix = Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 1000);
      const res = await fetch(`${WORLDTIDES_URL}?extremes&lat=${lat}&lon=${lon}&start=${unix}&length=86400&key=${wtKey}`);
      if (res.ok) {
        const json = await res.json();
        return json.extremes.map((p: any) => ({
          time:   new Date(p.dt * 1000).toISOString(),
          height: parseFloat(p.height.toFixed(2)),
          type:   p.type === 'High' ? 'HIGH' : p.type === 'Low' ? 'LOW' : null,
        }));
      }
    } catch (e) { console.warn('WT fail', e); }
  }

  console.warn('Using synthetic tides.');
  return generateSyntheticTides(date);
}

export function generateSyntheticTides(date: string, offset = 0): TidePoint[] {
  const base = new Date(`${date}T00:00:00Z`);
  const amp  = 1.5;
  const per  = 12.42;
  const pts: TidePoint[] = [];
  for (let h = 0; h < 48; h++) {
    const t = new Date(base.getTime() + h * 3600000);
    const hours = h + offset;
    const height = amp * Math.cos((2 * Math.PI * hours) / per);
    const prev = amp * Math.cos((2 * Math.PI * (hours - 0.5)) / per);
    const next = amp * Math.cos((2 * Math.PI * (hours + 0.5)) / per);
    let type: any = null;
    if (height > prev && height > next && height > amp * 0.85) type = 'HIGH';
    else if (height < prev && height < next && height < -amp * 0.85) type = 'LOW';
    pts.push({ time: t.toISOString(), height: parseFloat((height + amp).toFixed(2)), type });
  }
  return pts;
}
```

───────────────────────────────────────────────────────────────────────────────
## TASK C — CARCAVELOS AS DEFAULT SPOT (src/context/AppContext.tsx)
───────────────────────────────────────────────────────────────────────────────

### The problem
homeSpotId is null. Forecast fetch is gated on homeSpotId. App opens blank.

### The fix
1. In src/context/AppContext.tsx, find initialState. Set homeSpotId: 'carcavelos'.
2. Set nearbySpotIds to the 5 nearest to 'carcavelos' using getNearestSpots.
3. In initApp useEffect, add logic to restore 'user_homeSpotId' or 'guest_homeSpotId'
   from Preferences. If found, dispatch SET_HOME_SPOT_ID immediately.
4. Add a watcher useEffect that saves homeSpotId to Preferences when it changes.

───────────────────────────────────────────────────────────────────────────────
## TASK D — FIX NAVIGATION PARAMS (App.tsx + Screens)
───────────────────────────────────────────────────────────────────────────────

### The problem
navigate() only accepts (screen). HomeScreen can't pass spot context to
SpotDetailScreen.

### The fix
1. In App.tsx, update navigate:
   ```ts
   const navigate = useCallback((screen: Screen, params?: any) => {
     if (params?.spot) setSelectedSpot(params.spot);
     if (params?.session) setSelectedSession(params.session);
     setCurrentScreen(screen);
   }, []);
   ```
2. In HomeScreen.tsx, update SpotDetail navigate calls:
   ```ts
   // Find where a spot is clicked
   onNavigate(Screen.SPOT_DETAIL, { spot: ndata });
   ```
3. Update ALL navigate calls to pass the relevant data object, not just the ID.
4. In App.tsx renderScreen(), ensure SpotDetailScreen correctly receives
   selectedSpot, and SessionDetailScreen receives selectedSession.
```
