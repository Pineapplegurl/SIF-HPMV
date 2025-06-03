import React, { useState } from 'react';
// useState est un hook qui permet de mémoriser un état . 
import Navbar from './components/Navbar';
import PlanViewer from './components/PlanViewer';
import CoordinateSystem from './CoordinateSystem';
import './App.css';
import './index.css';

function App() {
  // activePage est l'état qui mémorise la page active
  // setActivePage est la fonction qui permet de mettre à jour cet état
  const [activePage, setActivePage] = useState(1); // page 1 par défaut

  const imageOptions = [
    { id: 'autres-projets-depose', label: 'Autres Projets Dépose', src: 'SIF-V3-Autres-projets-Déposel.png' },
    { id: 'hpmv', label: 'HPMV', src: 'SIF-V3-HPMVpng.png' },
    // ... d'autres images
  ];

  return (
    // JSX 
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