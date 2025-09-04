import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../utils/config';
import { useToast } from './Toast';

const ZoneTable = ({ zones, onZonesUpdate }) => {
  const [localZones, setLocalZones] = useState(zones || []);
  const [newZone, setNewZone] = useState({
    Type: '', Name: '', Line: '', Track: '', PkStart: '', PkEnd: '', Xsif: '', Ysif: '', Info: ''
  });
  const [loading, setLoading] = useState(false);
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    // Synchronise avec la prop zones
    setLocalZones(zones || []);
  }, [zones]);

  // Rafraîchit les zones depuis l'API
  const refreshZones = async () => {
    const updatedZones = await fetch(`${API_BASE_URL}/api/zones`).then(r => r.json());
    setLocalZones(updatedZones);
    if (typeof onZonesUpdate === 'function') onZonesUpdate(updatedZones);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewZone(prev => ({ ...prev, [name]: value }));
  };

  const handleAddZone = async () => {
    setLoading(true);
    const res = await fetch(`${API_BASE_URL}/api/add-zone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(newZone)
    });
    setLoading(false);
    if (res.ok) {
      setNewZone({ Type: '', Name: '', Line: '', Track: '', PkStart: '', PkEnd: '', Xsif: '', Ysif: '', Info: '' });
      showToast('Zone ajoutée avec succès', 'success');
      refreshZones();
    } else if (res.status === 403) {
      showToast('Non autorisé : êtes-vous connecté en admin ?', 'error');
    } else {
      showToast('Erreur lors de l\'ajout de la zone', 'error');
    }
  };

  const handleDeleteZone = async (zone) => {
    if (!zone._id) {
      showToast('Zone sans identifiant, suppression impossible côté backend', 'warning');
      return;
    }
    if (window.confirm('Supprimer cette zone ?')) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/delete-zone/${zone._id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (res.ok) {
          showToast('Zone supprimée avec succès', 'success');
          refreshZones();
        } else {
          showToast('Erreur lors de la suppression côté backend', 'error');
        }
      } catch {
        showToast('Erreur réseau', 'error');
      }
    }
  };

  return (
    <div className="w-[1000px] mt-8 bg-white rounded-2xl border border-blue-100 p-6 shadow-xl transition-all duration-200">
      <h2 className="text-xl font-bold mb-2 text-blue-900 flex items-center gap-2">Zones</h2>
      <hr className="mb-4 border-blue-100" />
      <div className="overflow-x-auto overflow-y-auto max-h-[400px] border border-gray-200 rounded-lg">
        <table className="min-w-[900px] table-fixed w-full text-sm">
        <thead>
          <tr className="bg-blue-50 text-blue-900 font-semibold">
            <th className="py-2 px-3">Type</th>
            <th className="py-2 px-3">Nom</th>
            <th className="py-2 px-3">Ligne</th>
            <th className="py-2 px-3">Voie</th>
            <th className="py-2 px-3">PK Début</th>
            <th className="py-2 px-3">PK Fin</th>
            <th className="py-2 px-3">Xsif</th>
            <th className="py-2 px-3">Ysif</th>
            <th className="py-2 px-3">Info</th>
            <th className="py-2 px-3 text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          {localZones.map((z, idx) => {
            // Check for valid PK/coords
            const pkStart = parseFloat(String(z.pkStart).replace(',', '.'));
            const pkEnd = parseFloat(String(z.pkEnd).replace(',', '.'));
            let xsif = z.xsif !== undefined && z.xsif !== '' ? parseFloat(String(z.xsif).replace(',', '.')) : NaN;
            let ysif = z.ysif !== undefined && z.ysif !== '' ? parseFloat(String(z.ysif).replace(',', '.')) : NaN;
            return (
              <tr key={z._id || idx} className="border-t hover:bg-blue-50 transition">
                <td className="px-3 py-2">{z.Type}</td>
                <td className="px-3 py-2">{z.name}</td>
                <td className="px-3 py-2">{z.line}</td>
                <td className="px-3 py-2">{z.track}</td>
                <td className="px-3 py-2">{z.pkStart}</td>
                <td className="px-3 py-2">{z.pkEnd}</td>
                <td className="px-3 py-2">{z.xsif}</td>
                <td className="px-3 py-2">{z.ysif}</td>
                <td className="px-3 py-2">{z.info}</td>
                <td className="px-3 py-2 text-center">
                  <button
                    className="text-red-600 hover:text-red-800 p-1 rounded-full transition shadow-none focus:outline-none"
                    style={{ background: 'none', border: 'none' }}
                    onClick={() => handleDeleteZone(z)}
                    title="Supprimer"
                  >
                    {/* Trash icon for delete */}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </td>
                <td>
                  {(!isNaN(xsif) && !isNaN(ysif)) ? `${xsif}, ${ysif}` : ''}
                </td>
              </tr>
            );
          })}
          <tr className="border-t bg-blue-50/50">
            {Object.keys(newZone).map((key, i) => (
              <td key={i} className="px-3 py-2">
                <input
                  name={key}
                  value={newZone[key]}
                  onChange={handleChange}
                  className="border px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  placeholder={key}
                />
              </td>
            ))}
            <td className="px-3 py-2 text-center">
              <button
                className="bg-[#1A237E] text-white px-4 py-1 rounded hover:bg-blue-900 mt-1 font-semibold shadow"
                disabled={loading}
                onClick={handleAddZone}
              >
                {loading ? 'Ajout...' : 'Ajouter'}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
      <ToastContainer />
    </div>
  );
};

export default ZoneTable;
