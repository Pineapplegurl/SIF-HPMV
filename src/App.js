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
  const [activeLayers, setActiveLayers] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
  const imageOptions = [
  { id: 'situation-actuelle', label: 'Situation actuelle', src: 'SIF-V6-SA.png' },
  { id: 'phase-1', label: 'Phase 1', src: 'SIF-V3-Phase 1.png' },
  { id: 'phase-1-pose', label: 'Phase 1 pose', src: 'SIF-V3-Phase1Pose.png' },
  { id: 'phase-1-depose', label: 'Phase 1 dépose', src: 'SIF-V3-Phase1Dépose.png' },
  { id: 'phase-2', label: 'Phase 2', src: 'SIF-V3-Phase2.png' },
  { id: 'phase-2-pose', label: 'Phase 2 pose', src: 'SIF-V3-Phase2Pose.png' },
  { id: 'phase-2-depose', label: 'Phase 2 dépose', src: 'SIF-V3-Phase2Dépose.png' },
  { id: 'reflexion-optior', label: 'Réflexion/optior', src: 'SIF-V3-RéflexionPCA.png' },
  { id: 'hpmv', label: 'HPMV', src: 'SIF-V3-HPMV.png' },
  { id: 'hpmv-pose', label: 'HPMV pose', src: 'SIF-V3-HPMVPose.png' },
  { id: 'hpmv-depose', label: 'HPMV dépose', src: 'SIF-V3-HPMVDépose.png' },
  { id: 'gsmr-existante', label: 'BTS GSM-R existante', src: 'BTS-GSM-R-existante.png' },
  { id: 'gsmr-hpmv', label: 'BTS GSM-R HPMV', src: 'BTS-GSM-R-HPMV.png' },
  { id: 'postes-existants', label: 'Postes existants', src: 'Postes-existants.png' },
  { id: 'centre-n2-hpmv', label: 'Centre N2 HPMV', src: 'Centre-N2-HPMV.png' },
  { id: 'filets', label: 'Filets', src: 'Filets.png' },
  { id: 'zones-actions', label: 'Zones d\'actions', src: 'Zones-actions.png' },
  { id: 'zones-postes', label: 'Zones de postes', src: 'Zones-postes.png' },
  { id: 'pdf', label: 'PDF', src: 'SIF-V6.PDF' } // Ajout de l'option PDF
];

  return (
    // JSX 
    <div className="app">
      <Navbar
        setActivePage={setActivePage}
        activeLayers={activeLayers}
        setActiveLayers={setActiveLayers}
        isAdmin={isAdmin}
        setIsAdmin={setIsAdmin}
      />

      {activePage === 1 && (
        <section className="section plans-section">
          <PlanViewer
            imageOptions={imageOptions}
            activeLayers={activeLayers}
            isAdmin={isAdmin}
          />
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