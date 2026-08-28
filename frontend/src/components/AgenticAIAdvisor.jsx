import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, Cpu, CheckSquare, Square, 
  Trees, Droplet, Home, Layers, 
  Leaf, Umbrella, AlertTriangle, 
  TrendingUp, ShieldAlert, Sparkles, Activity, Info, HelpCircle,
  ArrowRight, BarChart2, GitCommit
} from 'lucide-react';
import { runAdvisor, simulateScenario } from '../services/agents/advisorPipeline';

const IconMap = {
  Trees: Trees,
  Square: Square,
  Droplet: Droplet,
  Home: Home,
  Layers: Layers,
  Flower: Leaf,
  Umbrella: Umbrella
};

export default function AgenticAIAdvisor({
  selectedTileId,
  coordinates = [],
  tileForecasts = {},
  selectedDateIndex,
  dates = [],
  dailySummary = [],
  dailyMeteorologicalData = null,
  onMitigationOffsetChange
}) {
  const forecasts = {
    tile_forecasts: tileForecasts,
    daily_summary: dailySummary,
    dates: dates
  };

  const [advisorResult, setAdvisorResult] = useState(null);
  
  const [selectedInterventions, setSelectedInterventions] = useState([]);
  const [simulationResult, setSimulationResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const [visibleLogs, setVisibleLogs] = useState([]);
  const [isAgentReasoning, setIsAgentReasoning] = useState(false);
  const terminalEndRef = useRef(null);
  const logIntervalRef = useRef(null);

  useEffect(() => {
    setSelectedInterventions([]);
    setSimulationResult(null);
    if (onMitigationOffsetChange) onMitigationOffsetChange(0);

    if (coordinates.length === 0 || !tileForecasts[selectedTileId]) return;

    const result = runAdvisor(
      selectedTileId,
      coordinates,
      forecasts,
      selectedDateIndex,
      dailyMeteorologicalData
    );

    setAdvisorResult(result);
    animateLogs(result.collaborationLog);

    return () => {
      if (logIntervalRef.current) clearInterval(logIntervalRef.current);
    };
  }, [selectedTileId, selectedDateIndex, coordinates]);

  useEffect(() => {
    if (terminalEndRef.current) {
      const container = terminalEndRef.current.parentElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [visibleLogs, isAgentReasoning]);

  const animateLogs = (fullLog) => {
    if (logIntervalRef.current) clearInterval(logIntervalRef.current);
    
    setVisibleLogs([]);
    setIsAgentReasoning(true);
    
    let index = 0;
    logIntervalRef.current = setInterval(() => {
      if (index < fullLog.length) {
        const nextLog = fullLog[index];
        if (nextLog) setVisibleLogs(prev => [...prev, nextLog]);
        index++;
      } else {
        setIsAgentReasoning(false);
        clearInterval(logIntervalRef.current);
      }
    }, 450);
  };

  const handleToggle = (id) => {
    if (selectedInterventions.includes(id)) {
      setSelectedInterventions(prev => prev.filter(x => x !== id));
    } else {
      setSelectedInterventions(prev => [...prev, id]);
    }
  };

  const handleSimulate = () => {
    if (!advisorResult || !tileForecasts[selectedTileId]) return;
    const tileForecast = tileForecasts[selectedTileId];
    const currentTemp = tileForecast[selectedDateIndex];

    setIsSimulating(true);
    
    const sim = simulateScenario(currentTemp, selectedInterventions, selectedDateIndex);
    const curveSim = simulateScenario(tileForecast, selectedInterventions, selectedDateIndex);
    
    setTimeout(() => {
      setSimulationResult(sim);
      setIsSimulating(false);
      
      if (onMitigationOffsetChange) {
        onMitigationOffsetChange(curveSim.totalEstimatedReduction);
      }
    }, 400); 
  };

  if (!advisorResult) {
    return (
      <div className="glass-panel visualizer-card" style={{ padding: '1.25rem', marginTop: '1.5rem', textAlign: 'center' }}>
        <HelpCircle size={32} style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }} />
        <p style={{ color: 'var(--text-secondary)' }}>No spatial telemetry available. Select a location coordinate to engage the Mitigation Advisor.</p>
      </div>
    );
  }

  const { 
    plannerAnalysis, 
    scientistAnalysis, 
    causalAnalysis, 
    recommendations, 
    coordinatorDecision,
    mlPrediction 
  } = advisorResult;

  const getRiskColor = (level) => {
    switch (level?.toUpperCase()) {
      case "EXTREME": return "#EF4444";
      case "HIGH": return "#F97316";
      case "MODERATE": return "#FACC15";
      case "LOW": return "#22C55E";
      default: return "var(--text-secondary)";
    }
  };

  return (
    <div className="glass-panel visualizer-card" style={{ padding: '1.25rem', marginTop: '1.5rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <Cpu size={18} style={{ color: 'var(--primary)' }} /> Agentic AI Urban Mitigation Advisor
        </h3>
        <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(34, 211, 238, 0.1)', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: '4px', fontWeight: 600 }}>
          DECISION SUPPORT SYSTEM
        </span>
      </div>
      


      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }} className="agent-grid-layout">
        
        {/* Left Side: Models, Causality, Recommendations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {/* ML Prediction Card */}
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>ML HEAT-RISK PREDICTION</span>
                <span style={{ fontSize: '0.55rem', padding: '0.1rem 0.3rem', background: '#1e293b', color: 'var(--text-secondary)', borderRadius: '2px' }}>DEMO MODEL</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.7rem' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>Current:</span>
                  <div style={{ fontWeight: 600 }}>{mlPrediction?.currentTemperature?.toFixed(1) || '--'}°C</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>Predicted:</span>
                  <div style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{mlPrediction?.predictedTemperature?.toFixed(1) || '--'}°C</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>Risk Prob:</span>
                  <div style={{ fontWeight: 600 }}>{mlPrediction?.riskProbability || '--'}%</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>Risk Level:</span>
                  <div style={{ fontWeight: 700, color: getRiskColor(mlPrediction?.riskLevel) }}>{mlPrediction?.riskLevel || '--'}</div>
                </div>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', marginTop: '0.5rem', fontStyle: 'italic', lineHeight: '1.2' }}>
                Model predicts a {mlPrediction && mlPrediction.predictedTemperature > mlPrediction.currentTemperature ? '+' : ''}{((mlPrediction?.predictedTemperature || 0) - (mlPrediction?.currentTemperature || 0)).toFixed(1)}°C shift over the {mlPrediction?.horizon}. Confidence: {mlPrediction?.confidence}%.
              </p>
            </div>

            {/* Causal Analysis Card */}
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>CAUSAL ANALYSIS</span>
                <span style={{ fontSize: '0.55rem', padding: '0.1rem 0.3rem', background: '#1e293b', color: 'var(--text-secondary)', borderRadius: '2px' }}>DEMO CAUSAL</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {causalAnalysis?.factors?.slice(0,4).map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.65rem' }}>
                    <span style={{ color: 'var(--text-secondary)', width: '45%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
                    <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.05)', margin: '0 0.5rem', borderRadius: '2px', position: 'relative' }}>
                      <div style={{ 
                        position: 'absolute', 
                        right: f.contribution < 0 ? '50%' : 'auto',
                        left: f.contribution >= 0 ? '50%' : 'auto',
                        width: `${Math.min(Math.abs(f.contribution) * 40, 50)}%`, 
                        height: '100%', 
                        background: f.contribution >= 0 ? '#ef4444' : '#22c55e', 
                        borderRadius: '2px' 
                      }} />
                    </div>
                    <span style={{ color: f.contribution >= 0 ? '#ef4444' : '#22c55e', fontWeight: 600, width: '30px', textAlign: 'right' }}>
                      {f.contribution > 0 ? '+' : ''}{f.contribution.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', marginTop: '0.5rem', fontStyle: 'italic', lineHeight: '1.2' }}>
                Top driver: <strong style={{color: 'var(--accent-yellow)'}}>{causalAnalysis?.topDriver}</strong>. Estimated contribution: {causalAnalysis?.topContribution > 0 ? '+' : ''}{causalAnalysis?.topContribution?.toFixed(2)}°C.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>AI Mitigation Recommendations</span>
            <span className="regime-tag" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', background: 'rgba(34, 211, 238, 0.1)', color: 'var(--primary)' }}>
              Interactive Simulator
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {recommendations.slice(0, 3).map((rec) => {
              const isSelected = selectedInterventions.includes(rec.id);
              const RecIcon = IconMap[rec.iconName] || Shield;

              return (
                <div 
                  key={rec.id}
                  className={`glass-card recommendation-box \${isSelected ? 'active' : ''}`}
                  onClick={() => handleToggle(rec.id)}
                  style={{ 
                    padding: '0.75rem', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    gap: '0.75rem', 
                    alignItems: 'flex-start',
                    borderLeft: isSelected ? '3px solid var(--accent-green)' : '1px solid var(--border-light)',
                    backgroundColor: isSelected ? 'rgba(16,185,129,0.03)' : 'var(--bg-card)'
                  }}
                >
                  <div style={{ marginTop: 2 }}>
                    {isSelected ? (
                      <CheckSquare size={16} style={{ color: 'var(--accent-green)' }} />
                    ) : (
                      <Square size={16} style={{ color: '#6b7280' }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isSelected ? '#fff' : '#d1d5db', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <RecIcon size={14} style={{ color: isSelected ? 'var(--accent-green)' : 'var(--primary)' }} />
                        {rec.name}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                        {rec.estimatedCoolingImpact}°C Cooling
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', marginTop: '0.35rem', fontSize: '0.65rem' }}>
                      <div><span style={{color: '#6b7280'}}>Suitability:</span> <strong style={{color: 'var(--accent-green)'}}>{rec.suitabilityScore}%</strong></div>
                      <div><span style={{color: '#6b7280'}}>Target:</span> <strong style={{color: 'var(--text-secondary)'}}>{rec.primaryTarget}</strong></div>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: '0.4rem', fontStyle: 'italic', lineHeight: '1.2' }}>
                      <strong>Why:</strong> {rec.reasons[0]}
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.4rem', fontSize: '0.65rem', color: '#6b7280' }}>
                      <span>Cost: <strong style={{ color: 'var(--text-secondary)' }}>{rec.cost}</strong></span>
                      <span>•</span>
                      <span>Difficulty: <strong style={{ color: 'var(--text-secondary)' }}>{rec.difficulty}</strong></span>
                      <span>•</span>
                      <span style={{color: '#fbbf24'}}>Heuristic Estimate</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleSimulate}
            disabled={selectedInterventions.length === 0 || isSimulating}
            style={{
              background: selectedInterventions.length === 0 ? '#1e293b' : 'var(--primary)',
              color: selectedInterventions.length === 0 ? '#6b7280' : '#000',
              border: 'none',
              padding: '0.6rem 1.2rem',
              borderRadius: '6px',
              fontWeight: 700,
              cursor: selectedInterventions.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              marginTop: '0.5rem'
            }}
          >
            {isSimulating ? "Recalculating Scenario..." : "SIMULATE SCENARIO"}
          </button>

          {simulationResult && (
            <div className="glass-card animate-fade-in" style={{ padding: '0.75rem', border: '1px solid var(--primary)', backgroundColor: 'rgba(34, 211, 238, 0.02)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.35rem' }}>
                <strong style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>Scenario Simulation</strong>
                <span className="regime-tag" style={{ fontSize: '0.65rem', padding: '0.05rem 0.4rem', background: '#1e293b', color: 'var(--text-secondary)' }}>
                  HEURISTIC ESTIMATE
                </span>
              </div>
              <div className="scenario-result-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '1rem', textAlign: 'center', fontSize: '0.75rem', margin: '0.5rem 0' }}>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>ML Prediction</div>
                  <strong style={{ fontSize: '1rem' }}>{simulationResult.baseline.toFixed(1)}°C</strong>
                  <div style={{ color: getRiskColor(simulationResult.baselineRisk), fontSize: '0.65rem', fontWeight: 600 }}>{simulationResult.baselineRisk}</div>
                </div>
                <div style={{ borderLeft: '1px dashed rgba(255,255,255,0.08)', borderRight: '1px dashed rgba(255,255,255,0.08)' }}>
                  <div style={{ color: 'var(--accent-green)', fontSize: '0.65rem' }}>Intervention Effect</div>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--accent-green)' }}>↓ {simulationResult.totalEstimatedReduction.toFixed(1)}°C</strong>
                </div>
                <div>
                  <div style={{ color: 'var(--primary)', fontSize: '0.65rem' }}>Projected Scenario</div>
                  <strong style={{ fontSize: '1rem', color: 'var(--primary)' }}>{simulationResult.scenario.toFixed(1)}°C</strong>
                  <div style={{ color: getRiskColor(simulationResult.scenarioRisk), fontSize: '0.65rem', fontWeight: 600 }}>{simulationResult.scenarioRisk}</div>
                </div>
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-main)', marginTop: '0.5rem', padding: '0.3rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                Risk Transition: <strong style={{color: getRiskColor(simulationResult.baselineRisk)}}>{simulationResult.baselineRisk}</strong> ➔ <strong style={{color: getRiskColor(simulationResult.scenarioRisk)}}>{simulationResult.scenarioRisk}</strong>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'flex-start', marginTop: '0.5rem', fontSize: '0.65rem', color: 'var(--text-secondary)', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '0.4rem' }}>
                <Info size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{simulationResult.disclaimer}</span>
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Agent Collaboration Logs & Final Decision */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem' }}>
              Agent Collaboration Log
            </span>
            <div 
              className="agent-terminal"
              style={{ 
                background: '#040710', 
                border: '1px solid var(--border-light)', 
                borderRadius: '8px', 
                padding: '0.75rem', 
                fontFamily: 'monospace', 
                fontSize: '0.7rem', 
                height: '350px', 
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}
            >
              {visibleLogs.map((log, idx) => {
                if (!log) return null;
                return (
                  <div key={idx} style={{ lineHeight: '1.4', color: '#d1d5db' }}>
                    <span style={{ color: log.color || '#fff', fontWeight: 'bold' }}>[{log.sender}]</span>
                    <br />
                    <span style={{ whiteSpace: 'pre-wrap' }}>{log.text}</span>
                  </div>
                );
              })}
              {isAgentReasoning && (
                <div style={{ display: 'flex', gap: '0.2rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  <span>Agent reasoning...</span>
                  <span className="dot-pulse" />
                </div>
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>

          {/* Coordinator Final Decision */}
          <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', borderBottom: '1px solid rgba(16, 185, 129, 0.1)', paddingBottom: '0.5rem' }}>
              <Sparkles size={16} style={{ color: 'var(--accent-green)' }} /> 
              <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.8rem' }}>FINAL RECOMMENDATION</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.6rem', fontSize: '0.75rem' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Recommended Intervention:</span>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', marginTop: '0.1rem' }}>{coordinatorDecision?.selectedIntervention}</div>
              </div>
              
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Why:</span>
                <div style={{ color: 'var(--accent-green)', fontStyle: 'italic', marginTop: '0.1rem', lineHeight: '1.4' }}>"{coordinatorDecision?.explanation}"</div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                <div>
                  <span style={{ color: '#6b7280', fontSize: '0.65rem' }}>Decision Score</span>
                  <div style={{ color: '#fff', fontWeight: 700 }}>{coordinatorDecision?.decisionScore}%</div>
                </div>
                <div>
                  <span style={{ color: '#6b7280', fontSize: '0.65rem' }}>Target Risk Level</span>
                  <div style={{ color: '#fff', fontWeight: 700 }}>
                    <span style={{ color: getRiskColor(coordinatorDecision?.targetRiskLevel || coordinatorDecision?.projectedRisk) }}>
                      {coordinatorDecision?.targetRiskLevel || coordinatorDecision?.projectedRisk}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .recommendation-box {
          transition: var(--transition-smooth);
        }
        .recommendation-box:hover {
          background: rgba(255,255,255,0.02);
          border-color: rgba(255,255,255,0.12);
        }
        .recommendation-box.active:hover {
          border-color: var(--accent-green);
          background: rgba(16,185,129,0.05);
        }
        .dot-pulse {
          display: inline-block;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--primary);
          animation: terminal-pulse 1s infinite alternate;
        }
        @keyframes terminal-pulse {
          0% { opacity: 0.2; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1.2); }
        }
        .agent-terminal::-webkit-scrollbar {
          width: 5px;
        }
        .agent-terminal::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
        }
        @media (max-width: 900px) {
          .agent-grid-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}} />
    </div>
  );
}
