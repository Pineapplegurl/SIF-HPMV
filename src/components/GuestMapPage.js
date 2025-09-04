import React, { useRef, useState, useEffect } from 'react';
import { API_BASE_URL } from '../utils/config';
import './Navbar.css';
import Navbar from './Navbar';
import { interpolateData } from '../utils/interpolateData';
import computePairedPolygons from '../utils/pairedMedianPolygons';
import { useManualPoints } from '../hooks/useManualPoints';
import { FaSearch, FaTrain, FaBroadcastTower, FaBuilding, FaCog, FaPlus, FaMinus, FaExpand } from 'react-icons/fa';
import { useTypePoints } from '../hooks/useTypePoints';
import { centerViewOnPoint, performSearch } from '../utils/searchUtils';

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
  "Zones de postes": "Zones-postes.png",
  "PDF": "SIF-V6.PDF"
};

// Calques qui contrôlent l'affichage des points (pas des images)
const pointLayers = ["BTS GSM-R", "Postes existants", "Centre N2 HPMV"];

// Calques qui contrôlent l'affichage des polygones
const polygonLayers = ["Zones d'actions"];

// Liste complète des calques (images + points + polygones)
const allLayers = [...Object.keys(layerImageMap).filter(layer => !polygonLayers.includes(layer)), ...pointLayers, ...polygonLayers];

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
  const { typePoints, isLoading, error } = useTypePoints();
  
  // Hook pour récupérer les points manuels (nécessaire pour l'interpolation des zones)
  const { manualPoints } = useManualPoints();
  
  // Variables pour les points comme dans PlanViewer
  const validManualPoints = Array.isArray(manualPoints) ? manualPoints : [];
  const [interpolatedPoints, setInterpolatedPoints] = useState([]);
  
  // Variables pour les couleurs des zones comme dans PlanViewer
  const [zoneColors, setZoneColors] = useState({});
  const [viewportPosition, setViewportPosition] = useState({ left: 0, width: 100 });

  // Interpolation des points comme dans PlanViewer
  useEffect(() => {
    if (!validManualPoints || validManualPoints.length === 0) return;

    const groupedByLineTrack = {};
    validManualPoints.forEach(p => {
      const key = `${p.line}-${p.track}`;
      if (!groupedByLineTrack[key]) groupedByLineTrack[key] = [];
      groupedByLineTrack[key].push(p);
    });
    
    const allInterpolated = [];
    Object.values(groupedByLineTrack).forEach(group => {
      const sortedGroup = [...group].sort((a, b) => a.pk - b.pk);
      for (let i = 0; i < sortedGroup.length - 1; i++) {
        const p1 = sortedGroup[i];
        const p2 = sortedGroup[i + 1];
        if (p1.pk === p2.pk) continue;
        const segment = interpolateData(
          [p1.pk, p2.pk],
          [p1.x, p2.x],
          [p1.y, p2.y],
          0.1
        ).map(p => ({
          ...p,
          line: p1.line,
          track: p1.track,
        }));
        allInterpolated.push(...segment);
      }
    });

    setInterpolatedPoints(allInterpolated);
  }, [manualPoints]);

  // Calculer la position du viewport pour la mini-navigation
  useEffect(() => {
    const updateViewportPosition = () => {
      if (!containerRef.current || !naturalSize.width) return;
      
      const container = containerRef.current;
      const totalImageWidth = naturalSize.width * zoom;
      const viewportWidth = container.clientWidth;
      const scrollLeft = container.scrollLeft;
      
      // Si l'image est plus petite que le viewport, elle peut être centrée
      const imageStartOffset = Math.max(0, (viewportWidth - totalImageWidth) / 2);
      
      // Calcul de la position relative du viewport par rapport à l'image visible
      let leftPercent, widthPercent;
      
      if (totalImageWidth <= viewportWidth) {
        // Image entièrement visible - le train occupe toute la largeur
        leftPercent = 0;
        widthPercent = 100;
      } else {
        // Image plus large que le viewport - calcul normal
        const effectiveScrollLeft = Math.max(0, scrollLeft - imageStartOffset);
        leftPercent = Math.max(0, (effectiveScrollLeft / totalImageWidth) * 100);
        widthPercent = Math.min((viewportWidth / totalImageWidth) * 100, 100);
        leftPercent = Math.min(leftPercent, 100 - widthPercent);
      }
      
      setViewportPosition({
        left: leftPercent,
        width: widthPercent
      });
    };

    updateViewportPosition();
    
    // Écouter les changements de scroll et de resize
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', updateViewportPosition);
      window.addEventListener('resize', updateViewportPosition);
      return () => {
        container.removeEventListener('scroll', updateViewportPosition);
        window.removeEventListener('resize', updateViewportPosition);
      };
    }
  }, [zoom, naturalSize]);

  // Helper: generate random color comme dans PlanViewer
  function getRandomColor(existingColors = []) {
    const colors = [
      '#FFB300', '#803E75', '#FF6800', '#A6BDD7', '#C10020', '#CEA262', '#817066',
      '#007D34', '#F6768E', '#00538A', '#FF7A5C', '#53377A', '#FF8E00', '#B32851',
      '#F4C800', '#7F180D', '#93AA00', '#593315', '#F13A13', '#232C16'
    ];
    // Pick a color not in existingColors
    const available = colors.filter(c => !existingColors.includes(c));
    return available.length > 0 ? available[Math.floor(Math.random() * available.length)] : colors[Math.floor(Math.random() * colors.length)];
  }

  // Système de coordonnées pour les zones (basé sur la structure de l'image)
  const coordinateSystem = {
    pkToPixel: (pk) => {
      // Conversion approximative basée sur la largeur de l'image (2200px)
      // et supposant une plage de PK de 0 à 100
      return (pk / 100) * 2200;
    },
    pixelToPk: (pixel) => {
      return (pixel / 2200) * 100;
    }
  };
  
  // État pour les zones d'actions
  const [zonesActions, setZonesActions] = useState([]);
  
  // Récupération des zones d'actions depuis l'API
  useEffect(() => {
    const fetchZonesActions = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/zones`);
        if (response.ok) {
          const zones = await response.json();
          setZonesActions(zones);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des zones d\'actions:', error);
      }
    };
    
    fetchZonesActions();
  }, []);

  // Assign random colors to zones comme dans PlanViewer
  useEffect(() => {
    const newColors = {};
    zonesActions.forEach((zone, idx) => {
      // Check for overlap with previous zones
      let usedColors = [];
      zonesActions.forEach((other, jdx) => {
        if (jdx < idx && other.name === zone.name) {
          usedColors.push(newColors[other.name]);
        }
      });
      newColors[zone.name] = getRandomColor(usedColors);
    });
    setZoneColors(newColors);
  }, [zonesActions]);

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

  // Recherche intelligente avec vraies données
  const handleSearchChange = e => {
    const value = e.target.value;
    setSearch(value);
    
    if (value.length > 1) {
      const searchResults = performSearch(value, zonesActions, validManualPoints, centerView);
      setSuggestions(searchResults);
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = suggestion => {
    setSelectedSuggestion(suggestion);
    setSearch(suggestion.label);
    setSuggestions([]);
    
    // Centrer la vue sur la suggestion sélectionnée
    if (suggestion.action) {
      suggestion.action();
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => setZoom(1);

  // Fonction wrapper pour centerViewOnPoint
  const centerView = (targetPK, targetX = null, targetY = null) => {
    centerViewOnPoint({
      targetPK,
      targetX,
      targetY,
      containerRef,
      naturalSize,
      zoom,
      interpolatedPoints
    });
  };

  // Fonction de recherche intelligente
  const performSearch = (searchValue) => {
    const value = searchValue.toLowerCase().trim();
    const suggestions = [];

    // 1. Recherche par PK (format: "PK 45.2" ou juste "45.2")
    const pkMatch = value.match(/(?:pk\s*)?(\d+(?:\.\d+)?)/);
    if (pkMatch) {
      const pk = parseFloat(pkMatch[1]);
      suggestions.push({
        label: `PK ${pk}`,
        type: 'pk',
        pk: pk,
        action: () => centerViewOnPoint(pk)
      });
    }

    // 2. Recherche dans les zones d'actions
    zonesActions.forEach(zone => {
      if (zone.name && zone.name.toLowerCase().includes(value)) {
        const centerPK = (zone.pkStart + zone.pkEnd) / 2;
        suggestions.push({
          label: `Zone: ${zone.name} (PK ${zone.pkStart}-${zone.pkEnd})`,
          type: 'zone',
          pk: centerPK,
          zone: zone,
          action: () => centerViewOnPoint(centerPK)
        });
      }
    });

    // 3. Recherche dans les points manuels (s'ils ont des noms/descriptions)
    validManualPoints.forEach(point => {
      if (point.name && point.name.toLowerCase().includes(value)) {
        suggestions.push({
          label: `Point: ${point.name} (PK ${point.pk})`,
          type: 'point',
          pk: point.pk,
          point: point,
          action: () => centerViewOnPoint(point.pk, point.x, point.y)
        });
      }
      // Recherche aussi par description si elle existe
      if (point.description && point.description.toLowerCase().includes(value)) {
        suggestions.push({
          label: `${point.description} (PK ${point.pk})`,
          type: 'point',
          pk: point.pk,
          point: point,
          action: () => centerViewOnPoint(point.pk, point.x, point.y)
        });
      }
    });

    // 4. Recherche de gares communes (liste prédéfinie)
    const commonStations = [
      { name: 'Gare de Lyon', pk: 12.3 },
      { name: 'Gare du Nord', pk: 8.5 },
      { name: 'Gare Montparnasse', pk: 15.7 },
      { name: 'Gare Saint-Lazare', pk: 9.2 }
    ];
    
    commonStations.forEach(station => {
      if (station.name.toLowerCase().includes(value)) {
        suggestions.push({
          label: `Gare: ${station.name} (PK ${station.pk})`,
          type: 'station',
          pk: station.pk,
          action: () => centerViewOnPoint(station.pk)
        });
      }
    });

    return suggestions.slice(0, 8); // Limiter à 8 suggestions
  };

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
            <div className="absolute left-0 right-0 top-12 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
              {suggestions.map((s, idx) => (
                <div
                  key={idx}
                  className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                  onClick={() => handleSuggestionClick(s)}
                >
                  {/* Icône selon le type */}
                  {s.type === 'station' && <FaBuilding className="text-blue-600 flex-shrink-0" />}
                  {s.type === 'pk' && <FaTrain className="text-green-600 flex-shrink-0" />}
                  {s.type === 'zone' && <FaCog className="text-orange-600 flex-shrink-0" />}
                  {s.type === 'point' && <FaBroadcastTower className="text-purple-600 flex-shrink-0" />}
                  
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-800">{s.label}</span>
                    {s.pk && (
                      <span className="text-xs text-gray-500">PK {s.pk}</span>
                    )}
                  </div>
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
                  className="bg-[#1A237E] text-white rounded-lg hover:bg-[#16205c] transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 w-10 h-10 flex items-center justify-center"
                  title="Zoom avant"
                  aria-label="Zoom avant"
                >
                  <FaPlus size={14} />
                </button>
                <button 
                  onClick={handleZoomOut} 
                  className="bg-[#1A237E] text-white rounded-lg hover:bg-[#16205c] transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 w-10 h-10 flex items-center justify-center"
                  title="Zoom arrière"
                  aria-label="Zoom arrière"
                >
                  <FaMinus size={14} />
                </button>
                <button 
                  onClick={handleResetZoom} 
                  className="bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 w-10 h-10 flex items-center justify-center"
                  title="Réinitialiser le zoom"
                  aria-label="Réinitialiser le zoom"
                >
                  <span className="text-xs font-bold leading-none">1:1</span>
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
                
                {/* Polygones des zones d'actions */}
                {activeLayers['Zones d\'actions'] && zonesActions && zonesActions.length > 0 && (
                  <svg
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: naturalSize.width * zoom,
                      height: naturalSize.height * zoom,
                      pointerEvents: 'none',
                      zIndex: 15
                    }}
                  >
                    {(() => {
                      if (!zonesActions || !zonesActions.length) return null;

                      console.log('🎯 Zones actions dans GuestMapPage:', zonesActions);
                      zonesActions.forEach((zone, idx) => {
                        console.log(`Zone ${idx}:`, {
                          name: zone.name,
                          line: zone.line,
                          track: zone.track,
                          pkStart: zone.pkStart,
                          pkEnd: zone.pkEnd
                        });
                      });

                      // COPIE EXACTE DE LA LOGIQUE DE PLANVIEWER
                      console.log('📍 validManualPoints:', validManualPoints.length);
                      console.log('📍 interpolatedPoints:', interpolatedPoints.length);
                      
                      // Vérifions les voies disponibles
                      const availableTracks = [...new Set([...validManualPoints, ...interpolatedPoints].map(p => `${p.line}||${p.track}`))];
                      console.log('🛤️ Voies disponibles:', availableTracks);

                      const groupedZones = {};
                      zonesActions.forEach(zone => {
                        if (!groupedZones[zone.name]) groupedZones[zone.name] = [];
                        groupedZones[zone.name].push(zone);
                      });

                      return Object.entries(groupedZones).flatMap(([zoneName, zoneGroup], groupIdx) => {
                        // Pour chaque zoneName, on crée un polygone par voie (line+track)
                        // puis on tente d'apparier les voies voisines pour calculer
                        // une médiane locale partagée. Si appariement impossible,
                        // on retombe sur le polygone d'offset classique.
                        const defaultWidth = 20;
                        // Calculer limites globales PK pour la zone
                        let globalPkStart = Infinity;
                        let globalPkEnd = -Infinity;
                        zoneGroup.forEach(zone => {
                          const pkStart = parseFloat(String(zone.pkStart).replace(',', '.'));
                          const pkEnd = parseFloat(String(zone.pkEnd).replace(',', '.'));
                          if (!isNaN(pkStart) && !isNaN(pkEnd)) {
                            globalPkStart = Math.min(globalPkStart, pkStart);
                            globalPkEnd = Math.max(globalPkEnd, pkEnd);
                          }
                        });
                        if (globalPkStart === Infinity) return [];

                        // Récupérer toutes les voies concernées (unique par line+track)
                        const trackKeys = {};
                        zoneGroup.forEach(z => { trackKeys[`${z.line}||${z.track}`] = { line: z.line, track: z.track, width: z.width }; });
                        const tracks = Object.values(trackKeys);

                        // Calculer centre de chaque voie (moyenne des points) pour déterminer direction interne
                        const trackCenters = {};
                        tracks.forEach(t => {
                          const allPtsForTrack = [...validManualPoints, ...interpolatedPoints].filter(pt =>
                            pt.line === t.line && pt.track === t.track && !isNaN(pt.x) && !isNaN(pt.y)
                          );
                          const pts = allPtsForTrack.filter(pt =>
                            pt.pk >= globalPkStart && pt.pk <= globalPkEnd
                          );
                          console.log(`📍 ${t.line}||${t.track}: ${allPtsForTrack.length} points total, ${pts.length} dans plage PK ${globalPkStart}-${globalPkEnd}`);
                          if (allPtsForTrack.length > 0) {
                            const pkRange = {
                              min: Math.min(...allPtsForTrack.map(p => p.pk)),
                              max: Math.max(...allPtsForTrack.map(p => p.pk))
                            };
                            console.log(`� ${t.line}||${t.track} PK range disponible: ${pkRange.min}-${pkRange.max}`);
                          }
                          if (pts.length > 0) {
                            const avg = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
                            avg.x /= pts.length; avg.y /= pts.length;
                            trackCenters[`${t.line}||${t.track}`] = { center: avg, pts };
                          } else {
                            trackCenters[`${t.line}||${t.track}`] = { center: null, pts: [] };
                          }
                        });

                        const polygons = [];
                        // Pour chaque voie, construire le polygone. On essaye d'apparier
                        // avec le meilleur voisin et utiliser computePairedPolygons pour
                        // obtenir deux polygones partageant la même médiane.
                        const processed = new Set();
                        Object.keys(trackCenters).forEach(key => {
                          if (processed.has(key)) return;
                          const track = trackCenters[key];
                          if (!track.center || track.pts.length < 2) return;

                          // Chercher le meilleur voisin pour appariement
                          let bestPair = null;
                          let bestDistance = Infinity;
                          Object.keys(trackCenters).forEach(otherKey => {
                            if (otherKey === key || processed.has(otherKey)) return;
                            const otherTrack = trackCenters[otherKey];
                            if (!otherTrack.center || otherTrack.pts.length < 2) return;
                            const dist = Math.hypot(track.center.x - otherTrack.center.x, track.center.y - otherTrack.center.y);
                            if (dist < bestDistance) {
                              bestDistance = dist;
                              bestPair = { key: otherKey, track: otherTrack };
                            }
                          });

                          if (bestPair && bestDistance < 200) {
                            // Appariement trouvé : calculer polygones médians
                            console.log(`🔗 Appariement trouvé entre ${key} et ${bestPair.key}, distance: ${bestDistance}`);
                            try {
                              const [poly1, poly2] = computePairedPolygons(
                                track.pts.sort((a, b) => a.pk - b.pk),
                                bestPair.track.pts.sort((a, b) => a.pk - b.pk),
                                defaultWidth,
                                zoom
                              );
                              console.log(`📐 Polygones calculés: poly1=${poly1?.length} points, poly2=${poly2?.length} points`);
                              if (poly1 && poly1.length >= 3) {
                                polygons.push(
                                  <polygon 
                                    key={`zone-${groupIdx}-${key}`}
                                    points={poly1.map(p => `${p[0]},${p[1]}`).join(' ')}
                                    fill={zoneColors[zoneName] || '#FFB300'}
                                    fillOpacity="0.3"
                                    stroke={zoneColors[zoneName] || '#FFB300'}
                                    strokeWidth="2"
                                  />
                                );
                              }
                              if (poly2 && poly2.length >= 3) {
                                polygons.push(
                                  <polygon 
                                    key={`zone-${groupIdx}-${bestPair.key}`}
                                    points={poly2.map(p => `${p[0]},${p[1]}`).join(' ')}
                                    fill={zoneColors[zoneName] || '#FFB300'}
                                    fillOpacity="0.3"
                                    stroke={zoneColors[zoneName] || '#FFB300'}
                                    strokeWidth="2"
                                  />
                                );
                              }
                              processed.add(key);
                              processed.add(bestPair.key);
                            } catch (err) {
                              console.warn('Erreur computePairedPolygons:', err);
                              // Fallback sur polygone simple
                            }
                          }

                          if (!processed.has(key)) {
                            // Pas d'appariement : polygone simple par offset
                            const pts = track.pts.sort((a, b) => a.pk - b.pk);
                            const widthPx = defaultWidth;
                            const outerHalf = widthPx / 2;
                            const leftSide = [];
                            const rightSide = [];
                            
                            for (let i = 0; i < pts.length; i++) {
                              const p = pts[i];
                              let dx = 0, dy = 0;
                              if (i === 0) { 
                                dx = pts[i+1].x - p.x; 
                                dy = pts[i+1].y - p.y; 
                              } else if (i === pts.length - 1) { 
                                dx = p.x - pts[i-1].x; 
                                dy = p.y - pts[i-1].y; 
                              } else { 
                                dx = (pts[i+1].x - pts[i-1].x) / 2; 
                                dy = (pts[i+1].y - pts[i-1].y) / 2; 
                              }
                              
                              const len = Math.hypot(dx, dy) || 1;
                              const nx = -dy / len; 
                              const ny = dx / len;
                              
                              leftSide.push([(p.x + nx * outerHalf) * zoom, (p.y + ny * outerHalf) * zoom]);
                              rightSide.push([(p.x - nx * outerHalf) * zoom, (p.y - ny * outerHalf) * zoom]);
                            }
                            
                            const polyPoints = [...leftSide, ...rightSide.reverse()];
                            if (polyPoints.length >= 3) {
                              polygons.push(
                                <polygon 
                                  key={`zone-${groupIdx}-${key}`}
                                  points={polyPoints.map(p => `${p[0]},${p[1]}`).join(' ')}
                                  fill={zoneColors[zoneName] || '#FFB300'}
                                  fillOpacity="0.3"
                                  stroke={zoneColors[zoneName] || '#FFB300'}
                                  strokeWidth="2"
                                />
                              );
                            }
                            processed.add(key);
                          }
                        });

                        return polygons;
                      });
                    })()}
                  </svg>
                )}
                
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
              <span className="text-sm text-gray-500 mb-2">Plan de voie simplifié </span>
              <div className="relative w-full h-16 flex items-center">
                {/* Image de fond SIMPLE.png */}
                <div className="absolute inset-0 overflow-hidden rounded">
                  <img 
                    src="/SIMPLE.png" 
                    alt="Plan de voie simplifié"
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Train représentant le viewport actuel - synchronisé avec le scroll/zoom */}
                <div 
                  className="absolute flex items-center justify-center transition-all duration-200"
                  style={{
                    left: `${viewportPosition.left}%`,
                    top: '25%',
                    width: `${Math.max(viewportPosition.width, 8)}%`, // Minimum 8% pour l'icône
                    height: '50%',
                    backgroundColor: 'rgba(255, 0, 0, 0.1)', // Debug: fond rouge semi-transparent
                    border: '1px solid red' // Debug: bordure rouge
                  }}
                >
                  {/* Icône de train propre */}
                  <FaTrain 
                    className="text-red-600 drop-shadow-lg" 
                    style={{ 
                      fontSize: '1.2rem',
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                    }} 
                  />
                </div>
                
                {/* Indicateur de position PK si une suggestion est sélectionnée */}
                {selectedSuggestion && (
                  <div 
                    className="absolute w-1 bg-yellow-500 opacity-80 rounded"
                    style={{
                      left: `${Math.min(95, (selectedSuggestion.pk || 0) / 100 * 100)}%`, // Calcul basé sur le PK réel
                      top: '10%',
                      height: '80%'
                    }}
                  />
                )}
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
        <span className="text-blue-900">{open ? 'Masquer' : 'Afficher'} les calques</span>
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
