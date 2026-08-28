import React, { useState, useEffect } from 'react';
import { performADF, performGranger } from '../utils/statistics';
import { Activity, HelpCircle, Info, TrendingUp, Zap, ChevronRight } from 'lucide-react';

const VARIABLE_LABELS = {
  temperature_2m_mean: "Air Temperature (2m)",
  apparent_temperature_mean: "Apparent Temperature",
  precipitation_sum: "Precipitation",
  wind_speed_10m_max: "Wind Speed",
  shortwave_radiation_sum: "Solar Radiation",
  sunshine_duration: "Sunshine Duration"
};

export default function StatisticalSuite({
  selectedTileId,
  historicalData = {},
  dailyMeteorologicalData = null
}) {
  const [selectedYear, setSelectedYear] = useState('2026'); // default to 2026 (latest historical)
  
  // ADF States
  const [adfLag, setAdfLag] = useState(1);
  const [adfTrend, setAdfTrend] = useState(false);
  const [adfResult, setAdfResult] = useState(null);
  
  // Granger States
  const [grangerVar, setGrangerVar] = useState('apparent_temperature_mean');
  const [grangerLag, setGrangerLag] = useState(2);
  const [grangerTrend, setGrangerTrend] = useState(false);
  const [grangerResult, setGrangerResult] = useState(null);

  // Compute tests when parameters change
  useEffect(() => {
    const tileHistory = historicalData?.tile_history?.[selectedTileId];
    const tempSeries = tileHistory?.[selectedYear];
    
    if (!tempSeries || tempSeries.length === 0) {
      setAdfResult({ error: 'No temperature data found for active tile.' });
      setGrangerResult({ error: 'No temperature data found for active tile.' });
      return;
    }

    // Filter nulls (e.g. from missing labels)
    const validTempSeries = tempSeries.filter(v => v !== null && !isNaN(v));

    if (validTempSeries.length < 10) {
      setAdfResult({ error: 'Insufficient data points to perform test.' });
      setGrangerResult({ error: 'Insufficient data points to perform test.' });
      return;
    }

    // Run ADF Test
    const adf = performADF(validTempSeries, parseInt(adfLag), adfTrend);
    setAdfResult(adf);

    // Run Granger Causality
    if (selectedYear === '2027') {
      setGrangerResult({ 
        error: 'Forecast Mode active. Exogenous weather features are unavailable for 2027 projection. Select 2024-2026 to evaluate historical causality.' 
      });
    } else if (!dailyMeteorologicalData) {
      setGrangerResult({ error: 'Meteorological baseline data is loading...' });
    } else {
      const exogSeries = dailyMeteorologicalData[selectedYear]?.[grangerVar];
      if (!exogSeries) {
        setGrangerResult({ error: `Exogenous series ${grangerVar} not found.` });
      } else {
        // Granger expects series of equal lengths
        // Align them: the historical temperature series for summer has 61 days
        const alignedTemp = validTempSeries.slice(0, exogSeries.length);
        const alignedExog = exogSeries.slice(0, alignedTemp.length);

        const granger = performGranger(alignedTemp, alignedExog, parseInt(grangerLag), grangerTrend);
        setGrangerResult(granger);
      }
    }
  }, [
    selectedTileId,
    historicalData,
    dailyMeteorologicalData,
    selectedYear,
    adfLag,
    adfTrend,
    grangerVar,
    grangerLag,
    grangerTrend
  ]);

  return (
    <div className="statistical-suite-section animate-fade-in" style={{ marginTop: '1.5rem' }}>
      {/* Title block */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
          <Activity className="glow-text-orange" size={20} /> Time Series Statistical Diagnostics Suite
        </h2>
        
        {/* Controls Panel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Tile: <span style={{ color: 'var(--primary)' }}>#{selectedTileId}</span></span>
          <div style={{ width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Select Year:</span>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              className="stat-select"
            >
              <option value="2026">2026 (Observed)</option>
              <option value="2025">2025 (Observed)</option>
              <option value="2024">2024 (Observed)</option>
              <option value="2027">2027 (Forecast)</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="diagnostics-grid">
        {/* ADF Test Panel */}
        <div className="glass-panel visualizer-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                Augmented Dickey-Fuller (ADF) Test
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.2rem', lineHeight: '1.3' }}>
                Evaluates if the temperature time series is stationary (no unit root) or has a temporal trend requiring differencing.
              </p>
            </div>
            <span className="info-tag hover-trigger" style={{ cursor: 'help', color: '#6b7280' }}>
              <HelpCircle size={15} />
              <span className="tooltip-content">
                H₀ (Null Hypothesis): The series contains a unit root (is non-stationary).
                Rejecting H₀ (p &lt; 0.05) indicates stationarity.
              </span>
            </span>
          </div>

          {/* Controls row */}
          <div className="stat-controls-row" style={{ display: 'flex', gap: '1rem', margin: '1rem 0', background: 'rgba(0,0,0,0.15)', padding: '0.6rem', borderRadius: '6px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Lag Order:</label>
              <select value={adfLag} onChange={(e) => setAdfLag(e.target.value)} className="stat-select-small">
                {[1, 2, 3, 4, 5].map(l => <option key={l} value={l}>Lag {l}</option>)}
              </select>
            </div>
            <div style={{ flex: 1.5 }}>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Regression Model:</label>
              <select value={adfTrend ? 'ct' : 'c'} onChange={(e) => setAdfTrend(e.target.value === 'ct')} className="stat-select-small">
                <option value="c">Constant Only (c)</option>
                <option value="ct">Constant + Linear Trend (ct)</option>
              </select>
            </div>
          </div>

          {/* Results Block */}
          {adfResult && !adfResult.error ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>ADF Test Statistic</span>
                  <strong style={{ fontSize: '1.25rem', color: '#fff', textShadow: '0 0 10px rgba(255,255,255,0.05)' }}>
                    {adfResult.adfStatistic.toFixed(4)}
                  </strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>P-Value</span>
                  <strong style={{ fontSize: '1.25rem', color: adfResult.pValue < 0.05 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {adfResult.pValue.toFixed(5)}
                  </strong>
                </div>
              </div>

              {/* Stationarity Badge */}
              <div 
                style={{ 
                  background: adfResult.isStationary ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${adfResult.isStationary ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  borderRadius: '6px',
                  padding: '0.5rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: adfResult.isStationary ? 'var(--accent-green)' : 'var(--accent-red)' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: adfResult.isStationary ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {adfResult.isStationary ? 'Stationary Series' : 'Non-Stationary Series'}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#d1d5db', lineHeight: '1.2', marginTop: '0.1rem' }}>
                    {adfResult.isStationary 
                      ? 'Rejects H₀. Temperature fluctuates around a stable historical mean (no unit root).' 
                      : 'Fails to reject H₀. Series contains a unit-root trend requiring differencing.'
                    }
                  </span>
                </div>
              </div>

              {/* Critical values table */}
              <table className="insights-table" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                <thead>
                  <tr>
                    <th>Critical Threshold</th>
                    <th>1% Level</th>
                    <th>5% Level</th>
                    <th>10% Level</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Value Anchors</strong></td>
                    <td style={{ color: adfResult.adfStatistic <= adfResult.criticalValues['1%'] ? 'var(--accent-green)' : '#9ca3af' }}>{adfResult.criticalValues['1%'].toFixed(2)}</td>
                    <td style={{ color: adfResult.adfStatistic <= adfResult.criticalValues['5%'] ? 'var(--accent-green)' : '#9ca3af' }}>{adfResult.criticalValues['5%'].toFixed(2)}</td>
                    <td style={{ color: adfResult.adfStatistic <= adfResult.criticalValues['10%'] ? 'var(--accent-green)' : '#9ca3af' }}>{adfResult.criticalValues['10%'].toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.8rem' }}>
              {adfResult?.error || 'Calculating unit-root test...'}
            </div>
          )}
        </div>

        {/* Granger Causality Panel */}
        <div className="glass-panel visualizer-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                Granger Causality Analysis
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.2rem', lineHeight: '1.3' }}>
                Tests whether past values of meteorological variables contain predictive information for temperature changes.
              </p>
            </div>
            <span className="info-tag hover-trigger" style={{ cursor: 'help', color: '#6b7280' }}>
              <HelpCircle size={15} />
              <span className="tooltip-content">
                H₀ (Null Hypothesis): Past values of X do not Granger-cause Y.
                Significant p-value (&lt; 0.05) indicates X helps predict Y.
              </span>
            </span>
          </div>

          {/* Controls Row */}
          <div className="stat-controls-row" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '0.5rem', margin: '1rem 0', background: 'rgba(0,0,0,0.15)', padding: '0.6rem', borderRadius: '6px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Exogenous (X):</label>
              <select 
                value={grangerVar} 
                onChange={(e) => setGrangerVar(e.target.value)} 
                className="stat-select-small"
                disabled={selectedYear === '2027'}
              >
                {Object.entries(VARIABLE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Lag Order:</label>
              <select 
                value={grangerLag} 
                onChange={(e) => setGrangerLag(e.target.value)} 
                className="stat-select-small"
                disabled={selectedYear === '2027'}
              >
                {[1, 2, 3, 4, 5].map(l => <option key={l} value={l}>Lag {l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Trend:</label>
              <select 
                value={grangerTrend ? 'ct' : 'c'} 
                onChange={(e) => setGrangerTrend(e.target.value === 'ct')} 
                className="stat-select-small"
                disabled={selectedYear === '2027'}
              >
                <option value="c">No Trend</option>
                <option value="ct">With Trend</option>
              </select>
            </div>
          </div>

          {/* Results Block */}
          {grangerResult && !grangerResult.error ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Granger F-Statistic</span>
                  <strong style={{ fontSize: '1.25rem', color: '#fff' }}>
                    {grangerResult.fStatistic.toFixed(4)}
                  </strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>P-Value (Pr &gt; F)</span>
                  <strong style={{ fontSize: '1.25rem', color: grangerResult.significant ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {grangerResult.pValue.toFixed(5)}
                  </strong>
                </div>
              </div>

              {/* Causality Indicator */}
              <div 
                style={{ 
                  background: grangerResult.significant ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${grangerResult.significant ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  borderRadius: '6px',
                  padding: '0.5rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: grangerResult.significant ? 'var(--accent-green)' : 'var(--accent-red)' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: grangerResult.significant ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {grangerResult.significant ? 'Predictive Information Confirmed' : 'No Statistical Causality'}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#d1d5db', lineHeight: '1.2', marginTop: '0.1rem' }}>
                    {grangerResult.significant
                      ? `Reject H₀. Past values of ${VARIABLE_LABELS[grangerVar]} help predict temperature changes on this tile.`
                      : `Fail to reject H₀. Past ${VARIABLE_LABELS[grangerVar]} values do not provide predictive skill beyond temp history.`
                    }
                  </span>
                </div>
              </div>

              {/* Degrees of freedom details */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#9ca3af', padding: '0.2rem 0' }}>
                <span>Obs: <strong>{grangerResult.nobs}</strong> days</span>
                <span>Restricted SSR: <strong>{grangerResult.ssrRestricted.toFixed(2)}</strong></span>
                <span>Unrestricted SSR: <strong>{grangerResult.ssrUnrestricted.toFixed(2)}</strong></span>
              </div>
            </div>
          ) : (
            <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#6b7280', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center', minHeight: 120 }}>
              {grangerResult?.error ? (
                <>
                  <Info size={18} style={{ alignSelf: 'center', color: 'var(--accent-yellow)' }} />
                  <span>{grangerResult.error}</span>
                </>
              ) : (
                'Calculating causality regression...'
              )}
            </div>
          )}
        </div>
      </div>

      {/* Styled Tooltip Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .info-tag {
          position: relative;
          display: inline-block;
        }
        .info-tag .tooltip-content {
          visibility: hidden;
          width: 260px;
          background-color: #0b1120;
          color: #d1d5db;
          text-align: left;
          border: 1px solid var(--primary);
          border-radius: 6px;
          padding: 0.6rem;
          font-size: 0.7rem;
          line-height: 1.3;
          position: absolute;
          z-index: 10;
          right: 0;
          top: 120%;
          opacity: 0;
          transition: opacity 0.2s ease, visibility 0.2s ease;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }
        .info-tag:hover .tooltip-content {
          visibility: visible;
          opacity: 1;
        }
        .stat-select {
          background: #0d1527;
          border: 1px solid var(--border-light);
          color: #f3f4f6;
          font-size: 0.8rem;
          font-weight: 600;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          outline: none;
          cursor: pointer;
          font-family: inherit;
        }
        .stat-select:focus {
          border-color: var(--primary);
        }
        .stat-select-small {
          background: #090e1a;
          border: 1px solid var(--border-light);
          color: #e5e7eb;
          font-size: 0.75rem;
          padding: 0.25rem 0.4rem;
          border-radius: 4px;
          width: 100%;
          outline: none;
          cursor: pointer;
          font-family: inherit;
        }
        .stat-select-small:focus {
          border-color: var(--primary);
        }
        .stat-select-small:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        @media (max-width: 768px) {
          .diagnostics-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}} />
    </div>
  );
}
