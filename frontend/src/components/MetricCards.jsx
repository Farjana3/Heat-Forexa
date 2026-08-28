import React from 'react';
import { Thermometer, ShieldAlert, TrendingUp, AlertTriangle } from 'lucide-react';

export default function MetricCards({
  selectedDateIndex,
  selectedTileId,
  coordinates = [],
  tileForecasts = {},
  dailySummary = []
}) {
  const currentSummary = dailySummary[selectedDateIndex] || {};
  const globalMean = currentSummary.mean || 0;
  
  const selectedTile = coordinates.find(t => t.tile_id === selectedTileId);
  const selectedTemp = selectedTile && tileForecasts[selectedTileId]
    ? tileForecasts[selectedTileId][selectedDateIndex]
    : null;

  // Compute thermal spatial anomaly (tile temp - global mean)
  const tileAnomaly = selectedTemp !== null ? (selectedTemp - globalMean) : 0;
  
  // Compute Heat Risk Level
  const getRiskLevel = (temp, anomaly, regime) => {
    if (temp === null) return { level: "N/A", desc: "No coordinate selected", class: "glow-text-cyan", icon: ShieldAlert };
    
    // UHI regime or high temperature
    if (temp >= 33.5 || anomaly >= 2.0) {
      return {
        level: "Extreme",
        desc: "Active UHI. Critical mitigation required.",
        class: "glow-text-red",
        icon: AlertTriangle
      };
    } else if (temp >= 32.0 || anomaly >= 0.8) {
      return {
        level: "High",
        desc: "Elevated temperatures. Limit outdoor exposure.",
        class: "glow-text-orange",
        icon: AlertTriangle
      };
    } else if (temp >= 29.5 || regime === "Commercial District") {
      return {
        level: "Moderate",
        desc: "Normal urban conditions. Hydrate regularly.",
        class: "glow-text-amber",
        icon: TrendingUp
      };
    } else {
      return {
        level: "Low Risk",
        desc: "Cool coastal or park breeze buffering.",
        class: "glow-text-green",
        icon: ShieldAlert
      };
    }
  };

  const risk = getRiskLevel(selectedTemp, tileAnomaly, selectedTile?.regime);
  const RiskIcon = risk.icon;

  return (
    <div className="metrics-grid">
      {/* Metric 1: Selected Tile Forecast */}
      <div className="glass-card metric-card-inner card-uhi">
        <span className="metric-label">
          <Thermometer size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> 
          Local Temperature
        </span>
        <div className="metric-value-container">
          <span className="metric-value" style={{ color: selectedTemp > 31 ? 'var(--accent-red)' : 'var(--accent-orange)' }}>
            {selectedTemp !== null ? selectedTemp.toFixed(1) : '--.-'}
          </span>
          {selectedTemp !== null && <span className="metric-unit">°C</span>}
        </div>
        <span className="metric-desc">
          {selectedTile ? `Tile #${selectedTileId} (${selectedTile.regime.split(' ')[0]})` : "Select a location coordinate"}
        </span>
      </div>

      {/* Metric 2: Global Spatial Mean */}
      <div className="glass-card metric-card-inner card-mean">
        <span className="metric-label">
          <TrendingUp size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> 
          Metropolitan Mean
        </span>
        <div className="metric-value-container">
          <span className="metric-value" style={{ color: 'var(--primary)' }}>
            {globalMean ? globalMean.toFixed(1) : '--.-'}
          </span>
          {globalMean > 0 && <span className="metric-unit">°C</span>}
        </div>
        <span className="metric-desc">
          Downtown Miami region spatial baseline
        </span>
      </div>

      {/* Metric 3: Spatial Anomaly */}
      <div className="glass-card metric-card-inner card-anomaly">
        <span className="metric-label">
          <Thermometer size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> 
          Thermal Offset
        </span>
        <div className="metric-value-container">
          <span className="metric-value" style={{ color: tileAnomaly >= 0 ? 'var(--accent-red)' : 'var(--accent-cyan)' }}>
            {selectedTemp !== null ? `${tileAnomaly >= 0 ? '+' : ''}${tileAnomaly.toFixed(2)}` : '0.00'}
          </span>
          <span className="metric-unit">°C</span>
        </div>
        <span className="metric-desc">
          Difference from metropolitan baseline
        </span>
      </div>

      {/* Metric 4: Risk Gauge */}
      <div className="glass-card metric-card-inner card-risk">
        <span className="metric-label">
          <RiskIcon size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> 
          Heat Vulnerability
        </span>
        <div className="metric-value-container">
          <span className={`metric-value ${risk.class}`} style={{ fontSize: '1.25rem', fontWeight: 800, padding: '0.55rem 0' }}>
            {risk.level}
          </span>
        </div>
        <span className="metric-desc">
          {risk.desc}
        </span>
      </div>
    </div>
  );
}
