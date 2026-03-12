import * as SunCalc from 'suncalc';
import { Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/src/firebase';
import type { ForecastSnapshot, SpotBreakProfile, SessionLog, GeminiInsight, ConditionsSnapshot, Board } from '@/types';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// ─── Main function ────────────────────────────────────────────────────────────
export async function getGeminiInsight(
  forecast: ForecastSnapshot[],
  profile: SpotBreakProfile,
  history: SessionLog[],
  preferredWaveHeight: { min: number; max: number } | undefined,
  coords: { lat: number; lng: number },
  quiver?: Board[],
): Promise<GeminiInsight> {
  const prompt = buildPrompt(forecast, profile, history, preferredWaveHeight, coords, quiver);

  try {
    const functions = getFunctions(app);
    const callGemini = httpsCallable<{ prompt: string; temperature: number; maxOutputTokens: number }, { text: string }>(functions, 'callGemini');
    
    const result = await callGemini({ 
      prompt, 
      temperature: 0.7, 
      maxOutputTokens: 1024 
    });
    
    const rawText = result.data.text;
    const jsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(jsonStr) as GeminiInsight;
    return sanitiseInsight(parsed);
  } catch (err) {
    console.error('Gemini insight fetch failed', err);
    return getFallbackInsight();
  }
}

export async function getSurfMatchInsights(
  allForecasts: ForecastSnapshot[],
  breakProfile: SpotBreakProfile,
  userPrefs?: { min: number; max: number },
  coords?: { lat: number; lng: number },
): Promise<Record<string, string>> {
  // Group forecasts by date
  const byDate: Record<string, ForecastSnapshot[]> = {};
  allForecasts.forEach(f => {
    const date = f.forecastHour.slice(0, 10);
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(f);
  });
  
  const dates = Object.keys(byDate).sort().slice(0, 7);
  const compassToDeg = (c: string): number => {
    const map: Record<string, number> = { N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5, S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5 };
    const key = c.toUpperCase().replace(/[^A-Z]/g, '');
    return map[key] ?? 0;
  };

  const isDirectionAligned = (deg1: number, deg2: number) => {
    const diff = Math.abs(deg1 - deg2) % 360;
    const finalDiff = diff > 180 ? 360 - diff : diff;
    return finalDiff <= 45;
  };
  
  const optWindStr = breakProfile.optimalWindDirection ? breakProfile.optimalWindDirection.split(' ')[0].split('-')[0].trim() : 'N';
  const optWindDeg = compassToDeg(optWindStr);

  const optSwellStr = breakProfile.optimalSwellDirection ? breakProfile.optimalSwellDirection.split(' ')[0].split('-')[0].trim() : 'N';
  const optSwellDeg = compassToDeg(optSwellStr);

  const daySummaries = dates.map(date => {
    const snaps = byDate[date];
    const best = snaps.reduce((max, obj) => obj.waveHeight > max.waveHeight ? obj : max, snaps[0]);
    
    const isOffshore = isDirectionAligned(best.windDirection, optWindDeg);
    const swellAligned = isDirectionAligned(best.swellDirection, optSwellDeg);

    return `${date}: MAX waves ${best.waveHeight.toFixed(1)}m @ ${best.wavePeriod.toFixed(0)}s, wind ${best.windSpeed.toFixed(0)}km/h ${isOffshore ? '✓ offshore' : '✗ onshore'}, swell ${swellAligned ? '✓ aligned' : '✗ cross-swell'}`;
  });

  const prompt = `You are an elite virtual surf coach analysing a spot's 7-day forecast.
  
SPOT PROFILE:
- Optimal Swell: ${breakProfile.optimalSwellDirection}
- Optimal Wind: ${breakProfile.optimalWindDirection}
- Pre-filtered Best Windows (one per day):
${daySummaries.join('\n')}

USER PREF: ${userPrefs ? `${userPrefs.min}m - ${userPrefs.max}m wave height` : 'No preference set.'}

TASK:
Provide exactly one short, punchy sentence (max 15 words) per day giving a qualitative coaching opinion on that day's specific condition.
Speak naturally like a surfer. Do not include the date or introductory phrases.

Respond ONLY with a valid JSON Record<string, string> where the key is the YYYY-MM-DD date and the value is the sentence.
Example format:
{
  "2026-03-01": "Punchy and offshore all morning, grab the shorty.",
  "2026-03-02": "Blowing heavy onshore, might be blown out."
}`;

  try {
    const functions = getFunctions(app);
    const callGemini = httpsCallable<{ prompt: string; temperature: number; maxOutputTokens: number }, { text: string }>(functions, 'callGemini');
    
    const result = await callGemini({ 
      prompt, 
      temperature: 0.6, 
      maxOutputTokens: 1024 
    });
    
    const rawText = result.data.text;
    const jsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(jsonStr) as Record<string, string>;
  } catch (err) {
    console.error('SurfMatch Gemini insight fetch failed', err);
    return {};
  }
}

// ─── Prompt builder ───────────────────────────────────────────────────────────
function buildPrompt(
  forecast: ForecastSnapshot[],
  profile: SpotBreakProfile,
  history: SessionLog[],
  preferredWaveHeight: { min: number; max: number } | undefined,
  coords: { lat: number; lng: number },
  quiver?: Board[],
): string {
  // Filter to daylight hours only using SunCalc, then take up to 56 snapshots
  const daylightForecast = forecast.filter(f => {
    const date = new Date(f.forecastHour);
    const sun = SunCalc.getTimes(date, coords.lat, coords.lng);
    return date >= sun.sunrise && date <= sun.sunset;
  });

  const forecastSummary = daylightForecast
    .slice(0, 56) // up to 7 days of daylight hours
    .map(
      f =>
        `${f.forecastHour}: waves ${f.waveHeight.toFixed(1)}m @ ${f.wavePeriod.toFixed(0)}s period, wind ${f.windSpeed.toFixed(0)}km/h from ${f.windDirection}°, swell from ${f.swellDirection}°`,
    )
    .join('\n');

  const historyText =
    history.length > 0
      ? history
          .slice(0, 5)
          .map(s =>
            `${s.date}: ${s.spotName}, ${s.height}, rating ${s.rating}/5, ` +
            `energy ${s.energyLevel ?? 'N/A'}/5, crowd ${s.crowdFactor ?? 'N/A'}/5` +
            `${s.notes ? `, notes: "${s.notes}"` : ''}`
          )
          .join('\n')
      : 'No previous sessions logged.';

  const wavePreference = preferredWaveHeight
    ? `The surfer prefers waves between ${preferredWaveHeight.min}m and ${preferredWaveHeight.max}m.`
    : 'No specific wave height preference set.';

  let boardsUsedText = '';
  if (quiver && quiver.length > 0 && history.length > 0) {
    const boardLines = history.slice(0, 5).map(s => {
      const b = quiver.find(q => q.id === s.boardId);
      if (b) return `${s.date.slice(0, 10)}: ${b.brand} ${b.model} ${b.volume}L (${b.boardType})`;
      return null;
    }).filter(Boolean);
    if (boardLines.length > 0) {
      boardsUsedText = `\nBOARDS USED (recent sessions):\n${boardLines.join('\n')}\n`;
    }
  }

  let detectedPatternsText = '';
  if (history.length >= 3) {
    const tideRatings: Record<string, number[]> = {};
    history.forEach(s => {
      const tideType = s.conditionsSnapshot?.tideType ?? 'UNKNOWN';
      if (!tideRatings[tideType]) tideRatings[tideType] = [];
      tideRatings[tideType].push(s.rating);
    });
    const tidePattern = Object.entries(tideRatings)
      .map(([tide, ratings]) => {
        const avg = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
        return `${tide} tide: avg rating ${avg}/5 (${ratings.length} sessions)`;
      })
      .join(', ');

    const ratings = history.map(s => s.rating);
    const first = ratings.slice(-3).reduce((a,b) => a+b, 0) / 3;
    const last = ratings.slice(0, 3).reduce((a,b) => a+b, 0) / 3;
    let trend = 'consistent';
    if (last > first + 0.4) trend = 'improving';
    if (last < first - 0.4) trend = 'declining';

    detectedPatternsText = `\nDETECTED PATTERNS (computed from session history):\n- Tide correlation: ${tidePattern}\n- Surfer's recent trend: ${trend} based on last ratings\n`;
  }

  return `You are an expert surf coach and meteorologist analysing surf forecasts.

SPOT PROFILE:
- Break type: ${profile.breakType}
- Facing direction: ${profile.facingDirection}
- Optimal swell direction: ${profile.optimalSwellDirection}
- Optimal tide phase: ${profile.optimalTidePhase}
- Best wind direction (offshore): ${profile.optimalWindDirection}

SURFER PREFERENCE:
${wavePreference}

7-DAY FORECAST DATA (daylight hours only):
${forecastSummary}

RECENT SESSION HISTORY:
${historyText}
${boardsUsedText}${detectedPatternsText}
TASK: Analyse the forecast data and identify the best 1–3 session windows in the next 7 days. Consider:
1. Wave height and period quality
2. Wind direction (offshore is best)
3. Swell direction alignment with this break
4. Tide phase match
5. Surfer's preferred wave height range
6. Pattern comparison with past sessions
7. Only recommend session windows during daylight hours (between sunrise and sunset). Do not suggest pre-dawn or post-sunset sessions.
8. Factor in the surfer's energy levels from past sessions. If recent sessions 
show consistently low energy (1–2), recommend rest before the next swell. If 
energy is high (4–5), they are ready to tackle bigger or more challenging windows.

9. Factor in crowd data from past sessions. If the surfer consistently logs high 
crowd scores (4–5) at their home spot, prioritise early morning session windows 
(within 1–2 hours of sunrise) to help them find emptier lineups.

10. Consider the surfer's board choices. If they consistently use a high-volume board (>45L), avoid recommending hollow or powerful reef conditions. If they ride a shortboard (<33L), they can handle steeper and more powerful waves.

Respond ONLY with valid JSON in this exact format (no markdown, no extra text):
{
  "bestWindows": [
    {"startTime": "ISO8601_datetime", "endTime": "ISO8601_datetime", "reason": "2-3 sentence explanation in plain surfer language"},
    ...
  ],
  "summary": "2-3 sentence overall forecast summary for this spot this week, in plain surfer language"
}`;
}

// ─── Sanitise parsed response ─────────────────────────────────────────────────
function sanitiseInsight(raw: Partial<GeminiInsight>): GeminiInsight {
  return {
    bestWindows: Array.isArray(raw.bestWindows)
      ? raw.bestWindows.map(w => ({
          startTime: String(w.startTime ?? ''),
          endTime: String(w.endTime ?? ''),
          reason: String(w.reason ?? ''),
        }))
      : [],
    summary: String(raw.summary ?? ''),
  };
}

// ─── Fallback when API is unavailable ────────────────────────────────────────
function getFallbackInsight(): GeminiInsight {
  return {
    bestWindows: [
      {
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        reason:
          'Morning session looks promising with offshore winds and building swell. Get out there early before the sea breeze kicks in.',
      },
    ],
    summary:
      'AI Coach is unavailable right now — check back shortly. Based on patterns, early mornings this week should offer the best conditions.',
  };
}

export async function getSessionNoteDraft(
  conditions: ConditionsSnapshot,
  board: Board | undefined,
  rating: number,
  waveCount: number,
  durationHours: number,
  spotName: string,
): Promise<string> {
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

  try {
    const functions = getFunctions(app);
    const callGemini = httpsCallable<{ prompt: string; temperature: number; maxOutputTokens: number }, { text: string }>(functions, 'callGemini');
    const result = await callGemini({ prompt, temperature: 0.8, maxOutputTokens: 256 });
    const parsed = JSON.parse(result.data.text);
    return parsed.note ?? '';
  } catch {
    return '';
  }
}

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
    const functions = getFunctions(app);
    const callGemini = httpsCallable<{ prompt: string; temperature: number; maxOutputTokens: number }, { text: string }>(functions, 'callGemini');
    const result = await callGemini({ prompt, temperature: 0.7, maxOutputTokens: 512 });
    const parsed = JSON.parse(result.data.text);
    return parsed.analysis ?? '';
  } catch {
    return '';
  }
}
