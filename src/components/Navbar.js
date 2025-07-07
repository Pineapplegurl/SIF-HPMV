import React, { useState, useEffect } from 'react';
import './Navbar.css'; 
import { FaBars, FaQuestionCircle, FaUser, FaFileExport } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function Navbar({ setActivePage, activeLayers, setActiveLayers, isAdmin, setIsAdmin }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [missingLayer, setMissingLayer] = useState(null);


  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const handleLogin = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "admin", password: passwordInput }),
        });

        const data = await response.json();

        if (response.ok) {
          localStorage.setItem("token", data.token); // sauvegarde le token
          setIsAdmin(true);
          setShowPasswordModal(false);
          setPasswordInput("");
        } else {
          alert(data.error || "Mot de passe incorrect.");
        }
      } catch (err) {
        alert("Erreur réseau.");
      }
    };
    // À vérifier si le token reste en front 
  const handleLogout = () => {
    localStorage.removeItem("token"); // Supprime le token
    setIsAdmin(false); // Repasser en mode invité
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsAdmin(true);
    }
  }, []);

    function handleExport() {
    const target = document.body;
    if (!target) {
      alert('Élément introuvable pour l’export.');
      return;
    }

    html2canvas(target).then((canvas) => {
      const imgData = canvas.toDataURL('image.png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('export_sif.pdf');
    });
  }

  const layerImageMap = {
    "Situation actuelle": "SIF-V6-SA.png",
    "Phase 1": "SIF-V3-Phase 1.png",
    "Phase 1 pose": "SIF-V3-Phase1Pose.png",
    "Phase 1 dépose": "SIF-V3-Phase1Dépose.png",
    "Phase 2": "SIF-V3-Phase2.png",
    "Phase 2 pose": "SIF-V3-Phase2Pose.png",
    "Phase 2 dépose": "SIF-V3-Phase2Dépose.png",
    "Réflexion/optior": "SIF-V3-RéflexionPCA.png",
    "HPMV": "SIF-V3-HPMV.png",
    "HPMV pose": "SIF-V3-HPMVPose.png",
    "HPMV dépose": "SIF-V3-HPMVDépose.png",
    "BTS GSM-R existante": "BTS-GSM-R-existante.png",
    "BTS GSM-R HPMV": "BTS-GSM-R-HPMV.png",
    "Postes existants": "Postes-existants.png",
    "Centre N2 HPMV": "Centre-N2-HPMV.png",
    "Filets": "Filets.png",
    "Zones d'actions": "Zones-actions.png",
    "Zones de postes": "Zones-postes.png",
    "PDF": "SIF-V6.PDF"
  };

  const toggleLayer = (layer) => {
    const imageName = layerImageMap[layer];
    const imagePath = `/${imageName}`;
    const img = new Image();
    img.onload = () => {
      setActiveLayers((prev) => ({
        ...prev,
        [layer]: !prev[layer],
      }));
      setMissingLayer(null);
    };
    img.onerror = () => {
      setMissingLayer(`Le calque "${layer}" est en cours de chargement ou indisponible.`);
    };
    img.src = imagePath;
  };

  const calques = {
    "SIF": ["Situation actuelle"],
    "LNPCA": [
      "Phase 1", "Phase 1 pose", "Phase 1 dépose",
      "Phase 2", "Phase 2 pose", "Phase 2 dépose", "Réflexion/optior"
    ],
    "HPMV": ["HPMV", "HPMV pose", "HPMV dépose"],
    "Patrimoine": [
      "BTS GSM-R existante", "BTS GSM-R HPMV", "Postes existants",
      "Centre N2 HPMV", "Filets", "Zones d'actions", "Zones de postes"
    ],
    "Autres": ["PDF"]
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
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <>
                <span className="bg-yellow-500 text-white px-2 py-1 rounded text-sm">Admin</span>
                <button
                  className="text-sm bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded"
                  onClick={handleLogout}
                >
                  Se déconnecter
                </button>
              </>
            ) : (
              <button title="Utilisateur" onClick={() => setShowPasswordModal(true)}> <FaUser /></button>
            )}
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed top-0 left-0 w-64 h-full bg-white border-r border-gray-300 shadow-lg z-50 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Calques</h2>
            <button onClick={() => setMenuOpen(false)}>×</button>
          </div>
          {missingLayer && (
            <div className="text-sm text-orange-600 bg-orange-100 border border-orange-300 p-2 rounded mb-2">
              {missingLayer}
            </div>
          )}
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
                          checked={!!activeLayers[item]}
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

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg">
            <h2 className="text-lg font-bold mb-4">Connexion admin</h2>
            <input
              type="password"
              placeholder="Mot de passe"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="border p-2 w-full mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowPasswordModal(false)} className="px-4 py-2 bg-gray-300 rounded">Annuler</button>
              <button onClick={handleLogin} className="px-4 py-2 bg-blue-600 text-white rounded">Valider</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;