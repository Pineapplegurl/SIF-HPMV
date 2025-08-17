import React, { useRef, useState, useEffect } from 'react';
import './Navbar.css';
import Navbar from './Navbar';
import { FaSearch, FaTrain, FaBroadcastTower, FaBuilding, FaCog, FaPlus, FaMinus, FaExpand } from 'react-icons/fa';
import { useTypePoints } from '../hooks/useTypePoints';

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
  "Filets": "Filets.png",
  "Zones d'actions": "Zones-actions.png",
  "Zones de postes": "Zones-postes.png",
  "PDF": "SIF-V6.PDF"
};

// Calques qui contrôlent l'affichage des points (pas des images)
const pointLayers = ["BTS GSM-R", "Postes existants", "Centre N2 HPMV"];

// Liste complète des calques (images + points)
const allLayers = [...Object.keys(layerImageMap), ...pointLayers];

const GuestMapPage = ({ isAdmin, setIsAdmin, activeLayers, setActiveLayers }) => {
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollOffset, setScrollOffset] = useState({ x: 0, y: 0 });
  // Use activeLayers and setActiveLayers from props passed by App.js
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  // Hook pour récupérer les points BTS/GSMR
  const { typePoints } = useTypePoints();

  // Fonction robuste pour normaliser les états et gérer les fautes de frappe
  const normalizeEtat = (etat) => {
    if (!etat || etat === 'undefined' || etat === 'null') return 'Mis en service';
    const cleaned = etat.toString().toLowerCase()
      .trim()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/[ñ]/g, 'n')
      .replace(/[\s\-_]/g, '');
    if (cleaned.includes('etud')) return 'Etude';
    if (cleaned.includes('realis') || cleaned.includes('realiz')) return 'Réalisation';
    if (cleaned.includes('service') || cleaned.includes('exploit')) return 'Mis en service';
    return 'Mis en service';
  };
  const etatColorMap = {
    'Etude': '#FF9800',
    'Réalisation': '#FF5722',
    'Mis en service': '#2196F3',
  };

  // Icon component et couleurs
  const getTypeIcon = (type, size = 24) => {
    const iconProps = { size: size, style: { filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' } };
    
    switch (type) {
      case 'BTS GSM-R':
      case 'BTS GSM-R existante':
      case 'BTS GSM-R HPMV':
        return <FaBroadcastTower {...iconProps} color="#1976D2" />; // Bleu - Antenne/Tour
      case 'Postes existants':
        return <FaBuilding {...iconProps} color="#1976D2" />; // Bleu - Poste/Bâtiment ferroviaire
      case 'Centre N2 HPMV':
        return <FaCog {...iconProps} color="#1976D2" />; // Bleu - Centre technique/Équipement
      default:
        return <FaBroadcastTower {...iconProps} color="#1976D2" />; // Bleu par défaut
    }
  };

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

  // Effet pour gérer le style en mode plein écran
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .map-fullscreen-container:fullscreen {
        background-color: white !important;
        padding: 20px !important;
      }
      .map-fullscreen-container:-webkit-full-screen {
        background-color: white !important;
        padding: 20px !important;
      }
      .map-fullscreen-container:-moz-full-screen {
        background-color: white !important;
        padding: 20px !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
              layers={allLayers}
              activeLayers={activeLayers}
              setActiveLayers={setActiveLayers}
            />
          </div>
          {/* Légende épurée */}
          <div className="w-full bg-white rounded-xl shadow border border-gray-200 p-4 flex flex-col items-center justify-center">
            <h3 className="text-lg font-bold text-blue-900 mb-3 text-center w-full">Légende</h3>
            <div className="flex flex-col gap-3 items-center">
              <div className="flex items-center gap-2 text-base">
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FaBroadcastTower color="#1976D2" size={16} />
                </div>
                <span className="font-medium text-gray-700">BTS GSM-R</span>
              </div>
              <div className="flex items-center gap-2 text-base">
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FaBuilding color="#1976D2" size={16} />
                </div>
                <span className="font-medium text-gray-700">Postes existants</span>
              </div>
              <div className="flex items-center gap-2 text-base">
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FaCog color="#1976D2" size={16} />
                </div>
                <span className="font-medium text-gray-700">Centre N2 HPMV</span>
              </div>
              <div className="mt-2 text-sm text-gray-600">

                <div className="flex items-center gap-2 mt-2">
                  <span className="font-semibold">Bordures :</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-3 h-3 rounded-full border-2" style={{borderColor: '#FF9800'}}></div>
                  <span>Étude</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full border-2" style={{borderColor: '#FF5722'}}></div>
                  <span>Réalisation</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full border-2" style={{borderColor: '#2196F3'}}></div>
                  <span>Mis en service</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
        {/* Main content: carto + plan */}
        <div className="flex-1 min-w-0 flex flex-col gap-8">
          {/* Carto */}
          <div className="relative max-w-[1000px] w-full h-[600px] border-4 border-[#1A237E] rounded-lg bg-white shadow-lg">
            {/* Floating Action Bar - Compact pour invités */}
            <div className="absolute top-4 right-4 z-30">
              <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm p-2 rounded-xl shadow-lg border border-gray-200">
                {/* Contrôles de zoom */}
                <button 
                  onClick={handleZoomIn} 
                  className="bg-[#1A237E] text-white p-2 rounded-lg hover:bg-[#16205c] transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105"
                  title="Zoom avant"
                  aria-label="Zoom avant"
                >
                  <FaPlus size={14} />
                </button>
                <button 
                  onClick={handleZoomOut} 
                  className="bg-[#1A237E] text-white p-2 rounded-lg hover:bg-[#16205c] transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105"
                  title="Zoom arrière"
                  aria-label="Zoom arrière"
                >
                  <FaMinus size={14} />
                </button>
                <button 
                  onClick={handleResetZoom} 
                  className="bg-gray-600 text-white px-2 py-2 rounded-lg hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105"
                  title="Réinitialiser le zoom"
                  aria-label="Réinitialiser le zoom"
                >
                  <span className="text-xs font-bold">1:1</span>
                </button>

                {/* Séparateur visuel */}
                <div className="w-px h-8 bg-gray-300 mx-1"></div>

                {/* Plein écran */}
                <button
                  className="bg-[#1A237E] text-white p-2 rounded-lg hover:bg-[#16205c] transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105"
                  onClick={() => {
                    const el = document.querySelector('.map-fullscreen-container');
                    if (!document.fullscreenElement) {
                      el?.requestFullscreen();
                    } else {
                      document.exitFullscreen();
                    }
                  }}
                  title="Plein écran"
                  aria-label="Plein écran"
                >
                  <FaExpand size={14} />
                </button>
              </div>
            </div>
            <div
              ref={containerRef}
              className="w-full h-full overflow-auto map-fullscreen-container"
              style={{ 
                cursor: isDragging ? 'grabbing' : 'grab',
                backgroundColor: 'white', // Background blanc pour le plein écran
                // CSS pour le mode plein écran avec Tailwind style
                '--fullscreen-bg': 'white',
                '--fullscreen-padding': '20px'
              }}
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
                
                {/* Points BTS/GSMR pour les invités */}
                {activeLayers['BTS GSM-R'] && typePoints && typePoints.filter(pt => {
                  const isBTSPoint = pt.type === 'BTS GSM-R existante' || pt.type === 'BTS GSM-R HPMV' || pt.type === 'BTS GSM-R';
                  return isBTSPoint && pt.x !== undefined && pt.y !== undefined && !isNaN(pt.x) && !isNaN(pt.y);
                }).map((point, idx) => {
                  const normalizedEtat = normalizeEtat(point.Etats);
                  const etatColor = etatColorMap[normalizedEtat] || '#2196F3';
                  
                  // Offset vertical selon la voie
                  let yOffset = 0;
                  if (point.track) {
                    const track = String(point.track).toLowerCase().trim();
                    if (track.includes('mv1') || track.includes('1')) {
                      yOffset = -30; // Au-dessus pour MV1
                    } else if (track.includes('mv2') || track.includes('2')) {
                      yOffset = 30;  // En-dessous pour MV2
                    }
                    // Pour d'autres voies, pas d'offset (reste sur la voie)
                  }
                  
                  return (
                    <div
                      key={`guest-bts-${idx}`}
                      className="absolute"
                      style={{
                        left: `${point.x * zoom}px`,
                        top: `${(point.y + yOffset) * zoom}px`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 25,
                        cursor: 'pointer'
                      }}
                      title={`${point.name} - ${point.type} (PK ${point.pk}) - Voie: ${point.track} - ${point.Etats || 'N/A'}`}
                    >
                      <div
                        className="bts-icon-container"
                        style={{
                          backgroundColor: 'white',
                          border: `4px solid ${etatColor}`, // Bordure plus épaisse
                          borderRadius: '50%',
                          padding: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 3px 6px rgba(0,0,0,0.3)',
                          minWidth: '32px',
                          minHeight: '32px'
                        }}
                      >
                        {getTypeIcon(point.type, 20)}
                      </div>
                    </div>
                  );
                })}
                
                {/* Points Postes existants pour les invités */}
                {activeLayers['Postes existants'] && typePoints && typePoints.filter(pt => {
                  return pt.type === 'Postes existants' && pt.x !== undefined && pt.y !== undefined && !isNaN(pt.x) && !isNaN(pt.y);
                }).map((point, idx) => {
                  const normalizedEtat = normalizeEtat(point.Etats);
                  const etatColor = etatColorMap[normalizedEtat] || '#2196F3';
                  
                  let yOffset = 0;
                  if (point.track) {
                    const track = String(point.track).toLowerCase().trim();
                    if (track.includes('mv1') || track.includes('1')) {
                      yOffset = -30;
                    } else if (track.includes('mv2') || track.includes('2')) {
                      yOffset = 30;
                    }
                  }
                  
                  return (
                    <div
                      key={`guest-postes-${idx}`}
                      className="absolute"
                      style={{
                        left: `${point.x * zoom}px`,
                        top: `${(point.y + yOffset) * zoom}px`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 25,
                        cursor: 'pointer'
                      }}
                      title={`${point.name} - ${point.type} (PK ${point.pk}) - Voie: ${point.track} - ${point.Etats || 'N/A'}`}
                    >
                      <div
                        style={{
                          backgroundColor: 'white',
                          border: `3px solid ${etatColor}`,
                          borderRadius: '50%',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                      >
                        {getTypeIcon(point.type, 20)}
                      </div>
                    </div>
                  );
                })}
                
                {/* Points Centre N2 HPMV pour les invités */}
                {activeLayers['Centre N2 HPMV'] && typePoints && typePoints.filter(pt => {
                  return pt.type === 'Centre N2 HPMV' && pt.x !== undefined && pt.y !== undefined && !isNaN(pt.x) && !isNaN(pt.y);
                }).map((point, idx) => {
                  const normalizedEtat = normalizeEtat(point.Etats);
                  const etatColor = etatColorMap[normalizedEtat] || '#2196F3';
                  
                  let yOffset = 0;
                  if (point.track) {
                    const track = String(point.track).toLowerCase().trim();
                    if (track.includes('mv1') || track.includes('1')) {
                      yOffset = -30;
                    } else if (track.includes('mv2') || track.includes('2')) {
                      yOffset = 30;
                    }
                  }
                  
                  return (
                    <div
                      key={`guest-centre-${idx}`}
                      className="absolute"
                      style={{
                        left: `${point.x * zoom}px`,
                        top: `${(point.y + yOffset) * zoom}px`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 25,
                        cursor: 'pointer'
                      }}
                      title={`${point.name} - ${point.type} (PK ${point.pk}) - Voie: ${point.track} - ${point.Etats || 'N/A'}`}
                    >
                      <div
                        style={{
                          backgroundColor: 'white',
                          border: `3px solid ${etatColor}`,
                          borderRadius: '50%',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                      >
                        {getTypeIcon(point.type, 20)}
                      </div>
                    </div>
                  );
                })}
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
