import React, { useRef, useEffect, useState } from 'react';
import { Maximize2, Minimize2, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

export default function SpatialMap({
  coordinates = [],
  selectedDateIndex,
  selectedTileId,
  setSelectedTileId,
  selectedRegime,
  tileForecasts = {}
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [hoveredTile, setHoveredTile] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Calculate coordinates bounds
  const latitudes = coordinates.map(c => c.latitude);
  const longitudes = coordinates.map(c => c.longitude);
  
  const minLat = latitudes.length ? Math.min(...latitudes) : 25.75;
  const maxLat = latitudes.length ? Math.max(...latitudes) : 25.81;
  const minLon = longitudes.length ? Math.min(...longitudes) : -80.25;
  const maxLon = longitudes.length ? Math.max(...longitudes) : -80.19;

  // Reset view button handler
  const handleResetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  // Color scale mapper based on temperature value
  const getThermalColor = (temp) => {
    if (temp === null || temp === undefined) return '#4b5563';
    // Temperature bounds: 26°C (cool) to 34°C (hot)
    const min = 26.5;
    const max = 34.5;
    const pct = Math.max(0, Math.min(1, (temp - min) / (max - min)));
    
    // Thermal HSL scale: Blue (220) to Red (0)
    const hue = 220 - pct * 220;
    return `hsl(${hue}, 85%, 48%)`;
  };

  // Main Canvas Draw Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Set high-DPI scaling
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    const w = rect.width;
    const h = rect.height;
    
    // Clear canvas with dark grid background
    ctx.fillStyle = '#05070e';
    ctx.fillRect(0, 0, w, h);
    
    // Draw background spatial gridlines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (!coordinates.length) return;

    const pad = 25; // padding in pixels
    
    // Draw coordinates
    coordinates.forEach(tile => {
      // Map lat/lon to Canvas X/Y
      let x = pad + ((tile.longitude - minLon) / (maxLon - minLon)) * (w - 2 * pad);
      let y = pad + ((maxLat - tile.latitude) / (maxLat - minLat)) * (h - 2 * pad);
      
      // Apply zoom & pan transformations
      x = w / 2 + (x - w / 2) * zoom + offset.x;
      y = h / 2 + (y - h / 2) * zoom + offset.y;

      const temp = tileForecasts[tile.tile_id] ? tileForecasts[tile.tile_id][selectedDateIndex] : null;
      
      // Spatial regime filtration styling
      const matchesFilter = !selectedRegime || tile.regime === selectedRegime;
      
      ctx.fillStyle = getThermalColor(temp);
      
      if (tile.tile_id === selectedTileId) {
        // Draw selected tile highlighting glow
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        ctx.arc(x, y, 6.5 * zoom, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      } else {
        // Standard tile dot
        ctx.beginPath();
        // Reduce opacity for filtered-out regimes
        ctx.globalAlpha = matchesFilter ? 0.95 : 0.08;
        ctx.arc(x, y, 4 * zoom, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
    
    // Reset alpha
    ctx.globalAlpha = 1.0;
  }, [coordinates, selectedDateIndex, selectedTileId, selectedRegime, tileForecasts, zoom, offset]);

  // Coordinate mapper from Canvas coordinates to nearest Tile
  const findNearestTile = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const xMouse = clientX - rect.left;
    const yMouse = clientY - rect.top;
    
    const w = rect.width;
    const h = rect.height;
    const pad = 25;
    
    let nearest = null;
    let minDist = 15; // Threshold radius for selection
    
    coordinates.forEach(tile => {
      let x = pad + ((tile.longitude - minLon) / (maxLon - minLon)) * (w - 2 * pad);
      let y = pad + ((maxLat - tile.latitude) / (maxLat - minLat)) * (h - 2 * pad);
      
      // Apply transforms
      x = w / 2 + (x - w / 2) * zoom + offset.x;
      y = h / 2 + (y - h / 2) * zoom + offset.y;
      
      const dist = Math.hypot(xMouse - x, yMouse - y);
      if (dist < minDist) {
        minDist = dist;
        nearest = tile;
      }
    });
    
    return nearest;
  };

  // Canvas Mouse Move Event
  const handleMouseMove = (e) => {
    if (isDragging) {
      setOffset(prev => ({
        x: prev.x + (e.clientX - dragStart.x),
        y: prev.y + (e.clientY - dragStart.y)
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const nearest = findNearestTile(e.clientX, e.clientY);
    setHoveredTile(nearest);

    if (nearest) {
      const canvas = canvasRef.current;
      const canvasRect = canvas.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - canvasRect.left + 15,
        y: e.clientY - canvasRect.top + 10
      });
    }
  };

  // Canvas Mouse Down (For Drag/Pan)
  const handleMouseDown = (e) => {
    // If middle click or holding space or right click, enable panning
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  // Canvas Mouse Up (Click selection or stop drag)
  const handleMouseUp = (e) => {
    setIsDragging(false);
    
    // If not a significant drag, treat as click selection
    const nearest = findNearestTile(e.clientX, e.clientY);
    if (nearest) {
      setSelectedTileId(nearest.tile_id);
    }
  };

  const handleZoom = (factor) => {
    setZoom(prev => Math.max(0.7, Math.min(5, prev * factor)));
  };

  const hoveredTemp = hoveredTile && tileForecasts[hoveredTile.tile_id] 
    ? tileForecasts[hoveredTile.tile_id][selectedDateIndex] 
    : null;

  return (
    <div ref={containerRef} className="spatial-map-container" style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        className="spatial-canvas"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setHoveredTile(null); setIsDragging(false); }}
      />
      
      {/* Zoom / Pan Panel Controls */}
      <div className="spatial-controls">
        <button onClick={() => handleZoom(1.25)} className="map-control-btn" title="Zoom In">
          <ZoomIn size={16} />
        </button>
        <button onClick={() => handleZoom(0.8)} className="map-control-btn" title="Zoom Out">
          <ZoomOut size={16} />
        </button>
        <button onClick={handleResetView} className="map-control-btn" title="Reset View">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Legend Gauge */}
      <div className="map-legend">
        <span className="legend-title">Temperature Gradient</span>
        <div className="legend-gradient" />
        <div className="legend-labels">
          <span>26.5°C</span>
          <span>30.5°C</span>
          <span>34.5°C</span>
        </div>
      </div>

      {/* Dynamic Hover Tooltip */}
      {hoveredTile && (
        <div
          className="map-tooltip"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
          }}
        >
          <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.85rem' }}>
            Tile ID: #{hoveredTile.tile_id}
          </span>
          <span style={{ color: 'var(--accent-orange)', fontWeight: 600 }}>
            Temp: {hoveredTemp !== null ? `${hoveredTemp.toFixed(1)}°C` : 'N/A'}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Regime: {hoveredTile.regime}
          </span>
          <span style={{ fontSize: '0.7rem', color: '#6b7280', fontFamily: 'monospace' }}>
            {hoveredTile.latitude.toFixed(5)}, {hoveredTile.longitude.toFixed(5)}
          </span>
        </div>
      )}
    </div>
  );
}
