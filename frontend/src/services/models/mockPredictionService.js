export function generateMockPrediction(currentTemp, regime, baseDateIndex) {
  if (currentTemp === null) {
      return {
          currentTemperature: null,
          predictedTemperature: null,
          riskProbability: 0,
          riskLevel: "UNKNOWN",
          confidence: 0,
          horizon: "Next 24 hours",
          mode: "demo"
      };
  }

  const horizon = "Next 24 hours";
  let confidence = 85 + Math.random() * 10; 
  
  // Predict slightly higher or lower based on simple heuristics for demo
  let predictedTemp = currentTemp + (Math.random() * 1.5 - 0.2);
  
  if (regime === "Urban Heat Island") {
      predictedTemp += 0.5;
  }

  // Round to 1 dec
  predictedTemp = Math.round(predictedTemp * 10) / 10;
  confidence = Math.round(confidence); 
  
  // calculate risk based on predicted temp
  let riskLevel = "LOW";
  let riskProb = 10;
  if (predictedTemp >= 33.5) {
      riskLevel = "EXTREME";
      riskProb = 90 + Math.random() * 8;
  } else if (predictedTemp >= 32.0) {
      riskLevel = "HIGH";
      riskProb = 75 + Math.random() * 14;
  } else if (predictedTemp >= 29.5) {
      riskLevel = "MODERATE";
      riskProb = 40 + Math.random() * 30;
  } else {
      riskProb = 10 + Math.random() * 25;
  }
  
  riskProb = Math.round(riskProb);

  return {
    currentTemperature: Math.round(currentTemp * 10) / 10,
    predictedTemperature: predictedTemp,
    riskProbability: riskProb,
    riskLevel: riskLevel,
    confidence: confidence,
    horizon: horizon,
    mode: "demo"
  };
}
