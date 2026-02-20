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

export function generateSyntheticTides(date: string, offset = 0): TidePoint[] {
  const base = new Date(`${date}T00:00:00Z`);
  const amp  = 1.5;
  const per  = 12.42;
  const pts: TidePoint[] = [];
  for (let h = 0; h < 48; h++) {
    const t = new Date(base.getTime() + h * 3600000);
    const hours = h + offset;
    const height = amp * Math.cos((2 * Math.PI * hours) / per);
    const prev = amp * Math.cos((2 * Math.PI * (hours - 0.5)) / per);
    const next = amp * Math.cos((2 * Math.PI * (hours + 0.5)) / per);
    let type: any = null;
    if (height > prev && height > next && height > amp * 0.85) type = 'HIGH';
    else if (height < prev && height < next && height < -amp * 0.85) type = 'LOW';
    pts.push({ time: t.toISOString(), height: parseFloat((height + amp).toFixed(2)), type });
  }
  return pts;
}
