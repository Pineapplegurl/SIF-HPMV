import React, { useState } from 'react';
import Navbar from './Navbar';
import PlanViewer from './PlanViewer';
import CoordinateSystem from './CoordinateSystem';
import './App.css';

function App() {
  const [activePage, setActivePage] = useState(1); // page 1 par défaut

  const imageOptions = [
    { id: 'autres-projets-depose', label: 'Autres Projets Dépose', src: 'SIF-V3-Autres-projets-Déposel.png' },
    { id: 'hpmv', label: 'HPMV', src: 'SIF-V3-HPMVpng.png' },
    // ... d'autres images
  ];

  return (
    <div className="app">
      <Navbar setActivePage={setActivePage} />

      {activePage === 1 && (
        <section className="section plans-section">
          <PlanViewer imageOptions={imageOptions} />
        </section>
      )}

      {activePage === 2 && (
        <section className="section coordinate-system-section">
          <h2>Système de Coordonnées</h2>
          <CoordinateSystem />
        </section>
      )}
    </div>
  );
}

export default App;