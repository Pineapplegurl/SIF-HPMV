import React, { useRef, useState, useEffect, useMemo } from 'react';
import CoordinateEditor from './CoordinateEditor';
import { useManualPoints } from '../hooks/useManualPoints';
import { interpolateData } from '../utils/interpolateData';
import { Document, Page, pdfjs } from 'react-pdf';
import ZoneTable from './ZoneTable';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const layerImageMap = {
  "Situation actuelle": "SIF-V6-SA.png",
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
  "Zones de postes": "Zones-postes.png",
  "PDF": "SIF-V6.PDF" // ne marche pas 
};

const PlanViewer = ({ imageOptions, activeLayers, isAdmin }) => {
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollOffset, setScrollOffset] = useState({ x: 0, y: 0 });
  const [zones, setZones] = useState([]);
  useEffect(() => {
  // Pour tester l’affichage d’un rectangle, ajoute une zone manuellement :
  setZones([
    {
      type: 'ZA',
      name: 'ZA63',
      line: '930000',
      track: 'v1',
      pkStart: 180,
      pkEnd: 210,
      info: 'Test zone',
    },
  ]);
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

  console.log("Points interpolés pour 930000 MV1 entre 24.9 et 39.8 :", interpolatedPoints.filter(p =>
  p.line === "930000" &&
  p.track === "MV1" &&
  p.pk >= 24.9 &&
  p.pk <= 39.8
));

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
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left + containerRef.current.scrollLeft) / zoom;
            const y = (e.clientY - rect.top + containerRef.current.scrollTop) / zoom;

            // Remplit les champs du formulaire si on est en admin
            if (isAdmin) {
              const form = document.querySelector("form");
              if (form) {
                form.x.value = x.toFixed(2);
                form.y.value = y.toFixed(2);
              }
            }

            console.log("Clicked at image coordinates:", x.toFixed(2), y.toFixed(2));
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

            {Object.entries(activeLayers)
        .filter(([layer, visible]) => visible)
        .map(([layer]) => {
          const src = `/${layerImageMap[layer]}`;
          const isPDF = src.toLowerCase().endsWith('.pdf');

          return isPDF ? (
            <div
              key={layer}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: naturalSize.width * zoom,
                height: naturalSize.height * zoom,
                zIndex: 5,
                overflow: 'hidden',
              }}
            >
              {naturalSize.width > 0 && naturalSize.height > 0 && (
                <Document
                  file={src}
                  onLoadSuccess={() => console.log("✅ PDF chargé")}
                  onLoadError={(err) => console.error("❌ Erreur PDF :", err)}
                >
                  <Page
                    pageNumber={1}
                    width={naturalSize.width * zoom}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </Document>
              )}
            </div>
          ) : (
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

            {/* Green zone rectangles overlay */}
            {zones.map((zone, idx) => {
              const { line, track, pkStart, pkEnd } = zone;
              const group = interpolatedPoints.filter(p => p.line === line && p.track === track && p.pk >= parseFloat(pkStart) && p.pk <= parseFloat(pkEnd));
              if (group.length === 0) return null;
              const xs = group.map(p => p.x);
              const ys = group.map(p => p.y);
              const minX = Math.min(...xs);
              const maxX = Math.max(...xs);
              const minY = Math.min(...ys);
              const maxY = Math.max(...ys);

              return (
                <div
                  key={`zone-${idx}`}
                  style={{
                    position: 'absolute',
                    left: `${minX * zoom}px`,
                    top: `${minY * zoom}px`,
                    width: `${(maxX - minX) * zoom}px`,
                    height: `${(maxY - minY) * zoom}px`,
                    border: '2px solid green',
                    backgroundColor: 'rgba(0,255,0,0.1)',
                    zIndex: 8,
                  }}
                  title={`Zone ${zone.name}`}
                />
              );
            })}

            {isAdmin && (
              <CoordinateEditor
                imgRef={imgRef}
                zoom={zoom}
                naturalSize={naturalSize}
                onNewPoint={refetch}
              />
            )}

            {validManualPoints.filter(pt => pt.x !== undefined && pt.y !== undefined).map((point, idx) => (
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

            {/* Render BTS/GSMR icons with vertical offset depending on track */}
            {validManualPoints.filter(pt => pt.type === "BTS" || pt.type === "GSMR").map((pt, idx) => {
  let offsetY = 0;
  if (pt.track === "MV1") offsetY = -20;
  else if (pt.track === "MV3") offsetY = 20;

  return (
    <div
      key={`icon-${idx}`}
      className="absolute"
      style={{
        left: `${pt.x * zoom}px`,
        top: `${(pt.y + offsetY) * zoom}px`,
        transform: 'translate(-50%, -50%)',
        zIndex: 25,
        cursor: isAdmin ? 'pointer' : 'default'
      }}
      title={`${pt.type} ${pt.name}`}
      onClick={isAdmin ? () => handleDelete(pt._id) : undefined}
    >
      <img
        src={`/icons/GSM.png`}
        alt={pt.type}
        style={{ width: '24px', height: '24px' }}
      />
    </div>
  );
})}

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
        <div className="w-2/3 bg-white h-[300px] rounded-lg border p-4 overflow-y-auto shadow">
          <h2 className="text-lg font-bold mb-2">Points ajoutés</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th>Nom</th><th>PK</th><th>X</th><th>Y</th><th></th>
              </tr>
            </thead>
            <tbody>
              {manualPoints.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-gray-500 italic py-4">Aucun point ajouté</td>
                </tr>
              ) : manualPoints.map((pt, idx) => (
                <tr
                  key={idx}
                  className={`border-t hover:bg-gray-100 transition cursor-pointer ${selectedPoint && selectedPoint._id === pt._id ? 'bg-purple-100' : ''}`}
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
        <div className="w-1/3 bg-gray-50 h-[300px] rounded-lg border p-4 overflow-y-auto flex flex-col shadow">
          <h2 className="text-lg font-bold mb-2">Détail du point</h2>
          {editedPoint ? (
            <form
              className="flex flex-col gap-4"
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
                      className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  ) : (
                    <input
                      name={key}
                      id={key}
                      value={value === undefined || value === null ? '' : value}
                      onChange={handleEditChange}
                      className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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
{isAdmin && (
  <form
    className="w-[1000px] bg-gray-50 p-4 rounded-lg border mb-6 flex flex-wrap gap-6 shadow"
    onSubmit={async (e) => {
      e.preventDefault();
      const form = e.target;

      let approxX = parseFloat(form.x.value);
      let approxY = parseFloat(form.y.value);
      const pk = parseFloat(form.pk.value);
      const track = form.track.value;
      const line = form.line.value;

      // Appelle l’API pour interpoler automatiquement si x/y pas remplis
      if ((!form.x.value || !form.y.value) && pk && track && line) {
        try {
          const res = await fetch('http://localhost:5000/api/interpolated-position', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pk, track, line })
          });
          if (res.ok) {
            const { x, y } = await res.json();
            approxX = x;
            approxY = y;
            form.x.value = x.toFixed(2);
            form.y.value = y.toFixed(2);
          } else {
            alert("❌ Impossible d'interpoler ce point.");
            return;
          }
        } catch (err) {
          alert("Erreur d'interpolation.");
          return;
        }
      }

      // Ne pas ajouter le point si les coordonnées sont absentes ou invalides
      if (isNaN(approxX) || isNaN(approxY)) {
        alert("❌ Coordonnées X/Y invalides ou absentes.");
        return;
      }

      const data = {
        name: form.name.value,
        pk: pk,
        x: approxX,
        y: approxY,
        line: line,
        track: track,
        type: form.type.value,
        info: form.info.value,
      };
      try {
        const res = await fetch('http://localhost:5000/api/add-point', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          alert("✅ Point ajouté !");
          form.reset();
          refetch(); // recharge les points
        } else {
          alert("❌ Erreur à l’ajout (êtes-vous en admin ?)");
        }
      } catch (err) {
        alert("Erreur réseau.");
      }
    }}
  >
    {/* Groupe Nom et Info */}
    <div className="flex flex-col gap-2">
      <input name="name" placeholder="Nom" required className="border px-2 py-1 rounded w-[120px] focus:outline-none focus:ring-2 focus:ring-purple-500" />
      <input name="info" placeholder="Info" className="border px-2 py-1 rounded w-[150px] focus:outline-none focus:ring-2 focus:ring-purple-500" />
    </div>
    {/* Groupe X/Y */}
    <div className="flex gap-2">
      <input name="x" placeholder="X" required type="number" className="border px-2 py-1 rounded w-[80px] focus:outline-none focus:ring-2 focus:ring-purple-500" />
      <input name="y" placeholder="Y" required type="number" className="border px-2 py-1 rounded w-[80px] focus:outline-none focus:ring-2 focus:ring-purple-500" />
    </div>
    {/* Groupe PK */}
    <div className="flex gap-2">
      <input name="pk" placeholder="PK" required type="number" step="0.01" className="border px-2 py-1 rounded w-[80px] focus:outline-none focus:ring-2 focus:ring-purple-500" />
    </div>
    {/* Groupe Ligne/Voie */}
    <div className="flex gap-2">
      <input name="line" placeholder="Ligne" required className="border px-2 py-1 rounded w-[80px] focus:outline-none focus:ring-2 focus:ring-purple-500" />
      <input name="track" placeholder="Voie" required className="border px-2 py-1 rounded w-[60px] focus:outline-none focus:ring-2 focus:ring-purple-500" />
    </div>
    {/* Groupe Type/Etat */}
    <div className="flex gap-2">
      <select name="type" required className="border px-2 py-1 rounded w-[100px] focus:outline-none focus:ring-2 focus:ring-purple-500">
        <option value="">Type</option>
        <option value="BTS">BTS</option>
        <option value="GSMR">GSMR</option>
      </select>
      <select name="Etats" required className="border px-2 py-1 rounded w-[120px] focus:outline-none focus:ring-2 focus:ring-purple-500">
        <option value="">Etude</option>
        <option value="">Réalisation</option>
        <option value="">Mis en service</option>
      </select>
    </div>
    <button
      type="submit"
      className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
    >
      Ajouter
    </button>
  </form>
)}
      <div className="w-[1000px]">
        <ZoneTable onZonesUpdate={(newZones) => setZones(newZones)} />
      </div>
    </div>
  );
};

export default PlanViewer;