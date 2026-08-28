import { RISK_THRESHOLDS } from './config';

export class ScientistAgent {
  /**
   * Consumes ML prediction output.
   * @param {Object} mlPrediction - Output from mockPredictionService
   * @param {number} currentTemp - Current baseline temperature
   * @returns {Object} scientific analysis based on ML prediction
   */
  static analyze(mlPrediction, currentTemp) {
    if (!mlPrediction || currentTemp === null) {
      return {
        temperature: null,
        predictedTemperature: null,
        riskLevel: "N/A",
        riskProbability: 0,
        confidence: 0
      };
    }

    return {
      temperature: currentTemp,
      predictedTemperature: mlPrediction.predictedTemperature,
      riskLevel: mlPrediction.riskLevel,
      riskProbability: mlPrediction.riskProbability,
      confidence: mlPrediction.confidence
    };
  }
}
