# SURFTRACK PRO — QA AUDIT PROMPT

## Real-User Walkthrough, Dead-Link Detection & Data Validation Pass

You are a senior QA engineer AND full-stack developer auditing the SurfTrack Pro app.
Your job is to simulate a real human user walking through every screen and user flow, identify every broken link, dead-end, empty state, missing data, and navigation failure — then fix each one immediately before moving to the next.

---

## CRITICAL: READ THESE FILES FIRST

Before you begin the audit, read and fully understand these files, along with every other files in the repository:

- `App.tsx` — understand the screen router, how `navigate(screen)` works, how `selectedSpot` and `selectedSession` are passed via parent state
- `types.ts` — all interfaces and the Screen enum
- `components/Navigation.tsx` — which tabs map to which screens
- `src/context/AuthContext.tsx` — `isGuest`, `isLoggedIn`, `isLoadingAuth`
- `src/context/AppContext.tsx` — all state fields and actions
- `src/context/ToastContext.tsx` — how toasts are triggered

---

## HOW TO AUDIT

For every screen and every interactive element, ask yourself:

1. **Does tapping/clicking this actually do something?** If a button, link, or card has an `onClick` but it either does nothing, navigates to a broken screen, or causes a crash — fix it.
2. **Is real data showing, or is it hardcoded/mock/undefined?** If a value shows `undefined`, `null`, `NaN`, `--` when it shouldn’t, or is clearly a placeholder string — fix it.
3. **Does the loading state work?** Every data-fetching action must show a skeleton or spinner while waiting. If the screen flashes empty content before data loads — fix it.
4. **Does the error state work?** Every data-fetching action must show a clear error message with a retry button if the fetch fails. If there is no error handling — add it.
5. **Does the back button work?** Every screen that has a back arrow must return the user to the correct previous screen.
6. **Is the GuestGate enforced?** Every locked feature must be blurred/hidden for guest users. If a guest can access a locked screen without being prompted to sign up — fix it.

---

## AUDIT PASS 1: GUEST USER JOURNEY

Simulate opening the app for the first time as a guest (not logged in). `isGuest = true`, `isLoggedIn = false`.

### Step G1 — App Launch

- [ ] App opens to `HomeScreen`.
- [ ] `AuthLoadingSplash` (animated `waves` icon) shows during `isLoadingAuth`, then disappears.
- [ ] `GuestBanner` is visible above the Navigation bar. It shows `"Join to unlock full forecasts"` and a `"Sign Up Free"` button.
- [ ] **FIX if:** `GuestBanner` is not rendered, is rendered behind the nav bar, or the `"Sign Up Free"` button does nothing.
- [ ] **FIX if:** The app crashes or shows a blank white screen on launch.

### Step G2 — HomeScreen (Guest)

- [ ] A `"Set Your Home Break"` section is visible at the top, prompting spot selection.
- [ ] The spot search/dropdown is populated with real entries from `src/data/portugalSpots.ts` — not empty.
- [ ] Selecting a spot saves the choice to `@capacitor/preferences` and updates the hero card.
- [ ] **Hero card** shows dummy forecast data from `src/data/guestDummyData.ts`: wave height, period, wind, condition label.
- [ ] **FIX if:** Hero card shows `undefined`, `NaN`, or nothing.
- [ ] The **7-Day ForecastStrip** is visible. Days 1–2 show data. Days 3–7 are blurred behind a `GuestGate` overlay showing `"Unlock full 7-day forecast"` and a `"Sign Up Free"` CTA.
- [ ] **FIX if:** ForecastStrip is empty, or all 7 days are blurred, or none are blurred.
- [ ] The **AI Insight card** is fully blurred/locked with `"Sign Up Free"` CTA.
- [ ] **FIX if:** The AI Insight card calls `getGeminiInsight()` for guest users — it must NOT make any API call for guests.
- [ ] The **TideMiniChart** is visible and shows today’s tide data from `guestDummyData.ts`.
- [ ] **FIX if:** The tide chart is blank, crashes, or calls an external API for guests.
- [ ] Tapping a **Nearby Spot card** navigates to `SpotDetailScreen` and passes the correct spot.
- [ ] **FIX if:** Tapping a spot card does nothing, navigates to the wrong screen, or crashes.

### Step G3 — SpotListScreen (Guest)

- [ ] Navigation tab `"Spots"` opens `SpotListScreen`.
- [ ] The search bar is visible and functional — typing filters the spot list in real time.
- [ ] **FIX if:** The search bar does nothing or throws an error.
- [ ] Spot cards display: name, distance, condition badge, wave height. None show `undefined` or blank.
- [ ] **FIX if:** Any field is `undefined`, blank, or shows a raw number without units.
- [ ] Tapping a spot card sets `selectedSpot` in App state and navigates to `Screen.SPOT_DETAIL`.
- [ ] **FIX if:** Tapping a spot navigates to SPOT_DETAIL but `selectedSpot` is null (causing a crash or empty screen).
- [ ] The `"Add Custom Spot"` FAB button is visible. Tapping it shows a `GuestGate` overlay — it must NOT open any form for guests.
- [ ] **FIX if:** The Add Spot FAB opens a form for guest users without gating.

### Step G4 — SpotDetailScreen (Guest)

- [ ] Screen header shows the correct spot name and back arrow.
- [ ] Back arrow (`arrow_back`) navigates back to `SpotListScreen` (or wherever the user came from).
- [ ] **FIX if:** Back arrow does nothing or navigates to the wrong screen.
- [ ] The **Swell Quality Score card** shows today’s score. Score is computed, not hardcoded.
- [ ] **FIX if:** Score shows `undefined`, `NaN`, `0`, or the word `EPIC` hardcoded regardless of data.
- [ ] The **Hourly Forecast Table** shows today’s rows. Rows beyond 24h are blurred behind `GuestGate`.
- [ ] **FIX if:** All rows are blurred, or no rows are blurred, or the table is empty.
- [ ] The **7-Day Chart** is fully blurred behind a `GuestGate` overlay.
- [ ] The **Best Session Windows** section is fully blurred/locked. It must NOT call `getGeminiInsight()` for guests.
- [ ] The **Multi-Model Confidence Panel** is fully blurred/locked.
- [ ] **FIX if:** Any locked section makes a live API call for guest users.

### Step G5 — Log Session (Guest — FAB)

- [ ] Tapping the centre FAB in the Navigation bar navigates to `LogSessionScreen`.
- [ ] `LogSessionScreen` immediately shows a full-screen `GuestGate` prompt, not the form.
- [ ] The `GuestGate` overlay has a `"Sign Up Free"` CTA that navigates to `Screen.SIGN_UP`.
- [ ] **FIX if:** The log session form is visible to guests at any point.

### Step G6 — Profile (Guest)

- [ ] Navigation tab `"Profile"` opens `ProfileScreen`.
- [ ] A placeholder avatar icon is shown (`account_circle`).
- [ ] All stats (sessions count, waves logged, spots visited) show `"--"` strings.
- [ ] A `"Create your profile"` CTA button is visible and navigates to `Screen.SIGN_UP`.
- [ ] **FIX if:** Real stats are shown for guest users, or the CTA button does nothing.
- [ ] A **theme toggle** is visible in the settings section.
- [ ] Toggling it switches the app between dark and light mode and persists the choice.
- [ ] **FIX if:** The toggle does nothing, crashes, or doesn’t persist.

### Step G7 — Quiver (Guest)

- [ ] Navigation routes to `QuiverScreen` from the Profile screen (or wherever it’s accessible).
- [ ] Exactly **1 dummy board** is shown, from `src/data/guestDummyData.ts`, with a `blur-sm opacity-60` overlay.
- [ ] An `"Add Board"` button or FAB is visible. Tapping it shows a `GuestGate` overlay — it must NOT open the add board form.
- [ ] **FIX if:** No boards are shown, more than 1 board is shown, or the Add Board form opens for guests.

### Step G8 — GuestBanner Sign Up CTA

- [ ] Tapping `"Sign Up Free"` in the `GuestBanner` navigates to `Screen.SIGN_UP`.
- [ ] **FIX if:** The button does nothing or navigates to the wrong screen.

### Step G9 — Community Screen (Guest)

- [ ] Navigate to the Community tab.
- [ ] Screen renders without crashing.
- [ ] Any interactive elements (posts, groups, friends) that require login show appropriate gating or prompts.
- [ ] **FIX if:** The screen is completely blank or crashes for guest users.

---

## AUDIT PASS 2: AUTHENTICATION FLOWS

### Step A1 — Sign Up Screen

- [ ] `SignUpScreen` renders correctly with no layout overflow or cut-off elements.
- [ ] All form fields are present: display name, email, password (with show/hide toggle), home spot selector, preferred wave height selector.
- [ ] **Home Spot Selector**: dropdown is populated from `src/data/portugalSpots.ts`. Selecting a spot stores `homeSpotId`.
- [ ] **FIX if:** The dropdown is empty or only shows 1–3 hardcoded options.
- [ ] **Preferred Wave Height**: a slider or two inputs for min/max (0.5–4.0m range). Values are stored and passed to `signUp()`.
- [ ] **FIX if:** The wave height inputs are absent or do nothing.
- [ ] The `"Create Free Account"` button calls `signUp()` from `AuthContext`. On success, navigates to `Screen.HOME` and clears guest state.
- [ ] **FIX if:** The button does nothing, navigates nowhere after success, or shows no loading state while the Firebase call is in progress.
- [ ] Auth errors from Firebase (e.g., `auth/email-already-in-use`) are displayed below the form in `text-red-400 text-sm`. Test by submitting a duplicate email.
- [ ] **FIX if:** Errors are silently swallowed or shown in a generic alert.
- [ ] `"Continue with Google"` button calls `signInWithGoogle()`. On success, navigates to `Screen.HOME`.
- [ ] **FIX if:** Google button does nothing or throws an unhandled error.
- [ ] `"Already have an account? Sign In"` link navigates to `Screen.SIGN_IN`.
- [ ] **FIX if:** The link does nothing.
- [ ] On successful sign up, `migrateGuestDataToAccount(uid)` is called. Any temp sessions or boards are moved to Firestore.

### Step A2 — Sign In Screen

- [ ] `SignInScreen` renders email + password fields only.
- [ ] Submitting correct credentials signs the user in and navigates to `Screen.HOME`.
- [ ] Submitting wrong credentials shows the Firebase error message inline (e.g., `"Invalid email or password"`).
- [ ] **FIX if:** Wrong credentials cause a crash or unhandled promise rejection.
- [ ] `"Forgot password?"` link navigates to `Screen.FORGOT_PASSWORD`.
- [ ] `"Don't have an account? Sign Up Free"` link navigates to `Screen.SIGN_UP`.
- [ ] **FIX if:** Either link does nothing.

### Step A3 — Forgot Password Screen

- [ ] Email input is present and functional.
- [ ] Submitting a valid email calls `resetPassword(email)` and shows a `text-cyan-400` confirmation message.
- [ ] **FIX if:** The button does nothing, or the confirmation never appears, or the screen crashes.
- [ ] A back button or link returns the user to `Screen.SIGN_IN`.
- [ ] **FIX if:** There is no way to leave this screen.

---

## AUDIT PASS 3: LOGGED-IN USER JOURNEY

Simulate a fully logged-in user. `isGuest = false`, `isLoggedIn = true`, `homeSpotId` is set.

### Step L1 — HomeScreen (Logged In)

- [ ] `"Set Your Home Break"` section is hidden once `homeSpotId` is set.
- [ ] **Hero Card** shows LIVE data from `fetchOpenMeteoForecast()` (or precomputed Firestore cache), NOT dummy data.
- [ ] While data is loading: animated skeleton placeholders are visible (from `src/components/Skeletons.tsx`).
- [ ] **FIX if:** Skeleton placeholders never appear and the card flashes empty.
- [ ] While data is loading: no data values appear (no `undefined`, no stale values).
- [ ] After data loads: wave height, period, wind speed, wind direction, and condition label all show real values with correct units.
- [ ] **FIX if:** Any value is `undefined`, `NaN`, `null`, or `0` when real data should be present.
- [ ] The offshore/onshore wind label is computed correctly against the spot’s `SpotBreakProfile.optimalWindDirection`.
- [ ] **ForecastStrip** shows all 7 days with real quality scores. No GuestGate overlays.
- [ ] Tapping a day card navigates to `Screen.SPOT_DETAIL` and passes the correct spot.
- [ ] **FIX if:** Tapping a ForecastStrip day does nothing or shows a blank SpotDetailScreen.
- [ ] **AI Insight Card** calls `getGeminiInsight()` and displays `insight.summary` and `insight.bestWindows[0]`.
- [ ] The `sync` icon spins while Gemini is loading.
- [ ] `"Powered by Gemini"` badge is visible in the card footer.
- [ ] **FIX if:** The AI card shows static/mock text or is still gated for logged-in users.
- [ ] **TideMiniChart** shows 48h of real tide data. HIGH and LOW tide points are labelled.
- [ ] **FIX if:** The tide chart is empty or shows only today’s data for logged-in users.
- [ ] **Nearby Spots list** shows the 5 spots nearest to `homeSpotId` (computed via haversine). Condition badges are live-computed, not static.
- [ ] **FIX if:** Nearby spots list shows the same spots regardless of `homeSpotId`, or shows more/fewer than 5.

### Step L2 — SpotDetailScreen (Logged In)

Navigate to a spot from the HomeScreen nearby list or ForecastStrip.

- [ ] Screen receives the correct spot — the name in the header matches the spot that was tapped.
- [ ] **FIX if:** The header shows the wrong spot name, `undefined`, or `null`.
- [ ] On mount, the screen checks Firestore for a precomputed forecast. If the cached `runAt` is less than 12 hours old, it uses the cache. If older or absent, it calls `fetchOpenMeteoForecast()`.
- [ ] **FIX if:** The screen always calls the live API even when a fresh cache exists (wasting quota).
- [ ] **Hourly Forecast Table** shows rows with real data. All columns have values: Time, Wave Ht, Period, Swell Dir, Wind, Gust, Quality badge.
- [ ] **FIX if:** Any column shows `undefined`, `--`, or `0` for all rows.
- [ ] The current time row is highlighted with `bg-slate-700`.
- [ ] **FIX if:** No row is highlighted, or the wrong row is highlighted.
- [ ] **7-Day Recharts Chart** renders without errors. Bars (wave height) and line (swell period) are both visible.
- [ ] **FIX if:** The chart renders blank, throws a Recharts error, or only one data series is visible.
- [ ] **Multi-Model Confidence Panel** shows agreement/divergence icons for wave height, wind speed, and swell direction.
- [ ] **FIX if:** The panel shows nothing or all icons are the same regardless of data.
- [ ] **Best Session Windows** section shows 3 Gemini-generated cards. Each card has a time window, reason, and quality badge.
- [ ] **FIX if:** The section is blank, shows loading forever, or is still gated for logged-in users.
- [ ] Back arrow returns user to whichever screen they came from.

### Step L3 — Log Session (Full Flow)

- [ ] FAB opens `LogSessionScreen`. The full 4-step form is shown (no GuestGate).

**Step 1 — Spot Selection:**

- [ ] Spot search is functional and returns results from `src/data/portugalSpots.ts`.
- [ ] Selecting a spot auto-fills `waveHeight` and `wavePeriod` from `AppContext.forecasts[selectedSpotId]?.[0]`.
- [ ] **FIX if:** Wave height and period fields are empty after spot selection.

**Step 2 — Session Details:**

- [ ] Date/time picker defaults to now and is interactive.
- [ ] Duration slider moves between 30min and 4hr in 15-minute steps.
- [ ] Star rating (1–5) is tappable. Tapping a star fills it and all stars before it.
- [ ] **FIX if:** Stars are not tappable or the wrong number fill.
- [ ] Board selector dropdown is populated from `AppContext.quiver`. Each option shows `brand + model + volume + 'L'`.
- [ ] **FIX if:** Dropdown is empty, shows only one hardcoded board, or crashes.

**Step 3 — Performance Metrics:**

- [ ] Wave count stepper (`+` / `-`) increments and decrements correctly. Cannot go below 0.
- [ ] Top speed and longest ride inputs accept numbers only.
- [ ] **FIX if:** Stepper goes negative or inputs accept non-numeric text.

**Step 4 — Save:**

- [ ] Tapping Save calls `addSession(uid, session)` in Firestore.
- [ ] Also calls `AppContext.addSession(session)` so the new session is immediately visible in the app without a refresh.
- [ ] A success toast appears: `"Session saved!"` — auto-dismisses after 2 seconds.
- [ ] After save, navigates to `Screen.SESSION_DETAIL` and the saved session data is visible.
- [ ] **FIX if:** The session is saved to Firestore but `AppContext` state is not updated (requires app restart to see the session).
- [ ] **FIX if:** Navigation goes to SESSION_DETAIL but `selectedSession` in App state is `null` (blank screen).

### Step L4 — SessionDetailScreen

- [ ] Screen displays the session that was just saved — all fields populated.
- [ ] **FIX if:** Any field shows `undefined`, `null`, or is blank.
- [ ] **Conditions Replay** section shows a `ForecastSnapshot` for the session’s date/time/spot with a delta vs the logged wave height.
- [ ] Delta colour is green if accurate (±0.2m), amber if diverged.
- [ ] **FIX if:** The section is absent or delta is always 0.
- [ ] **AI Coach** card calls `getGeminiInsight()` and displays `insight.summary` (2–3 sentences).
- [ ] **FIX if:** The AI Coach card is blank, shows mock text, or is still gated for logged-in users.
- [ ] Back button returns user to `Screen.PROFILE` (or `Screen.HOME` — whichever is correct in `App.tsx`).

### Step L5 — Quiver & Add Board

- [ ] `QuiverScreen` shows all boards from `AppContext.quiver`. Each card shows brand, model, volume, board type.
- [ ] **FIX if:** Boards from a previous session (stored in Firestore/Preferences) are not loaded on app start.
- [ ] Tapping a board card shows its details. If a detail modal or screen exists, it opens correctly.
- [ ] `"Add Board"` button/FAB navigates to `Screen.ADD_BOARD`.
- [ ] **FIX if:** The Add Board button does nothing.
- [ ] `AddBoardScreen` has all fields: photo, brand, model, dimensions, volume stepper, board type selector.
- [ ] Volume stepper `+` / `-` works. Minimum is 10, maximum is 100.
- [ ] **FIX if:** The stepper does not enforce min/max bounds.
- [ ] Tapping Save adds the board to `AppContext.quiver` AND persists it via `@capacitor/preferences`.
- [ ] After save, navigates back to `Screen.QUIVER` and the new board is immediately visible.
- [ ] **FIX if:** Board is saved but Quiver requires a refresh to show it.

### Step L6 — SpotListScreen (Logged In)

- [ ] All Portugal spots are listed from `src/data/portugalSpots.ts`.
- [ ] Condition badges are dynamically computed via `computeSwellQuality()`, not static.
- [ ] Search filters the list in real time as the user types.
- [ ] `"Add Custom Spot"` FAB opens an input form (not gated for logged-in users).
- [ ] **FIX if:** The FAB still shows a GuestGate overlay for logged-in users.

### Step L7 — SkillProgressionScreen

- [ ] Screen is accessible from the Profile screen (confirm there is a link/button to it).
- [ ] **FIX if:** There is no navigation link to SkillProgressionScreen from anywhere in the app.
- [ ] The **LineChart** renders with real data points from `AppContext.sessions`. X-axis shows session dates, Y-axis shows scores 0–100.
- [ ] **FIX if:** Chart renders empty, or X-axis shows generic labels instead of real dates.
- [ ] The **Gemini Coach Analysis** card shows real output from `getGeminiInsight()`, not mock text.
- [ ] Back button returns user to `Screen.PROFILE`.

### Step L8 — ProfileScreen (Logged In)

- [ ] User’s display name and avatar are shown (from Firestore user profile).
- [ ] Stats are real: sessions count, total waves logged, spots visited — computed from `AppContext.sessions`.
- [ ] **FIX if:** Stats are hardcoded, show `"--"`, or show `0` when sessions exist.
- [ ] A link/button to `SkillProgressionScreen` is present.
- [ ] Theme toggle is present and functional.
- [ ] Sign Out button calls `AuthContext.signOut()`. After sign out, the app returns to `Screen.HOME` in guest mode.
- [ ] **FIX if:** Sign Out does nothing, crashes, or doesn’t reset the app to guest mode.

---

## AUDIT PASS 4: NAVIGATION DEAD-END DETECTION

For each item, check that the navigation both works AND passes the correct data.

### Critical Navigation Checks

- [ ] **`navigate` signature audit**: In `App.tsx`, `navigate` only accepts `(screen: Screen)` — it does NOT accept a second params argument. Check every call to `navigate()` across all screens. If any screen calls `navigate(Screen.SPOT_DETAIL, { spotId, day })` or similar — this WILL silently fail. **FIX**: Ensure `selectedSpot` is set in App state via a callback prop BEFORE calling `navigate(Screen.SPOT_DETAIL)`. Update any screen that passes extra args to `navigate()`.
- [ ] **`selectedSpot` is never null on `SpotDetailScreen`**: Check that every navigation path to `Screen.SPOT_DETAIL` first calls the `onSelectSpot(spot)` callback (which sets `selectedSpot` in App state). If any path navigates to SPOT_DETAIL without setting `selectedSpot`, the screen will crash or show empty data.
- [ ] **`selectedSession` is never null on `SessionDetailScreen`**: Every navigation to `Screen.SESSION_DETAIL` must first set `selectedSession` via the callback in `App.tsx`. Add a null guard at the top of `SessionDetailScreen`: if `session` prop is null, show `"No session selected"` and a back button instead of crashing.
- [ ] **`SurfMatchScreen` — no `onNavigate` prop**: `App.tsx` renders `<SurfMatchScreen />` with no props. If `SurfMatchScreen` internally tries to call any navigation, it will fail. Audit this screen and either pass `onNavigate` as a prop or remove internal navigation calls.
- [ ] **`CommunityScreen` — no `onNavigate` prop**: Same issue. Audit `CommunityScreen` and fix any internal navigation calls.
- [ ] **Every `onBack` prop is wired**: Check every screen that receives `onBack`. Confirm the back button in the screen’s JSX actually calls `onBack()`. If the back button uses `navigate()` internally instead of `onBack()` — this will fail as screens don’t have direct access to `navigate` unless it’s passed.
- [ ] **ForecastStrip day tap**: Confirm `ForecastStrip` calls the correct callback on day tap (from Section 6.3 of COMPLETION_PROMPT.md). The callback must set `selectedSpot` before navigating.
- [ ] **Nearby spots list tap**: Same as above — must set `selectedSpot` before calling `navigate(Screen.SPOT_DETAIL)`.
- [ ] **QuiverScreen → ADD_BOARD**: Confirm there is a button that calls `onNavigate(Screen.ADD_BOARD)`. `QuiverScreen` receives `onNavigate` — confirm it’s being used.
- [ ] **ProfileScreen → SKILL_PROGRESSION**: Confirm there is a tappable element that calls `onNavigate(Screen.SKILL_PROGRESSION)`. Profile receives `onNavigate` — confirm it’s wired.
- [ ] **ProfileScreen → QUIVER**: Confirm there is a tappable element that calls `onNavigate(Screen.QUIVER)` from the profile screen.
- [ ] **SignUpScreen / SignInScreen success**: After a successful auth action, both screens must call `onNavigate(Screen.HOME)`. Confirm this is implemented.
- [ ] **ForgotPasswordScreen back**: Confirm there is a way to return to `Screen.SIGN_IN` from `ForgotPasswordScreen`.

---

## AUDIT PASS 5: DATA INTEGRITY CHECKS

For each data source, verify end-to-end that real data flows from the service to the UI.

### 5.1 — OpenMeteo Forecast Data

- [ ] Open `src/services/openMeteo.ts`. The function `fetchOpenMeteoForecast(lat, lon)` makes a real HTTP request to `https://marine-api.open-meteo.com/v1/marine` AND `https://api.open-meteo.com/v1/forecast`.
- [ ] The response is parsed into a `ForecastSnapshot[]` array with ALL required fields populated (waveHeight, wavePeriod, swellDirection, windSpeed, windDirection, windGust, etc.).
- [ ] **FIX if:** Any field in the parsed `ForecastSnapshot` is always `0`, `undefined`, or `null`.
- [ ] Test with the coordinates for Supertubos, Peniche: `lat: 39.3558, lon: -9.3799`. Log the first `ForecastSnapshot` object to the console and confirm all fields have real values.

### 5.2 — Tidal Data

- [ ] Open `src/services/tides.ts`. The function `fetchTidePredictions()` returns a `TidePoint[]` with at least 4–6 entries for the next 24 hours.
- [ ] Each `TidePoint` has: `time` (ISO string), `height` (number in metres), `type` (`'HIGH'` | `'LOW'` | `null`).
- [ ] **FIX if:** The array is empty, or `type` is always `null`, or `height` is always `0`.

### 5.3 — Swell Quality Scoring

- [ ] Open `src/services/swellQuality.ts`. Call `computeSwellQuality(forecast, breakProfile)` with a sample forecast and profile.
- [ ] The returned `SwellQualityScore` has: `score` (0–100), `label` (`EPIC`/`GOOD`/`FAIR`/`POOR`), `confidence` (`HIGH`/`MEDIUM`/`LOW`), `reasons` (non-empty array of strings).
- [ ] **FIX if:** `reasons[]` is always empty, `score` is always `0` or `100`, or `label` is always `POOR`.

### 5.4 — Gemini Insight

- [ ] Open `src/services/geminiInsight.ts`. The function uses `process.env.GEMINI_API_KEY` (injected via `vite.config.ts`).
- [ ] Confirm the API key is injected in `vite.config.ts` as `define: { 'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY) }`.
- [ ] The returned `GeminiInsight` object parses to valid JSON with `bestWindows` (array, length ≥ 1) and `summary` (non-empty string).
- [ ] **FIX if:** The Gemini response parsing fails silently and `getGeminiInsight()` returns `{ bestWindows: [], summary: '' }`.
- [ ] **FIX if:** The API key is undefined — add a console warning: `"GEMINI_API_KEY is not set — AI features will not work."`

### 5.5 — Firestore Session Persistence

- [ ] Log a session. Reload the app (simulate by navigating away and back). Confirm the session still appears in `AppContext.sessions` and in the profile stats.
- [ ] **FIX if:** Sessions are lost on navigation (they are only in local state, not persisted via Preferences or Firestore).

### 5.6 — Firestore Board Persistence

- [ ] Add a board. Reload the app. Confirm the board still appears in `AppContext.quiver`.
- [ ] **FIX if:** Boards are lost on navigation.

### 5.7 — AppContext Initialisation

- [ ] On app startup (after auth resolves), `AppContext` must:
  1. Load `homeSpotId` from `@capacitor/preferences` (or Firestore if logged in).
  2. Fetch forecasts for `homeSpotId` and the 5 nearest spots.
  3. Set `isLoadingForecast = true` during fetch, `false` after.
- [ ] **FIX if:** `isLoadingForecast` is always `false` (no loading state).
- [ ] **FIX if:** Forecasts are fetched but `AppContext.forecasts` is empty when accessed in screens.

---

## AUDIT PASS 6: EDGE CASES & ERROR STATES

- [ ] **No internet connection**: Simulate offline. Every screen that fetches data must show a user-friendly error message (`"Couldn't load forecast. Check your connection."`) with a Retry button. No screen should crash or show an unhandled error.
- [ ] **FIX if:** Any screen shows a blank white area or a raw JavaScript error when offline.
- [ ] **Empty sessions list**: A new logged-in user with no sessions should see a friendly empty state in `SkillProgressionScreen` (`"Log your first session to start tracking progress"`) and `ProfileScreen` (stats show `0`, not `undefined`).
- [ ] **FIX if:** Recharts crashes when rendered with an empty data array. Wrap all chart renders with `if (data.length === 0)` guards.
- [ ] **Spot with no break profile**: Some spots in `src/data/portugalSpots.ts` may not have a `SpotBreakProfile`. Everywhere `computeSwellQuality()` is called, ensure there is a null guard or default profile fallback.
- [ ] **FIX if:** `computeSwellQuality()` crashes when `breakProfile` is undefined.
- [ ] **Long spot names**: Confirm spot names do not overflow their containers. Use `truncate` or `line-clamp-1` Tailwind classes where needed.
- [ ] **FIX if:** Long names break card layouts.

---

## OUTPUT FORMAT

For every issue found during the audit:

1. **Screen / File**: Which screen or file the issue is in.
2. **Issue**: One sentence describing what is broken.
3. **Fix**: The complete corrected code, as a fenced TypeScript/TSX block. No pseudocode. Full, runnable code only.
4. **Verification**: After applying the fix, describe the exact observable behaviour that confirms it is working.

Process all 6 audit passes in order. Do not skip any checklist item. If an item passes with no issues, write `✅ PASS` next to it and move on. Do not write long explanations for passing items.

**Do not rewrite entire files. Make surgical changes only.**
