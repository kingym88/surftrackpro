import { TidePoint } from '@/types';

const STORMGLASS_URL = 'https://api.stormglass.io/v2/tide/extremes/point';
const WORLDTIDES_URL = 'https://www.worldtides.info/api/v3';

export async function fetchTidePredictions(
  lat:  number,
  lon:  number,
  date: string,
): Promise<TidePoint[]> {

  const sgKey = process.env.STORMGLASS_API_KEY;
  if (sgKey && sgKey !== 'PLACEHOLDER_STORMGLASS_API_KEY') {
    try {
      const start = new Date(`${date}T00:00:00Z`).toISOString();
      const end   = new Date(`${date}T23:59:59Z`).toISOString();
      const res = await fetch(`${STORMGLASS_URL}?lat=${lat}&lng=${lon}&start=${start}&end=${end}`, {
        headers: { Authorization: sgKey }
      });
      if (res.ok) {
        const json = await res.json();
        return json.data.map((p: any) => ({
          time:   p.time,
          height: parseFloat(p.height.toFixed(2)),
          type:   p.type === 'high' ? 'HIGH' : p.type === 'low' ? 'LOW' : null,
        }));
      }
    } catch (e) { console.warn('SG fail', e); }
  }

  const wtKey = process.env.WORLDTIDES_API_KEY;
  if (wtKey && wtKey !== 'PLACEHOLDER_WORLDTIDES_API_KEY') {
    try {
      const unix = Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 1000);
      const res = await fetch(`${WORLDTIDES_URL}?extremes&lat=${lat}&lon=${lon}&start=${unix}&length=86400&key=${wtKey}`);
      if (res.ok) {
        const json = await res.json();
        return json.extremes.map((p: any) => ({
          time:   new Date(p.dt * 1000).toISOString(),
          height: parseFloat(p.height.toFixed(2)),
          type:   p.type === 'High' ? 'HIGH' : p.type === 'Low' ? 'LOW' : null,
        }));
      }
    } catch (e) { console.warn('WT fail', e); }
  }

  console.warn('Using synthetic tides.');
  return generateSyntheticTides(date);
}

export function generateSyntheticTides(date: string): TidePoint[] {
  // Reference High Tide: Feb 21, 2026 at 04:41 WET (UTC+0)
  const refTime = Date.UTC(2026, 1, 21, 4, 41, 0); 
  const per = 12.4206012 * 3600000; // 12h 25m 14s total cycle
  const halfPer = per / 2; // ~6h 12m between High and Low
  const amp  = 1.5;
  const pts: TidePoint[] = [];

  // Window starts at beginning of 'date' (UTC boundaries)
  const startOfDay = new Date(`${date}T00:00:00Z`).getTime();
  const endOfWindow = startOfDay + 48 * 3600000; // Request covers 48 hours for chart completeness

  // Align cycle backward/forward from reference
  const diff = startOfDay - refTime;
  const periods = Math.floor(diff / per);
  let currentHigh = refTime + periods * per;

  // We should walk backwards slightly more just in case a Low comes before the First High
  let t = currentHigh - per;
  while (t <= endOfWindow) {
    if (t >= startOfDay) {
      pts.push({ 
        time: new Date(t).toISOString(), 
        height: parseFloat((amp * 2).toFixed(2)), 
        type: 'HIGH' 
      });
    }
    const nextLow = t + halfPer;
    if (nextLow >= startOfDay && nextLow <= endOfWindow) {
      pts.push({ 
        time: new Date(nextLow).toISOString(), 
        height: 0.1, 
        type: 'LOW' 
      });
    }
    t += per;
  }

  // Also pre-fill hourly points so Recharts `TideMiniChart` renders a curve smoothly!
  for (let h = 0; h < 48; h++) {
    const ht = startOfDay + h * 3600000;
    const diffHours = (ht - refTime) / 3600000;
    const height = amp * Math.cos((2 * Math.PI * diffHours) / 12.4206012);
    // Add continuous hourly dots. To avoid duplicates with exact points, mark type null.
    pts.push({ time: new Date(ht).toISOString(), height: parseFloat((height + amp).toFixed(2)), type: null });
  }

  // Sort them sequentially so the chart reads time correctly 
  return pts.sort((a,b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}
