import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import CoordinateEditor from './CoordinateEditor';
import { useManualPoints } from '../hooks/useManualPoints';
import { interpolateData } from '../utils/interpolateData';
import { Document, Page, pdfjs } from 'react-pdf';
import ZoneTable from './ZoneTable';
import computePairedPolygons from '../utils/pairedMedianPolygons';
import { useTypePoints } from '../hooks/useTypePoints';
import { FaWifi, FaBroadcastTower, FaLayerGroup, FaTrain, FaTrash, FaDesktop, FaServer, FaBuilding, FaCog, FaPlus, FaMinus, FaExpand, FaCompress, FaEye, FaEyeSlash, FaEdit, FaLock, FaTimes } from 'react-icons/fa';
import { useToast } from './Toast';
import { centerViewOnPoint, performSearch } from '../utils/searchUtils';
import { API_BASE_URL } from '../utils/config';

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
  "Filets": "Filets.png",
  "Zones d'actions": "Zones-actions.png",
  "Zones de postes": "Zones-postes.png",
  "PDF": "SIF-V6.PDF"
};

// Calques qui contrôlent l'affichage des points 
const pointLayers = ["BTS GSM-R", "Postes existants", "Centre N2 HPMV"];

// Liste complète des calques (images + points)
const allLayers = [...Object.keys(layerImageMap), ...pointLayers];

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

const PlanViewer = ({ imageOptions, activeLayers, setActiveLayers, isAdmin }) => {
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const addFormRef = useRef(null);

  // --- Shared state and hooks (moved up to prevent TDZ) ---
  const { manualPoints, loading: loadingManual, refetch } = useManualPoints();
  const validManualPoints = Array.isArray(manualPoints) ? manualPoints : [];
  const [interpolatedPoints, setInterpolatedPoints] = useState([]);
  const { typePoints, loading: loadingTypePoints, refetch: refetchTypePoints } = useTypePoints();

  const { showToast, ToastContainer } = useToast();

  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollOffset, setScrollOffset] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 1000, height: 800 });
  const [editMode, setEditMode] = useState(false);
  const [draggingPoint, setDraggingPoint] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [editedPoint, setEditedPoint] = useState(null);
  const [zones, setZones] = useState([]);
  const [showInterpolatedPoints, setShowInterpolatedPoints] = useState(false);

  // Interpolation automatique entre chaque paire de points consécutifs
  useEffect(() => {
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

  // Basic zoom handlers
  const handleResetZoom = () => setZoom(1);
  const handleZoomIn = () => setZoom(z => Math.min(4, (z || 1) * 1.2));
  const handleZoomOut = () => setZoom(z => Math.max(0.25, (z || 1) / 1.2));

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
      const res = await fetch(`${API_BASE_URL}/api/update-point/${editedPoint._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(editedPoint),
      });
      if (res.ok) {
        showToast("Modifications enregistrées !", "success");
        setSelectedPoint(null);
        setEditedPoint(null);
        refetch();
      } else if (res.status === 401) {
        showToast("Non autorisé : êtes-vous connecté en admin ?", "error");
      } else {
        showToast("Erreur lors de la modification", "error");
      }
    } catch (error) {
      showToast("Erreur réseau", "error");
    }
  };

  const handleDelete = async (pointId) => {
    const confirmDelete = window.confirm("Voulez-vous vraiment supprimer ce point ?");
    if (!confirmDelete) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/delete-point/${pointId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (res.ok) {
        console.log('Point supprimé');
        showToast("Point supprimé avec succès", "success");
        refetch(); // recharge la liste
      } else if (res.status === 401) {
        showToast("Non autorisé : êtes-vous connecté en admin ?", "error");
      } else {
        showToast("Erreur lors de la suppression", "error");
      }
    } catch (error) {
      console.error("Erreur de suppression :", error);
      showToast("Erreur réseau", "error");
    }
  };

  // Fonctions pour le drag & drop des points
  const handlePointMouseDown = (e, point) => {
    if (!editMode) return;
    e.stopPropagation();
    e.preventDefault();
    
    const rect = containerRef.current.getBoundingClientRect();
    const pointX = point.x * zoom;
    const pointY = point.y * zoom;
    const mouseX = e.clientX - rect.left + containerRef.current.scrollLeft;
    const mouseY = e.clientY - rect.top + containerRef.current.scrollTop;
    
    setDraggingPoint(point);
    setDragOffset({
      x: mouseX - pointX,
      y: mouseY - pointY
    });
  };

  const handlePointMouseMove = (e) => {
    if (!draggingPoint || !editMode) return;
    e.preventDefault();
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left + containerRef.current.scrollLeft;
    const mouseY = e.clientY - rect.top + containerRef.current.scrollTop;
    
    const newX = (mouseX - dragOffset.x) / zoom;
    const newY = (mouseY - dragOffset.y) / zoom;
    
    // Mise à jour temporaire pour la visualisation
    setDraggingPoint(prev => ({
      ...prev,
      x: newX,
      y: newY
    }));
  };

  const handlePointMouseUp = async () => {
    if (!draggingPoint || !editMode) return;
    
    try {
      // Mise à jour dans la base de données
      const res = await fetch(`${API_BASE_URL}/api/update-point/${draggingPoint._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...draggingPoint,
          x: draggingPoint.x,
          y: draggingPoint.y
        }),
      });
      
      if (res.ok) {
        // Recharger les points pour mettre à jour l'interpolation
        refetch();
        showToast("Point déplacé avec succès", "success");
        console.log('Point déplacé avec succès');
      } else {
        showToast("Erreur lors de la mise à jour du point", "error");
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour :", error);
      showToast("Erreur réseau", "error");
    }
    
    setDraggingPoint(null);
    setDragOffset({ x: 0, y: 0 });
  };

  // Ajouter les event listeners pour le drag global
  useEffect(() => {
    if (draggingPoint && editMode) {
      document.addEventListener('mousemove', handlePointMouseMove);
      document.addEventListener('mouseup', handlePointMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handlePointMouseMove);
        document.removeEventListener('mouseup', handlePointMouseUp);
      };
    }
  }, [draggingPoint, editMode, dragOffset, zoom]);

  const selectedPlan = imageOptions[0];
  

  // ...shared state/hooks are declared earlier to avoid TDZ...

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

  // --- Additional state for BTS/GSMR and zones ---
  const [savedTypePoints, setSavedTypePoints] = useState([]);
  const [loadingSavedTypePoints, setLoadingSavedTypePoints] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isInterpolating, setIsInterpolating] = useState(false);
  const [zoneCoords, setZoneCoords] = useState({});

  const fetchSavedTypePoints = useCallback(async () => {
    setLoadingSavedTypePoints(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/saved-type-points`);
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
      fetch(`${API_BASE_URL}/api/interpolated-position`, {
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
        if (p1.pk <= p2.pk) {
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
        fetch(`${API_BASE_URL}/api/interpolated-position`, {
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

  // Icon component and color mapping by type
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

  // Color mapping by Etats (border colors)
  const etatColorMap = {
    'Etude': '#FF9800', // Orange
    'Réalisation': '#4CAF50', // Vert
    'Mis en service': '#2196F3', // Bleu
    'Exploitation': '#2196F3', // Bleu
  };

  // normalizeEtat: normalize various user-entered etat strings to canonical keys
  const normalizeEtat = (s) => {
    if (s === undefined || s === null) return 'Réalisation';
    const v = String(s).toLowerCase().trim();
    if (v.includes('mau') || v === 'mauvais') return 'Exploitation';
    if (v.includes('réal') || v.includes('real') || v === 'réalisation') return 'Réalisation';
    if (v.includes('mis') || v.includes('service') || v === 'mis en service') return 'Mis en service';
    if (v.includes('etud') || v.includes('etude')) return 'Etude';
    return 'Réalisation';
  };

  // Debug: log des états pour vérifier les valeurs
  useEffect(() => {
    if (typePoints && typePoints.length > 0) {
      const etats = [...new Set(typePoints.map(p => p.Etats).filter(Boolean))];
      console.log('États trouvés dans les points BTS/GSMR:', etats);
      console.log('États supportés dans etatColorMap:', Object.keys(etatColorMap));
    }
  }, [typePoints]);

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
    const res = await fetch(`${API_BASE_URL}/api/zones`);
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
            const resStart = await fetch(`${API_BASE_URL}/api/interpolated-position`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pk: pkStart, line: String(zone.line), track: String(zone.track) })
            });
            const resEnd = await fetch(`${API_BASE_URL}/api/interpolated-position`, {
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

  // Vérifier si l'utilisateur est bien connecté en admin
  const isTokenValid = () => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
      // Vérification basique du format JWT (3 parties séparées par des points)
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      // Décodage de la payload pour vérifier l'expiration
      const payload = JSON.parse(atob(parts[1]));
      const now = Date.now() / 1000;
      
      return payload.exp > now;
    } catch {
      return false;
    }
  };

  // Afficher un avertissement si le token n'est pas valide
  useEffect(() => {
    if (isAdmin && !isTokenValid()) {
      showToast('Votre session a expiré. Veuillez vous reconnecter pour effectuer des modifications.', 'warning', 5000);
    }
  }, [isAdmin]);

  return (
    <div className="flex flex-row w-full max-w-[1400px] mx-auto pt-8">
      {/* Sidebar (calques + légende) toujours visible */}
      <aside className="w-80 min-h-[600px] bg-white rounded-2xl shadow-lg border border-gray-200 flex flex-col gap-8 px-6 py-8 sticky top-24 h-fit items-start mr-8">
        {/* Calques dépliants UX épuré */}
        <div className="w-full bg-white rounded-xl shadow border border-gray-200 p-4 mb-4">
          <h3 className="text-lg font-bold text-blue-900 mb-3 text-center w-full">Calques</h3>
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
                <div className="w-3 h-3 rounded-full border-2" style={{borderColor: '#4CAF50'}}></div>
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
      {/* Main content: carto + plan + admin/guest conditional */}
      <div className="flex-1 min-w-0 flex flex-col gap-8">
        {/* Fonction wrapper pour centerViewOnPoint */}
        {(() => {
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
          
          window.planViewerCenterView = centerView; // Rendre accessible pour la recherche
          return null;
        })()}
        
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
                
                if (value.length > 1) {
                  const searchResults = performSearch(value, zones, validManualPoints, window.planViewerCenterView);
                  setSuggestions(searchResults);
                } else {
                  setSuggestions([]);
                }
              }}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 shadow focus:outline-none focus:ring-2 focus:ring-blue-300 text-lg bg-white"
              style={{ fontFamily: 'Inter, Poppins, Roboto, sans-serif' }}
            />
            <svg className="absolute right-3 top-3 text-gray-400" width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l4.387 4.387a1 1 0 01-1.414 1.414l-4.387-4.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" clipRule="evenodd" /></svg>
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-12 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                {suggestions.map((s, idx) => (
                  <div
                    key={idx}
                    className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                    onClick={() => {
                      setSelectedSuggestion(s);
                      setSearch(s.label);
                      setSuggestions([]);
                      
                      // Centrer la vue sur la suggestion sélectionnée
                      if (s.action) {
                        s.action();
                      }
                    }}
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
        {/* Harmonized map container logic: strictly match GuestMapPage.js */}
        <div className="relative max-w-[1000px] w-full h-[600px] border-4 border-[#1A237E] rounded-lg bg-white shadow-lg">
          {/* Notification mode édition */}
          {editMode && (
            <div className="absolute top-4 left-4 z-40 bg-orange-100 border border-orange-300 text-orange-800 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <span className="text-lg">✏️</span>
              <span className="font-semibold">Mode édition activé</span>
              <span className="text-sm">- Glissez-déposez les points bleus pour les déplacer</span>
            </div>
          )}
          
          {/* Floating Action Bar - Compact et élégant */}
          <div className="absolute top-4 right-4 z-30">
            {/* Barre horizontale compacte avec tous les contrôles */}
            <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm p-2 rounded-xl shadow-lg border border-gray-200">
              {/* Groupe zoom avec séparateur visuel */}
              <div className="flex items-center gap-1">
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
              </div>

              {/* Séparateur visuel */}
              <div className="w-px h-8 bg-gray-300 mx-1"></div>

              {/* Actions d'affichage */}
              <div className="flex items-center gap-1">
                <button
                  className={`p-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 ${
                    showInterpolatedPoints 
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                  }`}
                  onClick={() => setShowInterpolatedPoints(v => !v)}
                  title={showInterpolatedPoints ? 'Masquer interpolation' : 'Afficher interpolation'}
                  aria-label="Basculer l'affichage de l'interpolation"
                >
                  {showInterpolatedPoints ? <FaEye size={14} /> : <FaEyeSlash size={14} />}
                </button>
                
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

              {/* Mode édition (Admin seulement) avec séparateur */}
              {isAdmin && (
                <>
                  <div className="w-px h-8 bg-gray-300 mx-1"></div>
                  <button
                    className={`p-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 ${
                      editMode 
                        ? 'bg-orange-500 text-white hover:bg-orange-600' 
                        : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                    }`}
                    onClick={() => setEditMode(v => !v)}
                    title={editMode ? 'Verrouiller' : 'Mode édition'}
                    aria-label="Basculer le mode édition"
                  >
                    {editMode ? <FaEdit size={14} /> : <FaLock size={14} />}
                  </button>
                </>
              )}
            </div>
          </div>
          <div
            ref={containerRef}
            className="w-full h-full overflow-auto relative map-fullscreen-container"
            style={{ 
              cursor: isDragging ? 'grabbing' : (editMode ? 'crosshair' : 'grab'),
              backgroundColor: 'white' // Fond blanc pour la visibilité des calques transparents
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={(e) => {
              // Ne pas ajouter de point en mode édition
              if (editMode) return;
              
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
                {/* Fusion des zones par nom + enveloppe convexe (convex hull) */}
                {(() => {
                  const groupedZones = {};
                  zones.forEach(zone => {
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
                      const pts = [...validManualPoints, ...interpolatedPoints].filter(pt =>
                        pt.line === t.line && pt.track === t.track && pt.pk >= globalPkStart && pt.pk <= globalPkEnd && !isNaN(pt.x) && !isNaN(pt.y)
                      );
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
                    tracks.forEach((t, tidx) => {
                      const key = `${t.line}||${t.track}`;
                      const pts = trackCenters[key].pts.sort((a,b) => a.pk - b.pk);
                      if (pts.length < 2) return; // pas assez de points
                      // if already processed as part of a paired operation, skip
                      if (processed.has(key)) return;

                      // Find best neighbor similarly to previous approach but keep it lightweight
                      let bestNeighborKey = null; let bestScore = Infinity;
                      Object.entries(trackCenters).forEach(([k, v]) => {
                        if (k === key) return;
                        if (!v.center || v.pts.length < 2) return;
                        const aPkMin = pts[0].pk; const aPkMax = pts[pts.length-1].pk;
                        const bPkMin = v.pts[0].pk; const bPkMax = v.pts[v.pts.length-1].pk;
                        const overlapStart = Math.max(aPkMin, bPkMin);
                        const overlapEnd = Math.min(aPkMax, bPkMax);
                        if (overlapEnd <= overlapStart) return;
                        // compute midpoint distance as heuristic
                        const midPk = (overlapStart + overlapEnd) / 2;
                        const interp = (arr, pks) => {
                          for (let ii = 0; ii < arr.length-1; ii++) {
                            const p1 = arr[ii], p2 = arr[ii+1];
                            if (pks >= p1.pk && pks <= p2.pk) {
                              const r = (pks - p1.pk) / (p2.pk - p1.pk || 1);
                              return { x: p1.x + (p2.x - p1.x) * r, y: p1.y + (p2.y - p1.y) * r };
                            }
                          }
                          return arr[arr.length-1] || arr[0];
                        };
                        const aMid = interp(pts, midPk); const bMid = interp(v.pts, midPk);
                        const d = Math.hypot(aMid.x - bMid.x, aMid.y - bMid.y);
                        if (d < bestScore) { bestScore = d; bestNeighborKey = k; }
                      });

                      const color = zoneColors[zoneName] || '#FFB300';

                      if (bestNeighborKey) {
                        // build paired polygons using utility
                        const neighbor = trackCenters[bestNeighborKey];
                        if (neighbor && neighbor.pts && neighbor.pts.length > 1) {
                          const widthA = t.width ? Number(t.width) : defaultWidth;
                          const parts = computePairedPolygons(pts, neighbor.pts, widthA, neighbor.width || defaultWidth, { samples: 40, zoom });
                          if (parts && parts.polyA && parts.polyB) {
                            polygons.push(
                              <polygon key={`zone-${zoneName}-${key}-A-${groupIdx}`} points={parts.polyA.map(p=>p.join(',')).join(' ')} fill={color} fillOpacity={0.25} stroke={color} strokeWidth={2} />
                            );
                            polygons.push(
                              <polygon key={`zone-${zoneName}-${bestNeighborKey}-B-${groupIdx}`} points={parts.polyB.map(p=>p.join(',')).join(' ')} fill={color} fillOpacity={0.25} stroke={color} strokeWidth={2} />
                            );
                            // mark both processed
                            processed.add(key); processed.add(bestNeighborKey);
                            return;
                          }
                        }
                      }

                      // Fallback: compute offset polygon for this track alone
                      const widthPx = t.width ? Number(t.width) : defaultWidth;
                      const outerHalf = widthPx / 2;
                      const leftSide = [];
                      const rightSide = [];
                      for (let i = 0; i < pts.length; i++) {
                        const p = pts[i];
                        let dx = 0, dy = 0;
                        if (i === 0) { dx = pts[i+1].x - p.x; dy = pts[i+1].y - p.y; }
                        else if (i === pts.length - 1) { dx = p.x - pts[i-1].x; dy = p.y - pts[i-1].y; }
                        else { dx = (pts[i+1].x - pts[i-1].x) / 2; dy = (pts[i+1].y - pts[i-1].y) / 2; }
                        const len = Math.hypot(dx, dy) || 1;
                        const nx = -dy / len; const ny = dx / len;
                        leftSide.push([(p.x + nx * outerHalf) * zoom, (p.y + ny * outerHalf) * zoom]);
                        rightSide.push([(p.x - nx * outerHalf) * zoom, (p.y - ny * outerHalf) * zoom]);
                      }
                      const polyPoints = [...leftSide, ...rightSide.reverse()];
                      if (polyPoints.length >= 3) {
                        polygons.push(
                          <polygon key={`zone-${zoneName}-${key}-${groupIdx}`} points={polyPoints.map(([x,y]) => `${x},${y}`).join(' ')} fill={color} fillOpacity={0.25} stroke={color} strokeWidth={2} title={`${zoneName} (${t.line}/${t.track})`} />
                        );
                      }
                    });

                    return polygons;
                  });
                })()}
              </svg>
              {Object.entries(activeLayers)
                .filter(([layer, visible]) => visible && layer !== 'Situation actuelle' && layerImageMap[layer])
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
              {isAdmin && validManualPoints && validManualPoints.filter(pt => pt.x !== undefined && pt.y !== undefined).map((point, idx) => {
                // Utiliser la position du point en cours de déplacement si c'est celui qu'on traîne
                const displayPoint = draggingPoint && draggingPoint._id === point._id ? draggingPoint : point;
                
                return (
                  <div
                    key={point._id || idx}
                    className={`absolute border border-white rounded-full transition-all duration-150 ${
                      editMode 
                        ? 'bg-orange-500 hover:bg-orange-600 shadow-lg' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    } ${draggingPoint && draggingPoint._id === point._id ? 'scale-125 shadow-xl' : ''}`}
                    title={editMode 
                      ? `Drag pour déplacer - PK ${point.pk || 'Inconnu'}` 
                      : `Clic pour supprimer - PK ${point.pk || 'Inconnu'}`
                    }
                    style={{
                      width: editMode ? '14px' : '10px',
                      height: editMode ? '14px' : '10px',
                      left: `${displayPoint.x * zoom}px`,
                      top: `${displayPoint.y * zoom}px`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: draggingPoint && draggingPoint._id === point._id ? 50 : 30,
                      cursor: editMode ? 'grab' : 'pointer',
                    }}
                    onMouseDown={(e) => editMode ? handlePointMouseDown(e, point) : null}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!editMode) {
                        // Si pas en mode édition, on sélectionne le point dans le tableau
                        setSelectedPoint(point);
                      }
                    }}
                    onDoubleClick={(e) => {
                      if (!editMode) {
                        e.stopPropagation();
                        handleDelete(point._id);
                      }
                    }}
                  />
                );
              })}
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
              
              {/* Points BTS/GSMR */}
              {isAdmin && activeLayers['BTS GSM-R'] && typePoints && typePoints.filter(pt => {
                // Filtrer seulement les points BTS GSM-R (existante, HPMV, et nouveau type unifié)
                const isBTSPoint = pt.type === 'BTS GSM-R existante' || pt.type === 'BTS GSM-R HPMV' || pt.type === 'BTS GSM-R';
                return isBTSPoint && pt.x !== undefined && pt.y !== undefined && !isNaN(pt.x) && !isNaN(pt.y);
              }).map((point, idx) => {
                // Normalisation de l'état pour correspondre aux clés de etatColorMap
                const normalizedEtat = point.Etats ? String(point.Etats).trim() : '';
                const etatColor = etatColorMap[normalizedEtat] || '#666666';
                
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
                    key={`bts-${idx}`}
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
              
              {/* Points Postes existants */}
              {isAdmin && activeLayers['Postes existants'] && typePoints && typePoints.filter(pt => {
                return pt.type === 'Postes existants' && pt.x !== undefined && pt.y !== undefined && !isNaN(pt.x) && !isNaN(pt.y);
              }).map((point, idx) => {
                const normalizedEtat = point.Etats ? String(point.Etats).trim() : '';
                const etatColor = etatColorMap[normalizedEtat] || '#666666';
                
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
                    key={`postes-${idx}`}
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
              
              {/* Points Centre N2 HPMV */}
              {isAdmin && activeLayers['Centre N2 HPMV'] && typePoints && typePoints.filter(pt => {
                return pt.type === 'Centre N2 HPMV' && pt.x !== undefined && pt.y !== undefined && !isNaN(pt.x) && !isNaN(pt.y);
              }).map((point, idx) => {
                const normalizedEtat = point.Etats ? String(point.Etats).trim() : '';
                const etatColor = etatColorMap[normalizedEtat] || '#666666';
                
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
                    key={`centre-${idx}`}
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
              <div className="w-2/3 bg-white h-[300px] rounded-2xl border border-blue-100 p-6 overflow-y-auto shadow-xl mb-8">
                <h2 className="text-xl font-bold mb-2 text-blue-900 flex items-center gap-2">Points ajoutés</h2>
                <hr className="mb-4 border-blue-100" />
                <div className="overflow-x-auto overflow-y-auto max-h-[200px] border border-gray-200 rounded-lg">
                  <table className="w-full min-w-[500px] text-sm">
                    <thead>
                      <tr className="bg-blue-50 text-blue-900 font-semibold">
                        <th className="py-3 px-4 text-left border-r border-blue-100 w-40">Nom</th>
                        <th className="py-3 px-3 text-center border-r border-blue-100 w-20">PK</th>
                        <th className="py-3 px-3 text-center border-r border-blue-100 w-24">X</th>
                        <th className="py-3 px-3 text-center border-r border-blue-100 w-24">Y</th>
                        <th className="py-3 px-3 text-center w-12"> </th>
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
                            className={`border-t hover:bg-blue-50 transition cursor-pointer ${selectedPoint && selectedPoint._id === pt._id ? 'bg-blue-100' : ''}`}
                            onClick={() => setSelectedPoint(pt)}
                          >
                            <td className="px-4 py-3">
                              <div 
                                className="truncate max-w-36 cursor-help" 
                                title={pt.name || 'Non défini'}
                              >
                                {pt.name || 'Non défini'}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center font-mono text-xs">{pkDisplay}</td>
                            <td className="px-3 py-3 text-center font-mono text-xs">{pt.x || '-'}</td>
                            <td className="px-3 py-3 text-center font-mono text-xs">{pt.y || '-'}</td>
                            <td className="px-3 py-3 text-center">
                              <button
                                onClick={e => { e.stopPropagation(); handleDelete(pt._id); }}
                                title="Supprimer"
                                className="text-red-600 hover:text-red-800 p-1 rounded-full transition shadow-none focus:outline-none"
                                style={{ background: 'none', border: 'none' }}
                              >
                                <FaTimes size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
                        <FaTimes className="h-4 w-4" />
                        Annuler
                      </button>
                    </div>
                  </form>
                ) : selectedPoint ? (
                  <div className="flex flex-col gap-4 flex-1">
                    {/* Affichage des détails du point sélectionné */}
                    {Object.entries(selectedPoint).filter(([key]) => key !== '_id' && key !== '__v').map(([key, value]) => (
                      <div key={key} className="flex flex-col gap-1">
                        <label className="font-semibold text-sm text-blue-900 mb-1 capitalize tracking-wide">{key}</label>
                        <div className="border border-blue-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700">
                          {value !== undefined && value !== null ? value.toString() : 'Non défini'}
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-3 mt-4 justify-end">
                      <button
                        type="button"
                        className="bg-[#1A237E] text-white px-4 py-1.5 rounded-lg font-semibold shadow hover:bg-blue-700 transition flex items-center gap-2"
                        onClick={() => setEditedPoint({ ...selectedPoint })}
                      >
                        <FaEdit className="h-4 w-4" />
                        Modifier
                      </button>
                      <button
                        type="button"
                        className="bg-gray-200 text-gray-700 px-4 py-1.5 rounded-lg font-semibold shadow hover:bg-gray-300 transition flex items-center gap-2"
                        onClick={() => setSelectedPoint(null)}
                      >
                        <FaTimes className="h-4 w-4" />
                        Fermer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 italic flex-1 flex items-center justify-center text-center">
                    Sélectionnez un point dans le tableau pour voir/modifier ses détails.
                  </div>
                )}
              </div>
            </div>
            {/* Tableau des points BTS/GSMR ajoutés juste sous le formulaire */}
            <div className="w-[1000px] mt-8 bg-white rounded-2xl border border-blue-100 p-6 shadow-xl transition-all duration-200">
              <h2 className="text-xl font-bold mb-2 text-blue-900 flex items-center gap-2">Points BTS/GSMR ajoutés</h2>
              <hr className="mb-4 border-blue-100" />
              <div className="overflow-x-auto overflow-y-auto max-h-[400px] border border-gray-200 rounded-lg">
                <table className="w-full min-w-[1200px] text-sm">
                <thead>
                  <tr className="bg-blue-50 text-blue-900 font-semibold">
                    <th className="py-3 px-4 text-left border-r border-blue-100 w-48">Nom</th>
                    <th className="py-3 px-3 text-center border-r border-blue-100 w-32">Type</th>
                    <th className="py-3 px-3 text-center border-r border-blue-100 w-20">PK</th>
                    <th className="py-3 px-3 text-center border-r border-blue-100 w-24">X</th>
                    <th className="py-3 px-3 text-center border-r border-blue-100 w-24">Y</th>
                    <th className="py-3 px-3 text-center border-r border-blue-100 w-20">Ligne</th>
                    <th className="py-3 px-3 text-center border-r border-blue-100 w-16">Voie</th>
                    <th className="py-3 px-3 text-center border-r border-blue-100 w-20">Info</th>
                    <th className="py-3 px-3 text-center border-r border-blue-100 w-24">Etat</th>
                    <th className="py-3 px-3 text-center w-12"> </th>
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
                        <td className="px-4 py-3">
                          <div 
                            className="truncate max-w-44 cursor-help" 
                            title={pt.name || 'Non défini'}
                          >
                            {pt.name || 'Non défini'}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            {pt.type || '-'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center font-mono text-xs">{pkDisplay}</td>
                        <td className="px-3 py-3 text-center font-mono text-xs">{pt.x || '-'}</td>
                        <td className="px-3 py-3 text-center font-mono text-xs">{pt.y || '-'}</td>
                        <td className="px-3 py-3 text-center font-mono text-xs">{pt.line || '-'}</td>
                        <td className="px-3 py-3 text-center font-mono text-xs">{pt.track || '-'}</td>
                        <td className="px-3 py-3 text-center text-xs">{pt.info || '-'}</td>
                        <td className="px-3 py-3 text-center">
                          {pt.Etats && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              pt.Etats === 'Mis en service' ? 'bg-green-100 text-green-800' :
                              pt.Etats === 'Réalisation' ? 'bg-blue-100 text-blue-800' :
                              pt.Etats === 'Etude' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {pt.Etats}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {isAdmin && (
                            <button
                              onClick={async e => {
                                e.stopPropagation();
                                if (window.confirm('Supprimer ce point BTS/GSMR ?')) {
                                  try {
                                    const res = await fetch(`${API_BASE_URL}/api/delete-type-point/${pt._id}`, {
                                      method: 'DELETE',
                                      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                                    });
                                    if (res.ok) {
                                      showToast("Point BTS/GSMR supprimé avec succès", "success");
                                      if (typeof refetchTypePoints === 'function') refetchTypePoints();
                                    } else if (res.status === 403) {
                                      showToast('Non autorisé : êtes-vous connecté en admin ?', "error");
                                    } else if (res.status === 401) {
                                      showToast('Token expiré. Veuillez vous reconnecter.', "warning");
                                    } else {
                                      showToast('Erreur lors de la suppression', "error");
                                    }
                                  } catch {
                                    showToast('Erreur réseau', "error");
                                  }
                                }
                              }}
                              title="Supprimer"
                              className="text-red-600 hover:text-red-800 p-1 rounded-full transition shadow-none focus:outline-none"
                              style={{ background: 'none', border: 'none' }}
                            >
                              <FaTimes size={18} />
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
                        <option value="BTS GSM-R">BTS GSM-R</option>
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
                            const res = await fetch(`${API_BASE_URL}/api/add-type-point`, {
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
                              showToast("Point BTS/GSMR ajouté avec succès !", "success");
                            } else if (res.status === 403) {
                              setBtsError('Non autorisé : êtes-vous connecté en admin ?');
                              showToast('Non autorisé : êtes-vous connecté en admin ?', 'error');
                            } else if (res.status === 401) {
                              setBtsError('Token expiré. Veuillez vous reconnecter.');
                              showToast('Token expiré. Veuillez vous reconnecter.', 'warning');
                            } else {
                              setBtsError('Erreur à l\'ajout');
                              showToast('Erreur lors de l\'ajout du point BTS/GSMR', 'error');
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
              </div>
              {btsError && <div className="text-red-600 font-bold mt-2">{btsError}</div>}
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
      <ToastContainer />
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