import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import Sidebar from './components/Sidebar';
import MetricCards from './components/MetricCards';
import SpatialMap from './components/SpatialMap';
import HistoricalChart from './components/HistoricalChart';

import AgenticAIAdvisor from './components/AgenticAIAdvisor';
import LocationForecastLookup from './components/LocationForecastLookup';
import { Flame, Map, BarChart2, ChevronDown, ChevronUp } from 'lucide-react';
import './App.css';

export default function App() {
  // Main states
  const [coordinates, setCoordinates] = useState([]);
  const [dates, setDates] = useState([]);
  const [dailySummary, setDailySummary] = useState([]);
  const [tileForecasts, setTileForecasts] = useState({});
  const [historicalData, setHistoricalData] = useState({});
  const [modelMetrics, setModelMetrics] = useState({});
  const [causalInsights, setCausalInsights] = useState({});
  const [dailyMeteorological, setDailyMeteorological] = useState(null);
  const [mitigationOffset, setMitigationOffset] = useState(0);

  const [selectedDateIndex, setSelectedDateIndex] = useState(14); // Default to June 15
  const [selectedTileId, setSelectedTileId] = useState(0); // Default to Tile #0
  const [selectedRegime, setSelectedRegime] = useState(null); // Default: All regimes

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Floating scroll arrow state (supports Down & Up directions)
  const [showScrollArrow, setShowScrollArrow] = useState(false);
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const advisorRef = useRef(null);

  // Track window scroll position to switch arrow direction
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 300;
      setIsScrolledDown(scrolled);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Wrapper to show arrow when user clicks a tile
  const handleTileSelect = useCallback((tileId) => {
    setSelectedTileId(tileId);
    setShowScrollArrow(true);
  }, []);

  // Toggle scroll position: scroll down to Advisor or scroll up to top
  const handleFloatingClick = useCallback(() => {
    if (isScrolledDown) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      if (advisorRef.current) {
        advisorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [isScrolledDown]);


  // Fetch all precomputed datasets on mount
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        // 1. Fetch registry
        const regRes = await fetch('/data/coordinate_registry.json');
        if (!regRes.ok) throw new Error('Failed to load coordinate registry');
        const regData = await regRes.json();
        setCoordinates(regData);

        // 2. Fetch forecast summary
        const foreRes = await fetch('/data/forecast_2027_summary.json');
        if (!foreRes.ok) throw new Error('Failed to load forecast summary');
        const foreData = await foreRes.json();
        setDates(foreData.dates);
        setDailySummary(foreData.daily_summary);
        setTileForecasts(foreData.tile_forecasts);

        // 3. Fetch historical comparison
        const histRes = await fetch('/data/historical_comparison.json');
        if (!histRes.ok) throw new Error('Failed to load historical comparison');
        const histData = await histRes.json();
        setHistoricalData(histData);

        // 4. Fetch metrics
        const metRes = await fetch('/data/model_metrics.json');
        if (!metRes.ok) throw new Error('Failed to load model metrics');
        const metData = await metRes.json();
        setModelMetrics(metData);

        // 5. Fetch causal insights
        const causRes = await fetch('/data/causal_insights.json');
        if (!causRes.ok) throw new Error('Failed to load causal insights');
        const causData = await causRes.json();
        setCausalInsights(causData);

        // 6. Fetch daily meteorological baseline data
        const dmRes = await fetch('/data/daily_meteorological.json');
        if (!dmRes.ok) throw new Error('Failed to load daily meteorological data');
        const dmData = await dmRes.json();
        setDailyMeteorological(dmData);

        setLoading(false);
      } catch (err) {
        console.error('Data Loading Error:', err);
        setError(err.message);
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Apply agentic mitigation simulation offset to forecast temperatures (year 2027)
  const adjustedTileForecasts = React.useMemo(() => {
    if (mitigationOffset === 0 || !tileForecasts[selectedTileId]) return tileForecasts;
    
    const adjusted = { ...tileForecasts };
    adjusted[selectedTileId] = tileForecasts[selectedTileId].map(temp => 
      Math.round((temp - mitigationOffset) * 100) / 100
    );
    return adjusted;
  }, [tileForecasts, selectedTileId, mitigationOffset]);

  const adjustedHistoricalData = React.useMemo(() => {
    if (mitigationOffset === 0 || !historicalData.tile_history?.[selectedTileId]) return historicalData;
    
    const adjusted = {
      ...historicalData,
      tile_history: {
        ...historicalData.tile_history,
        [selectedTileId]: {
          ...historicalData.tile_history[selectedTileId],
          "2027": historicalData.tile_history[selectedTileId]["2027"].map(temp => 
            temp !== null ? Math.round((temp - mitigationOffset) * 100) / 100 : null
          )
        }
      }
    };
    return adjusted;
  }, [historicalData, selectedTileId, mitigationOffset]);

  // Sync selected tile ID if selected regime changes and current tile is filtered out
  useEffect(() => {
    if (selectedRegime && coordinates.length > 0) {
      const currentTile = coordinates.find(t => t.tile_id === selectedTileId);
      if (currentTile && currentTile.regime !== selectedRegime) {
        // Find first tile in coordinates that matches the new regime
        const firstMatching = coordinates.find(t => t.regime === selectedRegime);
        if (firstMatching) {
          setSelectedTileId(firstMatching.tile_id);
        }
      }
    }
  }, [selectedRegime, coordinates, selectedTileId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B1220', gap: '1rem' }}>
        <div className="animate-pulse-slow" style={{ width: 64, height: 64, borderRadius: '50%', border: '4px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 1s infinite linear' }} />
        <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)' }} className="animate-pulse-slow">
          Synthesizing Spatiotemporal Heat Projections...
        </span>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B1220', gap: '1rem', color: '#ef4444' }}>
        <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>Data Synthesizer Error</span>
        <p style={{ color: '#9ca3af', maxWidth: '500px', textAlign: 'center' }}>{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          style={{ background: 'var(--primary)', border: 'none', color: '#000', padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}
        >
          Retry Integration
        </button>
      </div>
    );
  }

  const currentDate = dates[selectedDateIndex] || '';

  return (
    <>
    <div className="app-container animate-fade-in">
      {/* Header Panel */}
      <header className="dashboard-header">
        <div className="header-title-container">
          <div className="header-brand">
            <div className="header-logo-icon">
              <Flame size={22} style={{ color: '#f97316' }} />
            </div>
            <h1>
              <span className="brand-highlight">HEAT-FOREXA</span>
              <span className="brand-divider">:</span>
              <span className="brand-subtitle">Interactive Thermal Dashboard</span>
            </h1>
          </div>
        </div>
        <div className="header-meta">
          <div className="meta-item">
            <strong>Location:</strong> Downtown Miami / Brickell
          </div>
          <div className="meta-item">
            <strong>Granularity:</strong> 2,187 Tile Grid (30m²)
          </div>
          <div className="meta-item">
            <strong>Target Horizon:</strong> Summer 2027
          </div>
        </div>
      </header>

      {/* Primary Metrics Strip */}
      <MetricCards
        selectedDateIndex={selectedDateIndex}
        selectedTileId={selectedTileId}
        coordinates={coordinates}
        tileForecasts={adjustedTileForecasts}
        dailySummary={dailySummary}
      />

      {/* Main Workspace Layout */}
      <div className="dashboard-grid">
        {/* Left Side: Sidebar Control Deck */}
        <Sidebar
          selectedDateIndex={selectedDateIndex}
          setSelectedDateIndex={setSelectedDateIndex}
          dates={dates}
          selectedTileId={selectedTileId}
          setSelectedTileId={handleTileSelect}
          selectedRegime={selectedRegime}
          setSelectedRegime={setSelectedRegime}
          coordinates={coordinates}
          tileForecasts={adjustedTileForecasts}
        />

        {/* Right Side: Map & Analytics Charts */}
        <main className="main-workspace">
          <div className="visualizer-grid">
            {/* Spatial Heatmap Canvas Grid */}
            <div className="glass-panel visualizer-card">
              <h3 className="card-title">
                <Map size={18} style={{ color: 'var(--primary)' }} /> Spatial Spatiotemporal Temperature Grid
              </h3>
              <SpatialMap
                coordinates={coordinates}
                selectedDateIndex={selectedDateIndex}
                selectedTileId={selectedTileId}
                setSelectedTileId={handleTileSelect}
                selectedRegime={selectedRegime}
                tileForecasts={adjustedTileForecasts}
              />
            </div>

            {/* Historical Temperature Comparisons Linechart */}
            <div className="glass-panel visualizer-card">
              <h3 className="card-title">
                <BarChart2 size={18} style={{ color: 'var(--primary)' }} /> Multi-Year Historical Trajectories
              </h3>
              <HistoricalChart
                selectedTileId={selectedTileId}
                historicalData={adjustedHistoricalData}
                selectedDateIndex={selectedDateIndex}
                mitigationOffset={mitigationOffset}
              />
            </div>
          </div>

          {/* Location-Based Forecast Lookup */}
          <LocationForecastLookup
            coordinates={coordinates}
            tileForecasts={tileForecasts}
            dates={dates}
          />



          {/* Agentic AI Urban Mitigation Advisor */}
          <div ref={advisorRef}>
            <AgenticAIAdvisor
              selectedTileId={selectedTileId}
              coordinates={coordinates}
              tileForecasts={tileForecasts}
              selectedDateIndex={selectedDateIndex}
              dates={dates}
              dailySummary={dailySummary}
              dailyMeteorologicalData={dailyMeteorological}
              onMitigationOffsetChange={setMitigationOffset}
            />
          </div>

        </main>
      </div>
    </div>

    {/* Portal: render the floating arrow outside the app-container so position:fixed works */}
    {(showScrollArrow || isScrolledDown) && ReactDOM.createPortal(
      <>
        <div 
          className="scroll-arrow-container"
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            pointerEvents: 'none',
            animation: 'arrowFadeIn 0.3s ease-out',
          }}
        >
          <div 
            style={{
              pointerEvents: 'auto',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(11, 18, 32, 0.85)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '8px',
              padding: '0.5rem 0.9rem',
              color: '#fbbf24',
              fontSize: '0.78rem',
              fontWeight: '700',
              boxShadow: '0 0 15px rgba(251, 191, 36, 0.15)',
              backdropFilter: 'blur(12px)',
              gap: '0.75rem',
              transition: 'all 0.2s ease-in-out',
            }}
            onClick={handleFloatingClick}
            onMouseEnter={e => {
              e.currentTarget.style.border = '1px solid #fbbf24';
              e.currentTarget.style.boxShadow = '0 0 22px rgba(251, 191, 36, 0.3)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.border = '1px solid rgba(251, 191, 36, 0.3)';
              e.currentTarget.style.boxShadow = '0 0 15px rgba(251, 191, 36, 0.15)';
            }}
          >
            <span style={{ letterSpacing: '0.03em' }}>{isScrolledDown ? "Back to Top" : "See Agent Recommendations"}</span>
            <div style={{ width: '25px', height: '1.5px', background: '#fbbf24', position: 'relative', opacity: 0.8 }}>
              <div style={{ position: 'absolute', right: 0, top: '-2px', width: '5px', height: '5px', borderRadius: '50%', background: '#fbbf24' }} />
            </div>
          </div>

          <button
            onClick={handleFloatingClick}
            aria-label={isScrolledDown ? "Scroll to Top" : "Scroll to AI Advisor"}
            className="scroll-arrow-btn"
            style={{
              pointerEvents: 'auto',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: '2px solid #fbbf24',
              background: 'rgba(11, 18, 32, 0.85)',
              backdropFilter: 'blur(12px)',
              color: '#fbbf24',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(251, 191, 36, 0.3), 0 4px 12px rgba(0,0,0,0.4)',
              animation: 'arrowBounce 1.5s ease-in-out infinite',
              transition: 'background 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(251, 191, 36, 0.15)';
              e.currentTarget.style.boxShadow = '0 0 28px rgba(251, 191, 36, 0.5), 0 4px 16px rgba(0,0,0,0.5)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(11, 18, 32, 0.85)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(251, 191, 36, 0.3), 0 4px 12px rgba(0,0,0,0.4)';
            }}
          >
            {isScrolledDown ? (
              <ChevronUp size={24} strokeWidth={2.5} />
            ) : (
              <ChevronDown size={24} strokeWidth={2.5} />
            )}
          </button>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes arrowBounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(6px); }
          }
          @keyframes arrowFadeIn {
            from { opacity: 0; transform: translate(15px, 0); }
            to { opacity: 1; transform: translate(0, 0); }
          }
        `}} />
      </>,
      document.body
    )}
    </>
  );
}
