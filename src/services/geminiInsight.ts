import * as SunCalc from 'suncalc';
import { getAuth, User } from 'firebase/auth';
import { app } from '@/src/firebase';
import type { ForecastSnapshot, SpotBreakProfile, SessionLog, GeminiInsight, ConditionsSnapshot, Board } from '@/types';

const isDev = import.meta.env.DEV;

async function callGemini(data: { type: string; payload: Record<string, any> }): Promise<string> {
  const auth = getAuth(app);

  const user = await new Promise<User | null>((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      unsubscribe();
      resolve(u);
    });
  });

  if (!user) throw new Error('Not authenticated');

  const token = await user.getIdToken(true);

  const response = await fetch('/api/callGemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ data }),
  });

  if (!response.ok) throw new Error(`Function error: ${response.status}`);
  const json = await response.json();
  return json.result.text;
}

export async function getGeminiInsight(
  forecast: ForecastSnapshot[],
  profile: SpotBreakProfile,
  history: SessionLog[],
  preferredWaveHeight: { min: number; max: number } | undefined,
  coords: { lat: number; lng: number },
  quiver?: Board[],
): Promise<GeminiInsight> {

  const now = new Date(); // ← ADDED

  const daylightForecast = forecast.filter(f => {
    const date = new Date(f.forecastHour);
    if (date < now) return false; // ← ADDED: skip past hours
    const sun = SunCalc.getTimes(date, coords.lat, coords.lng);
    return date >= sun.sunrise && date <= sun.sunset;
  });

  const forecastSummary = daylightForecast.slice(0, 56).map(f =>
    `${f.forecastHour}: waves ${f.waveHeight.toFixed(1)}m @ ${f.wavePeriod.toFixed(0)}s period, wind ${f.windSpeed.toFixed(0)}km/h from ${f.windDirection}°, swell from ${f.swellDirection}°`
  ).join('\n');

  const historyText = history.length > 0
    ? history.slice(0, 5).map(s =>
        `${s.date}: ${s.spotName}, ${s.height}, rating ${s.rating}/5, energy ${s.energyLevel ?? 'N/A'}/5, crowd ${s.crowdFactor ?? 'N/A'}/5${s.notes ? `, notes: "${s.notes}"` : ''}`
      ).join('\n')
    : 'No previous sessions logged.';

  const wavePreference = preferredWaveHeight
    ? `The surfer prefers waves between ${preferredWaveHeight.min}m and ${preferredWaveHeight.max}m.`
    : 'No specific wave height preference set.';

  let boardsUsedText = '';
  if (quiver && quiver.length > 0 && history.length > 0) {
    const lines = history.slice(0, 5).map(s => {
      const b = quiver.find(q => q.id === s.boardId);
      return b ? `${s.date.slice(0, 10)}: ${b.brand} ${b.model} ${b.volume}L (${b.boardType})` : null;
    }).filter(Boolean);
    if (lines.length > 0) boardsUsedText = `\nBOARDS USED (recent sessions):\n${lines.join('\n')}\n`;
  }

  let detectedPatternsText = '';
  if (history.length >= 3) {
    const tideRatings: Record<string, number[]> = {};
    history.forEach(s => {
      const tideType = s.conditionsSnapshot?.tideType ?? 'UNKNOWN';
      if (!tideRatings[tideType]) tideRatings[tideType] = [];
      tideRatings[tideType].push(s.rating);
    });
    const tidePattern = Object.entries(tideRatings).map(([tide, ratings]) => {
      const avg = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
      return `${tide} tide: avg rating ${avg}/5 (${ratings.length} sessions)`;
    }).join(', ');
    const ratings = history.map(s => s.rating);
    const first = ratings.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const last = ratings.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const trend = last > first + 0.4 ? 'improving' : last < first - 0.4 ? 'declining' : 'consistent';
    detectedPatternsText = `\nDETECTED PATTERNS:\n- Tide correlation: ${tidePattern}\n- Surfer's recent trend: ${trend}\n`;
  }

  try {
    const rawText = await callGemini({
      type: 'SPOT_ANALYSIS',
      payload: {
        breakType: profile.breakType,
        facingDirection: profile.facingDirection,
        optimalSwellDirection: profile.optimalSwellDirection,
        optimalTidePhase: profile.optimalTidePhase,
        optimalWindDirection: profile.optimalWindDirection,
        wavePreference,
        forecastSummary,
        historyText,
        boardsUsedText,
        detectedPatternsText,
      }
    });

    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON object found in Gemini response');
    return sanitiseInsight(JSON.parse(match[0]));
  } catch (err) {
    console.error('Gemini insight fetch failed', err);
    return getFallbackInsight();
  }
}

export async function getSurfMatchInsights(
  allForecasts: ForecastSnapshot[],
  breakProfile: SpotBreakProfile,
  userPrefs?: { min: number; max: number },
): Promise<Record<string, string>> {
  const byDate: Record<string, ForecastSnapshot[]> = {};
  allForecasts.forEach(f => {
    const date = f.forecastHour.slice(0, 10);
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(f);
  });

  const dates = Object.keys(byDate).sort().slice(0, 7);
  const compassToDeg = (c: string): number => {
    const map: Record<string, number> = { N:0,NNE:22.5,NE:45,ENE:67.5,E:90,ESE:112.5,SE:135,SSE:157.5,S:180,SSW:202.5,SW:225,WSW:247.5,W:270,WNW:292.5,NW:315,NNW:337.5 };
    return map[c.toUpperCase().replace(/[^A-Z]/g,'')] ?? 0;
  };
  const isAligned = (d1: number, d2: number) => {
    const diff = Math.abs(d1 - d2) % 360;
    return (diff > 180 ? 360 - diff : diff) <= 45;
  };

  const optWindDeg = compassToDeg(breakProfile.optimalWindDirection?.split(' ')[0].split('-')[0].trim() ?? 'N');
  const optSwellDeg = compassToDeg(breakProfile.optimalSwellDirection?.split(' ')[0].split('-')[0].trim() ?? 'N');

  const daySummaries = dates.map(date => {
    const snaps = byDate[date];
    const best = snaps.reduce((max, obj) => obj.waveHeight > max.waveHeight ? obj : max, snaps[0]);
    return `${date}: MAX waves ${best.waveHeight.toFixed(1)}m @ ${best.wavePeriod.toFixed(0)}s, wind ${best.windSpeed.toFixed(0)}km/h ${isAligned(best.windDirection, optWindDeg) ? '✓ offshore' : '✗ onshore'}, swell ${isAligned(best.swellDirection, optSwellDeg) ? '✓ aligned' : '✗ cross-swell'}`;
  }).join('\n');

  try {
    const rawText = await callGemini({
      type: 'SURF_MATCH',
      payload: {
        optimalSwellDirection: breakProfile.optimalSwellDirection,
        optimalWindDirection: breakProfile.optimalWindDirection,
        daySummaries,
        userPrefs: userPrefs ? `${userPrefs.min}m - ${userPrefs.max}m wave height` : 'No preference set.',
      }
    });
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found');
    return JSON.parse(match[0]);
  } catch (err) {
    console.error('SurfMatch Gemini insight fetch failed', err);
    return {};
  }
}

export async function getSessionNoteDraft(
  conditions: ConditionsSnapshot,
  board: Board | undefined,
  rating: number,
  waveCount: number,
  durationHours: number,
  spotName: string,
): Promise<string> {
  try {
    const rawText = await callGemini({
      type: 'SESSION_NOTE',
      payload: {
        spotName,
        rating,
        durationHours,
        waveCount,
        waveHeight: conditions.waveHeight.toFixed(1),
        wavePeriod: conditions.wavePeriod.toFixed(0),
        windSpeed: conditions.windSpeed.toFixed(0),
        tideType: conditions.tideType,
        tide: conditions.tide.toFixed(1),
        board: board ? `${board.brand} ${board.model} ${board.volume}L (${board.boardType})` : null,
      }
    });
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) return '';
    const parsed = JSON.parse(match[0]);
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
    return `${s.date.slice(0, 10)}: ${s.spotName}, waves ~${s.height}m, rated ${s.rating}/5, energy ${s.energyLevel ?? 'N/A'}/5, waves caught: ${s.waveCount ?? 'N/A'}${board ? `, board: ${board.brand} ${board.model} ${board.volume}L` : ''}${s.notes ? `, note: "${s.notes.slice(0, 60)}"` : ''}`;
  }).join('\n');

  const ratings = recentSessions.map(s => s.rating);
  const first = ratings.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const last = ratings.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  const trend = last > first + 0.4 ? 'improving' : last < first - 0.4 ? 'declining' : 'consistent';

  try {
    const rawText = await callGemini({
      type: 'SKILL_COACH',
      payload: { homeSpotName, timeframe, sessionSummary, trend }
    });
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) return '';
    const parsed = JSON.parse(match[0]);
    return parsed.analysis ?? '';
  } catch {
    return '';
  }
}

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

function getFallbackInsight(): GeminiInsight {
  return {
    bestWindows: [{
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      reason: 'Morning session looks promising with offshore winds and building swell. Get out there early before the sea breeze kicks in.',
    }],
    summary: 'AI Coach is unavailable right now — check back shortly. Based on patterns, early mornings this week should offer the best conditions.',
  };
}
