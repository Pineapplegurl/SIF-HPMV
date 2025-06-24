import React, { useRef, useState, useEffect, useMemo } from 'react';
import CoordinateEditor from './CoordinateEditor';
import { useManualPoints } from '../hooks/useManualPoints';
import { interpolateData } from '../utils/interpolateData';

const layerImageMap = {
  "Situation actuelle": "SIF-V3-Etat actuel.png",
  "Phase 1": "SIF-V3-Phase 1.png",
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
  "Zones de postes": "Zones-postes.png"
};

const PlanViewer = ({ imageOptions, activeLayers, isAdmin }) => {
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollOffset, setScrollOffset] = useState({ x: 0, y: 0 });

  const { manualPoints, loading: loadingManual, refetch } = useManualPoints();
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
    const validPoints = manualPoints
      .filter(p => p.pk && p.x !== undefined && p.y !== undefined)
      .map(p => ({
        ...p,
        pk: parseFloat(p.pk.toString().replace(',', '.')),
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
        );
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

  return (
    <div className="flex flex-col items-center w-full bg-gray-100 min-h-screen pt-24 gap-8">
      <div className="relative w-[1000px] h-[600px] border-4 border-purple-600 rounded-lg bg-white shadow-lg">
        <div className="absolute top-4 right-4 z-30 flex gap-2 bg-white/80 p-1 rounded shadow">
          <button onClick={handleZoomIn} className="bg-purple-600 text-white px-3 py-1 rounded">+</button>
          <button onClick={handleZoomOut} className="bg-purple-600 text-white px-3 py-1 rounded">-</button>
          <button onClick={handleResetZoom} className="bg-purple-600 text-white px-3 py-1 rounded">Reset</button>
        </div>

        {isAdmin && (
          <div className="absolute top-4 left-4 z-30 flex gap-2 bg-white/80 p-1 rounded shadow">
            <button onClick={() => setShowInterpolatedPoints(!showInterpolatedPoints)} className="bg-indigo-600 text-white px-3 py-1 rounded">
              {showInterpolatedPoints ? "Cacher Interp" : "Afficher Interp"}
            </button>
          </div>
        )}

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

            {Object.entries(activeLayers).filter(([layer, visible]) => visible).map(([layer]) => (
              <img
                key={layer}
                src={`/${layerImageMap[layer]}`}
                alt={layer}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: naturalSize.width * zoom,
                  height: naturalSize.height * zoom,
                  opacity: 0.6,
                  pointerEvents: 'none',
                }}
              />
            ))}

            {isAdmin && (
              <CoordinateEditor
                imgRef={imgRef}
                zoom={zoom}
                naturalSize={naturalSize}
                onNewPoint={refetch}
              />
            )}

            {manualPoints.filter(pt => pt.x !== undefined && pt.y !== undefined).map((point, idx) => (
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
                  cursor: isAdmin ? 'pointer' : 'default'
                }}
                onClick={isAdmin ? () => handleDelete(point._id) : undefined}
              />
            ))}

            {showInterpolatedPoints && interpolatedPoints.map((point, idx) => (
              <div
                key={`interp-${idx}`}
                className="absolute bg-red-600 border border-white rounded-full"
                style={{
                  width: '8px',
                  height: '8px',
                  left: `${point.x * zoom}px`,
                  top: `${point.y * zoom}px`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 20,
                }}
                title={`Interp PK ${point.pk.toFixed(3)}`}
              />
            ))}

          </div>
        </div>
      </div>

      <div className="flex flex-row w-[1000px] gap-6">
        {/* Tableau des points (gauche) */}
        <div className="w-2/3 bg-white h-[300px] rounded-lg border p-4 overflow-y-auto">
          <h2 className="text-lg font-bold mb-2">Points ajoutés</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th>Nom</th><th>PK</th><th>X</th><th>Y</th><th></th>
              </tr>
            </thead>
            <tbody>
              {manualPoints.map((pt, idx) => (
                <tr
                  key={idx}
                  className={`border-t cursor-pointer ${selectedPoint && selectedPoint._id === pt._id ? 'bg-purple-100' : ''}`}
                  onClick={() => setSelectedPoint(pt)}
                >
                  <td>{pt.name}</td>
                  <td>{pt.pk}</td>
                  <td>{pt.x}</td>
                  <td>{pt.y}</td>
                  <td>
                    {isAdmin && (
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(pt._id); }}
                        className="text-red-600 hover:underline"
                      >
                        Supprimer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Container détail/édition du point sélectionné (droite) */}
        <div className="w-1/3 bg-white h-[300px] rounded-lg border p-4 overflow-y-auto flex flex-col">
          <h2 className="text-lg font-bold mb-2">Détail du point</h2>
          {editedPoint ? (
            <form
              className="flex flex-col gap-2"
              onSubmit={e => { e.preventDefault(); handleSave(); }}
            >
              {/* Affiche dynamiquement tous les champs du point sauf _id et __v */}
              {Object.entries(editedPoint).filter(([key]) => key !== '_id' && key !== '__v').map(([key, value]) => (
                <div key={key} className="flex flex-col">
                  <label className="font-medium text-xs mb-1 capitalize" htmlFor={key}>{key}</label>
                  {typeof value === 'string' && value.length > 40 ? (
                    <textarea
                      name={key}
                      id={key}
                      value={value}
                      onChange={handleEditChange}
                      className="border rounded px-2 py-1 text-sm"
                    />
                  ) : (
                    <input
                      name={key}
                      id={key}
                      value={value === undefined || value === null ? '' : value}
                      onChange={handleEditChange}
                      className="border rounded px-2 py-1 text-sm"
                      type={typeof value === 'number' ? 'number' : 'text'}
                    />
                  )}
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <button
                  type="submit"
                  className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  className="bg-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-400"
                  onClick={() => { setSelectedPoint(null); setEditedPoint(null); }}
                >
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <div className="text-gray-500 italic flex-1 flex items-center justify-center">
              Sélectionnez un point dans le tableau pour voir/modifier ses détails.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanViewer;