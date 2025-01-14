import React, { useState } from 'react';
import './App.css';

function App() {
  // Les images seront gérées avec un useState pour chaque calque
  const [visiblePlan, setVisiblePlan] = useState('plan1');
  const [zoomLevel, setZoomLevel] = useState(100);

  // Fonction pour gérer l'affichage des calques
  const toggleImage = (imageId) => {
    setVisiblePlan(imageId);
  };

  // Fonction pour gérer le zoom
  const zoomImage = (e) => {
    setZoomLevel(e.target.value);
  };

  // Fonction pour réinitialiser le zoom
  const resetZoom = () => {
    setZoomLevel(100);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>HPMV SIF</h1>

        {/* Formulaire de recherche */}
        <div className="search-container">
          <form id="search-form">
            <input type="text" id="search-input" placeholder="Rechercher..." aria-label="Rechercher" />
            <button type="submit">🔍</button>
          </form>
        </div>

        {/* Boutons pour afficher les plans */}
        <button className="btn-blue" onClick={() => toggleImage('plan1')}>Plan 1</button>
        <button className="btn-green" onClick={() => toggleImage('plan2')}>Plan 2</button>
        <button className="btn-red" onClick={() => toggleImage('plan3')}>Plan 3</button>

        {/* Barre de zoom */}
        <div className="zoom-container">
          <label htmlFor="zoom-range">Zoom:</label>
          <input
            type="range"
            id="zoom-range"
            min="50"
            max="200"
            value={zoomLevel}
            step="10"
            onChange={zoomImage}
          />
          <span id="zoom-value">{zoomLevel}%</span>
          <button onClick={resetZoom}>Reset</button>
        </div>

        {/* Conteneur des images */}
        <div className="image-scroll-container">
          <img
            id="plan1"
            src="SIF-V3-Phase 1.png"
            alt="Plan 1"
            className={`scroll-image ${visiblePlan === 'plan1' ? '' : 'hidden'}`}
            style={{ transform: `scale(${zoomLevel / 100})` }}
          />
          <img
            id="plan2"
            src="image2.png"
            alt="Plan 2"
            className={`scroll-image ${visiblePlan === 'plan2' ? '' : 'hidden'}`}
            style={{ transform: `scale(${zoomLevel / 100})` }}
          />
          <img
            id="plan3"
            src="image3.png"
            alt="Plan 3"
            className={`scroll-image ${visiblePlan === 'plan3' ? '' : 'hidden'}`}
            style={{ transform: `scale(${zoomLevel / 100})` }}
          />
        </div>
      </header>
    </div>
  );
}

export default App;