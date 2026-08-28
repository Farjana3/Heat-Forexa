import React, { useState } from 'react';
import { Database, FileCheck, HelpCircle, Activity, GitBranch, Cpu, Compass } from 'lucide-react';

export default function PipelineVisualizer() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      title: "Data Ingestion",
      short: "Ingestion",
      icon: Database,
      detailsTitle: "Spatiotemporal Raw Data Aggregation",
      description: "Aggregates historical microclimate heat readings (sampled across 2,187 tile coordinates by FortyGuard) alongside macro-environmental variables (ambient temperature, wind speed, relative humidity, precipitation, and solar radiation) extracted from Open-Meteo API covering the summers of 2024 to 2026."
    },
    {
      title: "Quality Audit",
      short: "QA Cleaning",
      icon: FileCheck,
      detailsTitle: "Thermodynamic Quality Assurance",
      description: "Executes data profiling, duplicates resolution, and physical boundary checks. Validates that temperature values correspond to physically realistic bounds (15°C to 45°C) and aligns dates continuously to guarantee the absence of temporal gaps or leakage in subsequent lag features."
    },
    {
      title: "Feature Engine",
      short: "Spatiotemporal Features",
      icon: Activity,
      detailsTitle: "Leakage-Safe Feature Engineering",
      description: "Computes temporal lags (1 to 7 days), rolling statistics (3 and 7-day mean, max, min, std dev), and cyclic calendar components (sine/cosine representations of Day of Year/Month/Week). Computes spatial neighbor features using KNN (k=5 neighbors) based on prior day lag temperatures to protect against temporal leakage."
    },
    {
      title: "Causal Analysis",
      short: "Causal Test",
      icon: GitBranch,
      detailsTitle: "Granger Causality & AD-Fuller Tests",
      description: "Performs Augmented Dickey-Fuller (ADF) tests to confirm stationarity of temperature differentials. Runs Granger Causality VAR tests to statistically prove that environmental features (such as apparent temperature and shortwave solar radiation) Granger-cause target temperatures at a p < 0.05 threshold."
    },
    {
      title: "XGBoost Modeling",
      short: "XGBoost Delta",
      icon: Cpu,
      detailsTitle: "Delta-Offset Machine Learning Regressor",
      description: "Trains an XGBoost gradient boosted regression tree to predict the target delta (T_t+1 - T_t) rather than raw absolute values. This prevents temporal trend drift. The absolute next-day temperature is reconstructed by summing the predicted delta with the current day's temperature."
    },
    {
      title: "2027 Projection",
      short: "2027 Forecasts",
      icon: Compass,
      detailsTitle: "Future Simulation & Extrapolation",
      description: "Generates daily spatiotemporal forecasts for June & July 2027 by extrapolating 2026 baseline profiles, adding a global warming trend offset (+0.3°C), and overlaying sinusoidal heatwave weather dynamics to model realistic multi-step forecasting scenarios."
    }
  ];

  const ActiveIcon = steps[activeStep].icon;

  return (
    <div className="glass-panel visualizer-card animate-fade-in" style={{ gridColumn: '1 / -1' }}>
      <h3 className="card-title">
        <Activity size={18} style={{ color: 'var(--primary)' }} /> Interactive Machine Learning Pipeline
      </h3>
      
      <div className="pipeline-container">
        {/* Step-by-step Flow Node Train */}
        <div className="pipeline-steps">
          {steps.map((step, idx) => {
            const StepIcon = step.icon;
            const isActive = idx === activeStep;
            
            return (
              <React.Fragment key={idx}>
                <div
                  className={`pipeline-step-node ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveStep(idx)}
                >
                  <div className="pipeline-node-icon">
                    <StepIcon size={20} />
                  </div>
                  <span className="pipeline-node-title">{step.short}</span>
                </div>
                {idx < steps.length - 1 && <div className="pipeline-arrow" />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Selected Step Explanation Box */}
        <div className="pipeline-details-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <ActiveIcon size={16} style={{ color: 'var(--primary)' }} />
            <span className="pipeline-details-title">
              {steps[activeStep].detailsTitle}
            </span>
          </div>
          <p className="pipeline-details-desc">
            {steps[activeStep].description}
          </p>
        </div>
      </div>
    </div>
  );
}
