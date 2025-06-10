import React, { useRef, useState} from 'react';
import { usePkData } from '../hooks/usePkData'; // Custom hook pour récupérer les données PK depuis l’API
import MapOverlay from './MapOverlay'; 
import CoordinateEditor from './CoordinateEditor';
const PlanViewer = ({ imageOptions }) => {
  const { data, loading } = usePkData(); // Data 
  const imgRef = useRef(null); // Référence de l’image
  const containerRef = useRef(null); // Référence du conteneur s

  // États pour le zoom, le drag, et la taille d’origine de l’image
  const [zoom, setZoom] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollOffset, setScrollOffset] = useState({ x: 0, y: 0 });

  // Loading
  if (loading) return <div className="text-center mt-20">Chargement...</div>;
  if (!imageOptions || imageOptions.length === 0) return <div>Aucune image disponible</div>;

  // On extrait tous les PK du dataset et on calcule le min/max pour la projection
  const pkArray = data.map(d => parseFloat(String(d.Pk || d.pk || "0").replace(',', '.')));
  const pkMin = Math.min(...pkArray);
  const pkMax = Math.max(...pkArray);

  const selectedPlan = imageOptions[0]; // Une seule image ici

  // Fonctions de zoom
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => setZoom(1);

  // Début du drag
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setScrollOffset({
      x: containerRef.current.scrollLeft,
      y: containerRef.current.scrollTop,
    });
  };

  // Pendant le drag, on scroll l’image
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    containerRef.current.scrollLeft = scrollOffset.x - dx;
    containerRef.current.scrollTop = scrollOffset.y - dy;
  };

  const handleMouseUp = () => setIsDragging(false);

  // Quand l’image s'affiche on stocke sa taille réelle
  // garder la taille d'image pour l'adapter 
  const handleImageLoad = () => {
    const width = imgRef.current.naturalWidth;
    const height = imgRef.current.naturalHeight;
    setNaturalSize({ width, height });
    setImageLoaded(true);
  };

  return (
    <div className="flex flex-col items-center w-full bg-gray-100 min-h-screen pt-24 gap-8">
      {/* Conteneur avec l’image et les boutons zoom */}
      <div className="relative w-[1000px] h-[600px] border-4 border-purple-600 rounded-lg bg-white shadow-lg">

        {/* Boutons fixes dans le conteneur, PAS DE SCROLL  */}
        <div className="absolute top-4 right-4 z-30 flex gap-2 bg-white/80 p-1 rounded shadow">
          <button onClick={handleZoomIn} className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700">+</button>
          <button onClick={handleZoomOut} className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700">-</button>
          <button onClick={handleResetZoom} className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700">Reset</button>
        </div>

        {/* drag & scroll hori/verti */}
        <div
          ref={containerRef}
          className="w-full h-full overflow-auto"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* L’image + superposition des points */}
          <div
            className="relative min-w-max h-full" // relative donc c'est en haut à gauche le (0;0)
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

            <MapOverlay
              points={data}
              imgRef={imgRef}
              zoom={zoom}
              naturalSize={naturalSize}
              pkMin={pkMin}
              pkMax={pkMax}
            />

            <CoordinateEditor
            imgRef={imgRef}
            zoom={zoom}
            naturalSize={naturalSize}
          />

            {/* Points projetés */}
            {imageLoaded && data.map((d, idx) => {
              const pk = parseFloat(String(d.Pk || d.pk || "0").replace(',', '.'));
              const x = ((pk - pkMin) / (pkMax - pkMin)) * naturalSize.width * zoom;
              const y = (naturalSize.height * zoom) / 2; // Y est fixé : centre vertical de l’image

               console.log(`Point ${idx} - PK: ${pk.toFixed(3)}, X: ${x.toFixed(2)}, Y: ${y.toFixed(2)}`);
              return (
                <div
                  key={d._id || idx}
                  className="absolute"
                  title={`PK ${pk.toFixed(3)}`} 
                  style={{
                    left: `${x}px`,
                    top: `${y}px`,
                    transform: 'translate(-50%, -50%)',
                    background: 'red',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    border: '2px solid white',
                    zIndex: 10,
                  }}

                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Conteneurs 2 + 3 */}
      <div className="flex flex-row w-[1000px] gap-6">
        <div className="flex-1 bg-white h-48 rounded-lg border border-gray-300 shadow-md p-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Container 2</h2>
        </div>
        <div className="w-1/3 bg-white h-48 rounded-lg border border-gray-300 shadow-md p-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Container 1</h2>
        </div>
      </div>
    </div>
  );
};

export default PlanViewer;