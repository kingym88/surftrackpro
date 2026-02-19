import React from 'react';
import type { ForecastSnapshot, SwellQualityScore } from '@/types';
import { computeSwellQuality } from '@/src/services/swellQuality';

// Default break profile for Porto/Peniche area
const DEFAULT_BREAK_PROFILE = {
  breakType: 'beach' as const,
  facingDirection: 'W',
  optimalSwellDirection: 'W-NW',
  optimalTidePhase: 'mid' as const,
  optimalWindDirection: 'E-NE',
};

interface DayCard {
  label: string;
  date: string;
  score: SwellQualityScore;
  snapshots: ForecastSnapshot[];
}

interface ForecastStripProps {
  forecasts: ForecastSnapshot[];
  spotId?: string;
  onDaySelect?: (date: string) => void;
  /** Guest users see only today/tomorrow */
  isGuest?: boolean;
}

function getLabelColour(label: SwellQualityScore['label']): string {
  switch (label) {
    case 'EPIC': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'GOOD': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'FAIR': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'POOR': return 'bg-red-500/20 text-red-400 border-red-500/30';
  }
}

function getWindIcon(windDir: number): string {
  const dirs = ['north', 'north_east', 'east', 'south_east', 'south', 'south_west', 'west', 'north_west'];
  return dirs[Math.round((windDir % 360) / 45) % 8];
}

function formatDay(isoString: string, index: number): string {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-GB', { weekday: 'short' });
}

export const ForecastStrip: React.FC<ForecastStripProps> = ({
  forecasts,
  onDaySelect,
  isGuest = false,
}) => {
  if (!forecasts || forecasts.length === 0) {
    return (
      <div className="h-24 bg-surface rounded-xl animate-pulse" />
    );
  }

  // Group by day (UTC date)
  const byDay: Record<string, ForecastSnapshot[]> = {};
  for (const f of forecasts) {
    const dayKey = f.forecastHour.slice(0, 10);
    if (!byDay[dayKey]) byDay[dayKey] = [];
    byDay[dayKey].push(f);
  }

  const days = Object.entries(byDay).slice(0, 7);

  const dayCards: DayCard[] = days.map(([date, snaps], i) => {
    // Use the mid-morning snapshot (or first available) as the representative
    const midMorning = snaps.find(s => {
      const h = new Date(s.forecastHour).getUTCHours();
      return h >= 8 && h <= 10;
    }) ?? snaps[0];

    const score = computeSwellQuality(midMorning, DEFAULT_BREAK_PROFILE);
    score.spotId = 'strip';

    return {
      label: formatDay(date, i),
      date,
      score,
      snapshots: snaps,
    };
  });

  const FREE_DAYS = 2;

  return (
    <div className="overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
      <div className="flex gap-3 snap-x snap-mandatory" style={{ minWidth: 'max-content' }}>
        {dayCards.map((day, i) => {
          const isLocked = isGuest && i >= FREE_DAYS;

          if (isLocked) {
            return (
              <div
                key={day.date}
                className="snap-start flex-shrink-0 w-20 rounded-xl bg-surface/50 border border-border p-3 flex flex-col items-center gap-2 relative overflow-hidden"
              >
                <div className="blur-sm opacity-40 flex flex-col items-center gap-2 w-full">
                  <p className="text-xs font-medium text-textMuted">{day.label}</p>
                  <div className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getLabelColour(day.score.label)}`}>
                    {day.score.label}
                  </div>
                  <p className="text-xs font-bold text-text">
                    {day.snapshots[0]?.waveHeight?.toFixed(1)}m
                  </p>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="material-icons-round text-slate-500 text-base">lock</span>
                </div>
              </div>
            );
          }

          const repSnap = day.snapshots[0];

          return (
            <button
              key={day.date}
              onClick={() => onDaySelect?.(day.date)}
              className="snap-start flex-shrink-0 w-20 rounded-xl bg-surface border border-border p-3 flex flex-col items-center gap-2 hover:bg-surface hover:brightness-110 active:scale-[0.97] transition-all"
            >
              <p className="text-xs font-medium text-textMuted">{day.label}</p>
              <div className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getLabelColour(day.score.label)}`}>
                {day.score.label}
              </div>
              <p className="text-sm font-bold text-text">
                {repSnap?.waveHeight?.toFixed(1)}m
              </p>
              <p className="text-[10px] text-slate-500">
                {repSnap?.wavePeriod?.toFixed(0)}s
              </p>
              <span className="material-icons-round text-textMuted text-sm">
                {getWindIcon(repSnap?.windDirection ?? 0)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
