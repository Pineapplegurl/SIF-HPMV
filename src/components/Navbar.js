import React, { useState, useEffect } from 'react';
import './Navbar.css';
import { FaUserCircle, FaFilePdf } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { API_BASE_URL } from '../utils/config';

function Navbar({ isAdmin, setIsAdmin, title = "SIF", onTablesClick, activePage, setActivePage, onLogin, onLogout, isAuthenticated, refreshData }) {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  // Switch handler
  const handleAdminSwitch = () => {
    if (isAdmin) {
      localStorage.removeItem("token");
      setIsAdmin(false);
    } else {
      setShowPasswordModal(true);
    }
  };

  const handleLogin = async () => {
    if (!passwordInput.trim()) {
      setLoginError("Veuillez saisir le mot de passe");
      return;
    }

    setLoading(true);
    setLoginError("");
    
    try {
      console.log('🔐 Tentative de connexion vers:', `${API_BASE_URL}/api/login`);
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: 'admin',  // Hardcodé car c'est toujours admin
          password: passwordInput  // Utilise passwordInput au lieu de password
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.token) {
        localStorage.setItem('token', data.token);
        setIsAdmin(true);  // Met à jour l'état admin
        setShowPasswordModal(false);
        setPasswordInput('');
        setLoginError('');
      } else {
        throw new Error('Token manquant dans la réponse');
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
      setLoginError('Mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  function handleExport() {
    const target = document.body;
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

  return (
    <header className="w-full bg-[#1A237E] shadow flex items-center px-8 py-4 justify-between  font-sans">
      <div className="flex items-center gap-8">
        <span className="text-2xl font-bold text-white tracking-wide">{title}</span>
        <nav className="flex gap-6">
          {isAdmin && (
            <button
              className={`text-white font-semibold pb-1 border-b-2 ${activePage === 1 ? 'border-white' : 'border-transparent'} bg-transparent focus:outline-none transition-none`}
              onClick={() => setActivePage(1)}
              style={{ background: 'none' }}
            >
              Plans
            </button>
          )}
          {isAdmin && (
            <button
              className={`text-white font-semibold pb-1 border-b-2 ${activePage === 'sif-tables' ? 'border-white' : 'border-transparent'} bg-transparent focus:outline-none transition-none`}
              onClick={() => setActivePage('sif-tables')}
              style={{ background: 'none' }}
            >
              Tables
            </button>
          )}
          {isAdmin && (
            <button
              className={`text-white font-semibold pb-1 border-b-2 ${activePage === 'admin-layers' ? 'border-white' : 'border-transparent'} bg-transparent focus:outline-none transition-none`}
              onClick={() => setActivePage('admin-layers')}
              style={{ background: 'none' }}
            >
              Gestion Calques
            </button>
          )}
        </nav>
      </div>
      <div className="flex items-center gap-6">
        {/* PDF Export */}
        <button title="Exporter en PDF" onClick={handleExport} className="bg-white hover:bg-gray-200 text-[#1A237E] px-3 py-1 rounded shadow flex items-center gap-2">
          <FaFilePdf className="text-lg" /> PDF
        </button>
        {/* Admin/User Switch + Profile */}
        <div className="flex items-center gap-4">
          <label className="flex items-center cursor-pointer select-none">
            <span className={`mr-2 text-sm font-semibold ${isAdmin ? 'text-yellow-300' : 'text-gray-200'}`}>{isAdmin ? 'Admin' : 'Utilisateur'}</span>
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={handleAdminSwitch}
              className="sr-only"
            />
            <span
              className={`w-12 h-6 flex items-center bg-gray-400 rounded-full p-1 transition-colors duration-200 ${isAdmin ? 'bg-yellow-400' : 'bg-gray-400'}`}
              style={{ minWidth: 48 }}
            >
              <span
                className={`bg-white w-5 h-5 rounded-full shadow transform transition-transform duration-200 ${isAdmin ? 'translate-x-6' : ''}`}
              />
            </span>
          </label>
          {/* Profile icon */}
          <FaUserCircle className="text-3xl text-white opacity-80 cursor-pointer" title="Profil (à venir)" />
        </div>
      </div>
      {/* Modal login */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg">
            <h2 className="text-lg font-bold mb-4">Connexion admin</h2>
            <input
              type="password"
              placeholder="Mot de passe"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="border p-2 w-full mb-2"
            />
            {loginError && <div className="text-red-600 text-sm mb-2">{loginError}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowPasswordModal(false); setLoginError(""); }} className="px-4 py-2 bg-gray-300 rounded">Annuler</button>
              <button onClick={handleLogin} className="px-4 py-2 bg-blue-600 text-white rounded">Valider</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;