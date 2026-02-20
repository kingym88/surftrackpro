export type UnitSystem = 'metric' | 'imperial';

// Wave / swell height
export function metresToFeet(m: number): number {
  return m * 3.28084;
}

export function metresToDisplayHeight(m: number, system: UnitSystem): string {
  if (system === 'imperial') {
    return `${metresToFeet(m).toFixed(1)} ft`;
  }
  return `${m.toFixed(1)} m`;
}

// Wind / speed
export function kmhToMph(kmh: number): number {
  return kmh * 0.621371;
}

export function kmhToDisplaySpeed(kmh: number, system: UnitSystem): string {
  if (system === 'imperial') {
    return `${kmhToMph(kmh).toFixed(0)} mph`;
  }
  return `${kmh.toFixed(0)} km/h`;
}

// Temperature
export function celsiusToFahrenheit(c: number): number {
  return c * 9 / 5 + 32;
}

export function celsiusToDisplayTemp(c: number, system: UnitSystem): string {
  if (system === 'imperial') {
    return `${celsiusToFahrenheit(c).toFixed(0)}°F`;
  }
  return `${c.toFixed(0)}°C`;
}

// Distance / ride length
export function metresToYards(m: number): number {
  return m * 1.09361;
}

export function metresToDisplayDistance(m: number, system: UnitSystem): string {
  if (system === 'imperial') {
    return `${metresToYards(m).toFixed(0)} yd`;
  }
  return `${m.toFixed(0)} m`;
}

// Geographic Distance
export function kmToDisplayDistance(km: number, system: UnitSystem): string {
  if (system === 'imperial') {
    const mi = km * 0.621371;
    return `${mi.toFixed(1)} mi`;
  }
  return `${km.toFixed(1)} km`;
}

// Height range label (used for wave height display on cards e.g. "3 - 5 FT")
export function forecastHeightRangeLabel(minM: number, maxM: number, system: UnitSystem): string {
  if (system === 'imperial') {
    const minF = Math.round(metresToFeet(minM));
    const maxF = Math.round(metresToFeet(maxM));
    return `${minF} - ${maxF} FT`;
  }
  // Metric display, eg "1.0 - 1.5 M"
  return `${minM.toFixed(1)} - ${maxM.toFixed(1)} M`;
}
