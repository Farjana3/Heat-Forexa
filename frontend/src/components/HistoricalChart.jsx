import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function HistoricalChart({
  selectedTileId,
  historicalData = {},
  selectedDateIndex,
  mitigationOffset = 0
}) {
  const labels = historicalData.labels || [];
  const tileHistory = (historicalData.tile_history && historicalData.tile_history[selectedTileId]) || null;

  // Format data for Recharts LineChart
  const chartData = labels.map((label, idx) => {
    const temp2027 = tileHistory ? tileHistory["2027"][idx] : null;
    return {
      name: label,
      idx: idx,
      "2024": tileHistory ? tileHistory["2024"][idx] : null,
      "2025": tileHistory ? tileHistory["2025"][idx] : null,
      "2026": tileHistory ? tileHistory["2026"][idx] : null,
      "2027": temp2027,
      "2027_baseline": (temp2027 !== null && mitigationOffset > 0) ? Math.round((temp2027 + mitigationOffset) * 100) / 100 : null
    };
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const isCurrentDay = dataPoint.idx === selectedDateIndex;
      
      return (
        <div className="glass-panel" style={{ padding: '0.75rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', border: '1px solid var(--primary)' }}>
          <div style={{ fontWeight: 700, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.25rem', marginBottom: '0.25rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>{label}</span>
            {isCurrentDay && <span style={{ color: 'var(--primary)', fontSize: '0.7rem' }}>SELECTED DATE</span>}
          </div>
          {payload.map((entry) => {
            const isBaseline2027 = entry.dataKey === "2027_baseline";
            const isScenario2027 = entry.dataKey === "2027";
            
            let displayName = entry.name;
            let displayColor = entry.color;
            let valueColor = 'var(--text-main)';
            
            if (isScenario2027 && mitigationOffset > 0) {
              valueColor = 'var(--primary)';
            }
            
            return (
              <div key={entry.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
                <span style={{ color: displayColor, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: displayColor }} />
                  {displayName}:
                </span>
                <span style={{ fontWeight: 700, color: valueColor }}>
                  {entry.value !== null ? `${Number(entry.value).toFixed(1)}°C` : 'N/A'}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  if (!tileHistory) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: '0.9rem' }}>
        Select a location tile to load historical trajectories
      </div>
    );
  }

  return (
    <div className="chart-wrapper">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" />
          <XAxis 
            dataKey="name" 
            stroke="#6b7280" 
            fontSize={11} 
            tickLine={false} 
            interval={Math.round(labels.length / 6)}
          />
          <YAxis 
            stroke="#6b7280" 
            fontSize={11} 
            tickLine={false} 
            domain={['dataMin - 1', 'dataMax + 1']}
            tickFormatter={(v) => `${v.toFixed(0)}°C`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="top" 
            height={36} 
            iconSize={10} 
            fontSize={12} 
            iconType="circle"
          />
          {/* Historical Lines */}
          <Line 
            type="monotone" 
            dataKey="2024" 
            name="2024 (Observed)" 
            stroke="rgba(59, 130, 246, 0.45)" 
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false} 
          />
          <Line 
            type="monotone" 
            dataKey="2025" 
            name="2025 (Observed)" 
            stroke="rgba(16, 185, 129, 0.55)" 
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false} 
          />
          <Line 
            type="monotone" 
            dataKey="2026" 
            name="2026 (Observed)" 
            stroke="rgba(245, 158, 11, 0.65)" 
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false} 
          />
          {/* Target 2027 Lines */}
          {mitigationOffset > 0 && (
            <Line 
              type="monotone" 
              dataKey="2027_baseline" 
              name="Baseline ML Forecast" 
              stroke="rgba(239, 68, 68, 0.45)" 
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={false}
            />
          )}
          <Line 
            type="monotone" 
            dataKey="2027" 
            name={mitigationOffset > 0 ? "Scenario Estimate" : "2027 (Forecasted)"} 
            stroke={mitigationOffset > 0 ? "var(--primary)" : "var(--accent-red)"} 
            strokeWidth={3}
            dot={false}
            // Add custom dot highlight on the active selected index
            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 1.5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
