// Planner Agent Service - Evaluates geographic and land context

export class PlannerAgent {
  /**
   * Analyze the selected tile spatial parameters.
   * @param {Object} tileInfo - Metadata from the coordinate registry
   * @param {number} currentTemp - Selected day prediction temperature
   * @returns {Object} planning context
   */
  static analyze(tileInfo, currentTemp) {
    if (!tileInfo) {
      return {
        tileId: null,
        location: "Unknown",
        regime: "Commercial District",
        planningContext: "No coordinate selected. Please click on a spatiotemporal grid tile to analyze planning conditions.",
        priority: "Low"
      };
    }

    const { tile_id, latitude, longitude, regime } = tileInfo;
    const locationStr = `${latitude.toFixed(4)}°N, ${Math.abs(longitude).toFixed(4)}°W`;
    
    // Determine priority based on general temperature
    let priority = "Low";
    if (currentTemp !== null) {
      if (currentTemp >= 33) priority = "Critical";
      else if (currentTemp >= 31) priority = "High";
      else if (currentTemp >= 29) priority = "Medium";
    }

    // Determine planning focus based on synthetic/proxy regime
    let focus = "";
    if (regime === "Urban Heat Island") {
      focus = "This zone is classified as an active Urban Heat Island (UHI). Planning must focus heavily on macro-level albedo increases (reflective roofs) and shade buffers to combat heat trapping.";
    } else if (regime === "Coastal Breeze Zone") {
      focus = "This zone benefits from natural ventilation corridors and oceanic breeze sinks. Planning should focus on preserving wind paths and enhancing green shoreline buffers.";
    } else if (regime === "Commercial District") {
      focus = "High density of built structures and impervious surfaces. Planning should prioritize cool/green roof mandates and shade structures in high-pedestrian public corridors.";
    } else if (regime === "Residential Canopy") {
      focus = "Moderate residential density. Planning should target sidewalk forestry expansions, backyard tree plantings, and porous driveways.";
    } else if (regime === "Urban Park") {
      focus = "Existing vegetated area. Planning should focus on adding eco-park enhancements, cooling water bodies (bioswales), and maintaining shade sails.";
    } else {
      focus = "General urban zone. Standard shading and pavement interventions are suitable.";
    }

    const planningContext = `Tile #${tile_id} is located at ${locationStr} in a designated ${regime} proxy zone. ${focus}`;

    return {
      tileId: tile_id,
      location: locationStr,
      regime,
      planningContext,
      priority
    };
  }
}
