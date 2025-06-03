import React from 'react';

const MapOverlay = ({ points, geoToPixel, imgRef }) => {
    if (!imgRef.current) {
      console.log('⚠ imgRef.current is null');
      return null;
    }
  
    const imgWidth = imgRef.current.naturalWidth;
    const imgHeight = imgRef.current.naturalHeight;
  
    console.log('✅ Image dimensions:', imgWidth, imgHeight);
  
    const randomFivePoints = points
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);
  
    console.log('✅ Points:', randomFivePoints);

  const gridLines = [];
  const numCols = 10;
  const numRows = 10;

  // Colonnes (verticales)
  for (let i = 1; i < numCols; i++) {
    gridLines.push(
      <div
        key={`vline-${i}`}
        style={{
          position: 'absolute',
          left: `${(i / numCols) * 100}%`,
          top: 0,
          bottom: 0,
          width: '1px',
          backgroundColor: 'rgba(0,0,0,0.3)',
          zIndex: 501,
        }}
      />
    );
  }

  // Lignes (horizontales)
  for (let i = 1; i < numRows; i++) {
    gridLines.push(
      <div
        key={`hline-${i}`}
        style={{
          position: 'absolute',
          top: `${(i / numRows) * 100}%`,
          left: 0,
          right: 0,
          height: '1px',
          backgroundColor: 'rgba(0,0,0,0.3)',
          zIndex: 501,
        }}
      />
    );
  }
    console.log('✅ Grid lines:', gridLines.length);

  return (
    <>
      {/* Fond semi-transparent par-dessus l’image */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: imgWidth,
          height: imgHeight,
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
          zIndex: 500,
        }}
      />

      {/* Grille */}
      {gridLines}

      {/* Points rouges */}
      {randomFivePoints.map((pt, idx) => {
        const { x, y } = geoToPixel(pt.latitude, pt.longitude, imgWidth, imgHeight);

        if (isNaN(x) || isNaN(y)) {
          console.warn(`Point ${idx} has invalid coordinates: lat=${pt.latitude}, lon=${pt.longitude}`);
          return null;
        }

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
              width: '16px',
              height: '16px',
              backgroundColor: 'red',
              border: '2px solid black',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1000,
            }}
            title={`PK ${pt.pk}`}
          />
        );
      })}
    </>
  );
};

export default MapOverlay;