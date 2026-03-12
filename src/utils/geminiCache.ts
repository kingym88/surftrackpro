const CACHE_PREFIX = 'stp_gemini_';

export function getGeminiCache(key: string): string | null {
  try {
    return localStorage.getItem(`${CACHE_PREFIX}${key}`);
  } catch {
    return null;
  }
}

export function setGeminiCache(key: string, value: string): void {
  try {
    // Remove all previous stp_gemini entries to keep storage clean
    Object.keys(localStorage)
      .filter(k => k.startsWith(CACHE_PREFIX) && k !== `${CACHE_PREFIX}${key}`)
      .forEach(k => localStorage.removeItem(k));
    localStorage.setItem(`${CACHE_PREFIX}${key}`, value);
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

export function buildHomeCacheKey(spotId: string): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `home_${spotId}_${today}`;
}

export function buildCoachCacheKey(
  homeSpotId: string,
  sessionCount: number,
  timeframe: string
): string {
  const today = new Date().toISOString().slice(0, 10);
  return `coach_${homeSpotId}_${today}_${sessionCount}_${timeframe}`;
}
