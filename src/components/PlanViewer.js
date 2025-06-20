import React, { useRef, useState, useEffect, useMemo } from 'react';
import CoordinateEditor from './CoordinateEditor';
import { useManualPoints } from '../hooks/useManualPoints';
import { interpolateData } from '../utils/interpolateData';

const PlanViewer = ({ imageOptions }) => {
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollOffset, setScrollOffset] = useState({ x: 0, y: 0 });

  const { manualPoints, loading: loadingManual, refetch } = useManualPoints();
  const [interpolatedPoints, setInterpolatedPoints] = useState([]);

useEffect(() => {
  const validPoints = manualPoints
    .filter(p => p.pk && p.x !== undefined && p.y !== undefined)
    .map(p => ({
      ...p,
      pk: parseFloat(p.pk.toString().replace(',', '.')),
    }));

  // Groupe par line + track
  const groupedByLineTrack = {};
  for (const pt of validPoints) {
    const key = `${pt.line}-${pt.track}`;
    if (!groupedByLineTrack[key]) groupedByLineTrack[key] = [];
    groupedByLineTrack[key].push(pt);
  }

  const allInterpolated = [];

  // Pour chaque groupe : on trie, on interpole
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

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Supprimer ce point ?");
    if (!confirmDelete) return;
    try {
      await fetch(`http://localhost:5000/api/delete-point/${id}`, {
        method: 'DELETE'
      });
      refetch();
    } catch (err) {
      alert("Erreur suppression");
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

            <CoordinateEditor
              imgRef={imgRef}
              zoom={zoom}
              naturalSize={naturalSize}
              onNewPoint={refetch}
            />

            {/* Pastilles bleues (points manuels) */}
            {manualPoints.filter(pt => pt.x !== undefined && pt.y !== undefined).map((point, idx) => (
              <div
                key={idx}
                className="absolute bg-blue-600 border border-white rounded-full cursor-pointer"
                title={`PK ${point.pk || 'Inconnu'}`}
                style={{
                  width: '10px',
                  height: '10px',
                  left: `${point.x * zoom}px`,
                  top: `${point.y * zoom}px`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 30,
                }}
                onClick={() => handleDelete(point._id)}
              />
            ))}

            {/* Pastilles rouges (interpolées) */}
            {interpolatedPoints.map((point, idx) => (
  <React.Fragment key={`interp-${idx}`}>
    <div
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
  </React.Fragment>
))}
 
          </div>
        </div>
      </div>

      <div className="flex flex-row w-[1000px] gap-6">
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
                <tr key={idx} className="border-t">
                  <td>{pt.name}</td>
                  <td>{pt.pk}</td>
                  <td>{pt.x}</td>
                  <td>{pt.y}</td>
                  <td>
                    <button onClick={() => handleDelete(pt._id)} className="text-red-600 hover:underline">
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PlanViewer; 