export class CoordinatorAgent {
  /**
   * Synthesize final advisor results.
   * @param {Object} plannerResult
   * @param {Object} scientistResult
   * @param {Object} causalResult
   * @param {Array} recommendations
   * @returns {Object} final coordination result
   */
  static synthesize(plannerResult, scientistResult, causalResult, recommendations) {
    const { tileId, regime, location } = plannerResult;
    const { predictedTemperature, riskLevel, riskProbability } = scientistResult;
    const { topDriver, topContribution } = causalResult;

    // Sort by suitability score descending
    const sortedRecommendations = [...recommendations].sort((a, b) => b.suitabilityScore - a.suitabilityScore);
    const topRec = sortedRecommendations[0];

    const decisionScore = topRec ? topRec.suitabilityScore : 0;
    const explanation = topRec ? 
      `${topDriver} is the strongest identified contributor to heat risk. ${topRec.name} directly targets this and has high compatibility with the ${regime} zone.` 
      : "No suitable interventions found.";

    // Generate collaboration log timestamps/actions based on exact data passed
    const collaborationLog = [
      { sender: "Planner Agent", text: `Analyzing Tile #${tileId} context.\nLocation: ${location}\nRegime: ${regime}`, color: 'var(--primary)' },
      { sender: "Scientist Agent", text: `ML model predicts ${predictedTemperature}°C with ${riskProbability}% heat-risk probability (Level: ${riskLevel}).`, color: 'var(--accent-cyan)' },
      { sender: "Causal Agent", text: `Identified ${topDriver} as the strongest positive contributor (+${topContribution}°C).`, color: 'var(--accent-yellow)' },
      { sender: "Mitigation Agent", text: `Evaluating cooling interventions compatible with the identified causal drivers.`, color: 'var(--accent-green)' },
      { sender: "Coordinator Agent", text: `Ranking mitigation scenarios based on predicted heat reduction, suitability, cost, and feasibility. Selected ${topRec?.name}.`, color: '#10b981' }
    ];

    return {
      decision: {
        selectedIntervention: topRec ? topRec.name : "None",
        decisionScore,
        explanation,
        baselineRisk: riskLevel,
        targetRiskLevel: (riskLevel === "EXTREME" || riskLevel === "HIGH") ? "MODERATE" : "LOW",
        projectedRisk: (riskLevel === "EXTREME" || riskLevel === "HIGH") ? "MODERATE" : "LOW"
      },
      recommendations: sortedRecommendations,
      summary: `Tile #${tileId} is currently facing ${riskLevel} heat risk. The pipeline has selected ${topRec?.name} to counter ${topDriver}.`,
      collaborationLog
    };
  }
}
