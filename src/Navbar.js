import React, { useState } from 'react';
import './Navbar.css';
import { FaBars, FaQuestionCircle, FaUser, FaFileExport } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function Navbar({ setActivePage }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [checkedLayers, setCheckedLayers] = useState({});
  function handleExport() {
    const target = document.body
    if (!target) {
      alert('Élément introuvable pour l’export.');
      return;
    }
  
    html2canvas(target).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
  
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('export_sif.pdf');
    });
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
    "LNPCA" : ["Phase 1", "Phase 1 pose", "Phase 1 dépose",
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
      <nav className="navbar">
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)}>
          <FaBars />
        </button>

        <h1 className="navbar-title">SIF</h1>

        <div className="page-buttons">
  <button onClick={() => setActivePage(1)}>Page 1</button>
  <button onClick={() => setActivePage(2)}>Page 2</button>
</div>

        <div className="spacer" />

        <div className="right-buttons">
          <button title="Aide"><FaQuestionCircle /></button>
          <div className="server-status connected">Connecté</div>
          <button title="Exporter" onClick={handleExport}><FaFileExport /></button>
          <button title="Utilisateur"><FaUser /></button>
        </div>
      </nav>

      {menuOpen && (
        <div className="side-menu">
          <div className="side-menu-header">
            <h2>Calques:</h2>
            <button className="close-button" onClick={() => setMenuOpen(false)}>×</button>
          </div>
          <div className="layers">
            {Object.entries(calques).map(([category, items]) => (
              <div key={category}>
                <strong>{category}</strong>
                <ul>
                  {items.map((item) => (
                    <li key={item}>
                      <label>
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