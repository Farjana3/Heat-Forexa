import { INTERVENTIONS, SCORING_WEIGHTS } from './config';

export class MitigationAgent {
  /**
   * Evaluates suitability of all interventions based on causal drivers
   * @param {Object} plannerResult
   * @param {Object} causalResult
   * @param {Object} meteorologicalData
   * @param {number} dateIndex
   * @returns {Array} List of interventions with suitability scores
   */
  static generateRecommendations(plannerResult, causalResult, meteorologicalData = null, dateIndex = 0) {
    const { regime } = plannerResult;
    const { topDriver } = causalResult;

    return INTERVENTIONS.map(intervention => {
      let score = 50; 
      const reasons = [];
      let primaryTarget = "General heat reduction";

      // Match interventions to top causal drivers
      if (topDriver === "Solar Radiation") {
        if (intervention.id === "cool_roofs" || intervention.id === "shade_structures") {
          score += 30;
          primaryTarget = "Solar radiation reflection";
          reasons.push("Directly targets the strongest identified heat driver: Solar Radiation.");
        } else if (intervention.id === "urban_forestry" || intervention.id === "green_roofs") {
          score += 25;
          primaryTarget = "Canopy shading + evapotranspiration";
          reasons.push("Provides canopy shade and evaporative cooling against solar radiation.");
        }
      } else if (topDriver === "Previous Temperature") {
        if (intervention.id === "permeable_pavement") {
          score += 30;
          primaryTarget = "Surface thermal mass reduction";
          reasons.push("Directly counters previous temperature retention by reducing asphalt thermal mass.");
        } else if (intervention.id === "green_roofs" || intervention.id === "cool_roofs") {
          score += 25;
          primaryTarget = "Building thermal insulation";
          reasons.push("Insulates structural surfaces from accumulating heat.");
        }
      } else if (topDriver === "Wind Speed") {
        if (intervention.id === "eco_parks") {
          score += 30;
          primaryTarget = "Coastal wind corridor optimization";
          reasons.push("Maximizes wind corridor passage and coastal breeze buffer zone.");
        } else if (intervention.id === "urban_forestry") {
          score += 25;
          primaryTarget = "Microclimate breeze channeling";
          reasons.push("Channels prevailing winds while offering thermal shade.");
        }
      } else if (topDriver === "Humidity") {
        if (intervention.id === "urban_forestry" || intervention.id === "eco_parks") {
          score += 30;
          primaryTarget = "Vegetative microclimate regulation";
          reasons.push("Optimizes humidity balance and ambient microclimate air circulation.");
        } else if (intervention.id === "rain_gardens") {
          score += 25;
          primaryTarget = "Micro-moisture regulation";
          reasons.push("Cools localized moisture and surface humidity retention.");
        }
      } else if (topDriver === "Rainfall") {
        if (intervention.id === "rain_gardens") {
          score += 30;
          primaryTarget = "Stormwater retention & infiltration";
          reasons.push("Directly mitigates rainfall runoff and cools saturated soil surfaces.");
        } else if (intervention.id === "permeable_pavement") {
          score += 25;
          primaryTarget = "Porous water drainage";
          reasons.push("Enhances stormwater drainage and evaporative cooling.");
        }
      } else {
        primaryTarget = "General ambient cooling";
      }

      // Spatial Regime Compatibility
      const isDirectMatch = intervention.applicableRegimes.includes(regime);
      if (isDirectMatch) {
        score += 20;
        reasons.push(`High compatibility with the selected ${regime} zone.`);
      }

      const finalScore = Math.max(0, Math.min(100, Math.round(score)));
      if (reasons.length === 0) {
        reasons.push("Provides baseline cooling suitable for the zone.");
      }

      return {
        ...intervention,
        suitabilityScore: finalScore,
        primaryTarget,
        reasons
      };
    });
  }
}
