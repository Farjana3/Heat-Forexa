export function generateMockCausalAnalysis(currentTemp, predictedTemp, regime) {
  if (currentTemp === null) {
      return {
          factors: [],
          topDriver: "N/A",
          overallConfidence: 0,
          mode: "demo"
      };
  }

  // Vary causal drivers based on spatial land regime
  let solar = 0.2 + Math.random() * 0.25;
  let humidity = 0.15 + Math.random() * 0.2;
  let wind = -(0.08 + Math.random() * 0.15);
  let rain = -(0.04 + Math.random() * 0.1);
  let previous = 0.12 + Math.random() * 0.2;
  
  if (regime === "Urban Heat Island") {
      solar += 0.25;
      previous += 0.3; // High thermal mass retention
  } else if (regime === "Coastal Breeze Zone") {
      wind = -(0.35 + Math.random() * 0.25); // Strong wind cooling effect
      humidity += 0.15;
  } else if (regime === "Urban Park") {
      humidity += 0.25; // Evapotranspiration
      solar *= 0.6;
  } else if (regime === "Residential Canopy") {
      solar += 0.15;
      humidity += 0.1;
  }

  // Ensure factors somewhat match the delta (predicted - current) loosely
  const diff = predictedTemp - currentTemp;
  if (diff < 0) {
      solar *= 0.3;
      wind *= 2;
      rain *= 2;
  }

  // Round values
  const r = (val) => Math.round(val * 100) / 100;

  const factors = [
    { name: "Solar Radiation", contribution: r(solar), direction: "increases", confidence: Math.round(80 + Math.random()*15) },
    { name: "Humidity", contribution: r(humidity), direction: "increases", confidence: Math.round(75 + Math.random()*15) },
    { name: "Previous Temperature", contribution: r(previous), direction: "increases", confidence: Math.round(85 + Math.random()*10) },
    { name: "Wind Speed", contribution: r(wind), direction: "decreases", confidence: Math.round(70 + Math.random()*15) },
    { name: "Rainfall", contribution: r(rain), direction: "decreases", confidence: Math.round(65 + Math.random()*15) }
  ];

  // Sort by absolute contribution magnitude
  factors.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return {
    factors,
    topDriver: factors[0].name,
    overallConfidence: Math.round(80 + Math.random()*10),
    mode: "demo"
  };
}
