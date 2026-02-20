import type { ForecastSnapshot, SpotBreakProfile, SwellQualityScore } from '@/types';

// ─── Scoring weights ──────────────────────────────────────────────────────────
const WEIGHTS = {
  waveHeight: 25,
  swellPeriod: 25,
  windDirection: 20,
  swellDirection: 20,
  tidePhase: 10,
};

// ─── Compass bearing helpers ──────────────────────────────────────────────────
function degToCompass(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function bearingDiff(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function compassToDeg(c: string): number {
  const map: Record<string, number> = {
    N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
    S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
  };
  return map[c.toUpperCase()] ?? 0;
}

// ─── Main scoring function ────────────────────────────────────────────────────
export function computeSwellQuality(
  forecast: ForecastSnapshot,
  profile: SpotBreakProfile | undefined,
): SwellQualityScore {
  const safeProfile = profile || { breakType: 'beach', facingDirection: 'W', optimalSwellDirection: 'W-NW', optimalTidePhase: 'mid', optimalWindDirection: 'E' };
  
  const reasons: string[] = [];
  let totalScore = 0;

  // ── 1. Wave Height ──────────────────────────────────────────────────────────
  // Beach breaks typically ideal 1–3m; reef/point can handle bigger
  const h = forecast.waveHeight;
  let heightScore = 0;
  const optimalMin = safeProfile.breakType === 'reef' ? 1.0 : 0.8;
  const optimalMax = safeProfile.breakType === 'reef' ? 4.0 : 2.5;

  if (h >= optimalMin && h <= optimalMax) {
    heightScore = WEIGHTS.waveHeight;
    reasons.push(`Wave height ${h.toFixed(1)}m — in ideal range for this break.`);
  } else if (h > 0.3 && h < optimalMin) {
    heightScore = WEIGHTS.waveHeight * 0.5;
    reasons.push(`Wave height ${h.toFixed(1)}m — a bit small but surfable.`);
  } else if (h > optimalMax && h <= optimalMax * 1.5) {
    heightScore = WEIGHTS.waveHeight * 0.6;
    reasons.push(`Wave height ${h.toFixed(1)}m — overhead, experienced surfers only.`);
  } else if (h <= 0.3) {
    heightScore = 0;
    reasons.push(`Wave height ${h.toFixed(1)}m — too flat to surf.`);
  } else {
    heightScore = WEIGHTS.waveHeight * 0.2;
    reasons.push(`Wave height ${h.toFixed(1)}m — dangerously large.`);
  }
  totalScore += heightScore;

  // ── 2. Swell Period ─────────────────────────────────────────────────────────
  const period = forecast.wavePeriod;
  let periodScore = 0;

  if (period >= 14) {
    periodScore = WEIGHTS.swellPeriod;
    reasons.push(`Long period ${period.toFixed(0)}s — excellent ground swell energy.`);
  } else if (period >= 10) {
    periodScore = WEIGHTS.swellPeriod * 0.75;
    reasons.push(`Good swell period ${period.toFixed(0)}s — clean, organised waves.`);
  } else if (period >= 7) {
    periodScore = WEIGHTS.swellPeriod * 0.4;
    reasons.push(`Short period ${period.toFixed(0)}s — choppy, wind-swell conditions.`);
  } else {
    periodScore = 0;
    reasons.push(`Very short period ${period.toFixed(0)}s — messy and close-out conditions.`);
  }
  totalScore += periodScore;

  // ── 3. Wind Direction vs Break Orientation ──────────────────────────────────
  // Offshore wind = wind blowing from land to sea (grooms waves)
  // The spot's facingDirection is where waves come FROM, so offshore = opposite direction
  const breakFacingDeg = compassToDeg(safeProfile.facingDirection);
  const offshoreDeg = (breakFacingDeg + 180) % 360; // land side
  const windDiff = bearingDiff(forecast.windDirection, offshoreDeg);
  let windScore = 0;

  if (windDiff <= 45) {
    windScore = WEIGHTS.windDirection;
    reasons.push(`Offshore ${degToCompass(forecast.windDirection)} wind at ${forecast.windSpeed.toFixed(0)} km/h — perfect conditions.`);
  } else if (windDiff <= 90) {
    windScore = WEIGHTS.windDirection * 0.5;
    reasons.push(`Cross-shore wind — acceptable but not ideal.`);
  } else if (windDiff <= 135) {
    windScore = WEIGHTS.windDirection * 0.2;
    reasons.push(`Mostly onshore wind — expect messy, choppy conditions.`);
  } else {
    windScore = 0;
    reasons.push(`Strong onshore ${degToCompass(forecast.windDirection)} wind — conditions blown out.`);
  }
  totalScore += windScore;

  // ── 4. Swell Direction Alignment ───────────────────────────────────────────
  // Optimal swell direction is specified as a range like "W-NW"
  // Parse the first bearing from the optimal direction
  const optSwellParts = safeProfile.optimalSwellDirection.split('-');
  const optSwellDeg = compassToDeg(optSwellParts[0].trim());
  const swellDiff = bearingDiff(forecast.swellDirection, optSwellDeg);
  let swellDirScore = 0;

  if (swellDiff <= 30) {
    swellDirScore = WEIGHTS.swellDirection;
    reasons.push(`Swell from ${degToCompass(forecast.swellDirection)} — perfectly aligned with break.`);
  } else if (swellDiff <= 60) {
    swellDirScore = WEIGHTS.swellDirection * 0.65;
    reasons.push(`Swell direction ${degToCompass(forecast.swellDirection)} — good angle for this break.`);
  } else if (swellDiff <= 90) {
    swellDirScore = WEIGHTS.swellDirection * 0.3;
    reasons.push(`Swell direction marginal — may not fully wrap into the break.`);
  } else {
    swellDirScore = 0;
    reasons.push(`Swell direction ${degToCompass(forecast.swellDirection)} — wrong angle, poor shape expected.`);
  }
  totalScore += swellDirScore;

  // ── 5. Tide Phase ───────────────────────────────────────────────────────────
  // Simplified: use hour of day to approximate tide phase
  const hour = new Date(forecast.forecastHour).getUTCHours();
  let tideScore = 0;

  // For the simplified version, assume:
  // 0–3h: low tide zone, 4–9h: mid tide zone, 10–14h: high tide zone, etc. (rough pattern)
  const currentTidePhase: 'low' | 'mid' | 'high' =
    hour % 12 < 3 ? 'low' : hour % 12 < 9 ? 'mid' : 'high';

  if (safeProfile.optimalTidePhase === 'any' || currentTidePhase === safeProfile.optimalTidePhase) {
    tideScore = WEIGHTS.tidePhase;
    reasons.push(`Tide phase (${currentTidePhase}) matches optimal for this break.`);
  } else {
    tideScore = WEIGHTS.tidePhase * 0.3;
    reasons.push(`Tide phase (${currentTidePhase}) not ideal — optimal is ${safeProfile.optimalTidePhase}.`);
  }
  totalScore += tideScore;

  // ── Map to label ────────────────────────────────────────────────────────────
  const label: SwellQualityScore['label'] =
    totalScore >= 80 ? 'EPIC' :
    totalScore >= 55 ? 'GOOD' :
    totalScore >= 35 ? 'FAIR' : 'POOR';

  // ── Confidence based on wave height and period ──────────────────────────────
  const confidence: SwellQualityScore['confidence'] =
    period >= 10 && h >= 0.5 ? 'HIGH' :
    period >= 7 && h >= 0.3 ? 'MEDIUM' : 'LOW';

  return {
    spotId: '', // Caller should set this
    forecastHour: forecast.forecastHour,
    score: Math.round(totalScore),
    label,
    confidence,
    reasons,
  };
}
