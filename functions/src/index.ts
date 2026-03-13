import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest } from 'firebase-functions/v2/https';
import type { Request, Response } from 'express';
import { defineSecret } from 'firebase-functions/params';
import { callGeminiRaw } from './geminiHelper';

const geminiApiKey = defineSecret('GEMINI_API_KEY');

admin.initializeApp();

async function requireAuth(
  req: Request,
  res: Response,
  next: () => Promise<void>
): Promise<void> {
  const authHeader = req.headers.authorization ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!idToken) {
    res.status(401).json({ error: 'Unauthenticated' });
    return;
  }

  try {
    await admin.auth().verifyIdToken(idToken);
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  await next();
}

export const callGemini = onRequest(
  {
    cors: ['https://surftrack-pro.web.app', 'http://localhost:5173'],
    secrets: [geminiApiKey],
    region: 'us-central1',
  },
  (req, res) => requireAuth(req, res, async () => {
    const { data } = req.body;
    const { type, payload } = data ?? {};

    if (!type || !payload) {
      res.status(400).json({ error: 'Missing type or payload' });
      return;
    }

    let prompt: string;
    let temperature = 0.7;
    let maxOutputTokens = 1024;

    switch (type) {
      case 'SPOT_ANALYSIS':
        prompt = buildSpotAnalysisPrompt(payload);
        break;
      case 'SURF_MATCH':
        prompt = buildSurfMatchPrompt(payload);
        temperature = 0.6;
        break;
      case 'SESSION_NOTE':
        prompt = buildSessionNotePrompt(payload);
        temperature = 0.8;
        maxOutputTokens = 256;
        break;
      case 'SKILL_COACH':
        prompt = buildSkillCoachPrompt(payload);
        maxOutputTokens = 512;
        break;
      case 'SWELL_ALERT':
        prompt = buildSwellAlertPrompt(payload);
        temperature = 0.5;
        maxOutputTokens = 256;
        break;
      case 'HERO_SNAP':
        prompt = buildHeroSnapPrompt(payload);
        temperature = 0.6;
        maxOutputTokens = 256;
        break;
      case 'SPOT_ANALYSIS_DEEP':
        prompt = buildSpotAnalysisDeepPrompt(payload);
        temperature = 0.7;
        maxOutputTokens = 1024;
        break;
      default:
        res.status(400).json({ error: `Unknown type: ${type}` });
        return;
    }

    if (prompt.length > 12000) {
      res.status(400).json({ error: 'Payload too large.' });
      return;
    }

    try {
      const text = await callGeminiRaw(prompt, temperature, maxOutputTokens);
      res.json({ result: { text } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  })
);

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildSpotAnalysisPrompt(p: any): string {
  return `You are an expert surf coach and meteorologist analysing surf forecasts.

SPOT PROFILE:
- Break type: ${p.breakType}
- Facing direction: ${p.facingDirection}
- Optimal swell direction: ${p.optimalSwellDirection}
- Optimal tide phase: ${p.optimalTidePhase}
- Best wind direction (offshore): ${p.optimalWindDirection}

SURFER PREFERENCE:
${p.wavePreference ?? 'No specific wave height preference set.'}

7-DAY FORECAST DATA (daylight hours only, future dates only):
${p.forecastSummary}

RECENT SESSION HISTORY:
${p.historyText ?? 'No previous sessions logged.'}
${p.boardsUsedText ?? ''}${p.detectedPatternsText ?? ''}

TASK: Analyse the forecast data and identify the best 1–3 session windows. Consider wave height and period quality, wind direction (offshore is best), swell direction alignment, tide phase match, surfer's preferred wave height range, and pattern comparison with past sessions. Only recommend daylight hours. Only recommend future dates — never recommend dates in the past.

You MUST respond with ONLY a raw JSON object. No markdown. No code fences. No backticks. No explanation. Just the JSON object starting with { and ending with }:

{
  "bestWindows": [
    {"startTime": "ISO8601_datetime", "endTime": "ISO8601_datetime", "reason": "2-3 sentence explanation in plain surfer language"}
  ],
  "summary": "2-3 sentence personalised recommendation that explicitly references the surfer's session history patterns, tide preference, and wave height preference — not a generic forecast summary. Mention specific data from their history."
}`;
}

function buildSurfMatchPrompt(p: any): string {
  return `You are an elite virtual surf coach analysing a spot's 7-day forecast.

SPOT PROFILE:
- Optimal Swell: ${p.optimalSwellDirection}
- Optimal Wind: ${p.optimalWindDirection}
- Pre-filtered Best Windows (one per day):
${p.daySummaries}

USER PREF: ${p.userPrefs ?? 'No preference set.'}

TASK:
Provide exactly one short, punchy sentence (max 15 words) per day giving a qualitative coaching opinion on that day's specific condition.
Speak naturally like a surfer. Do not include the date or introductory phrases.

Respond ONLY with a valid JSON Record where the key is the YYYY-MM-DD date and the value is the sentence.
Example format:

"2026-03-01": "Punchy and offshore all morning, grab the shorty.",
"2026-03-02": "Blowing heavy onshore, might be blown out."
}`;
}

function buildSessionNotePrompt(p: any): string {
  return `You are helping a surfer write a quick session diary note.

SESSION FACTS:
- Spot: ${p.spotName}
- Rating: ${p.rating}/5
- Duration: ${p.durationHours} hours
- Wave count: ${p.waveCount}
- Conditions: ${p.waveHeight}m waves @ ${p.wavePeriod}s, wind ${p.windSpeed}km/h, tide ${p.tideType} (${p.tide}m)
${p.board ? `- Board: ${p.board}` : ''}

Write a 2–3 sentence personal surf diary note in first person.
Sound like a real surfer — casual, honest, descriptive.
Reference the conditions and session stats. Do not start with "I had".
Do not add quotes around the note.

Respond ONLY with valid JSON: { "note": "your draft note here" }`;
}

function buildSkillCoachPrompt(p: any): string {
  return `You are an expert surf coach reviewing a surfer's progression log.

HOME BREAK: ${p.homeSpotName}
TIMEFRAME: Last ${p.timeframe === 'ALL' ? 'all time' : p.timeframe + ' days'}
RECENT SESSIONS (most recent first):
${p.sessionSummary}

COMPUTED TREND: ${p.trend}
${p.tidePatternText ? `TIDE PATTERN: ${p.tidePatternText}` : ''}

Give a 3–4 sentence coaching analysis. Be specific — reference actual session data (dates, wave heights, boards used).
Identify one clear strength and one actionable area to improve. End with a motivating but realistic next goal.
Use plain surfer language — honest, direct, not patronising.

Respond ONLY with valid JSON: { "analysis": "your coaching analysis here" }`;
}

function buildHeroSnapPrompt(p: any): string {
  return `You are a surf reporter giving a live conditions update.

CURRENT CONDITIONS AT ${p.spotName}:
${p.currentSnap}

NEXT 6 HOURS:
${p.next6h}

Write 1-2 sentences (max 40 words) summarising right-now conditions and whether they will hold or change. Sound like a local surfer — casual and direct. No jargon.

Respond ONLY with valid JSON: { "summary": "your one sentence here" }`;
}

function buildSpotAnalysisDeepPrompt(p: any): string {
  return `You are an expert surf coach and meteorologist analysing ${p.spotName}.

BREAK CHARACTER:
- Type: ${p.breakType} | Facing: ${p.facingDirection}
- Works best: swell from ${p.optimalSwellDirection}, wind from ${p.optimalWindDirection}, tide: ${p.optimalTidePhase}

SURFER PROFILE:
${p.wavePreference}
${p.detectedPatternsText ?? ''}

7-DAY DAYLIGHT FORECAST:
${p.forecastSummary}

TASK: Identify the 2–3 best surf windows specific to THIS break's character. For each window, explain WHY it suits this specific break — reference the break type, facing direction, and optimal conditions in every reason. Do NOT give generic advice.

Respond ONLY with valid JSON:
{
  "bestWindows": [
    {
      "startTime": "ISO8601_datetime",
      "endTime": "ISO8601_datetime",
      "reason": "2-3 sentences referencing this break's specific character and why this window suits it"
    }
  ],
  "summary": "2-3 sentence spot-specific weekly outlook that references this break's personality and character — not a generic forecast"
}`;
}

function buildSwellAlertPrompt(p: any): string {
  return `You are a surf coach. Based on this 24-hour forecast for a surfer's home break,
decide if there is a genuinely good surf window today worth alerting them about.
Only say YES if conditions are clearly above average (good swell, offshore wind, decent period).

FORECAST (next 24h):
${p.forecastSummary}

Respond ONLY with valid JSON:

"shouldAlert": true | false,
"window": "e.g. 7am–9am",
"message": "One short sentence (max 15 words) in surfer language describing why it's worth going out."
}`;
}

export const dailySwellAlert = onSchedule('every day 06:00', async () => {
  const db = admin.firestore();
  const messaging = admin.messaging();

  const usersSnap = await db.collection('users').get();

  for (const userDoc of usersSnap.docs) {
    const userData = userDoc.data();
    const uid = userDoc.id;
    const homeSpotId = userData.homeSpotId;
    if (!homeSpotId) continue;

    const tokensSnap = await db.collection(`users/${uid}/fcmTokens`).get();
    if (tokensSnap.empty) continue;
    const tokens = tokensSnap.docs.map(d => d.data().token as string);

    const forecastSnap = await db.collection(`spots/${homeSpotId}/forecasts`).limit(56).get();
    if (forecastSnap.empty) continue;

    const forecastsDoc = forecastSnap.docs[0];
    const forecasts = forecastsDoc.data().data || forecastsDoc.data();

    if (!Array.isArray(forecasts)) continue;

    const next24hForecasts = forecasts.filter((f: any) => {
      const fTime = new Date(f.forecastHour).getTime();
      const now = Date.now();
      return fTime >= now && fTime <= now + 24 * 60 * 60 * 1000;
    });

    if (next24hForecasts.length === 0) continue;

    const forecastSummaryStr = next24hForecasts.map((f: any) =>
      `${f.forecastHour}: ${f.waveHeight.toFixed(1)}m @ ${f.wavePeriod.toFixed(0)}s, wind ${f.windSpeed.toFixed(0)}km/h from ${f.windDirection}°`
    ).join('\n');

    try {
      const rawText = await callGeminiRaw(
        buildSwellAlertPrompt({ forecastSummary: forecastSummaryStr }),
        0.5,
        256
      );

      let alertData: { shouldAlert: boolean; window: string; message: string };
      try {
        alertData = JSON.parse(rawText);
      } catch {
        continue;
      }

      if (!alertData.shouldAlert) continue;

      const notification = {
        title: `🌊 Surf Alert — ${alertData.window}`,
        body: alertData.message,
      };

      await messaging.sendEachForMulticast({
        tokens,
        notification,
        data: { spotId: homeSpotId, screen: 'SPOT_DETAIL' },
      });
    } catch (e) {
      console.error('Swell alert Gemini call failed', e);
      continue;
    }
  }
});
