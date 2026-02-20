import { useUserProfile } from '../context/UserProfileContext';
import * as Units from '../utils/units';

export function useUnits() {
  const { profile } = useUserProfile();
  const system: Units.UnitSystem = profile?.unitSystem ?? 'metric';

  return {
    system,
    height: (m: number) => Units.metresToDisplayHeight(m, system),
    speed: (kmh: number) => Units.kmhToDisplaySpeed(kmh, system),
    temp: (c: number) => Units.celsiusToDisplayTemp(c, system),
    distance: (m: number) => Units.metresToDisplayDistance(m, system),
    geoDistance: (km: number) => Units.kmToDisplayDistance(km, system),
    heightRange: (minM: number, maxM: number) => Units.forecastHeightRangeLabel(minM, maxM, system),
  };
}
