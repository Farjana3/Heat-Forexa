import React, { useState, useMemo } from 'react';
import {
  MapPin, Search, Thermometer, Calendar, Info, AlertCircle,
  ChevronDown, ChevronUp
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceDot
} from 'recharts';

// ─── Haversine distance (km) ─────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Risk helpers ─────────────────────────────────────────────────────────────
function getRisk(t) {
  if (t >= 33) return { label: 'Extreme', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' };
  if (t >= 31) return { label: 'High',    color: '#F97316', bg: 'rgba(249,115,22,0.12)' };
  if (t >= 29) return { label: 'Moderate',color: '#FACC15', bg: 'rgba(250,204,21,0.12)' };
  return              { label: 'Low Risk', color: '#22C55E', bg: 'rgba(34,197,94,0.12)' };
}

// ─── Filter dates by month ────────────────────────────────────────────────────
function filterByMonth(dates, temps, month) {
  return dates.reduce((acc, d, i) => {
    const m = new Date(d).getMonth() + 1;
    if (m === month) acc.push({ date: d, temp: temps[i] });
    return acc;
  }, []);
}

// ─── Known Miami landmarks for quick-select ──────────────────────────────────
const QUICK_LOCATIONS = [
  { label: 'Downtown Miami', lat: 25.7749, lon: -80.1977 },
  { label: 'Brickell',       lat: 25.7617, lon: -80.1918 },
  { label: 'Wynwood',        lat: 25.8008, lon: -80.1994 },
  { label: 'Coconut Grove',  lat: 25.7290, lon: -80.2413 },
  { label: 'Little Havana',  lat: 25.7685, lon: -80.2218 },
  { label: 'Miami Beach',    lat: 25.7907, lon: -80.1300 },
  { label: 'Coral Gables',   lat: 25.7215, lon: -80.2684 },
  { label: 'Overtown',       lat: 25.7886, lon: -80.2029 },
];

// ─── Shared input style ───────────────────────────────────────────────────────
const inputStyle = {
  width: '100%',
  background: '#0d1526',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'var(--text-main)',
  padding: '0.48rem 0.65rem',
  borderRadius: '7px',
  fontSize: '0.83rem',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
  fontFamily: 'inherit',
};

export default function LocationForecastLookup({
  coordinates = [],
  tileForecasts = {},
  dates = [],
}) {
  const [lat, setLat]       = useState('');
  const [lon, setLon]       = useState('');
  const [date, setDate]     = useState('2027-06-15'); // default mid-season
  const [result, setResult] = useState(null);
  const [error, setError]   = useState('');
  const [showSeason, setShowSeason] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  // ── Min/max from data ──────────────────────────────────────────────────────
  const dateMin = dates[0] || '2027-06-01';
  const dateMax = dates[dates.length - 1] || '2027-07-31';

  // ── Core lookup ────────────────────────────────────────────────────────────
  const handleLookup = (oLat, oLon, oDate) => {
    setError('');
    setResult(null);

    const parsedLat = parseFloat(oLat ?? lat);
    const parsedLon = parseFloat(oLon ?? lon);
    const targetDate = oDate ?? date;

    if (isNaN(parsedLat) || isNaN(parsedLon)) {
      setError('Please enter valid numeric latitude and longitude values.');
      return;
    }
    if (parsedLat < -90 || parsedLat > 90 || parsedLon < -180 || parsedLon > 180) {
      setError('Latitude must be −90 to 90 and longitude −180 to 180.');
      return;
    }
    if (!targetDate) {
      setError('Please select a forecast date.');
      return;
    }
    if (coordinates.length === 0) {
      setError('Coordinate data is still loading. Please wait a moment.');
      return;
    }

    // Validate date is in model range
    const dateIdx = dates.indexOf(targetDate);
    if (dateIdx === -1) {
      setError(`Date ${targetDate} is outside the forecast range (${dateMin} → ${dateMax}).`);
      return;
    }

    // Find nearest tile
    let nearest = null, minDist = Infinity;
    for (const tile of coordinates) {
      const d = haversine(parsedLat, parsedLon, tile.latitude, tile.longitude);
      if (d < minDist) { minDist = d; nearest = tile; }
    }

    if (!nearest || minDist > 30) {
      setError(`No forecast data found near (${parsedLat.toFixed(4)}, ${parsedLon.toFixed(4)}). This model covers Downtown Miami / Brickell area only.`);
      return;
    }

    const temps = tileForecasts[nearest.tile_id] || [];
    if (!temps.length) {
      setError('Forecast data unavailable for the nearest tile.');
      return;
    }

    // Point prediction for selected date
    const pointTemp = temps[dateIdx];

    // Season-wide stats
    const valid = temps.filter(t => t !== null && !isNaN(t));
    const mean  = valid.reduce((s, t) => s + t, 0) / valid.length;
    const max   = Math.max(...valid);
    const min   = Math.min(...valid);

    setResult({
      tile: nearest,
      distanceKm: minDist,
      temps,
      dateIdx,
      targetDate,
      pointTemp: Math.round(pointTemp * 10) / 10,
      mean: Math.round(mean * 10) / 10,
      max:  Math.round(max  * 10) / 10,
      min:  Math.round(min  * 10) / 10,
      maxDate: dates[temps.indexOf(max)],
      minDate: dates[temps.indexOf(min)],
      inputLat: parsedLat,
      inputLon: parsedLon,
    });
    setShowSeason(false); // reset accordion on new lookup
  };

  const handleQuick = (loc) => {
    setLat(loc.lat.toString());
    setLon(loc.lon.toString());
    handleLookup(loc.lat, loc.lon, date);
  };

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!result) return [];
    const allData = dates.map((d, i) => ({
      date: d,
      label: d.slice(5),
      temp: result.temps[i],
      isSelected: d === result.targetDate,
    }));
    if (selectedPeriod === 'june') return allData.filter(r => r.date.startsWith('2027-06'));
    if (selectedPeriod === 'july') return allData.filter(r => r.date.startsWith('2027-07'));
    return allData;
  }, [result, selectedPeriod, dates]);

  const juneDays = useMemo(() => result ? filterByMonth(dates, result.temps, 6) : [], [result, dates]);
  const julyDays = useMemo(() => result ? filterByMonth(dates, result.temps, 7) : [], [result, dates]);
  const juneMean = juneDays.length ? (juneDays.reduce((s, d) => s + d.temp, 0) / juneDays.length).toFixed(1) : '--';
  const julyMean = julyDays.length ? (julyDays.reduce((s, d) => s + d.temp, 0) / julyDays.length).toFixed(1) : '--';
  const juneMax  = juneDays.length ? Math.max(...juneDays.map(d => d.temp)).toFixed(1) : '--';
  const julyMax  = julyDays.length ? Math.max(...julyDays.map(d => d.temp)).toFixed(1) : '--';

  const pointRisk     = result ? getRisk(result.pointTemp)  : null;
  const overallRisk   = result ? getRisk(result.mean)        : null;

  // ── Custom chart tooltip ───────────────────────────────────────────────────
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const { date: d, temp } = payload[0].payload;
    const r = getRisk(temp);
    const isSelected = d === result?.targetDate;
    return (
      <div className="glass-panel" style={{
        padding: '0.55rem 0.75rem', fontSize: '0.75rem',
        border: `1px solid ${isSelected ? r.color : 'var(--primary)'}`,
        minWidth: 130,
      }}>
        <div style={{ fontWeight: 700, color: '#fff', marginBottom: 2 }}>{d}</div>
        {isSelected && <div style={{ fontSize: '0.65rem', color: r.color, fontWeight: 700, marginBottom: 2 }}>▶ Selected Date</div>}
        <div>Temp: <strong style={{ color: r.color }}>{temp?.toFixed(1)}°C</strong></div>
        <div>Risk: <strong style={{ color: r.color }}>{r.label}</strong></div>
      </div>
    );
  };

  // ── Formatted display date ─────────────────────────────────────────────────
  const formatDisplayDate = (d) => {
    if (!d) return '';
    const dt = new Date(d + 'T00:00:00Z');
    return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  };

  return (
    <div className="glass-panel visualizer-card" style={{ padding: '1.25rem', marginTop: '1.5rem' }}>

      {/* ── Header ── */}
      <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
        <MapPin size={18} style={{ color: 'var(--primary)' }} />
        Location & Date Forecast Lookup
      </h3>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Enter a location and a specific date to retrieve the ML-predicted temperature for Summer 2027 (Jun 1 – Jul 31).
      </p>

      {/* ── Input Row ── */}
      <div className="location-lookup-row" style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1.1fr auto',
        gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'flex-end',
      }}>
        {/* Latitude */}
        <div style={{ paddingBottom: '1.1rem' }}>
          <label style={{ fontSize: '0.69rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.28rem', fontWeight: 600, letterSpacing: '0.03em' }}>
            Latitude
          </label>
          <input
            type="number"
            value={lat}
            onChange={e => setLat(e.target.value)}
            placeholder="e.g. 25.7617"
            step="0.0001"
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
        </div>

        {/* Longitude */}
        <div style={{ paddingBottom: '1.1rem' }}>
          <label style={{ fontSize: '0.69rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.28rem', fontWeight: 600, letterSpacing: '0.03em' }}>
            Longitude
          </label>
          <input
            type="number"
            value={lon}
            onChange={e => setLon(e.target.value)}
            placeholder="e.g. -80.1918"
            step="0.0001"
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
        </div>

        {/* Date */}
        <div style={{ position: 'relative', paddingBottom: '1.1rem' }}>
          <label style={{ fontSize: '0.69rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.28rem', fontWeight: 600, letterSpacing: '0.03em' }}>
            Forecast Date
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="date"
              value={date}
              min={dateMin}
              max={dateMax}
              onChange={e => setDate(e.target.value)}
              style={{
                ...inputStyle,
                colorScheme: 'dark',
                paddingLeft: '2rem',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
            <Calendar size={13} style={{
              position: 'absolute', left: '0.55rem', top: '50%',
              transform: 'translateY(-50%)', color: 'var(--primary)', pointerEvents: 'none',
            }} />
          </div>
          <div style={{ fontSize: '0.6rem', color: '#4b5563', marginTop: '0.2rem', position: 'absolute', left: 0, bottom: 0 }}>
            Range: Jun 1 – Jul 31, 2027
          </div>
        </div>

        {/* Button */}
        <div style={{ paddingBottom: '1.1rem' }}>
          <button
            onClick={() => handleLookup()}
            style={{
              background: 'var(--primary)', color: '#000', border: 'none',
              padding: '0.5rem 1.1rem', borderRadius: '7px', fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
              fontSize: '0.82rem', whiteSpace: 'nowrap', width: '100%',
              justifyContent: 'center',
            }}
          >
            <Search size={14} /> Predict
          </button>
        </div>
      </div>

      {/* ── Quick-select landmarks ── */}
      <div style={{ marginBottom: '1.1rem' }}>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Quick select:</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.3rem' }}>
          {QUICK_LOCATIONS.map(loc => (
            <button
              key={loc.label}
              onClick={() => handleQuick(loc)}
              style={{
                background: 'rgba(34,211,238,0.07)', border: '1px solid rgba(34,211,238,0.2)',
                color: 'var(--primary)', padding: '0.22rem 0.55rem', borderRadius: '4px',
                fontSize: '0.68rem', cursor: 'pointer', fontWeight: 600,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => e.target.style.background = 'rgba(34,211,238,0.18)'}
              onMouseLeave={e => e.target.style.background = 'rgba(34,211,238,0.07)'}
            >
              {loc.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{
          display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '8px', padding: '0.65rem 0.8rem', marginBottom: '1rem',
          fontSize: '0.78rem', color: '#f87171',
        }}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          {error}
        </div>
      )}

      {/* ── Result ── */}
      {result && (
        <div>

          {/* Location match banner */}
          <div style={{
            background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.18)',
            borderRadius: '8px', padding: '0.6rem 0.85rem', marginBottom: '1rem',
            fontSize: '0.76rem', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem',
          }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              <MapPin size={11} style={{ color: 'var(--primary)', verticalAlign: 'middle', marginRight: 4 }} />
              Input: <strong style={{ color: '#fff' }}>{result.inputLat.toFixed(4)}°N, {Math.abs(result.inputLon).toFixed(4)}°W</strong>
              &nbsp;→ Tile <strong style={{ color: 'var(--primary)' }}>#{result.tile.tile_id}</strong>
              &nbsp;({result.distanceKm.toFixed(2)} km away)
            </span>
            <span className={`regime-tag regime-${result.tile.regime.split(' ')[0].toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
              {result.tile.regime}
            </span>
          </div>

          {/* ══ POINT PREDICTION HERO CARD ══ */}
          <div style={{
            background: `linear-gradient(135deg, ${pointRisk.bg} 0%, rgba(11,18,32,0.6) 100%)`,
            border: `1px solid ${pointRisk.color}40`,
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: `0 0 24px ${pointRisk.color}18`,
          }}>
            {/* Date + location label */}
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={12} style={{ color: pointRisk.color }} />
                ML Prediction for
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: '0.2rem' }}>
                {formatDisplayDate(result.targetDate)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                <MapPin size={11} style={{ verticalAlign: 'middle', marginRight: 3, color: 'var(--primary)' }} />
                {result.inputLat.toFixed(4)}°N, {Math.abs(result.inputLon).toFixed(4)}°W
              </div>
            </div>

            {/* Big temperature number */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '3.2rem', fontWeight: 900, lineHeight: 1,
                color: pointRisk.color,
                textShadow: `0 0 20px ${pointRisk.color}60`,
              }}>
                {result.pointTemp}
                <span style={{ fontSize: '1.4rem', fontWeight: 700, color: `${pointRisk.color}cc` }}>°C</span>
              </div>
              <div style={{
                marginTop: '0.35rem', display: 'inline-block',
                background: pointRisk.bg, border: `1px solid ${pointRisk.color}60`,
                color: pointRisk.color, fontWeight: 800, fontSize: '0.75rem',
                padding: '0.2rem 0.7rem', borderRadius: '20px', letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>
                {pointRisk.label}
              </div>
            </div>

            {/* Context stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
                <span>Season Mean</span>
                <strong style={{ color: overallRisk.color }}>{result.mean}°C</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
                <span>Season Peak</span>
                <strong style={{ color: '#EF4444' }}>{result.max}°C</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
                <span>Season Low</span>
                <strong style={{ color: '#22C55E' }}>{result.min}°C</strong>
              </div>
            </div>
          </div>

          {/* ── Forecast Chart ── */}
          {/* Period filter tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
            {[['all', 'Full Season'], ['june', 'June Only'], ['july', 'July Only']].map(([val, label]) => (
              <button key={val} onClick={() => setSelectedPeriod(val)} style={{
                padding: '0.22rem 0.65rem', borderRadius: '5px', fontSize: '0.7rem',
                fontWeight: 600, cursor: 'pointer',
                border: selectedPeriod === val ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
                background: selectedPeriod === val ? 'rgba(34,211,238,0.12)' : 'transparent',
                color: selectedPeriod === val ? 'var(--primary)' : 'var(--text-secondary)',
              }}>
                {label}
              </button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>
              ◆ = selected date
            </span>
          </div>

          <div style={{ height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="label" stroke="#4b5563" fontSize={10} tickLine={false}
                  interval={Math.ceil(chartData.length / 8)} />
                <YAxis stroke="#4b5563" fontSize={10} tickLine={false}
                  domain={['dataMin - 0.3', 'dataMax + 0.3']}
                  tickFormatter={v => `${v.toFixed(0)}°`} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={33} stroke="#EF4444" strokeDasharray="4 2"
                  label={{ value: 'Extreme', fill: '#EF4444', fontSize: 9, position: 'insideTopRight' }} />
                <ReferenceLine y={31} stroke="#F97316" strokeDasharray="4 2"
                  label={{ value: 'High', fill: '#F97316', fontSize: 9, position: 'insideTopRight' }} />
                <Line type="monotone" dataKey="temp" stroke="var(--primary)" strokeWidth={2.2}
                  dot={false} activeDot={{ r: 4.5, stroke: '#fff', strokeWidth: 1.5 }} />
                {/* Mark selected date on chart */}
                {result && chartData.find(d => d.date === result.targetDate) && (
                  <ReferenceDot
                    x={result.targetDate.slice(5)}
                    y={result.pointTemp}
                    r={6}
                    fill={pointRisk.color}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* ── Season breakdown accordion ── */}
          <div style={{ marginTop: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
            <button
              onClick={() => setShowSeason(s => !s)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                background: 'none', border: 'none', color: 'var(--text-secondary)',
                cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, padding: 0,
              }}
            >
              {showSeason ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showSeason ? 'Hide' : 'Show'} Season-Wide Summary (Jun/Jul 2027)
            </button>

            {showSeason && (
              <div className="month-breakdown-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                {[
                  { month: 'June 2027', days: juneDays, mean: juneMean, max: juneMax },
                  { month: 'July 2027', days: julyDays, mean: julyMean, max: julyMax },
                ].map(m => {
                  const r = getRisk(parseFloat(m.mean));
                  return (
                    <div key={m.month} style={{
                      background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '8px', padding: '0.75rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                        <strong style={{ fontSize: '0.8rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Calendar size={12} style={{ color: 'var(--primary)' }} /> {m.month}
                        </strong>
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, color: r.color, background: r.bg, padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                          {r.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div>Avg</div>
                          <strong style={{ fontSize: '0.95rem', color: r.color }}>{m.mean}°C</strong>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div>Peak</div>
                          <strong style={{ fontSize: '0.95rem', color: '#EF4444' }}>{m.max}°C</strong>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div>Days</div>
                          <strong style={{ fontSize: '0.95rem', color: '#fff' }}>{m.days.length}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Disclaimer */}
          <div style={{
            display: 'flex', gap: '0.35rem', alignItems: 'flex-start',
            marginTop: '0.75rem', fontSize: '0.63rem', color: 'var(--text-secondary)',
          }}>
            <Info size={11} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              ML predictions from an XGBoost model trained on Downtown Miami / Brickell tile data (Jun–Jul 2027).
              Results reflect the nearest grid tile, not the exact input coordinate. The dot on the chart marks your selected date.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
