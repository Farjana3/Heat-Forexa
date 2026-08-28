import { PlannerAgent } from './plannerAgent';
import { ScientistAgent } from './scientistAgent';
import { CausalAgent } from './causalAgent';
import { MitigationAgent } from './mitigationAgent';
import { CoordinatorAgent } from './coordinatorAgent';
import { generateMockPrediction } from '../models/mockPredictionService';
import { generateMockCausalAnalysis } from '../models/mockCausalService';
import { RISK_THRESHOLDS, INTERVENTIONS } from './config';

export function runAdvisor(tileId, coordinates, forecasts, dateIndex, meteorologicalData = null) {
  const tileInfo = coordinates.find(c => c.tile_id === tileId);
  const tileForecast = forecasts.tile_forecasts?.[tileId];
  const currentTemp = tileForecast ? tileForecast[dateIndex] : null;

  // 1. DATA -> ML MODEL -> ML PREDICTION
  const mlPrediction = generateMockPrediction(currentTemp, tileInfo?.regime, dateIndex);

  // 2. ML PREDICTION -> CAUSAL MODEL -> CAUSAL FACTORS
  const causalData = generateMockCausalAnalysis(currentTemp, mlPrediction.predictedTemperature, tileInfo?.regime);

  // 3. AGENTS PIPELINE
  const plannerAnalysis = PlannerAgent.analyze(tileInfo, currentTemp);
  const scientistAnalysis = ScientistAgent.analyze(mlPrediction, currentTemp);
  const causalAnalysis = CausalAgent.analyze(causalData);
  
  const rawRecommendations = MitigationAgent.generateRecommendations(
    plannerAnalysis,
    causalAnalysis,
    meteorologicalData,
    dateIndex
  );

  const synthesis = CoordinatorAgent.synthesize(
    plannerAnalysis,
    scientistAnalysis,
    causalAnalysis,
    rawRecommendations
  );

  return {
    tile: tileInfo || null,
    mlPrediction,
    causalData,
    plannerAnalysis,
    scientistAnalysis,
    causalAnalysis,
    recommendations: synthesis.recommendations,
    coordinatorDecision: synthesis.decision,
    summary: synthesis.summary,
    collaborationLog: synthesis.collaborationLog
  };
}

export function simulateScenario(baselineForecast, selectedInterventionIds = [], dateIndex = 14) {
  let totalImpact = 0;
  const activeInterventions = INTERVENTIONS.filter(item => 
    selectedInterventionIds.includes(item.id)
  );
  activeInterventions.forEach(item => {
    totalImpact += item.estimatedCoolingImpact;
  });

  totalImpact = Math.round(totalImpact * 100) / 100;

  let baseline = 0;
  let scenario = 0;

  if (Array.isArray(baselineForecast)) {
    baseline = baselineForecast;
    scenario = baselineForecast.map(temp => 
      temp !== null ? Math.round((temp - totalImpact) * 100) / 100 : null
    );
  } else {
    baseline = baselineForecast;
    scenario = baselineForecast !== null ? Math.round((baselineForecast - totalImpact) * 100) / 100 : null;
  }

  const getRiskLevelForTemp = (temp) => {
    if (temp === null) return "N/A";
    if (temp >= 33.5) return "EXTREME";
    if (temp >= 32.0) return "HIGH";
    if (temp >= 29.5) return "MODERATE";
    return "LOW";
  };

  const idx = typeof dateIndex === 'number' ? dateIndex : 14;
  const singleBaselineTemp = Array.isArray(baselineForecast) ? baselineForecast[idx] : baselineForecast; 
  const singleScenarioTemp = Array.isArray(scenario) ? scenario[idx] : scenario;

  const baselineRisk = getRiskLevelForTemp(singleBaselineTemp);
  const scenarioRisk = getRiskLevelForTemp(singleScenarioTemp);

  const disclaimer = "Intervention effect is a heuristic/demo estimate and is not an ML prediction.";

  return {
    baseline,
    scenario,
    totalEstimatedReduction: totalImpact,
    baselineRisk,
    scenarioRisk,
    selectedInterventions: activeInterventions,
    disclaimer
  };
}
