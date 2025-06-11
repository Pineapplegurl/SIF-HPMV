import React, { useState } from 'react';

const CoordinateEditor = ({ imgRef, zoom, naturalSize, onNewPoint }) => {
  const [editing, setEditing] = useState(false);
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
    };

    console.log("Payload envoyé :", payload);

    const res = await fetch('http://localhost:5000/api/add-point', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      onNewPoint();        // recharge les points depuis Mongo
      setEditing(false);   // ferme le panneau
    } else {
      alert("Erreur lors de l'ajout du point");
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
        <div className="fixed top-20 left-0 bg-white border-r border-gray-300 shadow-md w-[350px] h-[calc(100vh-5rem)] z-50 p-4 overflow-y-auto">
          <h2 className="font-bold text-lg mb-4">Ajouter un point</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            {['type', 'name', 'line', 'track', 'pk', 'xSif', 'ySif', 'xReal', 'yReal', 'infos'].map((field) => (
              <input
                key={field}
                name={field}
                placeholder={field.toUpperCase()}
                value={formData[field]}
                onChange={handleChange}
                className="border px-2 py-1 rounded"
                required={['name', 'pk'].includes(field)}
                readOnly={['xSif', 'ySif'].includes(field)}
              />
            ))}

            <div className="flex justify-between mt-4">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Ajouter
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
              >
                Fermer
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default CoordinateEditor;