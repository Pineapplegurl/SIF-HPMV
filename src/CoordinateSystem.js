import React, { useState, useRef, useEffect } from 'react';
import './CoordinateSystem.css';

function CoordinateSystem() {
  const [points, setPoints] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomTransform, setZoomTransform] = useState({ scale: 1, x: 0, y: 0 });
  const imageRef = useRef(null);

  const places = [
    { name: 'Miramas', x: 2, y: 2 },
    { name: 'Gare de Marseille', x: 150, y: 200 },
  ];

  const handleImageClick = (event) => {
    const rect = imageRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    console.log(`Coordonnées X, Y : (${x}, ${y})`);

    const newPoint = { x, y, name: prompt("Nom du point :") };
    setPoints([...points, newPoint]);
  };

  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
    const place = places.find(p => p.name.toLowerCase().includes(event.target.value.toLowerCase()));

    if (place && imageRef.current) {
      const imageElement = imageRef.current;
      const scale = 2; // Définissez le niveau de zoom souhaité
      const offsetX = place.x * scale - imageElement.clientWidth / 2;
      const offsetY = place.y * scale - imageElement.clientHeight / 2;

      setZoomTransform({ scale, x: offsetX, y: offsetY });
    }
  };

  useEffect(() => {
    if (imageRef.current) {
      const imageElement = imageRef.current;
      imageElement.style.transform = `scale(${zoomTransform.scale}) translate(${-zoomTransform.x}px, ${-zoomTransform.y}px)`;
    }
  }, [zoomTransform]);

  return (
    <div className="coordinate-system-container">
      <input
        type="text"
        placeholder="Rechercher un lieu..."
        value={searchQuery}
        onChange={handleSearch}
        className="search-bar"
      />
      <div className="image-container" onClick={handleImageClick} ref={imageRef}>
        <img
          src={process.env.PUBLIC_URL + '/SIFV3-Etat actuel.png'}
          alt="Plan"
          className="plan-image"
        />
        {points.map((point, index) => (
          <div
            key={index}
            className="marker"
            style={{ left: `${point.x}px`, top: `${point.y}px` }}
            title={point.name}
          />
        ))}
      </div>
    </div>
  );
}

export default CoordinateSystem;
