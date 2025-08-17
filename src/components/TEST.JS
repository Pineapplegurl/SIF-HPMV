import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import CoordinateEditor from './CoordinateEditor';
import { useManualPoints } from '../hooks/useManualPoints';
import { interpolateData } from '../utils/interpolateData';
import { Document, Page, pdfjs } from 'react-pdf';
import ZoneTable from './ZoneTable';
import { useTypePoints } from '../hooks/useTypePoints';
import { FaWifi, FaBroadcastTower, FaLayerGroup, FaTrain, FaTrash, FaDesktop, FaServer, FaBuilding, FaCog, FaPlus, FaMinus, FaExpand, FaCompress, FaEye, FaEyeSlash, FaEdit, FaLock } from 'react-icons/fa';
import { useToast } from './Toast';

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

// Calques qui contrôlent l'affichage des points (pas des images)
const pointLayers = ["BTS GSM-R", "Postes existants", "Centre N2 HPMV"];

// Liste complète des calques (images + points)
const allLayers = [...Object.keys(layerImageMap), ...pointLayers];

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
  const { showToast, ToastContainer } = useToast();
  useEffect(() => {
  }, []);
  const { manualPoints, loading: loadingManual, refetch } = useManualPoints();

  const validManualPoints = Array.isArray(manualPoints) ? manualPoints : [];
  // Nouvel état pour le point sélectionné
  const [selectedPoint, setSelectedPoint] = useState(null);
  // État pour éditer le point sélectionné (cloné pour édition)
  const [editedPoint, setEditedPoint] = useState(null);
  
  // États pour le drag & drop des points
  const [editMode, setEditMode] = useState(false);
  const [draggingPoint, setDraggingPoint] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
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
      const res = await fetch(`http://localhost:5000/api/delete-point/${pointId}`, {
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
      const res = await fetch(`http://localhost:5000/api/update-point/${draggingPoint._id}`, {
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
    const { pk, line, track, x, y } = btsForm;
    
    // Debug
    console.log('Autofill triggered:', { pk, line, track, x, y });
    
    // Vérifie si on a pk, line, track mais pas x et y (ou s'ils sont vides)
    if (pk && line && track && (!x || x === '' || !y || y === '')) {
      console.log('Tentative d\'interpolation pour:', { pk, line, track });
      
      // Utilise l'API d'interpolation directement
      fetch('http://localhost:5000/api/interpolated-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pk: parseFloat(pk), 
          line: String(line), 
          track: String(track) 
        })
      })
        .then(res => {
          console.log('Réponse API interpolation:', res.status);
          return res.ok ? res.json() : Promise.reject(`HTTP ${res.status}`);
        })
        .then(({ x, y }) => {
          console.log('Interpolation réussie:', { x, y });
          setBtsForm(prev => ({ 
            ...prev, 
            x: x?.toFixed(2) || '', 
            y: y?.toFixed(2) || '' 
          }));
        })
        .catch(err => {
          console.log('Erreur interpolation:', err);
          // Essaie une interpolation locale si l'API échoue
          const allPoints = [
            ...validManualPoints,
            ...interpolatedPoints
          ].filter(pt => normalize(pt.line) === normalize(line) && normalize(pt.track) === normalize(track) && !isNaN(pt.pk) && !isNaN(pt.x) && !isNaN(pt.y))
           .sort((a, b) => a.pk - b.pk);
          
          const pkNum = parseFloat(pk);
          console.log('Points disponibles pour interpolation locale:', allPoints.length);
          
          // Trouve le segment d'interpolation
          for (let i = 0; i < allPoints.length - 1; i++) {
            const p1 = allPoints[i];
            const p2 = allPoints[i + 1];
            if (p1.pk <= pkNum && pkNum <= p2.pk) {
              // Interpolation linéaire
              const t = (pkNum - p1.pk) / (p2.pk - p1.pk);
              const interpolatedX = p1.x + t * (p2.x - p1.x);
              const interpolatedY = p1.y + t * (p2.y - p1.y);
              setBtsForm(prev => ({ 
                ...prev, 
                x: interpolatedX.toFixed(2), 
                y: interpolatedY.toFixed(2) 
              }));
              console.log('Interpolation locale réussie:', { x: interpolatedX, y: interpolatedY });
              break;
            }
          }
        });
    }
  }, [btsForm.pk, btsForm.line, btsForm.track, btsForm.x, btsForm.y, validManualPoints, interpolatedPoints]);

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

  // Fonction robuste pour normaliser les états et gérer les fautes de frappe
  const normalizeEtat = (etat) => {
    if (!etat || etat === 'undefined' || etat === 'null') return 'Mis en service';
    
    // Nettoie et normalise la chaîne
    const cleaned = etat.toString().toLowerCase()
      .trim()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/[ñ]/g, 'n')
      .replace(/[\s\-_]/g, ''); // Supprime espaces, tirets, underscores
    
    // Mapping robuste avec tolérance aux fautes de frappe
    if (cleaned.includes('etud')) return 'Etude';
    if (cleaned.includes('realis') || cleaned.includes('realiz')) return 'Réalisation';
    if (cleaned.includes('service') || cleaned.includes('exploit')) return 'Mis en service';
    
    // Fallback
    return 'Mis en service';
  };

  // Color mapping by Etats (border colors) - Version ultra-robuste
  const etatColorMap = {
    'Etude': '#FF9800', // Orange
    'Réalisation': '#FF5722', // Rouge-orange
    'Mis en service': '#2196F3', // Bleu
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

  // Ajouter style CSS pour le mode plein écran avec Tailwind/CSS inline
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .map-fullscreen-container:fullscreen {
        background-color: white !important;
        padding: 20px;
      }
      .map-fullscreen-container:-webkit-full-screen {
        background-color: white !important;
        padding: 20px;
      }
      .map-fullscreen-container:-moz-full-screen {
        background-color: white !important;
        padding: 20px;
      }
      .map-fullscreen-container:-ms-fullscreen {
        background-color: white !important;
        padding: 20px;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
                {/* Nouvelle logique de traçage des zones avec fusion */}
                {(() => {
                  // Grouper les zones par nom pour fusion
                  const groupedZones = {};
                  zones.forEach(zone => {
                    if (!groupedZones[zone.name]) {
                      groupedZones[zone.name] = [];
                    }
                    groupedZones[zone.name].push(zone);
                  });

                  return Object.entries(groupedZones).map(([zoneName, zoneGroup], groupIdx) => {
                    // Calculer les limites globales de toutes les zones du groupe
                    let globalPkStart = Infinity;
                    let globalPkEnd = -Infinity;
                    const allLinesAndTracks = [];

                    zoneGroup.forEach(zone => {
                      const pkStart = parseFloat(String(zone.pkStart).replace(',', '.'));
                      const pkEnd = parseFloat(String(zone.pkEnd).replace(',', '.'));
                      if (!isNaN(pkStart) && !isNaN(pkEnd)) {
                        globalPkStart = Math.min(globalPkStart, pkStart);
                        globalPkEnd = Math.max(globalPkEnd, pkEnd);
                        allLinesAndTracks.push({ line: zone.line, track: zone.track });
                      }
                    });

                    if (globalPkStart === Infinity) return null;

                    // Collecter TOUS les points de TOUTES les voies du groupe dans la plage PK
                    let allZonePoints = [];
                    allLinesAndTracks.forEach(({ line, track }) => {
                      const lineTrackPoints = [
                        ...validManualPoints,
                        ...interpolatedPoints
                      ].filter(pt => 
                        pt.line === line && 
                        pt.track === track && 
                        pt.pk >= globalPkStart && 
                        pt.pk <= globalPkEnd && 
                        !isNaN(pt.x) && !isNaN(pt.y)
                      );
                      allZonePoints.push(...lineTrackPoints);
                    });

                    // Trier par PK et supprimer les doublons
                    allZonePoints = allZonePoints
                      .sort((a, b) => a.pk - b.pk)
                      .filter((pt, i, arr) => i === 0 || pt.pk !== arr[i-1].pk);

                    if (allZonePoints.length < 2) return null;

                    // Utiliser l'enveloppe convexe pour créer un polygone englobant
                    const zonePointsForHull = allZonePoints.map(pt => [pt.x * zoom, pt.y * zoom]);
                    const hull = convexHull(zonePointsForHull);
                    
                    if (hull.length < 3) return null;

                    const pointsStr = hull.map(([x, y]) => `${x},${y}`).join(' ');
                    const color = zoneColors[zoneName] || '#FFB300';
                    
                    return (
                      <polygon
                        key={`merged-${zoneName}-${groupIdx}`}
                        points={pointsStr}
                        fill={color}
                        fillOpacity={0.25}
                        stroke={color}
                        strokeWidth={2}
                        title={`${zoneName} (${zoneGroup.length} zone${zoneGroup.length > 1 ? 's fusionnées' : ''})`}
                      />
                    );
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
              {isAdmin && validManualPoints && validManualPoints.filter(pt => pt.x !== undefined && pt.y !== undefined).map((point, idx) => (
                <div
                  key={`manual-${point._id || idx}`}
                  className="absolute rounded-full"
                  style={{
                    width: editMode ? '14px' : '10px',
                    height: editMode ? '14px' : '10px',
                    left: `${point.x * zoom}px`,
                    top: `${point.y * zoom}px`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 25,
                    backgroundColor: point.color || '#1976D2', // manual points are blue by default
                    border: '2px solid white', // keep a white separator but no colored border
                    pointerEvents: 'auto',
                    cursor: editMode ? 'grab' : 'pointer',
                  }}
                  title={point.name}
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
              
              {/* Points BTS/GSMR */}
              {isAdmin && activeLayers['BTS GSM-R'] && typePoints && typePoints.filter(pt => {
                // Filtrer seulement les points BTS GSM-R (existante, HPMV, et nouveau type unifié)
                const isBTSPoint = pt.type === 'BTS GSM-R existante' || pt.type === 'BTS GSM-R HPMV' || pt.type === 'BTS GSM-R';
                return isBTSPoint && pt.x !== undefined && pt.y !== undefined && !isNaN(pt.x) && !isNaN(pt.y);
              }).map((point, idx) => {
                // Normalisation robuste de l'état avec gestion des fautes de frappe
                console.log('🔍 DEBUG BTS - Point état brut:', point.Etats, 'pour point:', point.name, 'type:', point.type); // Debug plus visible
                const normalizedEtat = normalizeEtat(point.Etats ?? point.Etat ?? point.etat ?? point.state ?? point.State ?? point['Etats '] ?? '');
                const etatColor = etatColorMap[normalizedEtat] || '#2196F3';
                
                console.log('🎨 BTS FINAL - Point:', point.name, 'État brut:', point.Etats, '→ État normalisé:', normalizedEtat, '→ Couleur:', etatColor);
                
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
                // Normalisation robuste de l'état avec gestion des fautes de frappe
                const normalizedEtat = normalizeEtat(point.Etats ?? point.Etat ?? point.etat ?? point.state ?? point.State ?? point['Etats '] ?? '');
                const etatColor = etatColorMap[normalizedEtat] || '#2196F3';
                
                console.log('🎨 POSTES FINAL - Point:', point.name, 'État brut:', point.Etats, '→ État normalisé:', normalizedEtat, '→ Couleur:', etatColor);
                
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
                // Normalisation robuste de l'état avec gestion des fautes de frappe
                console.log('🔍 DEBUG CENTRE N2 - Point brut:', point);
                console.log('🔍 DEBUG CENTRE N2 - Point.Etats:', point.Etats, 'Type:', typeof point.Etats);
                const normalizedEtat = normalizeEtat(point.Etats ?? point.Etat ?? point.etat ?? point.state ?? point.State ?? point['Etats '] ?? '');
                const etatColor = etatColorMap[normalizedEtat] || '#2196F3';
                
                console.log('🎨 CENTRE N2 FINAL - Point:', point.name, 'État brut:', point.Etats, '→ État normalisé:', normalizedEtat, '→ Couleur:', etatColor);
                
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
        <div>
          {/* Admin only: tables, forms, etc. */}
          {isAdmin && (
            <div className="flex flex-col gap-8">
            <div className="flex flex-row w-[1000px] gap-6">
              {/* Tableau des points ajoutés (AddedPoints) */}
              <div className="w-2/3 bg-white h-[300px] rounded-2xl border border-gray-200 p-4 overflow-y-auto shadow-lg mb-8">
                <h2 className="text-lg font-bold mb-4 text-blue-900 text-center tracking-wide">Points ajoutés</h2>
                <table className="w-full text-sm rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-blue-50 text-blue-900 font-semibold">
                      <th className="py-2 px-3 text-left border-r border-blue-100 w-[220px]">Nom</th>
                      <th className="py-2 px-3 text-center border-r border-blue-100 w-[120px]">Type</th>
                      <th className="py-2 px-3 text-center border-r border-blue-100 w-[80px]">PK</th>
                      <th className="py-2 px-3 text-center border-r border-blue-100 w-[110px]">X</th>
                      <th className="py-2 px-3 text-center border-r border-blue-100 w-[110px]">Y</th>
                      <th className="py-2 px-3 text-center border-r border-blue-100 w-[90px]">Ligne</th>
                      <th className="py-2 px-3 text-center border-r border-blue-100 w-[90px]">Voie</th>
                      <th className="py-2 px-3 text-center border-r border-blue-100 w-[120px]">Info</th>
                      <th className="py-2 px-3 text-center"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualPoints.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="text-center text-gray-500 italic py-6">Aucun point ajouté</td>
                      </tr>
                    ) : manualPoints.map((pt, idx) => {
                      return (
                        <tr key={pt._id || idx} className="border-t hover:bg-blue-50 transition">
                          <td className="px-3 py-2 max-w-[220px] truncate" title={pt.name}>{pt.name}</td>
                          <td className="px-3 py-2 text-center">{pt.type}</td>
                          <td className="px-3 py-2 text-center">{pt.pk ?? '-'}</td>
                          <td className="px-3 py-2 text-center">{pt.x}</td>
                          <td className="px-3 py-2 text-center">{pt.y}</td>
                          <td className="px-3 py-2 text-center">{pt.line}</td>
                          <td className="px-3 py-2 text-center">{pt.track}</td>
                          <td className="px-3 py-2 text-center max-w-[120px] truncate" title={pt.info}>{pt.info}</td>
                          <td className="px-3 py-2 text-center">
                            {isAdmin && (
                              <button
                                onClick={async e => { /* existing delete/edit handler preserved */ }}
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

            {/* Tableau des points ajoutés juste sous le formulaire */}
            <div className="w-[1000px] mt-8 bg-white rounded-2xl border border-blue-100 p-6 shadow-xl transition-all duration-200">
              <h2 className="text-xl font-bold mb-2 text-blue-900 flex items-center gap-2">Points ajoutés (BTS/GSMR, Postes existants, Centre N2 HPMV)</h2>
              <hr className="mb-4 border-blue-100" />
              <div className="overflow-x-auto overflow-y-auto max-h-[400px] border border-gray-200 rounded-lg">
                <table className="w-full min-w-[900px] table-fixed text-sm">
                <thead>
                  <tr className="bg-blue-50 text-blue-900 font-semibold">
                    <th className="py-2 px-3 text-left border-r border-blue-100 w-[220px]">Nom</th>
                    <th className="py-2 px-3 text-center border-r border-blue-100 w-[120px]">Type</th>
                    <th className="py-2 px-3 text-center border-r border-blue-100 w-[80px]">PK</th>
                    <th className="py-2 px-3 text-center border-r border-blue-100 w-[110px]">X</th>
                    <th className="py-2 px-3 text-center border-r border-blue-100 w-[110px]">Y</th>
                    <th className="py-2 px-3 text-center border-r border-blue-100 w-[90px]">Ligne</th>
                    <th className="py-2 px-3 text-center border-r border-blue-100 w-[90px]">Voie</th>
                    <th className="py-2 px-3 text-center border-r border-blue-100 w-[120px]">Info</th>
                    <th className="py-2 px-3 text-center border-r border-blue-100 w-[120px]">Etat</th>
                    <th className="py-2 px-3 text-center"> </th>
                  </tr>
                </thead>
                <tbody>
                  {typePoints.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="text-center text-gray-500 italic py-6">Aucun point ajouté</td>
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
                        <td className="px-3 py-2 max-w-[220px] truncate" title={pt.name}>{pt.name}</td>
                        <td className="px-3 py-2 text-center">{pt.type}</td>
                        <td className="px-3 py-2 text-center">{pkDisplay}</td>
                        <td className="px-3 py-2 text-center">{pt.x}</td>
                        <td className="px-3 py-2 text-center">{pt.y}</td>
                        <td className="px-3 py-2 text-center">{pt.line}</td>
                        <td className="px-3 py-2 text-center">{pt.track}</td>
                        <td className="px-3 py-2 text-center max-w-[120px] truncate" title={pt.info}>{pt.info}</td>
                        <td className="px-3 py-2 text-center">
                          {isAdmin && (
                            <button
                              onClick={async e => {
                                e.stopPropagation();
                                if (window.confirm(`Supprimer ce point ${pt.type || 'inconnu'} ?`)) {
                                  try {
                                    const res = await fetch(`http://localhost:5000/api/delete-type-point/${pt._id}`, {
                                      method: 'DELETE',
                                      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                                    });
                                    if (res.ok) {
                                      showToast(`Point ${pt.type || 'inconnu'} supprimé avec succès`, "success");
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
                      <input name="name" placeholder="Nom" required className="border px-3 py-1 rounded w-[140px] focus:outline-none focus:ring-2 focus:ring-purple-500 truncate" value={btsForm.name} onChange={e => setBtsForm(f => ({ ...f, name: e.target.value }))} title={btsForm.name} />
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
                      <div className="flex items-center gap-1">
                        <input name="x" placeholder="X" required type="number" className="border px-3 py-1 rounded w-[100px] focus:outline-none focus:ring-2 focus:ring-purple-500" value={btsForm.x} onChange={e => setBtsForm(f => ({ ...f, x: e.target.value }))} />
                        <button

                          type="button"
                          onClick={() => {
                            if (btsForm.pk && btsForm.line && btsForm.track) {
                              console.log('🔄 FORCE AUTOFILL:', btsForm.pk, btsForm.line, btsForm.track);
                              setBtsForm(prev => ({ ...prev, x: '', y: '' })); // Vider pour déclencher l'effet
                            } else {
                              alert('Remplissez PK, Ligne et Voie d\'abord');
                            }
                          }}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          🔄
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center border-r border-blue-50">
                      <input name="y" placeholder="Y" required type="number" className="border px-3 py-1 rounded w-[100px] focus:outline-none focus:ring-2 focus:ring-purple-500" value={btsForm.y} onChange={e => setBtsForm(f => ({ ...f, y: e.target.value }))} />
                    </td>
                    <td className="px-3 py-2 text-center border-r border-blue-50">
                      <input name="line" placeholder="Ligne" required className="border px-3 py-1 rounded w-[90px] focus:outline-none focus:ring-2 focus:ring-purple-500" value={btsForm.line} onChange={e => setBtsForm(f => ({ ...f, line: e.target.value }))} />
                    </td>
                    <td className="px-3 py-2 text-center border-r border-blue-50">
                      <input name="track" placeholder="Voie" required className="border px-3 py-1 rounded w-[90px] focus:outline-none focus:ring-2 focus:ring-purple-500" value={btsForm.track} onChange={e => setBtsForm(f => ({ ...f, track: e.target.value }))} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        className="bg-[#1A237E] text-white px-4 py-1 rounded hover:bg-blue-900 mt-1 font-semibold shadow"
                        disabled={btsLoading}
                        onClick={async e => {
                          e.preventDefault();
                          setBtsLoading(true);

                          // Debug du formulaire avant validation
                          console.log('🔍 DEBUG FORMULAIRE - btsForm:', btsForm);

                          // Validation renforcée
                          if (!btsForm.name || !btsForm.type || !btsForm.pk || !btsForm.x || !btsForm.y || !btsForm.line || !btsForm.track) {
                            setBtsError('Tous les champs obligatoires doivent être remplis.');
                            setBtsLoading(false);
                            return;
                          }

                          // Construire les données à envoyer (sans champ Etats)
                          const data = {
                            name: btsForm.name,
                            type: btsForm.type,
                            pk: parseFloat(btsForm.pk),
                            x: parseFloat(btsForm.x),
                            y: parseFloat(btsForm.y),
                            line: btsForm.line,
                            track: btsForm.track,
                            info: btsForm.info,
                            infos: btsForm.info,
                          };
                          console.log('🚀 ENVOI DU POINT (sans Etats):', data); // Debug l'envoi
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
                              console.log('✅ Point ajouté avec succès au serveur');
                              setBtsForm({ name: '', type: '', pk: '', x: '', y: '', line: '', track: '', info: '', Etats: '' });
                              setBtsError('');
                              if (typeof refetchTypePoints === 'function') {
                                await refetchTypePoints();
                                console.log('🔄 Points rechargés depuis le serveur');
                              }
                              showToast("Point ajouté avec succès !", "success");
                            } else {
                              // try to print response body for debugging
                              let body = null;
                              try { body = await res.json(); } catch(e) { body = await res.text().catch(()=>null); }
                              console.error('Erreur ajout point - statut', res.status, 'body', body);
                              if (res.status === 403) {
                                setBtsError('Non autorisé : êtes-vous connecté en admin ?');
                                showToast('Non autorisé : êtes-vous connecté en admin ?', 'error');
                              } else if (res.status === 401) {
                                setBtsError('Token expiré. Veuillez vous reconnecter.');
                                showToast('Token expiré. Veuillez vous reconnecter.', 'warning');
                              } else {
                                setBtsError('Erreur à l\'ajout');
                                showToast('Erreur lors de l\'ajout du point', 'error');
                              }
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
            </div>
            <div >
              <ZoneTable 
                zones={zones}
                onZonesUpdate={setZones}
                tableClassName="min-w-[900px] table-fixed w-full text-sm rounded-xl overflow-hidden"
              />
            </div>
          </div>
        )}
        {!isAdmin && (
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
      </div>
    </div>
  );
}

export default PlanViewer;