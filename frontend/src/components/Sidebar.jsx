import React, { useState } from 'react';
import { Calendar, MapPin, Layers, Search, Filter } from 'lucide-react';

export default function Sidebar({
  selectedDateIndex,
  setSelectedDateIndex,
  dates = [],
  selectedTileId,
  setSelectedTileId,
  selectedRegime,
  setSelectedRegime,
  coordinates = [],
  tileForecasts = {}
}) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const currentDate = dates[selectedDateIndex] || '';

  // Format date nicely (e.g. "Jun 15, 2027")
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  };

  // Filter coordinates based on search query and selected regime
  const filteredCoords = coordinates.filter(tile => {
    const matchesRegime = !selectedRegime || tile.regime === selectedRegime;
    const matchesSearch = searchQuery === '' || 
      tile.tile_id.toString().includes(searchQuery) ||
      tile.latitude.toFixed(4).includes(searchQuery) ||
      tile.longitude.toFixed(4).includes(searchQuery);
    return matchesRegime && matchesSearch;
  });

  const selectedTile = coordinates.find(t => t.tile_id === selectedTileId);
  const selectedTileTemp = selectedTile && tileForecasts[selectedTileId] 
    ? tileForecasts[selectedTileId][selectedDateIndex] 
    : null;

  const regimesList = [
    { name: "Urban Heat Island", class: "regime-uhi" },
    { name: "Coastal Breeze Zone", class: "regime-coastal" },
    { name: "Commercial District", class: "regime-commercial" },
    { name: "Residential Canopy", class: "regime-residential" },
    { name: "Urban Park", class: "regime-park" }
  ];

  return (
    <aside className="sidebar-panel glass-panel">
      {/* Date scrubbing controller */}
      <div className="sidebar-section">
        <h3><Calendar size={14} style={{ marginRight: 4, display: 'inline', verticalAlign: 'middle' }} /> Temporal Scope</h3>
        <div className="date-selector-container">
          <div className="date-display">
            <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Target Forecast:</span>
            <span className="current-date">{formatDate(currentDate)}</span>
          </div>
          <input
            type="range"
            min="0"
            max={dates.length > 0 ? dates.length - 1 : 60}
            value={selectedDateIndex}
            onChange={(e) => setSelectedDateIndex(parseInt(e.target.value))}
            className="date-slider"
          />
          <div className="slider-limits">
            <span>June 1</span>
            <span>July 31, 2027</span>
          </div>
        </div>
      </div>

      {/* Spatial Regime Filters */}
      <div className="sidebar-section">
        <h3><Layers size={14} style={{ marginRight: 4, display: 'inline', verticalAlign: 'middle' }} /> Spatial Regimes</h3>
        <div className="quick-filters">
          <button
            onClick={() => setSelectedRegime(null)}
            className={`filter-btn ${!selectedRegime ? 'active' : ''}`}
          >
            All Areas
          </button>
          {regimesList.map((r) => (
            <button
              key={r.name}
              onClick={() => setSelectedRegime(r.name)}
              className={`filter-btn ${selectedRegime === r.name ? 'active' : ''}`}
            >
              {r.name.replace(" District", "").replace(" Zone", "").replace(" Canopy", "")}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Location Indicator */}
      <div className="sidebar-section">
        <h3><MapPin size={14} style={{ marginRight: 4, display: 'inline', verticalAlign: 'middle' }} /> Selected Coordinate</h3>
        {selectedTile ? (
          <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '1rem', color: '#fff' }}>Tile ID: #{selectedTile.tile_id}</strong>
              <span className={`regime-tag ${
                selectedTile.regime === "Urban Heat Island" ? "regime-uhi" :
                selectedTile.regime === "Coastal Breeze Zone" ? "regime-coastal" :
                selectedTile.regime === "Commercial District" ? "regime-commercial" :
                selectedTile.regime === "Residential Canopy" ? "regime-residential" : "regime-park"
              }`}>
                {selectedTile.regime.replace(" District", "").replace(" Zone", "")}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#9ca3af' }}>
              <span>Lat: {selectedTile.latitude.toFixed(6)}</span>
              <span>Lon: {selectedTile.longitude.toFixed(6)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.25rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem' }}>Current Forecast:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: selectedTileTemp > 31 ? 'var(--accent-red)' : 'var(--accent-orange)' }}>
                {selectedTileTemp !== null ? `${selectedTileTemp}°C` : 'N/A'}
              </span>
            </div>
          </div>
        ) : (
          <div className="glass-card" style={{ padding: '1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>
            Click a tile on the spatial map to select a coordinate
          </div>
        )}
      </div>

      {/* Coordinate search panel */}
      <div className="sidebar-section" style={{ flexGrow: 1, minHeight: '150px', display: 'flex', flexDirection: 'column' }}>
        <h3><Search size={14} style={{ marginRight: 4, display: 'inline', verticalAlign: 'middle' }} /> Coordinate Registry</h3>
        <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: '#6b7280' }} />
          <input
            type="text"
            placeholder="Search by ID or Lat/Lon..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="coord-input"
            style={{ width: '100%', paddingLeft: '1.8rem' }}
          />
        </div>
        <div className="tiles-list-container" style={{ flexGrow: 1 }}>
          {filteredCoords.slice(0, 100).map((tile) => {
            const isSelected = tile.tile_id === selectedTileId;
            const tileTemp = tileForecasts[tile.tile_id] ? tileForecasts[tile.tile_id][selectedDateIndex] : null;
            
            return (
              <div
                key={tile.tile_id}
                onClick={() => setSelectedTileId(tile.tile_id)}
                className={`tile-row-item ${isSelected ? 'active' : ''}`}
              >
                <div>
                  <div style={{ fontWeight: 600, color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>Tile #{tile.tile_id}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{tile.latitude.toFixed(4)}, {tile.longitude.toFixed(4)}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                  <span style={{ fontWeight: 700, color: tileTemp > 31 ? 'var(--accent-red)' : 'var(--accent-orange)' }}>
                    {tileTemp ? `${tileTemp}°C` : 'N/A'}
                  </span>
                  <span className={`regime-tag ${
                    tile.regime === "Urban Heat Island" ? "regime-uhi" :
                    tile.regime === "Coastal Breeze Zone" ? "regime-coastal" :
                    tile.regime === "Commercial District" ? "regime-commercial" :
                    tile.regime === "Residential Canopy" ? "regime-residential" : "regime-park"
                  }`} style={{ fontSize: '0.6rem', padding: '0.05rem 0.25rem' }}>
                    {tile.regime.split(' ')[0]}
                  </span>
                </div>
              </div>
            );
          })}
          {filteredCoords.length === 0 && (
            <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.85rem', padding: '1rem' }}>
              No matches found
            </div>
          )}
          {filteredCoords.length > 100 && (
            <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.75rem', padding: '0.5rem' }}>
              Showing first 100 of {filteredCoords.length} tiles
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
