import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import type { TidePoint } from '@/types';
import { useUnits } from '@/src/hooks/useUnits';

interface TideMiniChartProps {
  tides: TidePoint[];
  /** Guest users see today only (24h) */
  isGuest?: boolean;
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export const TideMiniChart: React.FC<TideMiniChartProps> = ({
  tides,
  isGuest = false,
}) => {
  const units = useUnits();

  if (!tides || tides.length === 0) {
    return <div className="h-24 bg-surface rounded-xl animate-pulse" />;
  }

  const displayTides = isGuest ? tides.slice(0, 24) : tides;

  const data = displayTides.map(t => ({
    time: formatTime(t.time),
    height: parseFloat(t.height.toFixed(2)),
    type: t.type,
  }));

  const hiLoPoints = displayTides.filter(t => t.type !== null);

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-primary uppercase tracking-wider">
          Tide Chart
        </p>
        {isGuest && (
          <span className="text-[10px] text-slate-500 italic">Today only</span>
        )}
      </div>

      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 0, left: -30, bottom: 0 }}>
            <defs>
              <linearGradient id="tideGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tick={{ fill: '#64748b', fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              interval={Math.floor(data.length / 4)}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              width={30}
            />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '8px', padding: '4px 8px' }}
              itemStyle={{ color: 'var(--color-text)', fontSize: '10px', fontWeight: 'bold' }}
              labelStyle={{ display: 'none' }}
              formatter={(val: number) => [units.height(val), 'Height']}
            />
            {/* Hi/Lo reference lines */}
            {hiLoPoints.map((t, i) => (
              <ReferenceLine
                key={i}
                x={formatTime(t.time)}
                stroke={t.type === 'HIGH' ? '#22d3ee' : '#334155'}
                strokeDasharray="3 3"
                label={{
                  value: t.type === 'HIGH' ? `▲${units.height(t.height)}` : `▼${units.height(t.height)}`,
                  position: t.type === 'HIGH' ? 'top' : 'bottom',
                  fill: t.type === 'HIGH' ? '#22d3ee' : '#64748b',
                  fontSize: 8,
                }}
              />
            ))}
            <Area
              type="monotone"
              dataKey="height"
              stroke="#1d4ed8"
              strokeWidth={2}
              fill="url(#tideGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
