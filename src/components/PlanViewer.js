import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import CoordinateEditor from './CoordinateEditor';
import { useManualPoints } from '../hooks/useManualPoints';
import { interpolateData } from '../utils/interpolateData';
import { Document, Page, pdfjs } from 'react-pdf';
import ZoneTable from './ZoneTable';
import { useTypePoints } from '../hooks/useTypePoints';
import { FaWifi, FaBroadcastTower, FaLayerGroup, FaTrain, FaTrash } from 'react-icons/fa';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const layerImageMap = {
  "Situation actuelle": "SIF-V6-SA.png",
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
  "PDF": "SIF-V6.PDF" // ne marche pas
};

function CalquesCollapsible({ layers, activeLayers, setActiveLayers }) {
  // Par défaut, calques masqués (collapsed)
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2 flex flex-col items-center justify-center">
      <button
        className="w-full flex justify-between items-center font-semibold py-2 px-3 bg-gray-100 rounded-lg hover:bg-gray-200 mb-3 shadow"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="text-blue-900">Afficher/Masquer les calques</span>
        <span className="text-lg">{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-3 items-center">
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

const PlanViewer = ({ imageOptions, activeLayers, setActiveLayers, isAdmin }) => {
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const addFormRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollOffset, setScrollOffset] = useState({ x: 0, y: 0 });
  const [zones, setZones] = useState([]);
  const { typePoints, loading: loadingTypePoints, refetch: refetchTypePoints } = useTypePoints();
  useEffect(() => {
  }, []);
  const { manualPoints, loading: loadingManual, refetch } = useManualPoints();

  const validManualPoints = Array.isArray(manualPoints) ? manualPoints : [];
  // Nouvel état pour le point sélectionné
  const [selectedPoint, setSelectedPoint] = useState(null);
  // État pour éditer le point sélectionné (cloné pour édition)
  const [editedPoint, setEditedPoint] = useState(null);
  // Quand selectedPoint change, on clone ses valeurs pour édition
  useEffect(() => {
    if (selectedPoint) {
      setEditedPoint({ ...selectedPoint });
    } else {
      setEditedPoint(null);
    }
  }, [selectedPoint]);
  const [interpolatedPoints, setInterpolatedPoints] = useState([]);
  const [showInterpolatedPoints, setShowInterpolatedPoints] = useState(true);
  useEffect(() => {
    // Interpolation automatique entre chaque paire de points consécutifs, même si le premier n'a pas de point avant
    const validPoints = manualPoints
      .filter(p => p.pk !== undefined && p.x !== undefined && p.y !== undefined)
      .map(p => ({
        ...p,
        pk: parseFloat(p.pk)
      }));

    const groupedByLineTrack = {};
    for (const pt of validPoints) {
      const key = `${pt.line}-${pt.track}`;
      if (!groupedByLineTrack[key]) groupedByLineTrack[key] = [];
      groupedByLineTrack[key].push(pt);
    }
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

  // Handler pour modifier un champ du formulaire
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditedPoint(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handler pour enregistrer les modifications
  const handleSave = async () => {
    if (!editedPoint || !editedPoint._id) return;
    try {
      const res = await fetch(`http://localhost:5000/api/update-point/${editedPoint._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(editedPoint),
      });
      if (res.ok) {
        alert("Modifications enregistrées !");
        setSelectedPoint(null);
        setEditedPoint(null);
        refetch();
      } else if (res.status === 401) {
        alert("Non autorisé : êtes-vous connecté en admin ?");
      } else {
        alert("AHHHHHHHH ALED");
      }
    } catch (error) {
      alert("Erreur réseau.");
    }
  };

  const handleDelete = async (pointId) => {
    const confirmDelete = window.confirm("Voulez-vous vraiment supprimer ce point ?");
    if (!confirmDelete) return;
    try {
      const res = await fetch(`http://localhost:5000/api/delete-point/${pointId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (res.ok) {
        console.log('Point supprimé');
        refetch(); // recharge la liste
      } else if (res.status === 401) {
        alert("Non autorisé : êtes-vous connecté en admin ?");
      } else {
        alert("Erreur lors de la suppression.");
      }
    } catch (error) {
      console.error("Erreur de suppression :", error);
      alert("Erreur réseau.");
    }
  };

  const selectedPlan = imageOptions[0];

  // --- BTS/GSMR inline entry state ---
  const [formState, setFormState] = useState({
    name: '', info: '', x: '', y: '', pk: '', line: '', track: '', type: '', Etats: ''
  });
  // --- BTS/GSMR inline entry row state ---
  const [btsForm, setBtsForm] = useState({
    name: '', type: '', pk: '', x: '', y: '', line: '', track: '', info: '', Etats: ''
  });
  const [btsLoading, setBtsLoading] = useState(false);
  const [btsError, setBtsError] = useState('');
  const [btsSuccess, setBtsSuccess] = useState(false);

  // --- Additional state for BTS/GSMR and zones ---
  const [savedTypePoints, setSavedTypePoints] = useState([]);
  const [loadingSavedTypePoints, setLoadingSavedTypePoints] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isInterpolating, setIsInterpolating] = useState(false);
  const [zoneCoords, setZoneCoords] = useState({});

  const fetchSavedTypePoints = useCallback(async () => {
    setLoadingSavedTypePoints(true);
    try {
      const res = await fetch('http://localhost:5000/api/saved-type-points');
      if (res.ok) {
        const data = await res.json();
        setSavedTypePoints(data);
      }
    } catch (err) {
      // Optionally handle error
    } finally {
      setLoadingSavedTypePoints(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchSavedTypePoints();
  }, [fetchSavedTypePoints]);

  // Fetch after save
  useEffect(() => {
    if (saveSuccess) {
      fetchSavedTypePoints();
    }
  }, [saveSuccess, fetchSavedTypePoints]);

  // Autofill X/Y when PK, line, and track are entered
  useEffect(() => {
    const { pk, line, track } = formState;
    // Correction : s'assurer que line est bien le numéro et track la voie
    if (pk && line && track && (!formState.x || !formState.y)) {
      setIsInterpolating(true);
      fetch('http://localhost:5000/api/interpolated-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pk: parseFloat(pk), line: String(line), track: String(track) })
      })
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(({ x, y }) => {
          setFormState(prev => ({ ...prev, x: x?.toFixed(2) || '', y: y?.toFixed(2) || '' }));
        })
        .catch(() => {})
        .finally(() => setIsInterpolating(false));
    }
  }, [formState.pk, formState.line, formState.track]);

  // Helper to normalize line/track for robust comparison
  function normalize(str) {
    return String(str || '').toLowerCase().trim();
  }

  // Autofill X/Y for BTS/GSMR when PK, line, and track are entered
  useEffect(() => {
    const { pk, line, track } = btsForm;
    if (pk && line && track && (!btsForm.x || !btsForm.y)) {
      // Cherche tous les points (manuels + interpolés) pour cette ligne/voie (comparaison insensible à la casse et aux espaces)
      const allPoints = [
        ...validManualPoints,
        ...interpolatedPoints
      ].filter(pt => normalize(pt.line) === normalize(line) && normalize(pt.track) === normalize(track) && !isNaN(pt.pk) && !isNaN(pt.x) && !isNaN(pt.y))
       .sort((a, b) => a.pk - b.pk);
      const pkNum = parseFloat(pk);
      // Trouve le segment d'interpolation
      let found = false;
      for (let i = 0; i < allPoints.length - 1; i++) {
        const p1 = allPoints[i];
        const p2 = allPoints[i + 1];
        if (p1.pk <= pkNum && pkNum <= p2.pk) {
          // Interpolation linéaire
          const t = (pkNum - p1.pk) / (p2.pk - p1.pk);
          const x = p1.x + t * (p2.x - p1.x);
          const y = p1.y + t * (p2.y - p1.y);
          setBtsForm(prev => ({ ...prev, x: x.toFixed(2), y: y.toFixed(2) }));
          found = true;
          break;
        }
      }
      // Si pas trouvé, fallback API
      if (!found) {
        fetch('http://localhost:5000/api/interpolated-position', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pk: pkNum, line: String(line), track: String(track) })
        })
          .then(res => res.ok ? res.json() : Promise.reject())
          .then(({ x, y }) => {
            setBtsForm(prev => ({ ...prev, x: x?.toFixed(2) || '', y: y?.toFixed(2) || '' }));
          })
          .catch(() => {});
      }
    }
  }, [btsForm.pk, btsForm.line, btsForm.track, validManualPoints, interpolatedPoints]);

  // Icon mapping by type
  const typeIconMap = {
    'BTS GSM-R existante': '/icons/BTS-existante.png',
    'BTS GSM-R HPMV': '/icons/BTS-HPMV.png',
    'Postes existants': '/icons/Poste.png',
    'Centre N2 HPMV': '/icons/CentreN2.png',
    'BTS': '/icons/GSM.png', // fallback
    'GSMR': '/icons/GSM.png', // fallback
  };
  // Color mapping by Etats
  const etatColorMap = {
    'Etude': 'orange',
    'Réalisation': 'green',
    'Mis en service': 'blue',
    'Exploitation': 'blue',
  };

  // Helper: generate random color
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

  const [zoneColors, setZoneColors] = useState({});

useEffect(() => {
  // Assign random colors to zones, ensuring no overlap
  const newColors = {};
  zones.forEach((zone, idx) => {
    // Check for overlap with previous zones
    let usedColors = [];
    zones.forEach((other, jdx) => {
      if (jdx !== idx) {
        // Overlap if same line/track and PK ranges intersect
        if (zone.line === other.line && zone.track === other.track &&
          !(parseFloat(zone.pkEnd) < parseFloat(other.pkStart) || parseFloat(zone.pkStart) > parseFloat(other.pkEnd))) {
          if (zoneColors[other.name]) usedColors.push(zoneColors[other.name]);
        }
      }
    });
    newColors[zone.name] = getRandomColor(usedColors);
  });
  setZoneColors(newColors);
}, [zones]);

  // Rafraîchit les zones depuis l'API
const fetchZones = useCallback(async () => {
  try {
    const res = await fetch('http://localhost:5000/api/zones');
    if (res.ok) {
      const data = await res.json();
      setZones(data);
    }
  } catch {
    // Optionally handle error
  }
}, []);

// Rafraîchit au montage et à chaque fois que la page est affichée
useEffect(() => {
  fetchZones();
}, [fetchZones]);

  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchAllZoneCoords() {
      const newCoords = {};
      for (const zone of zones) {
        // Convert PKs to numbers, handle comma as decimal separator
        const pkStart = parseFloat(String(zone.pkStart).replace(',', '.'));
        const pkEnd = parseFloat(String(zone.pkEnd).replace(',', '.'));
        let xsif = zone.xsif !== undefined && zone.xsif !== '' ? parseFloat(String(zone.xsif).replace(',', '.')) : NaN;
        let ysif = zone.ysif !== undefined && zone.ysif !== '' ? parseFloat(String(zone.ysif).replace(',', '.')) : NaN;
        if (!isNaN(xsif) && !isNaN(ysif)) {
          newCoords[zone.name] = {
            xsifStart: xsif,
            ysifStart: ysif,
            xsifEnd: xsif,
            ysifEnd: ysif
          };
        } else if (!isNaN(pkStart) && !isNaN(pkEnd) && zone.line && zone.track) {
          try {
            const resStart = await fetch('http://localhost:5000/api/interpolated-position', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pk: pkStart, line: String(zone.line), track: String(zone.track) })
            });
            const resEnd = await fetch('http://localhost:5000/api/interpolated-position', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pk: pkEnd, line: String(zone.line), track: String(zone.track) })
            });
            if (resStart.ok && resEnd.ok) {
              const start = await resStart.json();
              const end = await resEnd.json();
              if (!cancelled && start.x && start.y && end.x && end.y) {
                newCoords[zone.name] = {
                  xsifStart: start.x,
                  ysifStart: start.y,
                  xsifEnd: end.x,
                  ysifEnd: end.y
                };
              }
            }
          } catch {
            // Optionally handle error
          }
        }
      }
      if (!cancelled) setZoneCoords(newCoords);
    }
    fetchAllZoneCoords();
    return () => { cancelled = true; };
  }, [zones]);

  return (
    <div className="flex flex-row w-full max-w-[1400px] mx-auto pt-8">
      {/* Sidebar (calques + légende) toujours visible */}
      <aside className="w-80 min-h-[600px] bg-white rounded-2xl shadow-lg border border-gray-200 flex flex-col gap-8 px-6 py-8 sticky top-24 h-fit items-start mr-8">
        {/* Calques dépliants UX épuré */}
        <div className="w-full bg-white rounded-xl shadow border border-gray-200 p-4 mb-4">
          <h3 className="text-lg font-bold text-blue-900 mb-3 text-center w-full">Calques</h3>
          <CalquesCollapsible
            layers={Object.keys(layerImageMap)}
            activeLayers={activeLayers}
            setActiveLayers={setActiveLayers}
          />
        </div>
        {/* Légende épurée */}
        <div className="w-full bg-white rounded-xl shadow border border-gray-200 p-4 flex flex-col items-center justify-center">
          <h3 className="text-lg font-bold text-blue-900 mb-3 text-center w-full">Légende</h3>
          <div className="flex flex-col gap-3 items-center">
            <div className="flex items-center gap-2 text-base"><FaBroadcastTower className="text-blue-700 text-lg" /> <span className="font-medium text-gray-700">Relais GSM-R</span></div>
            <div className="flex items-center gap-2 text-base"><FaLayerGroup className="text-blue-400 text-lg" /> <span className="font-medium text-gray-700">TEST</span></div>
            <div className="flex items-center gap-2 text-base"><FaTrain className="text-gray-500 text-lg" /> <span className="font-medium text-gray-700">TEST</span></div>
          </div>
        </div>
      </aside>
      {/* Main content: carto + plan + admin/guest conditional */}
      <div className="flex-1 min-w-0 flex flex-col gap-8">
        {/* Search Bar */}
        <div className="w-full flex flex-col items-center mt-8 gap-4">
          <div className="relative w-[500px]">
            <input
              type="text"
              placeholder="Rechercher une gare, un PK..."
              value={search}
              onChange={e => {
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
              }}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 shadow focus:outline-none focus:ring-2 focus:ring-blue-300 text-lg bg-white"
              style={{ fontFamily: 'Inter, Poppins, Roboto, sans-serif' }}
            />
            <svg className="absolute right-3 top-3 text-gray-400" width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l4.387 4.387a1 1 0 01-1.414 1.414l-4.387-4.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" clipRule="evenodd" /></svg>
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-12 bg-white border border-gray-200 rounded-lg shadow z-10">
                {suggestions.map((s, idx) => (
                  <div
                    key={idx}
                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2"
                    onClick={() => {
                      setSelectedSuggestion(s);
                      setSearch(s.label);
                      setSuggestions([]);
                      // TODO: Center/zoom map to suggestion
                    }}
                  >
                    {s.type === 'station' ? <FaBroadcastTower className="text-blue-700" /> : <FaTrain className="text-gray-500" />}
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Toggle interpolation button */}
          <button
            className={`px-4 py-2 rounded-lg font-semibold shadow border border-blue-200 bg-white hover:bg-blue-50 text-blue-900 transition ${showInterpolatedPoints ? '' : 'opacity-60'}`}
            onClick={() => setShowInterpolatedPoints(v => !v)}
          >
            {showInterpolatedPoints ? 'Masquer interpolation' : 'Afficher interpolation'}
          </button>
        </div>
        {/* Harmonized map container logic: strictly match GuestMapPage.js */}
        <div className="relative max-w-[1000px] w-full h-[600px] border-4 border-[#1A237E] rounded-lg bg-white shadow-lg">
          <div className="absolute top-4 right-4 z-30 flex gap-2 bg-white/80 p-1 rounded shadow">
            <button onClick={handleZoomIn} className="bg-[#1A237E] text-white px-3 py-1 rounded hover:bg-[#16205c] transition-colors">+</button>
            <button onClick={handleZoomOut} className="bg-[#1A237E] text-white px-3 py-1 rounded hover:bg-[#16205c] transition-colors">-</button>
            <button onClick={handleResetZoom} className="bg-[#1A237E] text-white px-3 py-1 rounded hover:bg-[#16205c] transition-colors">Reset</button>
            <button
              className="bg-[#1A237E] text-white px-3 py-1 rounded hover:bg-[#16205c] transition-colors"
              onClick={() => {
                const el = document.querySelector('.map-fullscreen-container');
                if (!document.fullscreenElement) {
                  el?.requestFullscreen();
                } else {
                  document.exitFullscreen();
                }
              }}
              aria-label="Plein écran"
            >
              Plein écran
            </button>
          </div>
          <div
            ref={containerRef}
            className="w-full h-full overflow-auto relative map-fullscreen-container"
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (e.clientX - rect.left + containerRef.current.scrollLeft) / zoom;
              const y = (e.clientY - rect.top + containerRef.current.scrollTop) / zoom;
              if (isAdmin && addFormRef && addFormRef.current) {
                const form = addFormRef.current;
                if (form.x && form.y) {
                  form.x.value = x.toFixed(2);
                  form.y.value = y.toFixed(2);
                }
              }
            }}
          >
            <div
              className="relative min-w-max h-full"
              style={{
                width: naturalSize.width * zoom,
                height: naturalSize.height * zoom,
                transition: 'width 0.2s, height 0.2s',
              }}
            >
              <img
                ref={imgRef}
                src={selectedPlan.src}
                alt={selectedPlan.label}
                onLoad={handleImageLoad}
                style={{
                  width: naturalSize.width * zoom,
                  height: naturalSize.height * zoom,
                  display: 'block',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
                draggable={false}
              />
              {/* --- ZONE POLYGONS --- */}
              <svg
                width={naturalSize.width * zoom}
                height={naturalSize.height * zoom}
                style={{ position: 'absolute', left: 0, top: 0, zIndex: 10, pointerEvents: 'none' }}
              >
                {/* Nouvelle logique de traçage des zones */}
                {zones.map((zone, idx) => {
                  // 1. Récupère tous les points interpolés/manuels pour la zone
                  const pkStart = parseFloat(String(zone.pkStart).replace(',', '.'));
                  const pkEnd = parseFloat(String(zone.pkEnd).replace(',', '.'));
                  if (!zone.line || !zone.track || isNaN(pkStart) || isNaN(pkEnd)) return null;
                  // Combine manual and interpolated points, filter and sort by PK, remove duplicate PKs
                  let zonePoints = [
                    ...validManualPoints,
                    ...interpolatedPoints
                  ].filter(pt => pt.line === zone.line && pt.track === zone.track && pt.pk >= pkStart && pt.pk <= pkEnd && !isNaN(pt.x) && !isNaN(pt.y))
                   .sort((a, b) => a.pk - b.pk);
                  // Remove duplicate PKs (keep first occurrence)
                  zonePoints = zonePoints.filter((pt, i, arr) => i === 0 || pt.pk !== arr[i-1].pk);
                  if (zonePoints.length < 2) return null;
                  // 2. Calcule les extrémités du polygone (offset perpendiculaire) avec direction lissée
                  const width = 20; // largeur de la zone en px (modifiable)
                  const leftSide = [];
                  const rightSide = [];
                  for (let i = 0; i < zonePoints.length; i++) {
                    const p = zonePoints[i];
                    // Direction lissée : moyenne des vecteurs avant/après
                    let dx = 0, dy = 0;
                    if (i === 0) {
                      dx = zonePoints[i+1].x - p.x;
                      dy = zonePoints[i+1].y - p.y;
                    } else if (i === zonePoints.length - 1) {
                      dx = p.x - zonePoints[i-1].x;
                      dy = p.y - zonePoints[i-1].y;
                    } else {
                      dx = (zonePoints[i+1].x - zonePoints[i-1].x) / 2;
                      dy = (zonePoints[i+1].y - zonePoints[i-1].y) / 2;
                    }
                    // Normalise
                    const len = Math.hypot(dx, dy) || 1;
                    const nx = -dy / len;
                    const ny = dx / len;
                    // Extrémités gauche/droite
                    leftSide.push([(p.x + nx * width) * zoom, (p.y + ny * width) * zoom]);
                    rightSide.push([(p.x - nx * width) * zoom, (p.y - ny * width) * zoom]);
                  }
                  // 3. Construit le polygone (gauche puis droite en sens inverse)
                  const polyPoints = [...leftSide, ...rightSide.reverse()];
                  const pointsStr = polyPoints.map(([x, y]) => `${x},${y}`).join(' ');
                  // Couleur aléatoire, mais différente des zones contiguës
                  const color = zoneColors[zone.name] || '#FFB300';
                  return (
                    <polygon
                      key={zone._id || idx}
                      points={pointsStr}
                      fill={color}
                      fillOpacity={0.25}
                      stroke={color}
                      strokeWidth={2}
                    />
                  );
                })}
              </svg>
              {Object.entries(activeLayers)
                .filter(([layer, visible]) => visible && layer !== 'Situation actuelle')
                .map(([layer]) => {
                  const src = `/${layerImageMap[layer]}`;
                  return (
                    <img
                      key={layer}
                      src={src}
                      alt={layer}
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: naturalSize.width * zoom,
                        height: naturalSize.height * zoom,
                        opacity: 0.6,
                        pointerEvents: 'none',
                        zIndex: 5,
                      }}
                    />
                  );
                })}
              {/* Pastilles bleues (points ajoutés) */}
              {isAdmin && validManualPoints && validManualPoints.filter(pt => pt.x !== undefined && pt.y !== undefined).map((point, idx) => (
                <div
                  key={idx}
                  className="absolute bg-blue-600 border border-white rounded-full"
                  title={`PK ${point.pk || 'Inconnu'}`}
                  style={{
                    width: '10px',
                    height: '10px',
                    left: `${point.x * zoom}px`,
                    top: `${point.y * zoom}px`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 30,
                    cursor: 'pointer'
                  }}
                  onClick={() => handleDelete(point._id)}
                />
              ))}
              {/* Points d'interpolation (rouges) */}
              {isAdmin && showInterpolatedPoints && interpolatedPoints && interpolatedPoints.map((point, idx) => (
                <div
                  key={`interp-${idx}`}
                  className="absolute bg-red-400 border border-white rounded-full"
                  style={{
                    width: '8px',
                    height: '8px',
                    left: `${point.x * zoom}px`,
                    top: `${point.y * zoom}px`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 20,
                  }}
                  title={`Interp PK ${point.pk?.toFixed(3)}`}
                />
              ))}
              {/* Ajoute ici d'autres overlays si besoin */}
              {isAdmin && (
                <CoordinateEditor
                  imgRef={imgRef}
                  zoom={zoom}
                  naturalSize={naturalSize}
                  onNewPoint={refetch}
                />
              )}
            </div>
          </div>
        </div>
        {/* Admin only: tables, forms, etc. */}
        {isAdmin ? (
          <div>
            <div className="flex flex-row w-[1000px] gap-6">
              {/* Tableau des points ajoutés (AddedPoints) */}
              <div className="w-2/3 bg-white h-[300px] rounded-2xl border border-gray-200 p-4 overflow-y-auto shadow-lg mb-8">
                <h2 className="text-lg font-bold mb-4 text-blue-900 text-center tracking-wide">Points ajoutés</h2>
                <table className="w-full text-sm rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-blue-50 text-blue-900 font-semibold">
                      <th className="py-2 px-3 text-left">Nom</th>
                      <th className="py-2 px-3 text-center">PK</th>
                      <th className="py-2 px-3 text-center">X</th>
                      <th className="py-2 px-3 text-center">Y</th>
                      <th className="py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualPoints.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center text-gray-500 italic py-6">Aucun point ajouté</td>
                      </tr>
                    ) : manualPoints.map((pt, idx) => {
                      // Robust PK display logic
                      let pkDisplay = '-';
                      if (pt.pk !== undefined && pt.pk !== null && pt.pk !== '') {
                        let pkStr = String(pt.pk).replace(/\s/g, '');
                        // Accept numbers with comma or dot as separator
                        if (/^\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?$/.test(pkStr)) {
                          pkDisplay = pkStr;
                        } else if (!isNaN(Number(pkStr.replace(/,/g, '.')))) {
                          // fallback: try replacing comma with dot
                          pkDisplay = Number(pkStr.replace(/,/g, '.')).toLocaleString('fr-FR', { maximumFractionDigits: 3 });
                        }
                      }
                      return (
                        <tr
                          key={idx}
                          className={`border-t hover:bg-blue-50 transition cursor-pointer ${selectedPoint && selectedPoint._id === pt._id ? 'bg-blue-50' : ''}`}
                          onClick={() => setSelectedPoint(pt)}
                        >
                          <td>{pt.name}</td>
                          <td>{pkDisplay}</td>
                          <td>{pt.x}</td>
                          <td>{pt.y}</td>
                          <td>
                            <button
                              onClick={e => { e.stopPropagation(); handleDelete(pt._id); }}
                              title="Supprimer"
                              className="text-red-600 hover:text-red-800 p-1 rounded-full transition shadow-none focus:outline-none"
                              style={{ background: 'none', border: 'none' }}
                            >
                              <FaTrash size={18} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Container détail/édition du point sélectionné (droite) */}
              <div className="w-1/3 h-[300px] bg-white rounded-2xl border border-blue-100 p-6 overflow-y-auto flex flex-col shadow-xl transition-all duration-200">
                <h2 className="text-xl font-bold mb-2 text-blue-900 flex items-center gap-2">
                  <span>Détail du point</span>
                  {editedPoint && <span className="ml-2 text-blue-400 text-base">(édition)</span>}
                </h2>
                <hr className="mb-4 border-blue-100" />
                {editedPoint ? (
                  <form
                    className="flex flex-col gap-4 flex-1"
                    onSubmit={e => { e.preventDefault(); handleSave(); }}
                  >
                    {/* Affiche dynamiquement tous les champs du point sauf _id et __v */}
                    {Object.entries(editedPoint).filter(([key]) => key !== '_id' && key !== '__v').map(([key, value]) => (
                      <div key={key} className="flex flex-col gap-1">
                        <label className="font-semibold text-sm text-blue-900 mb-1 capitalize tracking-wide" htmlFor={key}>{key}</label>
                        {typeof value === 'string' && value.length > 40 ? (
                          <textarea
                            name={key}
                            id={key}
                            value={value}
                            onChange={handleEditChange}
                            className="border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50 resize-none"
                          />
                        ) : (
                          <input
                            name={key}
                            id={key}
                            value={value === undefined || value === null ? '' : value}
                            onChange={handleEditChange}
                            className="border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50"
                            type={typeof value === 'number' ? 'number' : 'text'}
                          />
                        )}
                      </div>
                    ))}
                    <div className="flex gap-3 mt-4 justify-end">
                      <button
                        type="submit"
                        className="bg-[#1A237E] text-white px-4 py-1.5 rounded-lg font-semibold shadow hover:bg-blue-700 transition flex items-center gap-2"
                      >
                        <svg xmlns='http://www.w3.org/2000/svg' className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        className="bg-gray-200 text-gray-700 px-4 py-1.5 rounded-lg font-semibold shadow hover:bg-gray-300 transition flex items-center gap-2"
                        onClick={() => { setSelectedPoint(null); setEditedPoint(null); }}
                      >
                        <svg xmlns='http://www.w3.org/2000/svg' className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        Annuler
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-gray-500 italic flex-1 flex items-center justify-center text-center">
                    Sélectionnez un point dans le tableau pour voir/modifier ses détails.
                  </div>
                )}
              </div>
            </div>
            {/* Tableau des points BTS/GSMR ajoutés juste sous le formulaire */}
            <div className="w-[1000px] mt-8 bg-white rounded-2xl border border-blue-100 p-6 shadow-xl transition-all duration-200 overflow-x-auto">
              <h2 className="text-xl font-bold mb-2 text-blue-900 flex items-center gap-2">Points BTS/GSMR ajoutés</h2>
              <hr className="mb-4 border-blue-100" />
              <table className="w-full min-w-[900px] table-fixed text-sm rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-blue-50 text-blue-900 font-semibold">
                    <th className="py-2 px-3 text-left border-r border-blue-100">Nom</th>
                    <th className="py-2 px-3 text-center border-r border-blue-100">Type</th>
                    <th className="py-2 px-3 text-center border-r border-blue-100">PK</th>
                    <th className="py-2 px-3 text-center border-r border-blue-100">X</th>
                    <th className="py-2 px-3 text-center border-r border-blue-100">Y</th>
                    <th className="py-2 px-3 text-center border-r border-blue-100">Ligne</th>
                    <th className="py-2 px-3 text-center border-r border-blue-100">Voie</th>
                    <th className="py-2 px-3 text-center border-r border-blue-100">Info</th>
                    <th className="py-2 px-3 text-center border-r border-blue-100">Etat</th>
                    <th className="py-2 px-3 text-center"> </th>
                  </tr>
                </thead>
                <tbody>
                  {typePoints.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="text-center text-gray-500 italic py-6">Aucun point BTS/GSMR ajouté</td>
                    </tr>
                  ) : typePoints.map((pt, idx) => {
                    // Robust PK display logic for BTS/GSMR
                    let pkDisplay = '-';
                    if (pt.pk !== undefined && pt.pk !== null && pt.pk !== '') {
                      let pkStr = String(pt.pk).replace(/\s/g, '');
                      if (/^\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?$/.test(pkStr)) {
                        pkDisplay = pkStr;
                      } else if (!isNaN(Number(pkStr.replace(/,/g, '.')))) {
                        pkDisplay = Number(pkStr.replace(/,/g, '.')).toLocaleString('fr-FR', { maximumFractionDigits: 3 });
                      }
                    }
                    return (
                      <tr key={pt._id || idx} className="border-t hover:bg-blue-50 transition">
                        <td className="px-3 py-2">{pt.name}</td>
                        <td className="px-3 py-2 text-center">{pt.type}</td>
                        <td className="px-3 py-2 text-center">{pkDisplay}</td>
                        <td className="px-3 py-2 text-center">{pt.x}</td>
                        <td className="px-3 py-2 text-center">{pt.y}</td>
                        <td className="px-3 py-2 text-center">{pt.line}</td>
                        <td className="px-3 py-2 text-center">{pt.track}</td>
                        <td className="px-3 py-2 text-center">{pt.info}</td>
                        <td className="px-3 py-2 text-center">{pt.Etats}</td>
                        <td className="px-3 py-2 text-center">
                          {isAdmin && (
                            <button
                              onClick={async e => {
                                e.stopPropagation();
                                if (window.confirm('Supprimer ce point BTS/GSMR ?')) {
                                  try {
                                    const res = await fetch(`http://localhost:5000/api/delete-type-point/${pt._id}`, {
                                      method: 'DELETE',
                                      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                                    });
                                    if (res.ok) {
                                      if (typeof refetchTypePoints === 'function') refetchTypePoints();
                                    } else {
                                      alert('Erreur lors de la suppression.');
                                    }
                                  } catch {
                                    alert('Erreur réseau.');
                                  }
                                }
                              }}
                              title="Supprimer"
                              className="text-red-600 hover:text-red-800 p-1 rounded-full transition shadow-none focus:outline-none"
                              style={{ background: 'none', border: 'none' }}
                            >
                              <FaTrash size={18} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Ligne d'ajout inline */}
                  <tr className="border-t bg-blue-50/50">
                    <td className="px-3 py-2 border-r border-blue-50">
                      <input name="name" placeholder="Nom" required className="border px-3 py-1 rounded w-[90px] focus:outline-none focus:ring-2 focus:ring-purple-500" value={btsForm.name} onChange={e => setBtsForm(f => ({ ...f, name: e.target.value }))} />
                    </td>
                    <td className="px-3 py-2 text-center border-r border-blue-50">
                      <select name="type" required className="border px-3 py-1 rounded w-[110px] focus:outline-none focus:ring-2 focus:ring-purple-500" value={btsForm.type} onChange={e => setBtsForm(f => ({ ...f, type: e.target.value }))}>
                        <option value="">Type</option>
                        <option value="BTS GSM-R existante">BTS GSM-R existante</option>
                        <option value="BTS GSM-R HPMV">BTS GSM-R HPMV</option>
                        <option value="Postes existants">Postes existants</option>
                        <option value="Centre N2 HPMV">Centre N2 HPMV</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-center border-r border-blue-50">
                      <input name="pk" placeholder="PK" required type="number" step="0.01" className="border px-3 py-1 rounded w-[70px] focus:outline-none focus:ring-2 focus:ring-purple-500" value={btsForm.pk} onChange={e => setBtsForm(f => ({ ...f, pk: e.target.value }))} />
                    </td>
                    <td className="px-3 py-2 text-center border-r border-blue-50">
                      <input name="x" placeholder="X" required type="number" className="border px-3 py-1 rounded w-[70px] focus:outline-none focus:ring-2 focus:ring-purple-500" value={btsForm.x} onChange={e => setBtsForm(f => ({ ...f, x: e.target.value }))} />
                    </td>
                    <td className="px-3 py-2 text-center border-r border-blue-50">
                      <input name="y" placeholder="Y" required type="number" className="border px-3 py-1 rounded w-[70px] focus:outline-none focus:ring-2 focus:ring-purple-500" value={btsForm.y} onChange={e => setBtsForm(f => ({ ...f, y: e.target.value }))} />
                    </td>
                    <td className="px-3 py-2 text-center border-r border-blue-50">
                      <input name="line" placeholder="Ligne" required className="border px-3 py-1 rounded w-[60px] focus:outline-none focus:ring-2 focus:ring-purple-500" value={btsForm.line} onChange={e => setBtsForm(f => ({ ...f, line: e.target.value }))} />
                    </td>
                    <td className="px-3 py-2 text-center border-r border-blue-50">
                      <input name="track" placeholder="Voie" required className="border px-3 py-1 rounded w-[90px] focus:outline-none focus:ring-2 focus:ring-purple-500" value={btsForm.track} onChange={e => setBtsForm(f => ({ ...f, track: e.target.value }))} />
                    </td>
                    <td className="px-3 py-2 text-center border-r border-blue-50">
                      <input name="info" placeholder="Info" className="border px-3 py-1 rounded w-[90px] focus:outline-none focus:ring-2 focus:ring-purple-500" value={btsForm.info} onChange={e => setBtsForm(f => ({ ...f, info: e.target.value }))} />
                    </td>
                    <td className="px-3 py-2 text-center border-r border-blue-50">
                      <select name="Etats" required className="border px-3 py-1 rounded w-[100px] focus:outline-none focus:ring-2 focus:ring-purple-500" value={btsForm.Etats} onChange={e => setBtsForm(f => ({ ...f, Etats: e.target.value }))}>
                        <option value="">Etat</option>
                        <option value="Etude">Etude</option>
                        <option value="Réalisation">Réalisation</option>
                        <option value="Mis en service">Mis en service</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        className="bg-[#1A237E] text-white px-4 py-1 rounded hover:bg-blue-900 mt-1 font-semibold shadow"
                        disabled={btsLoading}
                        onClick={async e => {
                          e.preventDefault();
                          setBtsLoading(true);
                          // Validation
                          if (!btsForm.name || !btsForm.type || !btsForm.pk || !btsForm.x || !btsForm.y || !btsForm.line || !btsForm.track || !btsForm.Etats) {
                            setBtsError('Tous les champs obligatoires doivent être remplis.');
                            setBtsLoading(false);
                            return;
                          }
                          const data = {
                            name: btsForm.name,
                            type: btsForm.type,
                            pk: parseFloat(btsForm.pk),
                            x: parseFloat(btsForm.x),
                            y: parseFloat(btsForm.y),
                            line: btsForm.line,
                            track: btsForm.track,
                            info: btsForm.info,
                            Etats: btsForm.Etats,
                          };
                          try {
                            const res = await fetch('http://localhost:5000/api/add-type-point', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${localStorage.getItem('token')}`,
                              },
                              body: JSON.stringify(data),
                            });
                            if (res.ok) {
                              setBtsForm({ name: '', type: '', pk: '', x: '', y: '', line: '', track: '', info: '', Etats: '' });
                              setBtsError('');
                              if (typeof refetchTypePoints === 'function') refetchTypePoints();
                              setBtsSuccess(true);
                              setTimeout(() => setBtsSuccess(false), 2000);
                            } else {
                              setBtsError('Erreur à l’ajout (êtes-vous en admin ?)');
                            }
                          } catch (err) {
                            setBtsError('Erreur réseau.');
                          } finally {
                            setBtsLoading(false);
                          }
                        }}
                      >
                        {btsLoading ? 'Ajout...' : 'Ajouter'}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              {btsError && <div className="text-red-600 font-bold mt-2">{btsError}</div>}
              {btsSuccess && (
                <div className="flex items-center text-green-600 font-bold mt-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Point ajouté avec succès !
                </div>
              )}
            </div>
            <div >
              <ZoneTable 
                zones={zones}
                onZonesUpdate={setZones}
                tableClassName="min-w-[900px] table-fixed w-full text-sm rounded-xl overflow-hidden"
              />
            </div>
          </div>
        ) : (
          <div className="w-[1000px] mt-8 flex flex-col items-center">
            {/* Fenêtre plan de voie simplifié synchronisée avec la vue SIF */}
            <div className="w-full h-32 bg-white rounded-lg border shadow flex items-center justify-center relative">
              {/* Track line */}
              <div style={{ position: 'absolute', left: '5%', top: '50%', width: '90%', height: '4px', background: '#888', borderRadius: '2px', transform: 'translateY(-50%)' }} />
              {/* SIF viewport rectangle (red) - position and size can be improved for real sync */}
              <div style={{ position: 'absolute', left: `${Math.max(0, Math.min(90, (scrollOffset.x / (naturalSize.width * zoom)) * 90))}%`, top: '35%', width: '10%', height: '30%', border: '2px solid red', background: 'rgba(255,0,0,0.1)', borderRadius: '4px', transition: 'left 0.2s' }} />
              <span className="absolute left-2 top-2 text-xs text-gray-500">Plan de voie simplifié (vue SIF)</span>
            </div>
          </div>
        )}
      </div> {/* End main content column */}
    </div> 
  );
}

// Helper: Convex hull (Andrew's monotone chain)
function convexHull(points) {
  if (points.length < 3) return points;
  // Sort by x, then y
  points = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const lower = [];
  for (let p of points) {
    while (lower.length >= 2 && cross(lower[lower.length-2], lower[lower.length-1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    while (upper.length >= 2 && cross(upper[upper.length-2], upper[upper.length-1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}
function cross(a, b, c) {
  return (b[0]-a[0])*(c[1]-a[1]) - (b[1]-a[1])*(c[0]-a[0]);
}

export default PlanViewer;