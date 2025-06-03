import React, { useRef, useState } from 'react';
import { usePkData } from '../hooks/usePkData';
import { interpolateData } from '../utils/interpolateData';
import MapOverlay from './MapOverlay';

const PlanViewer = ({ imageOptions }) => {
  const { data, loading } = usePkData();
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollOffset, setScrollOffset] = useState({ x: 0, y: 0 });

  if (loading) return <div className="text-center mt-10">Chargement...</div>;
  if (!imageOptions || imageOptions.length === 0) return <div>Aucune image disponible</div>;

  const pkArray = data.map(d => parseFloat(d.pk || d.Pk));
  const latArray = data.map(d => parseFloat(d.latitude));
  const lonArray = data.map(d => parseFloat(d.longitude));

  const interpolatedPoints = interpolateData(pkArray, latArray, lonArray);

  const minLat = Math.min(...latArray);
  const maxLat = Math.max(...latArray);
  const minLon = Math.min(...lonArray);
  const maxLon = Math.max(...lonArray);

  const selectedPlan = imageOptions[0];

  const geoToPixel = (lat, lon, imgWidth, imgHeight) => {
    const x = ((lon - minLon) / (maxLon - minLon)) * imgWidth;
    const y = imgHeight - ((lat - minLat) / (maxLat - minLat)) * imgHeight; // inversé car Y top-down
    return { x, y };
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
    })
  }

  return (
    <div className="flex flex-col items-center w-full bg-gray-100 p-4 gap-4 mt-20"
      onMouseDown={handleMouseDown}
      onMouseUp={() => setIsDragging(false)}
      >
      {/* MAIN CONTAINER (IMAGE) */}
      <div 
      ref={containerRef}className="relative w-[1000px] h-[600px] border-4 border-purple-600 rounded-lg overflow-hidden bg-white">
        {/* Zoom controls (horizontal) */}
        <div className="absolute top-4 right-4 flex flex-row gap-2 z-10">
          <button
            onClick={handleZoomIn}
            className="bg-purple-600 text-white px-3 py-1 rounded shadow hover:bg-purple-700"
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            className="bg-purple-600 text-white px-3 py-1 rounded shadow hover:bg-purple-700"
          >
            -
          </button>
          <button
            onClick={handleResetZoom}
            className="bg-purple-600 text-white px-3 py-1 rounded shadow hover:bg-purple-700"
          >
            Reset
          </button>
        </div>

        {/* Scrollable horizontal */}
        <div className="w-full h-full overflow-x-auto overflow-y-hidden">
          <div className="relative flex min-w-max h-full">
            <img
              ref={imgRef}
              src={selectedPlan.src}
              alt={selectedPlan.label}
              className="max-h-full"
              style={{ transform: `scale(${zoom})` }}
            />
            {/*<MapOverlay points={interpolatedPoints} geoToPixel={geoToPixel} imgRef={imgRef} />*/}
          </div>
        </div>
      </div>
    

      {/* BELOW CONTAINERS */}
      <div className="flex w-[1000px] gap-4">
        {/* LEFT BIG BOX */}
        <div className="flex-1 bg-gray-200 h-48 rounded-lg border-2 border-gray-400">
          <div className="flex items-center justify-center h-full text-gray-600">
            Contenu à gauche
          </div>
        </div>

        {/* RIGHT SMALL BOX */}
        <div className="w-1/3 bg-gray-200 h-48 rounded-lg border-2 border-gray-400">
          <div className="flex items-center justify-center h-full text-gray-600">
            Contenu à droite 
          </div>
        </div>
      </div>
    </div>
    
  );
};

export default PlanViewer;