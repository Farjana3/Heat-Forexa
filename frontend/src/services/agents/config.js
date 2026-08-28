// Configuration parameters for Heat-Forexa Agentic AI Urban Mitigation Advisor

export const RISK_THRESHOLDS = {
  EXTREME: { temp: 33.5, anomaly: 2.0, label: "Extreme" },
  HIGH: { temp: 32.0, anomaly: 0.8, label: "High" },
  MODERATE: { temp: 29.5, label: "Moderate" },
  LOW: { label: "Low Risk" }
};

export const INTERVENTIONS = [
  {
    id: "urban_forestry",
    name: "Urban Forestry Expansion",
    description: "Increase native shade trees to provide direct canopy coverage and lower temperatures via evapotranspiration.",
    estimatedCoolingImpact: 1.2, // in °C
    cost: "Medium",
    difficulty: "Medium",
    applicableRegimes: ["Residential Canopy", "Urban Park", "Coastal Breeze Zone"],
    minimumRiskLevel: "MODERATE",
    iconName: "Trees"
  },
  {
    id: "permeable_pavement",
    name: "Permeable Pavement",
    description: "Replace impervious asphalt with porous concrete or block pavers to reduce surface heat retention and capture moisture.",
    estimatedCoolingImpact: 0.5,
    cost: "Low",
    difficulty: "Easy",
    applicableRegimes: ["Commercial District", "Residential Canopy"],
    minimumRiskLevel: "LOW",
    iconName: "Square"
  },
  {
    id: "rain_gardens",
    name: "Bioswales & Rain Gardens",
    description: "Construct planted depression zones to filter runoff water, cool the soil, and create microclimate buffers.",
    estimatedCoolingImpact: 0.3,
    cost: "Low",
    difficulty: "Easy",
    applicableRegimes: ["Commercial District", "Residential Canopy", "Urban Park"],
    minimumRiskLevel: "LOW",
    iconName: "Droplet"
  },
  {
    id: "cool_roofs",
    name: "Cool / Reflective Roofs",
    description: "Coat roofs with highly reflective elastomeric paint to increase surface albedo and minimize solar heat gain.",
    estimatedCoolingImpact: 0.6,
    cost: "Low",
    difficulty: "Easy",
    applicableRegimes: ["Commercial District", "Residential Canopy"],
    minimumRiskLevel: "MODERATE",
    iconName: "Home"
  },
  {
    id: "green_roofs",
    name: "Green Roof Systems",
    description: "Install soil layers and drought-tolerant vegetation on structural roofs for insulation and evaporative cooling.",
    estimatedCoolingImpact: 0.7,
    cost: "High",
    difficulty: "Hard",
    applicableRegimes: ["Commercial District", "Residential Canopy"],
    minimumRiskLevel: "HIGH",
    iconName: "Layers"
  },
  {
    id: "eco_parks",
    name: "Eco-Park Buffer Enhancements",
    description: "Expand coastal greenways and retention parks to maximize cooling breeze corridors.",
    estimatedCoolingImpact: 0.7,
    cost: "High",
    difficulty: "Medium",
    applicableRegimes: ["Urban Park", "Coastal Breeze Zone"],
    minimumRiskLevel: "LOW",
    iconName: "Flower"
  },
  {
    id: "shade_structures",
    name: "Tensioned Shade Structures",
    description: "Erect canvas awnings or shade sails over key pedestrian paths and transit stops to block direct solar radiation.",
    estimatedCoolingImpact: 0.4,
    cost: "Medium",
    difficulty: "Easy",
    applicableRegimes: ["Commercial District", "Residential Canopy"],
    minimumRiskLevel: "LOW",
    iconName: "Umbrella"
  }
];

export const SCORING_WEIGHTS = {
  // Severity adjustments
  riskLevelBonus: {
    EXTREME: 35,
    HIGH: 25,
    MODERATE: 15,
    LOW: 0
  },
  // Anomaly multiplier (score += anomaly * anomalyWeight)
  anomalyWeight: 10,
  
  // Regime compatibility bonuses
  regimeMatchBonus: 30,
  regimeSecondaryBonus: 10,
  
  // Weather triggers
  highRadiationBonus: 15,    // Triggered if solar radiation is high
  highPrecipitationBonus: 15  // Triggered if regional rainfall is high
};
