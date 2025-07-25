import React, { useState, useEffect } from 'react';
// useState est un hook qui permet de mémoriser un état . 
import Navbar from './components/Navbar';
import PlanViewer from './components/PlanViewer';
import CoordinateSystem from './CoordinateSystem';
import SIFTables from './components/SIFTables';
import GuestMapPage from './components/GuestMapPage';
import './App.css';
import './index.css';

function App() {
  // Vérifie la présence du token au démarrage
  const [isAdmin, setIsAdmin] = useState(() => !!localStorage.getItem('token'));
  // activePage est l'état qui mémorise la page active
  // setActivePage est la fonction qui permet de mettre à jour cet état
  const [activePage, setActivePage] = useState(1); // page 1 par défaut
  const [activeLayers, setActiveLayers] = useState({});
  const imageOptions = [
  { id: 'situation-actuelle', label: 'Situation actuelle', src: 'SIF-V6-SIF-EA.png' },
  { id: 'phase-1', label: 'Phase 1', src: 'SIF-V6-PHASE1.png' },
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

  // Synchronise isAdmin si le token change (ex: login/logout dans Navbar)
  useEffect(() => {
    const onStorage = () => setIsAdmin(!!localStorage.getItem('token'));
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Ajout détection mode invité : si pas admin, afficher GuestMapPage
  if (!isAdmin) {
    return <GuestMapPage isAdmin={isAdmin} setIsAdmin={setIsAdmin} />;
  }

  return (
    // JSX 
    <div className="app">
      <Navbar
        setActivePage={setActivePage}
        activePage={activePage}
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

      {activePage === 'sif-tables' && (
        <section className="section sif-tables-section">
          {isAdmin ? (
            <SIFTables isAdmin={isAdmin} />
          ) : (
            <div className="flex items-center justify-center h-full text-xl text-red-600 font-bold">Vous n'avez pas accès à cette page.</div>
          )}
        </section>
      )}
    </div>
  );
}

export default App;