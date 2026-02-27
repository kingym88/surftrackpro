import * as SunCalc from 'suncalc';
import type { ForecastSnapshot, SpotBreakProfile, SessionLog, GeminiInsight } from '@/types';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// ─── Main function ────────────────────────────────────────────────────────────
export async function getGeminiInsight(
  forecastOrMessages: ForecastSnapshot[] | Array<{role: string, content: string}>,
  profileOrContext?: SpotBreakProfile | any[],
  history?: SessionLog[],
  preferredWaveHeight?: { min: number; max: number },
  coords?: { lat: number; lng: number },
): Promise<GeminiInsight> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'PLACEHOLDER_GEMINI_API_KEY') {
    return getFallbackInsight();
  }

  let prompt = '';

  if (Array.isArray(forecastOrMessages) && forecastOrMessages.length > 0 && typeof forecastOrMessages[0] === 'object' && 'role' in forecastOrMessages[0]) {
      // Handle alternative generic message format (used in Post-Session analysis)
      prompt = (forecastOrMessages as Array<{role: string, content: string}>).map(m => m.content).join('\n');
  } else {
      // Handle original forecast payload
      prompt = buildPrompt(
         forecastOrMessages as ForecastSnapshot[],
         profileOrContext as SpotBreakProfile,
         history || [],
         preferredWaveHeight,
         coords ?? { lat: 39.36, lng: -9.38 }, // fallback: Peniche, Portugal
      );
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    console.error('Gemini API error:', response.status);
    return getFallbackInsight();
  }

  const data = await response.json();
  const rawText: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

  try {
    const parsed = JSON.parse(rawText) as GeminiInsight;
    return sanitiseInsight(parsed);
  } catch {
    console.error('Failed to parse Gemini response:', rawText);
    return getFallbackInsight();
  }
}

// ─── Prompt builder ───────────────────────────────────────────────────────────
function buildPrompt(
  forecast: ForecastSnapshot[],
  profile: SpotBreakProfile,
  history: SessionLog[],
  preferredWaveHeight: { min: number; max: number } | undefined,
  coords: { lat: number; lng: number },
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
          .map(
            s =>
              `${s.date}: ${s.spotName}, ${s.height}, rating ${s.rating}/5${s.notes ? `, notes: "${s.notes}"` : ''}`,
          )
          .join('\n')
      : 'No previous sessions logged.';

  const wavePreference = preferredWaveHeight
    ? `The surfer prefers waves between ${preferredWaveHeight.min}m and ${preferredWaveHeight.max}m.`
    : 'No specific wave height preference set.';

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

TASK: Analyse the forecast data and identify the best 1–3 session windows in the next 7 days. Consider:
1. Wave height and period quality
2. Wind direction (offshore is best)
3. Swell direction alignment with this break
4. Tide phase match
5. Surfer's preferred wave height range
6. Pattern comparison with past sessions
7. Only recommend session windows during daylight hours (between sunrise and sunset). Do not suggest pre-dawn or post-sunset sessions.

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
