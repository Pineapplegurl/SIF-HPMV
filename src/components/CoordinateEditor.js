import React, { useState } from 'react';
import { API_BASE_URL } from '../utils/config';
import { useToast } from './Toast';

const CoordinateEditor = ({ imgRef, zoom, naturalSize, onNewPoint }) => {
  const [editing, setEditing] = useState(false);
  const { showToast, ToastContainer } = useToast();
  const [formData, setFormData] = useState({
    type: '',
    name: '',
    line: '',
    track: '',
    pk: '',
    xSif: '',
    ySif: '',
    xReal: '',
    yReal: '',
    infos: '',
    x: 0,
    y: 0,
  });

  const handleClick = (event) => {
    if (!imgRef.current || !naturalSize?.width || !naturalSize?.height) return;

    const rect = imgRef.current.getBoundingClientRect();
    const rawX = event.clientX - rect.left;
    const rawY = event.clientY - rect.top;

    const x = rawX / zoom;
    const y = rawY / zoom;

    setFormData({
      ...formData,
      x,
      y,
      xSif: x.toFixed(2),
      ySif: y.toFixed(2),
    });

    setEditing(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🔍 Vérification finale et cast des X/Y en nombres
    const payload = {
  ...formData,
  x: parseFloat(formData.x),
  y: parseFloat(formData.y),
  pk: parseFloat(formData.pk.toString().replace(',', '.')), // Ajoute cette ligne
};

    console.log("Payload envoyé :", payload);

    const res = await fetch(`${API_BASE_URL}/api/add-point`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      showToast("Point ajouté avec succès !", "success");
      onNewPoint();        // recharge les points depuis Mongo
      setEditing(false);   // ferme le panneau
    } else if (res.status === 403) {
      showToast("Non autorisé : êtes-vous connecté en admin ?", "error");
    } else if (res.status === 401) {
      showToast("Token expiré ou invalide. Veuillez vous reconnecter.", "warning");
    } else {
      showToast("Erreur lors de l'ajout du point", "error");
    }
  };

  const handleClose = () => setEditing(false);

  return (
    <>
      <div
        className="absolute top-0 left-0 w-full h-full z-20"
        onClick={handleClick}
        style={{ cursor: 'crosshair' }}
      />

      {editing && (
        <div className="fixed top-20 left-0 bg-white border-l-4 border-[#1A237E] shadow-xl rounded-r-2xl w-[370px] h-[calc(100vh-5rem)] z-50 p-6 flex flex-col overflow-y-auto transition-all duration-200">
          <div className="pb-2 mb-2 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-bold text-xl text-[#1A237E] tracking-tight">Ajouter un point</h2>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {['type', 'name', 'line', 'track', 'pk', 'xSif', 'ySif', 'xReal', 'yReal', 'infos'].map((field) => (
              <div key={field} className="flex flex-col">
                <label htmlFor={field} className="text-sm font-medium text-gray-700 mb-1 capitalize">{field}</label>
                <input
                  id={field}
                  name={field}
                  autoComplete={field}
                  placeholder={field.toUpperCase()}
                  value={formData[field]}
                  onChange={handleChange}
                  className={`border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A237E] transition ${['xSif','ySif'].includes(field) ? 'bg-gray-100 text-gray-500' : ''}`}
                  required={['name', 'pk'].includes(field)}
                  readOnly={['xSif', 'ySif'].includes(field)}
                />
              </div>
            ))}
            <div className="flex justify-between mt-6 gap-2">
              <button
                type="submit"
                className="bg-[#1A237E] text-white px-5 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-[#1A237E]"
              >
                Ajouter
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg font-semibold shadow hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                Fermer
              </button>
            </div>
          </form>
        </div>
      )}
      <ToastContainer />
    </>
  );
};

export default CoordinateEditor;