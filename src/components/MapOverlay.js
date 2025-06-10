import React from 'react';

const MapOverlay = ({ points, imgRef, zoom, naturalSize, pkMin, pkMax }) => {
  if (!imgRef?.current || !naturalSize?.width || !naturalSize?.height) return null;

  const imageWidth = naturalSize.width * zoom;
  const imageHeight = naturalSize.height * zoom;

  return (
    <div
      className="absolute top-0 left-0 pointer-events-none"
      style={{
        width: imageWidth,
        height: imageHeight,
        zIndex: 10,
      }}
    >
      {/* Grille temporaire horizontale tous les 100px */}
      {Array.from({ length: Math.floor(imageWidth / 100) }).map((_, i) => (
        <div
          key={`grid-x-${i}`}
          className="absolute top-0 border-l border-dashed border-gray-400 opacity-50"
          style={{
            left: `${i * 100}px`,
            height: `${imageHeight}px`,
          }}
        />
      ))}

      {/* FORCER  LE FOND TRANSPARENT */}
      <div
        className="absolute top-0 left-0 bg-yellow-100 opacity-10"
        style={{ width: imageWidth, height: imageHeight }}
      />

      {/* Projection des points */}
      {points.map((point, idx) => {
        const pk = parseFloat(String(point.Pk || point.pk || "0").replace(',', '.'));
        const x = ((pk - pkMin) / (pkMax - pkMin)) * imageWidth;
        const y = imageHeight / 2;

        return (
          <div
            key={point._id || idx}
            className="absolute bg-red-600 border border-white rounded-full"
            style={{
              width: '10px',
              height: '10px',
              left: `${x}px`,
              top: `${y}px`,
              transform: 'translate(-50%, -50%)',
            }}
            title={`PK ${point.Pk || point.pk}`}
          />
        );
      })}
    </div>
  );
};

export default MapOverlay;