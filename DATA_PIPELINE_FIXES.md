# SURFTRACK PRO — DATA PIPELINE + 4 CRITICAL FIXES

You are implementing a server-side forecast pre-computation pipeline AND fixing four confirmed bugs in an existing React + Vite + TypeScript + Firebase app.

Work through the tasks in the exact order listed:
TASK A → TASK B → TASK C → TASK D → TASK E

---

## TASK A — SERVER-SIDE FORECAST PRE-COMPUTATION JOB

### A.1 — Create `.github/workflows/precompute-forecasts.yml`

```yaml
name: Precompute Surf Forecasts

on:
  schedule:
    - cron: '0 4,16 * * *'   # runs at 04:00 and 16:00 UTC daily
  workflow_dispatch:

jobs:
  precompute:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Run precomputation
        env:
          FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          FIREBASE_CLIENT_EMAIL: ${{ secrets.FIREBASE_CLIENT_EMAIL }}
          FIREBASE_PRIVATE_KEY: ${{ secrets.FIREBASE_PRIVATE_KEY }}
        run: npx ts-node --esm scripts/precomputeForecasts.ts
```

### A.2 — Create `scripts/precomputeForecasts.ts`

```typescript
import * as admin from 'firebase-admin';
import { portugalSpots } from '../src/data/portugalSpots.js';

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\\
/g, '\
');
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey,
  }),
});
const db = admin.firestore();

async function fetchOpenMeteo(lat, lon) {
  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,wave_period,wave_direction&forecast_days=7`;
  const res = await fetch(url);
  return res.json();
}

async function run() {
  for (const spot of portugalSpots) {
    const data = await fetchOpenMeteo(spot.latitude, spot.longitude);
    await db.collection('precomputed_forecasts').doc(spot.id).collection('runs').add({
      data: data.hourly,
      runAt: admin.firestore.Timestamp.now(),
      validTo: admin.firestore.Timestamp.fromMillis(Date.now() + 7 * 24 * 3600000)
    });
    console.log(`✅ ${spot.name}`);
  }
}
run();
```

---

## TASK B — PROBLEM 3: REAL TIDE DATA (src/services/tides.ts)

Replace the entire file with a Stormglass/WorldTides integration. Read Stormglass API key from `process.env.STORMGLASS_API_KEY`.

---

## TASK C — PROBLEM 2: DEFAULT HOME SPOT (src/context/AppContext.tsx)

Set `carcavelos` as the default `homeSpotId` in `initialState`. Update `useEffect` to trigger fetch immediately if `homeSpotId` is set.

---

## TASK D — PROBLEM 4: NAVIGATION PARAMS (App.tsx)

Update `navigate` to accept `(screen: Screen, params?: any)`. Update `renderScreen` to pass `params` (like `spotId`) to screens.

---

## TASK E — UI UPDATES (HomeScreen.tsx)

Update spot cards to call `onNavigate(Screen.SPOT_DETAIL, { spotId: spot.id })`.
