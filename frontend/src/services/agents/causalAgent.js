export class CausalAgent {
  static analyze(causalData) {
    if (!causalData || !causalData.factors) {
      return {
        topDriver: "N/A",
        topContribution: 0,
        factors: [],
        overallConfidence: 0
      };
    }

    const topDriverFactor = causalData.factors[0];

    return {
      topDriver: topDriverFactor ? topDriverFactor.name : "N/A",
      topContribution: topDriverFactor ? topDriverFactor.contribution : 0,
      factors: causalData.factors,
      overallConfidence: causalData.overallConfidence
    };
  }
}
