import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ShieldCheck, Cpu, GitBranch, Key } from 'lucide-react';

export default function ModelInsights({
  modelMetrics = {},
  causalInsights = {}
}) {
  const comparison = modelMetrics.comparison || [];
  const featureImportance = modelMetrics.feature_importance || [];
  const granger = causalInsights.granger_results || [];

  // Filter for unique variables in Granger causality showing if they have any significant lag
  const grangerSummary = [];
  const seenVars = new Set();
  granger.forEach(row => {
    if (!seenVars.has(row.exogenous_variable)) {
      seenVars.add(row.exogenous_variable);
      // Find if this variable has ANY significant lag (p_value < 0.05)
      const hasSigLag = granger.some(r => r.exogenous_variable === row.exogenous_variable && r.p_value < 0.05);
      const minP = Math.min(...granger.filter(r => r.exogenous_variable === row.exogenous_variable).map(r => r.p_value));
      
      grangerSummary.push({
        variable: row.exogenous_variable.replace(/_/g, ' '),
        raw_name: row.exogenous_variable,
        significant: hasSigLag,
        min_p: minP
      });
    }
  });

  // Recharts data transformation for Feature Importance
  const barData = featureImportance
    .map(feat => ({
      name: feat.Feature.replace(/_/g, ' ').replace('temperature', 'temp'),
      value: parseFloat(feat.Importance)
    }))
    .slice(0, 8); // Top 8 features

  return (
    <div className="bottom-grid animate-fade-in">
      {/* Panel 1: Model Benchmarks & Granger Causality */}
      <div className="glass-panel visualizer-card">
        <h3 className="card-title">
          <Cpu size={18} style={{ color: 'var(--primary)' }} /> Model Evaluation & Benchmarks
        </h3>
        
        {/* Model Metrics Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Spatiotemporal Validation Metrics</span>
          <table className="insights-table">
            <thead>
              <tr>
                <th>Model Architecture</th>
                <th>Val MAE</th>
                <th>Val RMSE</th>
                <th>Val R²</th>
                <th>Test R²</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row, idx) => (
                <tr key={idx} style={row.Model.includes("XGBoost") ? { borderLeft: '2px solid var(--primary)', backgroundColor: 'rgba(34, 211, 238, 0.03)' } : {}}>
                  <td>
                    <strong style={{ color: row.Model.includes("XGBoost") ? 'var(--primary)' : 'var(--text-main)' }}>
                      {row.Model}
                    </strong>
                  </td>
                  <td>{row.Val_MAE.toFixed(4)}</td>
                  <td>{row.Val_RMSE.toFixed(4)}</td>
                  <td style={{ color: row.Val_R2 > 0.4 ? '#34d399' : '#f87171' }}>{row.Val_R2.toFixed(4)}</td>
                  <td style={{ color: row.Test_R2 > 0.05 ? '#34d399' : '#f87171' }}>{row.Test_R2.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Granger Causality List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <GitBranch size={14} /> Granger Causality Test Summary (X → Temperature)
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {grangerSummary.slice(0, 6).map((item, idx) => (
              <div key={idx} className="glass-card" style={{ padding: '0.5rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                <span style={{ textTransform: 'capitalize', color: '#d1d5db' }}>{item.variable}</span>
                <span className={`regime-tag ${item.significant ? 'regime-park' : 'regime-uhi'}`} style={{ fontSize: '0.65rem' }}>
                  {item.significant ? 'Causes Temp' : 'No Causality'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel 2: XGBoost Feature Importance Bar Chart */}
      <div className="glass-panel visualizer-card">
        <h3 className="card-title">
          <Key size={18} style={{ color: 'var(--primary)' }} /> Core Predictors & Feature Importance
        </h3>
        
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Top XGBoost Relative Split Importance</span>
        
        <div className="chart-wrapper" style={{ height: '240px' }}>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 0, right: 10, left: 30, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                <XAxis type="number" stroke="#6b7280" fontSize={10} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={10} tickLine={false} width={120} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ background: '#0a0f1d', borderColor: 'var(--primary)', fontSize: '0.8rem' }}
                />
                <Bar 
                  dataKey="value" 
                  name="Relative Importance" 
                  fill="var(--primary)" 
                  radius={[0, 4, 4, 0]}
                  maxBarSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
              Loading features...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
