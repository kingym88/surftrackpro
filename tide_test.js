const refDt = Date.UTC(2026, 1, 21, 4, 41, 0); // Feb 21 2026, 04:41 WET
const testBase = Date.UTC(2026, 1, 20, 0, 0, 0); // Feb 20 2026, 00:00 WET

for (let h = 0; h < 48; h++) {
  const t = testBase + h * 3600000;
  const diffHours = (t - refDt) / 3600000;
  const height = 1.5 * Math.cos((2 * Math.PI * diffHours) / 12.42);
  const prev = 1.5 * Math.cos((2 * Math.PI * (diffHours - 0.5)) / 12.42);
  const next = 1.5 * Math.cos((2 * Math.PI * (diffHours + 0.5)) / 12.42);
  let type = null;
  if (height > prev && height > next && height > 1.5 * 0.85) type = 'HIGH';
  else if (height < prev && height < next && height < -1.5 * 0.85) type = 'LOW';
  
  if (type) console.log(`Hour ${h}: ${type} at height ${height.toFixed(2)}`);
}
