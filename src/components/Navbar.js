import React, { useState } from 'react';
import './Navbar.css'; 
import { FaBars, FaQuestionCircle, FaUser, FaFileExport } from 'react-icons/fa';
import html2canvas from 'html2canvas'; // capture d'écran 
import jsPDF from 'jspdf'; // génération de PDF à partir de l'image capturée

function Navbar({ setActivePage }) {
  const [menuOpen, setMenuOpen] = useState(false);  // menu fermé par défaut
  const [checkedLayers, setCheckedLayers] = useState({}); // pas de calques cochés par défaut
  function handleExport() {
    const target = document.body // cible le body pour capturer l'ensemble de la page
    if (!target) {
      alert('Élément introuvable pour l’export.');
      return;
    }

    html2canvas(target).then((canvas) => {
      const imgData = canvas.toDataURL('image.png'); // convertit le canvas en image PNG
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      }); // crée un nouveau PDF avec les dimensions du canvas
  
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('export_sif.pdf'); 
    });// insèrer le canvas dans le PDF
  }

  const toggleLayer = (layer) => {
    setCheckedLayers((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  };

  const calques = {
    "SIF": [
      "Situation actuelle"],
    "LNPCA" : ["Phase 1" , "Phase 1 pose", "Phase 1 dépose",
      "Phase 2", "Phase 2 pose", "Phase 2 dépose", "Réflexion/optior"
    ],
    "HPMV": ["HPMV", "HPMV pose", "HPMV dépose"],
    "Patrimoine": [
      "BTS GSM-R existante", "BTS GSM-R HPMV", "Postes existants",
      "Centre N2 HPMV", "Filets", "Zones d'actions", "Zones de postes"
    ]
  };

  return (
    <>
      <nav className="fixed top-0 left-0 w-full h-16 bg-blue-900 text-white flex items-center justify-between px-6 shadow z-50">
  <div className="flex items-center gap-4">
    <button className="text-2xl" onClick={() => setMenuOpen(!menuOpen)}>
      <FaBars />
    </button>
    <h1 className="text-xl font-bold">SIF v5</h1>
    <div className="flex gap-2">
      <button className="bg-blue-700 px-4 py-1 rounded hover:bg-blue-600" onClick={() => setActivePage(1)}>Interp</button>
      <button className="bg-blue-700 px-4 py-1 rounded hover:bg-blue-600" onClick={() => setActivePage(2)}>Tables</button>
    </div>
  </div>
  <div className="flex items-center gap-4">
    <button title="Aide"><FaQuestionCircle /></button>
    <div className="bg-green-500 px-3 py-1 rounded-full text-sm">Connecté</div>
    <button title="Exporter la vue" onClick={handleExport}><FaFileExport /></button>
    <button title="Utilisateur"><FaUser /></button>
  </div>
</nav>

    {menuOpen && (
      <div className="fixed top-0 left-0 w-64 h-full bg-white border-r border-gray-300 shadow-lg z-50 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Calques</h2>
          <button onClick={() => setMenuOpen(false)}>×</button>
        </div>
        <div className="space-y-4">
          {Object.entries(calques).map(([category, items]) => (
            <div key={category}>
              <strong>{category}</strong>
              <ul className="ml-2 space-y-1">
                {items.map(item => (
                  <li key={item}>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!checkedLayers[item]}
                        onChange={() => toggleLayer(item)}
                      />
                      {item}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    )}
    </>
  );
}

export default Navbar;