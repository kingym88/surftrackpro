# SURFTRACK PRO — COMPLETION & GAP-FILL PROMPT

You are a senior full-stack developer continuing work on an existing React + Vite + TypeScript + Firebase app.
The repository is at: https://github.com/kingym88/surftrackpro

Your task is to audit the existing codebase against the original specification and build EVERY missing piece.
Do NOT re-do what already works. Do NOT break existing functionality.
Read every referenced file carefully before modifying it.

---

# STEP 0 — READ THE CODEBASE FIRST

Before writing a single line, read and internalise these files in full:

- `types.ts` (root)
- `App.tsx` (root)
- `components/Navigation.tsx`
- `src/context/AuthContext.tsx`
- `src/context/AppContext.tsx`
- `src/context/ThemeContext.tsx`
- `src/context/ToastContext.tsx`
- `src/services/auth.ts`
- `src/services/firestore.ts`
- `src/services/openMeteo.ts`
- `src/services/tides.ts`
- `src/services/swellQuality.ts`
- `src/services/geminiInsight.ts`
- `src/data/guestDummyData.ts`
- `src/data/portugalSpots.ts`
- `src/components/GuestGate.tsx`
- `src/components/GuestBanner.tsx`
- `src/components/ForecastStrip.tsx`
- `src/components/TideMiniChart.tsx`
- `src/components/Skeletons.tsx`
- `screens/HomeScreen.tsx`
- `screens/SpotDetailScreen.tsx`
- `screens/SpotListScreen.tsx`
- `screens/LogSessionScreen.tsx`
- `screens/SessionDetailScreen.tsx`
- `screens/SkillProgressionScreen.tsx`
- `screens/ProfileScreen.tsx`
- `screens/QuiverScreen.tsx`
- `src/screens/SignUpScreen.tsx`
- `src/screens/SignInScreen.tsx`
- `src/screens/ForgotPasswordScreen.tsx`
- `vite.config.ts`
- `capacitor.config.ts`

Do not assume anything about their contents. Read them fully, then proceed.

---

# PART 1 — CREATE MISSING FILE: `src/services/fcm.ts`

This file is completely absent. Create it in full.

Requirements:
- `requestPushPermission()` — wraps `@capacitor/push-notifications` with a `Capacitor.isNativePlatform()` check; falls back gracefully on web.
- `registerFCMToken(uid: string, token: string)` — saves the FCM token to `users/{uid}/fcmTokens` subcollection in Firestore.
- `setupPushListeners()` — listens for foreground push events from `@capacitor/push-notifications` and routes them to the toast system via `useToast()` from `src/context/ToastContext.tsx`.

All three functions must be exported. Every function must handle errors explicitly with try/catch. Follow the pattern established in `src/services/auth.ts`.

---

# PART 2 — CHECK AND COMPLETE `src/services/auth.ts`

Open `src/services/auth.ts`. Check whether `migrateGuestDataToAccount(uid: string)` is implemented.

If it is absent or incomplete, implement it in full:
- Read any temp sessions stored via `@capacitor/preferences` under the key `"guest_sessions"`.
- Read any temp boards stored under the key `"guest_boards"`.
- If either exists, batch-write them to Firestore under `users/{uid}/sessions` and `users/{uid}/quiver` using the functions from `src/services/firestore.ts`.
- After successful write, clear the preferences keys using `Preferences.remove()`.
- Show a toast: `"Your data has been saved to your new account"`.
- Call this function from `signUpWithEmail()` after the Firestore user doc is created.

---

# PART 3 — CHECK AND COMPLETE `src/services/firestore.ts`

Open `src/services/firestore.ts`. Verify the following functions exist with the correct signatures. Add any that are missing:

```ts
getPrecomputedForecast(spotId: string): Promise<{ data: ForecastSnapshot[]; runAt: Timestamp } | null>
setPrecomputedForecast(spotId: string, data: ForecastSnapshot[], runAt: Timestamp, validTo: Timestamp): Promise<void>
getNearestSpots(baseSpotId: string, limit?: number): Promise<SurfSpot[]>
```

For `getNearestSpots`: implement haversine distance between the baseSpotId's lat/lon (from `src/data/portugalSpots.ts`) and all other spots. Sort ascending by distance. Exclude the baseSpotId itself. Return the top `limit` (default 5) results.

---

# PART 4 — CHECK AND COMPLETE `src/context/AppContext.tsx`

Open `src/context/AppContext.tsx`. Verify:

1. `AppContextType` includes all of the following fields. Add any that are missing:
   - `spots: SurfSpot[]`
   - `sessions: SessionLog[]`
   - `quiver: Board[]`
   - `forecasts: Record<string, ForecastSnapshot[]>`
   - `tides: Record<string, TidePoint[]>`
   - `qualityScores: Record<string, SwellQualityScore[]>`
   - `geminiInsights: Record<string, GeminiInsight>`
   - `isLoadingForecast: boolean`
   - `forecastError: string | null`
   - `homeSpotId: string | null`
   - `preferredWaveHeight: { min: number; max: number } | null`

2. Context actions include: `addSession`, `addBoard`, `setForecast`, `setTides`, `setQualityScore`, `setGeminiInsight`, `setHomeSpotId`, `setPreferredWaveHeight`. Add any that are missing.

3. On app load, the context initialises by calling `Geolocation` (with `Capacitor.isNativePlatform()` guard) and fetches forecasts for the user's `homeSpotId` and the 5 nearest spots. If the user is a guest, serve from `src/data/guestDummyData.ts` and do NOT call any APIs.

4. Sessions and quiver must be persisted via `@capacitor/preferences` (NOT `localStorage`).

5. When `homeSpotId` is set, immediately compute the 5 nearest spots using the haversine function and store them in state.

---

# PART 5 — COMPLETE `src/styles/theme.ts`

Check whether `src/styles/theme.ts` exists with full content. If it is absent or empty, create it:

- Define a Tailwind-compatible token map covering: background, surface, card, primary text, muted text, border, accent (cyan), success (emerald), warning (amber), error (red).
- Map each token to both dark and light Tailwind class variants.
- Export a `themeClasses` object that every screen can import.
- Example pattern:

```ts
export const themeClasses = {
  background: 'bg-slate-900 dark:bg-slate-900 bg-slate-50',
  surface: 'bg-slate-800 dark:bg-slate-800 bg-white',
  cardBg: 'bg-slate-800/80 dark:bg-slate-800/80 bg-slate-100',
  textPrimary: 'text-white dark:text-white text-slate-900',
  textMuted: 'text-slate-400 dark:text-slate-400 text-slate-500',
  border: 'border-slate-700 dark:border-slate-700 border-slate-200',
  accent: 'bg-cyan-500',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  error: 'text-red-400',
} as const;
```

---

# PART 6 — COMPLETE `screens/HomeScreen.tsx`

Open `screens/HomeScreen.tsx`. The screen likely renders static/mock data. You must wire it to live services. Make ONLY the changes listed below — do not rewrite the entire file.

## 6.1 — "Set Your Home Break" Section

At the TOP of the screen content (before the hero card), add this section — show it ONLY when `homeSpotId` is null:
- Heading: `"Set Your Home Break"` in `text-lg font-bold text-white`.
- A search/dropdown input filtered from `src/data/portugalSpots.ts`.
- On selection: call `setHomeSpotId(selectedSpotId)` from AppContext. For guest users: store the selection in state locally and in `@capacitor/preferences` under `"guest_homeSpotId"`. For logged-in users: also call `updateUserProfile(uid, { homeSpotId: selectedSpotId })`.
- A `"Choose a different spot"` secondary button that re-shows the search input.

## 6.2 — Hero Forecast Card (Live Data)

Replace any mock/static forecast values with real data:
- On mount, if `forecasts[homeSpotId]` in AppContext is populated, use it. If empty, call `fetchOpenMeteoForecast(lat, lon)` for the homeSpot's coordinates.
- Show `animate-pulse` Tailwind skeleton placeholders (from `src/components/Skeletons.tsx`) while `isLoadingForecast` is true.
- Show a `"Data may be outdated — tap to retry"` amber error banner (`className="bg-amber-900/40 rounded-lg p-2 text-amber-300 text-xs"`) if `forecastError` is set.
- Display: `waveHeight`, `wavePeriod`, `windSpeed`, `windDirection` (with "offshore"/"onshore" label computed against the spot's `SpotBreakProfile.optimalWindDirection`), and the `SwellQualityScore.label` from `computeSwellQuality()`.
- **GUEST GATE**: wrap everything beyond today + tomorrow with `<GuestGate featureName="Unlock 7-day forecast">`.

## 6.3 — ForecastStrip Integration

Check if `<ForecastStrip>` is already rendered. If so, confirm it receives real `ForecastSnapshot[]` from `AppContext.forecasts[homeSpotId]` — not mock data.
If ForecastStrip is not rendered, add it below the Hero Forecast Card:

```tsx
<ForecastStrip
  forecasts={forecasts[homeSpotId] ?? []}
  onDayTap={(day) => navigate(Screen.SPOT_DETAIL, { spotId: homeSpotId, day })}
/>
```

Wrap days 3–7 in `<GuestGate featureName="Unlock full 7-day forecast">`.

## 6.4 — AI Match Insight Card (Live Gemini)

Find the AI Match Insight card. Replace any static/mock AI text with a real call to `getGeminiInsight()`:
- Show Material Icon `sync` with `animate-spin` while loading.
- Display `insight.bestWindows[0]` as the primary recommendation.
- Display `insight.summary` as the card body.
- Show `"Powered by Gemini"` in `text-xs text-slate-500` at the card footer.
- Wrap the ENTIRE card in `<GuestGate featureName="AI Surf Insight">`.

## 6.5 — TideMiniChart Integration

Confirm `<TideMiniChart>` is rendered with real `TidePoint[]` from `AppContext.tides[homeSpotId]`. If not, add it:

```tsx
<TideMiniChart tides={tides[homeSpotId] ?? []} guestMode={isGuest} />
```

`TideMiniChart` should internally show only today's tides when `guestMode` is true, and 48h when false.

## 6.6 — Nearby Spots List (Live Quality Scoring)

Find the Nearby Spots list. For each spot, compute its condition badge dynamically:

```tsx
const score = computeSwellQuality(forecasts[spot.id]?.[0], spot.breakProfile);
```

Replace any static `condition` field with `score.label`.
When the user is logged in and `homeSpotId` is set, ensure the list shows the 5 nearest spots computed by the haversine logic.

---

# PART 7 — COMPLETE `screens/SpotDetailScreen.tsx`

Open `screens/SpotDetailScreen.tsx`. Make the following additions and changes:

## 7.1 — Precomputed Forecast Loading Strategy

On mount, before calling `fetchOpenMeteoForecast()`, check Firestore first:

```ts
const cached = await getPrecomputedForecast(spotId);
if (cached && differenceInHours(new Date(), cached.runAt.toDate()) < 12) {
  setLocalForecasts(cached.data);
} else {
  const live = await fetchOpenMeteoForecast(spot.latitude, spot.longitude);
  setLocalForecasts(live);
}
```

Show the amber stale-data banner if falling back to a cached result older than 12h.

## 7.2 — Swell Quality Score Card

Confirm this card exists. If it is absent or shows mock data:
- Compute it via `computeSwellQuality(forecasts[0], spot.breakProfile)`.
- Show: large colour-coded label, confidence indicator (if `LOW` → amber `"uncertain — models disagree"`), bullet list of `reasons[]`.
- **GUEST GATE**: wrap everything beyond today's score in `<GuestGate featureName="Full swell quality analysis">`.

## 7.3 — Hourly Forecast Table

Confirm the table renders real `ForecastSnapshot[]` data. Columns must be: Time | Wave Ht | Period | Swell Dir | Wind | Gust | Quality badge.
- Use `text-xs` font, sticky header row, `overflow-y-auto max-h-96`.
- Highlight the current-time row with `bg-slate-700`.
- **GUEST GATE**: wrap rows beyond 24h in `<GuestGate featureName="Full hourly forecast">`.

## 7.4 — 7-Day Recharts Chart

Confirm a Recharts `ComposedChart` exists with:
- `Bar` for wave height on left Y-axis (in ft).
- `Line` for swell period on right Y-axis (in seconds).
- X-axis: day labels.
- Custom tooltip showing all parameters.

If absent, add it. **GUEST GATE**: wrap the entire chart in `<GuestGate featureName="7-day forecast chart">`.

## 7.5 — Multi-Model Confidence Panel

If this panel does not exist, add it as a new section below the Hourly Table:
- Title: `"Forecast Confidence"` in `text-sm font-semibold text-slate-300`.
- For each forecast parameter (wave height, wind speed, swell direction):
  - If GFS snapshot and Open-Meteo snapshot agree within 10%: show `check_circle` green icon.
  - If they diverge: show `warning` amber icon and the divergence value.
- If only one model's data is available, show `"Single model — confidence limited"` in amber.
- **GUEST GATE**: wrap entire panel in `<GuestGate featureName="Multi-model confidence">`.

## 7.6 — Best Session Windows

If the Gemini-powered Best Session Windows section does not exist, add it:
- Call `getGeminiInsight(forecasts, spot.breakProfile, userSessions, preferredWaveHeight)`.
- Render `bestWindows[]` as 3 cards with: time window, reason string, quality badge.
- Show `sync` spinner (`animate-spin`) while loading.
- **GUEST GATE**: wrap the entire section in `<GuestGate featureName="AI Best Session Windows">`.

---

# PART 8 — COMPLETE `screens/SessionDetailScreen.tsx`

Open `screens/SessionDetailScreen.tsx`. Add the following sections if absent:

## 8.1 — Conditions Replay Section

Below the session stats, add a `"Conditions at Session Time"` card:
- Load the `ForecastSnapshot` nearest to the session's `date` from `AppContext.forecasts[session.spotName]` or fetch via `fetchOpenMeteoForecast` if not available.
- Display: forecast wave height vs logged wave height with a delta indicator (`+0.3m` or `-0.2m`).
- Display: forecast wind speed, swell direction, period.
- Use a subtle amber or green delta colour (green if forecast was accurate ±0.2m, amber otherwise).

## 8.2 — AI Post-Session Analysis

Below Session Notes, add an `"AI Coach"` card:
- Call `getGeminiInsight([forecastAtSessionTime], session.spotBreakProfile ?? defaultBreakProfile, [session], preferredWaveHeight)`.
- Display the `summary` string (2–3 sentences max).
- Prefix with Material Icon `smart_toy` and `"AI Coach:"` label.
- Show `sync` spinner while loading.
- **GUEST GATE**: wrap the entire card in `<GuestGate featureName="AI Post-Session Coaching">`.

---

# PART 9 — COMPLETE `screens/SkillProgressionScreen.tsx`

Open `screens/SkillProgressionScreen.tsx`. Make the following changes:

## 9.1 — Real Data Wiring

Replace any mock maneuver data with computed values derived from `AppContext.sessions`:
- Group sessions by spot and date.
- Compute a rolling score (0–100) based on session rating, wave height, and frequency.
- Sort sessions by date ascending.

## 9.2 — Recharts LineChart (Skill Over Time)

If a `LineChart` is not present, add it:

```tsx
<LineChart data={skillOverTime} width="100%" height={200}>
  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
  <Tooltip />
  <Line type="monotone" dataKey="score" stroke="#06b6d4" strokeWidth={2} dot={false} />
</LineChart>
```

Where `skillOverTime` is `Array<{ date: string; score: number }>` derived from sessions.

## 9.3 — Gemini Coach Analysis

Replace any mock text in the `"Coach's Analysis"` card with a real call to `getGeminiInsight(forecasts[homeSpotId], homeSpot.breakProfile, sessions, preferredWaveHeight)`.
Display `insight.summary`.

## 9.4 — GuestGate

Wrap the ENTIRE screen content in `<GuestGate featureName="Your skill progression tracking starts when you create an account">` when `isGuest` is true.

---

# PART 10 — COMPLETE `screens/LogSessionScreen.tsx`

Open `screens/LogSessionScreen.tsx`. Verify and complete the following:

## 10.1 — GuestGate

The ENTIRE screen should be replaced by a full-screen `<GuestGate>` when `isGuest` is true. Confirm this is implemented. If not, add at the TOP of the return:

```tsx
if (isGuest) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <GuestGate featureName="Log your surf sessions">
        <div className="h-64 w-full" />
      </GuestGate>
    </div>
  );
}
```

## 10.2 — Board Selector

Step 2 must include a board selector dropdown populated from `AppContext.quiver`. If the selector is absent or hardcoded:
- Use a `<select>` element styled with `className="w-full bg-slate-800 text-white rounded-xl p-3 border border-slate-700"`.
- Options: each board's `brand + ' ' + model + ' ' + volume + 'L'`.
- Value: `board.id`.

## 10.3 — Firestore Save

On Step 4 Save, call `addSession(uid, session)` from `src/services/firestore.ts`. Also call `AppContext.addSession(session)` to update local state. Then navigate to `Screen.SESSION_DETAIL`.

## 10.4 — Auto-fill Forecast Conditions

In Step 1, after spot selection: attempt to auto-fill `waveHeight` and `wavePeriod` from `AppContext.forecasts[selectedSpotId]?.[0]`. Show them as pre-filled but editable fields.

---

# PART 11 — COMPLETE `screens/ProfileScreen.tsx`

Open `screens/ProfileScreen.tsx`. Add the following if absent:

## 11.1 — Guest Mode Partial View

When `isGuest` is true:
- Show a placeholder avatar icon (`account_circle`, `text-7xl text-slate-500`).
- Show `"Create your profile"` CTA button navigating to `Screen.SIGN_UP`.
- All stats (sessions, waves logged, spots visited) must show `"--"` strings.

## 11.2 — Theme Toggle

Find the settings section. If a theme toggle is absent, add it:
- A row labelled `"Dark Mode"` with a toggle switch.
- Wire it to `ThemeContext.toggleTheme()`.
- Show current theme icon: `dark_mode` or `light_mode` Material Icon.

## 11.3 — Sign Out Button

Confirm there is a Sign Out button that calls `AuthContext.signOut()`. If absent, add it at the bottom of the profile screen.

---

# PART 12 — COMPLETE `screens/QuiverScreen.tsx`

Open `screens/QuiverScreen.tsx`. Add the following if absent:

## 12.1 — Guest Mode Dummy Board

When `isGuest` is true:
- Show exactly 1 board card pre-filled from `src/data/guestDummyData.ts` `dummyBoard`.
- Apply a `blur-sm opacity-60` overlay on the board card.

## 12.2 — Add Board GuestGate

The "Add Board" button (or FAB) must be wrapped in `<GuestGate featureName="Add boards to your quiver">` when `isGuest` is true.

---

# PART 13 — COMPLETE `vite.config.ts`

Open `vite.config.ts`. Verify that `vite-plugin-pwa` is configured. If it is absent, add it:

```ts
import { VitePWA } from 'vite-plugin-pwa';

VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'SurfTrack Pro',
    short_name: 'SurfTrack',
    theme_color: '#0f172a',
    background_color: '#0f172a',
    display: 'standalone',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
})
```

Also confirm `build.outDir` is set to `'dist'` (for Capacitor alignment). If not, add it.

---

# PART 14 — COMPLETE `App.tsx`

Open `App.tsx`. Verify the following and fix anything missing:

1. The provider wrapping order is: `ThemeContext > AuthContext > AppContext > ToastContext > App content`. Correct the order if wrong.
2. `GuestBanner` (`src/components/GuestBanner.tsx`) is rendered inside the App shell, ABOVE `Navigation` (`components/Navigation.tsx`) and BELOW the screen content area.
3. Navigation routes to ALL screens including `Screen.SIGN_UP`, `Screen.SIGN_IN`, `Screen.FORGOT_PASSWORD`. If any of these are missing from the screen router, add them pointing to `src/screens/SignUpScreen.tsx`, `src/screens/SignInScreen.tsx`, `src/screens/ForgotPasswordScreen.tsx`.
4. During `AuthContext.isLoadingAuth === true`, show a full-screen splash: `bg-slate-900 h-screen w-screen flex items-center justify-center` with an animated `waves` Material Icon in `text-5xl text-cyan-500 animate-pulse`.

---

# PART 15 — COMPLETE `types.ts`

Open `types.ts`. Confirm ALL of the following interfaces exist. Add any that are missing:

```ts
export interface ForecastSnapshot {
  modelName: string; runTime: string; forecastHour: string;
  waveHeight: number; wavePeriod: number; swellDirection: number;
  swellHeight: number; windSpeed: number; windDirection: number;
  windGust: number; airTemp: number; precipitation: number;
  cloudCover: number; pressure: number;
}

export interface TidePoint {
  time: string;
  height: number;
  type: 'HIGH' | 'LOW' | null;
}

export interface SpotBreakProfile {
  breakType: 'beach' | 'reef' | 'point';
  facingDirection: string;
  optimalSwellDirection: string;
  optimalTidePhase: 'low' | 'mid' | 'high' | 'any';
  optimalWindDirection: string;
}

export interface SwellQualityScore {
  spotId: string;
  forecastHour: string;
  score: number;
  label: 'EPIC' | 'GOOD' | 'FAIR' | 'POOR';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasons: string[];
}

export interface GeminiInsight {
  bestWindows: Array<{ startTime: string; endTime: string; reason: string }>;
  summary: string;
}

export interface Board {
  id: string;
  brand: string;
  model: string;
  volume: number;
  boardType: string;
  photoUrl?: string;
}
```

Also confirm the `Screen` enum includes: `SIGN_UP`, `SIGN_IN`, `FORGOT_PASSWORD`. Add them if missing.

---

# PART 16 — PRECOMPUTED FORECAST SCRIPT

Create a new file: `scripts/precomputeForecasts.ts`

This is a standalone Node.js script (not a Cloud Function for now — it runs locally or in CI).

```ts
// scripts/precomputeForecasts.ts
// Run with: npx ts-node scripts/precomputeForecasts.ts

import { portugalSpots } from '../src/data/portugalSpots';
import { fetchOpenMeteoForecast } from '../src/services/openMeteo';
import { setPrecomputedForecast } from '../src/services/firestore';
import { Timestamp } from 'firebase/firestore';

async function run() {
  const BATCH_SIZE = 5;
  const DELAY_MS = 1000; // respect Open-Meteo free tier

  for (let i = 0; i < portugalSpots.length; i += BATCH_SIZE) {
    const batch = portugalSpots.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (spot) => {
        try {
          const data = await fetchOpenMeteoForecast(spot.latitude, spot.longitude);
          const runAt = Timestamp.now();
          const validTo = Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000);
          await setPrecomputedForecast(spot.id, data, runAt, validTo);
          console.log(`✅ ${spot.name}`);
        } catch (e) {
          console.error(`❌ ${spot.name}:`, e);
        }
      })
    );
    if (i + BATCH_SIZE < portugalSpots.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }
  console.log('Done. All Portugal spots precomputed.');
}

run();
```

Add to `package.json` scripts:

```json
"precompute": "npx ts-node scripts/precomputeForecasts.ts"
```

---

# OUTPUT REQUIREMENTS

For each of the 16 parts above, produce:

1. **Exact file path** of the file being created or modified.
2. If MODIFYING an existing file: state the exact existing code block you are finding and replacing, followed by the new code.
   Format: `"In [filename], find: [existing code], replace with: [new code]."`
3. If CREATING a new file: provide the COMPLETE file content as a fenced TypeScript/TSX code block.
4. Flag any uncertain items as `[NEEDS VERIFICATION]` with a suggested resolution.

Do NOT produce summaries. Do NOT produce pseudocode. Every output must be complete, runnable code.

Process the parts in order: **15 → 1 → 2 → 3 → 4 → 5 → 14 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 16.**
(types.ts and App.tsx first, then services, then screens.)
