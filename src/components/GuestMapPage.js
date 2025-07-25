import React, { useRef, useState } from 'react';
import Navbar from './Navbar';
import { FaUserCircle, FaSearch, FaTrain, FaBroadcastTower, FaLayerGroup } from 'react-icons/fa';

const layerImageMap = {
  "Situation actuelle": "SIF-V6-SIF-EA.png",
  "Phase 1": "SIF-V6-PHASE1.png",
  "Phase 1 pose": "SIF-V3-Phase1Pose.png",
  "Phase 1 dépose": "SIF-V3-Phase1Dépose.png",
  "Phase 2": "SIF-V3-Phase2.png",
  "Phase 2 pose": "SIF-V3-Phase2Pose.png",
  "Phase 2 dépose": "SIF-V3-Phase2Dépose.png",
  "Réflexion/optior": "SIF-V3-RéflexionPCA.png",
  "HPMV": "SIF-V3-HPMV.png",
  "HPMV pose": "SIF-V3-HPMVPose.png",
  "HPMV dépose": "SIF-V3-HPMVDépose.png",
  "BTS GSM-R existante": "BTS-GSM-R-existante.png",
  "BTS GSM-R HPMV": "BTS-GSM-R-HPMV.png",
  "Postes existants": "Postes-existants.png",
  "Centre N2 HPMV": "Centre-N2-HPMV.png",
  "Filets": "Filets.png",
  "Zones d'actions": "Zones-actions.png",
  "Zones de postes": "Zones-postes.png",
  "PDF": "SIF-V6.PDF"
};

const GuestMapPage = ({ isAdmin, setIsAdmin }) => {
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollOffset, setScrollOffset] = useState({ x: 0, y: 0 });
  const [activeLayers, setActiveLayers] = useState({ "Situation actuelle": true });
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  // Dummy search logic (replace with real API)
  const handleSearchChange = e => {
    const value = e.target.value;
    setSearch(value);
    // Simulate suggestions
    if (value.length > 1) {
      setSuggestions([
        { label: 'Gare de Lyon', type: 'station', pk: 12.3 },
        { label: 'Ligne 930000, PK 45.2', type: 'pk', pk: 45.2 },
      ]);
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = suggestion => {
    setSelectedSuggestion(suggestion);
    setSearch(suggestion.label);
    setSuggestions([]);
    // TODO: Center/zoom map to suggestion
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => setZoom(1);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setScrollOffset({
      x: containerRef.current.scrollLeft,
      y: containerRef.current.scrollTop,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    containerRef.current.scrollLeft = scrollOffset.x - dx;
    containerRef.current.scrollTop = scrollOffset.y - dy;
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleImageLoad = () => {
    const width = imgRef.current.naturalWidth;
    const height = imgRef.current.naturalHeight;
    setNaturalSize({ width, height });
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] font-sans flex flex-col">
      {/* Unified Navbar */}
      <Navbar isAdmin={isAdmin} setIsAdmin={setIsAdmin} title="SIF" />
      {/* Search Bar */}
      <div className="w-full flex justify-center mt-8">
        <div className="relative w-[500px]">
          <input
            type="text"
            placeholder="Rechercher une gare, un PK..."
            value={search}
            onChange={handleSearchChange}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 shadow focus:outline-none focus:ring-2 focus:ring-blue-300 text-lg bg-white"
            style={{ fontFamily: 'Inter, Poppins, Roboto, sans-serif' }}
          />
          <FaSearch className="absolute right-3 top-3 text-gray-400" />
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-12 bg-white border border-gray-200 rounded-lg shadow z-10">
              {suggestions.map((s, idx) => (
                <div
                  key={idx}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2"
                  onClick={() => handleSuggestionClick(s)}
                >
                  {s.type === 'station' ? <FaBroadcastTower className="text-blue-700" /> : <FaTrain className="text-gray-500" />}
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Main Map Section */}
      <div className="flex flex-row w-full max-w-[1400px] mx-auto pt-8">
        {/* Sidebar (calques + légende) */}
        <aside className="w-80 min-h-[600px] bg-white rounded-2xl shadow-lg border border-gray-200 flex flex-col gap-8 px-6 py-8 sticky top-24 h-fit items-start mr-8">
          {/* Calques dépliants UX épuré */}
          <div className="w-full bg-white rounded-xl shadow border border-gray-200 p-4 mb-4">
            <h3 className="text-lg font-bold text-blue-900 mb-3">Calques</h3>
            <CalquesCollapsible
              layers={Object.keys(layerImageMap)}
              activeLayers={activeLayers}
              setActiveLayers={setActiveLayers}
            />
          </div>
          {/* Légende épurée */}
          <div className="w-full bg-white rounded-xl shadow border border-gray-200 p-4">
            <h3 className="text-lg font-bold text-blue-900 mb-3">Légende</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-base"><FaBroadcastTower className="text-blue-700 text-lg" /> <span className="font-medium text-gray-700">Relais GSM-R</span></div>
              <div className="flex items-center gap-2 text-base"><FaLayerGroup className="text-blue-400 text-lg" /> <span className="font-medium text-gray-700">TEST</span></div>
              <div className="flex items-center gap-2 text-base"><FaTrain className="text-gray-500 text-lg" /> <span className="font-medium text-gray-700">TEST</span></div>
            </div>
          </div>
        </aside>
        {/* Main content: carto + plan */}
        <div className="flex-1 min-w-0 flex flex-col gap-8">
          {/* Carto */}
          <div className="relative max-w-[1000px] w-full h-[600px] border-4 border-[#1A237E] rounded-lg bg-white shadow-lg">
            <div className="absolute top-4 right-4 z-30 flex gap-2 bg-white/80 p-1 rounded shadow">
              <button
                className="bg-[#1A237E] text-white px-3 py-1 rounded hover:bg-[#16205c] transition-colors"
                onClick={handleZoomIn}
                aria-label="Zoom in"
              >
                +
              </button>
              <button
                className="bg-[#1A237E] text-white px-3 py-1 rounded hover:bg-[#16205c] transition-colors"
                onClick={handleZoomOut}
                aria-label="Zoom out"
              >
                −
              </button>
              <button
                className="bg-[#1A237E] text-white px-3 py-1 rounded hover:bg-[#16205c] transition-colors"
                onClick={handleResetZoom}
                aria-label="Reset"
              >
                Reset
              </button>
            </div>
            <div
              ref={containerRef}
              className="w-full h-full overflow-auto"
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div
                className="relative min-w-max h-full"
                style={{
                  width: naturalSize.width * zoom,
                  height: naturalSize.height * zoom,
                  transition: 'width 0.2s, height 0.2s',
                }}
              >
                {/* Affiche tous les calques cochés dans l'ordre, 'Situation actuelle' toujours en fond si cochée */}
                {(() => {
                  const checkedLayers = Object.keys(layerImageMap).filter(layer => activeLayers[layer]);
                  if (checkedLayers.length === 0) {
                    return <div style={{ width: '100%', height: '100%', background: '#fff' }} />;
                  }
                  // Affiche tous les calques cochés dans l'ordre, le premier avec ref et onLoad
                  return Object.keys(layerImageMap)
                    .filter(layer => activeLayers[layer])
                    .map((layer, idx, arr) => (
                      <img
                        key={layer}
                        ref={idx === 0 ? imgRef : undefined}
                        src={`/${layerImageMap[layer]}`}
                        alt={layer}
                        onLoad={idx === 0 ? handleImageLoad : undefined}
                        style={{
                          position: idx === 0 ? 'relative' : 'absolute',
                          left: 0,
                          top: 0,
                          width: naturalSize.width * zoom,
                          height: naturalSize.height * zoom,
                          opacity: layer === 'Situation actuelle' ? 1 : 0.6,
                          pointerEvents: 'none',
                          zIndex: 5 + idx,
                          display: 'block',
                          userSelect: 'none',
                        }}
                        draggable={false}
                      />
                    ));
                })()}
                {/* ...future overlays for points/zones... */}
              </div>
            </div>
          </div>
          {/* Fenêtre plan de voie simplifié alignée exactement comme la carto, sans menuOpen */}
          <div className="mt-8 w-full max-w-[1000px]">
            <div className="w-full bg-white rounded-xl shadow border border-gray-200 py-4 px-6 flex flex-col items-center">
              <span className="text-sm text-gray-500 mb-2">Plan de voie simplifié (vue SIF)</span>
              <div className="relative w-full h-16 flex items-center">
                {/* Track line */}
                <div style={{ position: 'absolute', left: '5%', top: '50%', width: '90%', height: '4px', background: '#90CAF9', borderRadius: '2px', transform: 'translateY(-50%)' }} />
                {/* PK graduation */}
                {[0, 20, 40, 60, 80, 100].map(pk => (
                  <span key={pk} style={{ position: 'absolute', left: `${pk}%`, top: '60%' }} className="text-xs text-gray-400">PK {pk}</span>
                ))}
                {/* SIF viewport rectangle (red) - sync with map scroll/zoom if needed */}
                <div style={{ position: 'absolute', left: `${selectedSuggestion ? Math.min(90, selectedSuggestion.pk) : 40}%`, top: '25%', width: '10%', height: '50%', border: '2px solid #E53935', background: 'rgba(229,57,53,0.1)', borderRadius: '4px', transition: 'left 0.2s' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// CalquesCollapsible épuré
function CalquesCollapsible({ layers, activeLayers, setActiveLayers }) {
  const [open, setOpen] = useState(false); // collapsed by default
  return (
    <div className="mb-2">
      <button
        className="w-full flex justify-between items-center font-semibold py-2 px-3 bg-gray-100 rounded-lg hover:bg-gray-200 mb-3 shadow"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="text-blue-900">Afficher/Masquer les calques</span>
        <span className="text-lg">{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-3">
          {layers.map(layer => (
            <label key={layer} className="flex items-center gap-2 cursor-pointer text-base px-2 py-1 rounded hover:bg-gray-50 transition">
              <input
                type="checkbox"
                checked={!!activeLayers[layer]}
                onChange={() => setActiveLayers(prev => ({ ...prev, [layer]: !prev[layer] }))}
                className="accent-blue-600 w-5 h-5"
              />
              <span className="text-gray-800 font-medium">{layer}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default GuestMapPage;
