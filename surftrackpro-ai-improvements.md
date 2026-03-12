# SurfTrackPro — AI Improvement Agent Prompts

> Work through each prompt in order. Each is self-contained with full context.
> Complete and test one fully before moving to the next.

---

## PROMPT 1 — Security & Architecture: Move Gemini to a Firebase Cloud Function

### Context
The app currently calls the Gemini API directly from the client in `src/services/geminiInsight.ts`. The API key is exposed as `VITE_GEMINI_API_KEY` (a Vite env variable), which means it is bundled into the client-side JavaScript and visible to anyone who inspects the network tab or the compiled output. This is a critical security vulnerability.

The caching layer in `src/utils/geminiCache.ts` also uses `localStorage`, which means every new device a signed-in user logs in from makes a fresh Gemini API call even if the same insight was already generated today.

### Goal
Move all Gemini API calls server-side into a Firebase Cloud Function (HTTP callable), and upgrade the cache from `localStorage` to Firestore so it is shared across devices per user.

### Files to Modify
- `src/services/geminiInsight.ts` — replace direct `fetch()` to Gemini with a call to the new Cloud Function
- `src/utils/geminiCache.ts` — replace `localStorage` get/set with Firestore reads/writes
- Create new: `functions/src/index.ts` — Firebase Cloud Function that receives the prompt payload and calls Gemini server-side

### Exact Steps

#### Step 1 — Create the Cloud Function
Create `functions/src/index.ts` (or add to existing functions if already initialised):

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

admin.initializeApp();

export const callGemini = functions.https.onCall(async (data, context) => {
  // Auth check — only signed-in users
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new functions.https.HttpsError('internal', 'Gemini API key not configured.');
  }

  const { prompt, temperature = 0.7, maxOutputTokens = 1024 } = data;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature,
          maxOutputTokens,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new functions.https.HttpsError('internal', `Gemini error: ${response.status}`);
  }

  const result = await response.json() as any;
  return { text: result?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}' };
});
```

Set the Gemini key as a Firebase secret:
```bash
firebase functions:secrets:set GEMINI_API_KEY
```

#### Step 2 — Update `src/services/geminiInsight.ts`
Replace the direct `fetch()` call to the Gemini API URL with a Firebase callable function call. Import `getFunctions` and `httpsCallable` from `firebase/functions`. Remove all references to `import.meta.env.VITE_GEMINI_API_KEY`. The `buildPrompt()` function stays unchanged — it still builds the prompt string client-side, but the prompt string is sent to the Cloud Function instead of directly to Gemini.

The function signature stays the same. Only the internal HTTP call changes:

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

// Replace the fetch block with:
const functions = getFunctions();
const callGemini = httpsCallable<{ prompt: string; temperature: number; maxOutputTokens: number }, { text: string }>(functions, 'callGemini');
const result = await callGemini({ prompt, temperature: 0.7, maxOutputTokens: 1024 });
const rawText = result.data.text;
```

Remove the `apiKey` check at the top of `getGeminiInsight` and `getSurfMatchInsights` — the Cloud Function handles authentication.

#### Step 3 — Upgrade `src/utils/geminiCache.ts` to Firestore
Replace `localStorage` with Firestore. Cache documents should live at: `users/{uid}/geminiCache/{cacheKey}` with fields `{ value: string, createdAt: Timestamp }`.

Add a TTL check: if `createdAt` is older than 24 hours, treat as a cache miss and delete the document.

Update all call sites (`SkillProgressionScreen.tsx`, `HomeScreen.tsx`, `SpotDetailScreen.tsx`, `SurfMatchScreen.tsx`) to pass the authenticated `uid` into `getGeminiCache` and `setGeminiCache`.

#### Step 4 — Remove the exposed env variable
Remove `VITE_GEMINI_API_KEY` from `.env` and from any Vite config. The API key should only exist as a Firebase secret on the server.

### Acceptance Criteria
- [ ] No Gemini API key exists in client-side code or Vite env variables
- [ ] Gemini calls work when signed in and return a `functions.https.HttpsError('unauthenticated')` when not signed in
- [ ] The Firestore cache is written after a successful call and read on subsequent loads
- [ ] `HomeScreen`, `SpotDetailScreen`, `SurfMatchScreen`, and `SkillProgressionScreen` all still receive AI insights correctly
- [ ] `getFallbackInsight()` is still returned if the Cloud Function throws

---

## PROMPT 2 — Prompt Intelligence: Richer Context in Gemini Prompts

### Context
The main Gemini prompt in `src/services/geminiInsight.ts` inside `buildPrompt()` sends basic session history (5 sessions, with rating/energy/crowd) but ignores two rich data sources that are already available:

1. **Board data** — `SessionLog` has a `boardId` field and the app has a full `Board` type with `boardType`, `volume`, `length`. This is never included in the prompt, so Gemini can't give board-matched recommendations.
2. **Trend detection** — The prompt sends raw session logs but does no pre-processing. Patterns like "5 out of 5 recent sessions at this spot rated 4+ when tide was incoming" are computable from the data and would significantly improve recommendation quality.
3. **Spot-specific context** — `SpotBreakProfile` is passed but the prompt only uses a subset of its fields. The `optimalTidePhase` and `optimalWindDirection` are in the profile but not always referenced clearly in the task instructions.

### Files to Modify
- `src/services/geminiInsight.ts` — update `buildPrompt()` and its function signature
- `src/context/AppContext.tsx` — check how `getGeminiInsight` is called; update call sites to pass board and quiver data
- Check call sites in: `screens/HomeScreen.tsx`, `screens/SpotDetailScreen.tsx`, `screens/SkillProgressionScreen.tsx`

### Types for Reference
```typescript
// From types.ts
interface Board {
  id: string;
  brand: string;
  model: string;
  length: number;    // feet
  volume: number;    // litres
  boardType: 'shortboard' | 'longboard' | 'fish' | 'funboard' | 'gun' | 'foilboard';
}

interface SessionLog {
  boardId?: string;
  conditionsSnapshot?: ConditionsSnapshot; // has tide, waveHeight, windSpeed etc.
  rating: number;
  energyLevel?: number;
  crowdFactor?: number;
  notes?: string;
}
```

### Exact Steps

#### Step 1 — Add `quiver` parameter to `buildPrompt()`
Update the `buildPrompt()` function signature to accept an optional `quiver: Board[]` parameter:

```typescript
function buildPrompt(
  forecast: ForecastSnapshot[],
  profile: SpotBreakProfile,
  history: SessionLog[],
  preferredWaveHeight: { min: number; max: number } | undefined,
  coords: { lat: number; lng: number },
  quiver?: Board[],           // ← ADD THIS
): string
```

Inside the function, resolve each session's board by matching `session.boardId` against `quiver`. Build a board summary string like:

```
BOARDS USED (recent sessions):
2024-03-10: JS Monsta Box 6'2 30L (shortboard)
2024-03-08: Firewire Seaside 7'2 48L (funboard)
```

If `quiver` is empty or `boardId` is not found, skip that session's board line. Add this block to the prompt after `RECENT SESSION HISTORY`.

Then extend the TASK instructions to include:
```
10. Consider the surfer's board choices. If they consistently use a high-volume board (>45L), avoid recommending hollow or powerful reef conditions. If they ride a shortboard (<33L), they can handle steeper and more powerful waves.
```

#### Step 2 — Add pre-computed trend analysis to the prompt
Before building the prompt string, compute the following from `history`:

```typescript
// Compute pattern: avg rating when tide was HIGH vs LOW vs MID
const tideRatings: Record<string, number[]> = {};
history.forEach(s => {
  const tideType = s.conditionsSnapshot?.tideType ?? 'UNKNOWN';
  if (!tideRatings[tideType]) tideRatings[tideType] = [];
  tideRatings[tideType].push(s.rating);
});
const tidePattern = Object.entries(tideRatings)
  .map(([tide, ratings]) => {
    const avg = (ratings.reduce((a,b) => a+b, 0) / ratings.length).toFixed(1);
    return `${tide} tide: avg rating ${avg}/5 (${ratings.length} sessions)`;
  })
  .join(', ');

// Compute: avg rating by wind direction bucket
// Compute: best avg rating wave height range
```

Add a `DETECTED PATTERNS` section to the prompt:
```
DETECTED PATTERNS (computed from session history):
- Tide correlation: ${tidePattern}
- Sessions rated 4+ always had wave height between X.Xm–X.Xm
- Surfer's recent trend: [improving / plateauing / declining] based on last 5 ratings
```

Keep this section concise — 3–5 bullet points max. If history is < 3 sessions, skip the DETECTED PATTERNS section entirely.

#### Step 3 — Strengthen `getSurfMatchInsights` prompt
In `getSurfMatchInsights`, the current prompt only uses the best (highest wave) snapshot per day. Update it to also compute:
- Whether the day's wind is offshore or onshore relative to `breakProfile.optimalWindDirection`
- Whether swell direction aligns with `breakProfile.optimalSwellDirection`

Pre-compute these before the prompt:
```typescript
const daySummaries = dates.map(date => {
  const snaps = byDate[date];
  const best = snaps.reduce((a, b) => (b.waveHeight > a.waveHeight ? b : a));
  const isOffshore = /* compare best.windDirection to breakProfile.optimalWindDirection ±30° */;
  const swellAligned = /* compare best.swellDirection to breakProfile.optimalSwellDirection ±30° */;
  return `${date}: waves ${best.waveHeight.toFixed(1)}m @ ${best.wavePeriod.toFixed(0)}s, ` +
    `wind ${best.windSpeed.toFixed(0)}km/h ${isOffshore ? '✓ offshore' : '✗ onshore'}, ` +
    `swell ${swellAligned ? '✓ aligned' : '✗ cross-swell'}`;
});
```

This gives Gemini pre-digested signal quality markers, resulting in more accurate day-by-day coaching sentences.

#### Step 4 — Update all call sites
Update `getGeminiInsight` signature to accept `quiver?: Board[]` and pass it through to `buildPrompt()`. Update call sites in `AppContext.tsx`, `HomeScreen.tsx`, `SpotDetailScreen.tsx`, and `SkillProgressionScreen.tsx` to pass `quiver` from context.

### Acceptance Criteria
- [ ] `buildPrompt()` includes a `BOARDS USED` section when board data is available
- [ ] `buildPrompt()` includes a `DETECTED PATTERNS` section when history has ≥ 3 sessions
- [ ] `getSurfMatchInsights` computes offshore/onshore and swell alignment before the prompt
- [ ] The offshore/swell alignment markers appear in the per-day prompt summary string
- [ ] All existing call sites still compile and pass their available data correctly
- [ ] Fallback behaviour is unchanged when no board or history data is available

---

## PROMPT 3 — New Feature: AI Proactive Push Notifications (Daily Swell Alerts)

### Context
FCM (Firebase Cloud Messaging) is already set up in `src/services/fcm.ts` and FCM tokens are saved to Firestore at `users/{uid}/fcmTokens/{token}`. The infrastructure exists to send push notifications but there is no server-side logic that actually triggers them.

The goal is to add a scheduled Firebase Cloud Function that runs daily, calls Gemini for each user's home spot, and if a best window is within the next 24 hours, fires a push notification via FCM.

### Files to Modify / Create
- `functions/src/index.ts` — add a new scheduled function `dailySwellAlert`
- `src/services/fcm.ts` — no changes needed (token registration already works)
- Firestore schema: read from `users/{uid}` for `homeSpotId`; read FCM tokens from `users/{uid}/fcmTokens`

### Types for Reference
```typescript
// GeminiInsight — already defined in types.ts
interface GeminiInsight {
  bestWindows: Array<{ startTime: string; endTime: string; reason: string }>;
  summary: string;
}
```

### Exact Steps

#### Step 1 — Add the scheduled Cloud Function
In `functions/src/index.ts`, add:

```typescript
import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';

export const dailySwellAlert = onSchedule('every day 06:00', async () => {
  const db = admin.firestore();
  const messaging = admin.messaging();

  // 1. Get all users who have a homeSpotId set
  const usersSnap = await db.collection('users').get();

  for (const userDoc of usersSnap.docs) {
    const userData = userDoc.data();
    const uid = userDoc.id;
    const homeSpotId = userData.homeSpotId;
    if (!homeSpotId) continue;

    // 2. Get the user's FCM tokens
    const tokensSnap = await db.collection(`users/${uid}/fcmTokens`).get();
    if (tokensSnap.empty) continue;
    const tokens = tokensSnap.docs.map(d => d.data().token as string);

    // 3. Fetch forecast for homeSpot from Firestore (pre-computed forecasts)
    // Forecasts are stored at: spots/{spotId}/forecasts (adjust path to match your actual schema)
    const forecastSnap = await db.collection(`spots/${homeSpotId}/forecasts`).limit(56).get();
    if (forecastSnap.empty) continue;
    const forecasts = forecastSnap.docs.map(d => d.data() as any);

    // 4. Build a compact prompt for Gemini — same logic as buildPrompt() but simplified
    const next24hForecasts = forecasts.filter((f: any) => {
      const fTime = new Date(f.forecastHour).getTime();
      const now = Date.now();
      return fTime >= now && fTime <= now + 24 * 60 * 60 * 1000;
    });

    if (next24hForecasts.length === 0) continue;

    // 5. Call Gemini (reuse callGemini logic from Prompt 1 — extract it into a shared helper)
    const prompt = `You are a surf coach. Based on this 24-hour forecast for a surfer's home break, 
decide if there is a genuinely good surf window today worth alerting them about. 
Only say YES if conditions are clearly above average (good swell, offshore wind, decent period).

FORECAST (next 24h):
${next24hForecasts.map((f: any) => 
  `${f.forecastHour}: ${f.waveHeight.toFixed(1)}m @ ${f.wavePeriod.toFixed(0)}s, wind ${f.windSpeed.toFixed(0)}km/h from ${f.windDirection}°`
).join('\n')}

Respond ONLY with valid JSON:
{
  "shouldAlert": true | false,
  "window": "e.g. 7am–9am",
  "message": "One short sentence (max 15 words) in surfer language describing why it's worth going out."
}`;

    // 6. Call Gemini API (server-side, using the secret key)
    const apiKey = process.env.GEMINI_API_KEY;
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.5, maxOutputTokens: 256 }
      })
    });
    const geminiData = await geminiRes.json() as any;
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

    let alertData: { shouldAlert: boolean; window: string; message: string };
    try {
      alertData = JSON.parse(rawText);
    } catch {
      continue;
    }

    if (!alertData.shouldAlert) continue;

    // 7. Send FCM push notification to all user tokens
    const notification = {
      title: `🌊 Surf Alert — ${alertData.window}`,
      body: alertData.message,
    };

    await messaging.sendEachForMulticast({
      tokens,
      notification,
      data: { spotId: homeSpotId, screen: 'SPOT_DETAIL' },
    });
  }
});
```

#### Step 2 — Extract a shared `callGeminiRaw` helper
To avoid duplicating the Gemini `fetch()` logic between the callable function and the scheduled function, extract it into a shared helper in `functions/src/geminiHelper.ts`:

```typescript
export async function callGeminiRaw(prompt: string, temperature = 0.7, maxOutputTokens = 1024): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature, maxOutputTokens },
      }),
    }
  );
  if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
  const data = await response.json() as any;
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
}
```

Import and use this in both `callGemini` (the callable) and `dailySwellAlert`.

#### Step 3 — Handle deep linking from notification tap
In the notification payload, `data: { spotId, screen: 'SPOT_DETAIL' }` is sent. In `src/services/fcm.ts`, the `pushNotificationActionPerformed` listener already exists but only logs to console. Update it to call `onNavigate` if you can pass it as a callback, or emit a custom event that `App.tsx` listens to:

```typescript
// In setupPushListeners, add a navigate callback:
export async function setupPushListeners(
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void,
  onNavigate?: (screen: string, params?: any) => void
): Promise<void> {
  // ...existing code...
  await PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
    const data = notification.notification.data;
    if (data?.screen && onNavigate) {
      onNavigate(data.screen, { spotId: data.spotId });
    }
  });
}
```

Update the call to `setupPushListeners` in `App.tsx` to pass `onNavigate`.

### Acceptance Criteria
- [ ] `dailySwellAlert` Cloud Function is deployed and scheduled for 06:00 daily
- [ ] Function only sends a notification when `shouldAlert: true` is returned by Gemini
- [ ] Notification body matches the Gemini-generated message (max 15 words)
- [ ] Notification tap navigates the user to `SpotDetailScreen` for their home spot
- [ ] Function handles users with no `homeSpotId` or no FCM tokens gracefully (skips, no crash)
- [ ] `callGeminiRaw` helper is shared between the callable and scheduled functions

---

## PROMPT 4 — New Feature: AI Session Notes Assistant & Skill Coach Upgrade

### Context
Two feature gaps exist in the current AI implementation:

**Gap 1 — Session Notes (`screens/LogSessionScreen.tsx`):** The notes field (Step 4 of the log session flow) is a plain textarea. There is no AI assistance. Adding a one-tap "Generate draft note" button that calls Gemini with the captured conditions data would increase session log quality and engagement.

**Gap 2 — Skill Coach (`screens/SkillProgressionScreen.tsx`):** The Coach's Analysis section currently calls `getGeminiInsight()` and only uses the `result.summary` field — discarding `result.bestWindows`. The analysis is a one-liner paragraph. It would be much more useful to ask Gemini a specific skill-progression question rather than reusing the general forecast insight prompt.

### Files to Modify
- `screens/LogSessionScreen.tsx` — add "Generate draft note" button in Step 4
- `src/services/geminiInsight.ts` — add a new exported function `getSessionNoteDraft()`
- `screens/SkillProgressionScreen.tsx` — replace `getGeminiInsight()` call with a new dedicated `getSkillCoachAnalysis()` function
- `src/services/geminiInsight.ts` — add `getSkillCoachAnalysis()` function

### Types for Reference
```typescript
// ConditionsSnapshot — available at session log time
interface ConditionsSnapshot {
  waveHeight: number;
  wavePeriod: number;
  windSpeed: number;
  windDirection: number;
  tide: number;
  tideType: string;
  airTemp: number;
}

// Board — from quiver
interface Board {
  brand: string;
  model: string;
  volume: number;
  boardType: string;
}
```

### Exact Steps

#### Step 1 — Add `getSessionNoteDraft()` to `geminiInsight.ts`

```typescript
export async function getSessionNoteDraft(
  conditions: ConditionsSnapshot,
  board: Board | undefined,
  rating: number,
  waveCount: number,
  durationHours: number,
  spotName: string,
): Promise<string> {
  // Re-use the Cloud Function callable from Prompt 1 (callGemini)
  const prompt = `You are helping a surfer write a quick session diary note.

SESSION FACTS:
- Spot: ${spotName}
- Rating: ${rating}/5
- Duration: ${durationHours} hours
- Wave count: ${waveCount}
- Conditions: ${conditions.waveHeight.toFixed(1)}m waves @ ${conditions.wavePeriod.toFixed(0)}s, wind ${conditions.windSpeed.toFixed(0)}km/h, tide ${conditions.tideType} (${conditions.tide.toFixed(1)}m)
${board ? `- Board: ${board.brand} ${board.model} ${board.volume}L (${board.boardType})` : ''}

Write a 2–3 sentence personal surf diary note in first person. 
Sound like a real surfer — casual, honest, descriptive. 
Reference the conditions and session stats. Do not start with "I had".
Do not add quotes around the note.

Respond ONLY with valid JSON: { "note": "your draft note here" }`;

  // Use the Cloud Function callable (or direct Gemini if Cloud Function not yet deployed)
  try {
    const functions = getFunctions();
    const callGemini = httpsCallable<any, { text: string }>(functions, 'callGemini');
    const result = await callGemini({ prompt, temperature: 0.8, maxOutputTokens: 256 });
    const parsed = JSON.parse(result.data.text);
    return parsed.note ?? '';
  } catch {
    return '';
  }
}
```

#### Step 2 — Add the button to `LogSessionScreen.tsx`
In Step 4 of the log session flow (where the notes `<textarea>` is), add a "Draft with AI ✨" button directly below the textarea label. The button should:
- Be disabled if `matchedForecast` is null or `selectedBoardId` is empty
- Show a loading spinner while the draft is being generated
- On success, `setNotes(draft)` to populate the textarea (user can still edit it)
- Show a small toast "Draft generated — feel free to edit" on success

Add state: `const [isDraftingNote, setIsDraftingNote] = useState(false);`

The button should look like:
```tsx
<button
  onClick={async () => {
    if (!matchedForecast || isDraftingNote) return;
    setIsDraftingNote(true);
    const board = quiver.find(b => b.id === selectedBoardId);
    const snapshot = matchedForecast ? buildConditionsSnapshot(matchedForecast, matchedTide, sessionDatetime) : null;
    if (snapshot) {
      const draft = await getSessionNoteDraft(snapshot, board, rating, waveCount, durationHours, selectedSpot?.name ?? '');
      if (draft) setNotes(draft);
      addToast('Draft generated — feel free to edit ✏️', 'success');
    }
    setIsDraftingNote(false);
  }}
  disabled={!matchedForecast || isDraftingNote || !selectedBoardId}
  className="flex items-center gap-2 text-xs font-bold text-primary border border-primary/30 px-3 py-1.5 rounded-full hover:bg-primary/10 transition-colors disabled:opacity-40"
>
  {isDraftingNote
    ? <span className="material-icons-round animate-spin text-sm">sync</span>
    : <span className="material-icons-round text-sm">auto_awesome</span>
  }
  {isDraftingNote ? 'Drafting...' : 'Draft with AI ✨'}
</button>
```

Place this button in the "Personal Notes" section header row, aligned right.

#### Step 3 — Add `getSkillCoachAnalysis()` to `geminiInsight.ts`

```typescript
export async function getSkillCoachAnalysis(
  sessions: SessionLog[],
  quiver: Board[],
  homeSpotName: string,
  timeframe: '30' | '90' | 'ALL',
): Promise<string> {
  if (sessions.length < 3) return '';

  const recentSessions = sessions.slice(0, 10);
  const sessionSummary = recentSessions.map(s => {
    const board = quiver.find(b => b.id === s.boardId);
    return `${s.date.slice(0, 10)}: ${s.spotName}, waves ~${s.height}m, ` +
      `rated ${s.rating}/5, energy ${s.energyLevel ?? 'N/A'}/5, waves caught: ${s.waveCount ?? 'N/A'}` +
      `${board ? `, board: ${board.brand} ${board.model} ${board.volume}L` : ''}` +
      `${s.notes ? `, note: "${s.notes.slice(0, 60)}"` : ''}`;
  }).join('\n');

  const trend = (() => {
    const ratings = recentSessions.map(s => s.rating);
    const first = ratings.slice(-3).reduce((a,b) => a+b, 0) / 3;
    const last = ratings.slice(0, 3).reduce((a,b) => a+b, 0) / 3;
    if (last > first + 0.4) return 'improving';
    if (last < first - 0.4) return 'declining';
    return 'consistent';
  })();

  const prompt = `You are an expert surf coach reviewing a surfer's progression log.

HOME BREAK: ${homeSpotName}
TIMEFRAME: Last ${timeframe === 'ALL' ? 'all time' : timeframe + ' days'}
RECENT SESSIONS (most recent first):
${sessionSummary}

COMPUTED TREND: ${trend}

Give a 3–4 sentence coaching analysis. Be specific — reference actual session data (dates, wave heights, boards used). 
Identify one clear strength and one actionable area to improve. End with a motivating but realistic next goal.
Use plain surfer language — honest, direct, not patronising.

Respond ONLY with valid JSON: { "analysis": "your coaching analysis here" }`;

  try {
    const functions = getFunctions();
    const callGemini = httpsCallable<any, { text: string }>(functions, 'callGemini');
    const result = await callGemini({ prompt, temperature: 0.7, maxOutputTokens: 512 });
    const parsed = JSON.parse(result.data.text);
    return parsed.analysis ?? '';
  } catch {
    return '';
  }
}
```

#### Step 4 — Update `SkillProgressionScreen.tsx`
Replace the current `getGeminiInsight()` call in the `getCoaching` effect with `getSkillCoachAnalysis()`. Pass `filteredSessions`, `quiver` (from `useApp()`), `homeSpot?.name ?? ''`, and `timeframe`.

Update the cache key — the `buildCoachCacheKey` function in `geminiCache.ts` already handles this correctly.

Update the Coach's Analysis section heading from "Coach's Analysis" to "Progression Coaching" and the sub-label from "Gemini Powered" to "AI Coach · Gemini" to reflect that this is now a dedicated skill analysis, not a forecast summary.

### Acceptance Criteria
- [ ] "Draft with AI ✨" button appears in Step 4 of `LogSessionScreen`
- [ ] Button is disabled when no forecast data or no board is selected
- [ ] Clicking the button populates the notes textarea with a Gemini-generated draft
- [ ] The user can freely edit the draft after it's generated
- [ ] `SkillProgressionScreen` now calls `getSkillCoachAnalysis()` instead of `getGeminiInsight()`
- [ ] The skill coach prompt references specific session data (dates, boards, ratings) in its output
- [ ] Caching behaviour is unchanged — the Firestore/localStorage cache key still works correctly
- [ ] All new functions handle errors gracefully and return empty strings on failure (no crashes)

---

## Summary

This document contains **4 agent prompts** across 4 focused areas:

| Prompt | Focus | Key Files |
|---|---|---|
| **1** | Security — move Gemini to Cloud Function, Firestore cache | `geminiInsight.ts`, `geminiCache.ts`, new `functions/src/index.ts` |
| **2** | Prompt intelligence — board context, trend detection, swell alignment | `geminiInsight.ts`, `buildPrompt()`, all call sites |
| **3** | New feature — daily proactive swell push alerts via FCM | `functions/src/index.ts`, `fcm.ts`, `App.tsx` |
| **4** | New features — AI session note drafting + dedicated skill coach | `LogSessionScreen.tsx`, `SkillProgressionScreen.tsx`, `geminiInsight.ts` |

**Recommended order**: Complete Prompt 1 first, as it changes the underlying call architecture that Prompts 2, 3, and 4 all build on top of.