import React, { useState } from 'react';

const CoordinateEditor = ({ imgRef, zoom, naturalSize, pkMin, pkMax }) => {
  const [points, setPoints] = useState([]);

  const handleClick = (event) => {
  if (!imgRef.current || !naturalSize.width || !naturalSize.height) return;

  const rect = imgRef.current.getBoundingClientRect();
  const rawX = event.clientX - rect.left;
  const rawY = event.clientY - rect.top;

  // Calculs ajustés au zoom
  const x = rawX / zoom;
  const y = rawY / zoom;

  const name = prompt("Nom du point :");
  if (!name) return;

  const newPoint = { name, x, y };

  const pk = (x / naturalSize.width) * (pkMax - pkMin) + pkMin;
  console.log(`Point ajouté :\n- Nom : ${name}\n- X : ${x.toFixed(2)} px\n- Y : ${y.toFixed(2)} px\n- PK estimé : ${pk.toFixed(2)}`);

  setPoints(prev => [...prev, newPoint]);
};

  return (
    <>
      {/* AJout Point */}
      <div
        className="absolute top-0 left-0 w-full h-full z-20"
        onClick={handleClick}
        style={{ cursor: 'crosshair' }}
      />

      {/* Ajout du point  */}
      {points.map((point, idx) => (
        <div
          key={idx}
          className="absolute bg-blue-600 border border-white rounded-full"
          style={{
            width: '9px',
            height: '9px',
            left: `${point.x * zoom}px`,
            top: `${point.y * zoom}px`,
            transform: 'translate(-50%, -50%)',
            zIndex: 25,
          }}
          title={point.name}
        />
      ))}
    </>
  );
};

export default CoordinateEditor;