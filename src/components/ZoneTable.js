import React, { useState, useEffect } from 'react';

const ZoneTable = ({ onZonesUpdate }) => {
  const [zones, setZones] = useState([]);
  const [newZone, setNewZone] = useState({
    type: '', name: '', line: '', track: '', pkStart: '', pkEnd: '', xsif: '', ysif: '', info: ''
  });

  useEffect(() => {
    fetch('http://localhost:5000/api/zones')
      .then(res => res.json())
      .then(data => setZones(data));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewZone(prev => ({ ...prev, [name]: value }));
  };

  const handleAddZone = async () => {
    const res = await fetch('http://localhost:5000/api/add-zone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(newZone)
    });
    if (res.ok) {
      const updatedZones = await fetch('http://localhost:5000/api/zones').then(r => r.json());
      setZones(updatedZones);
      setNewZone({ type: '', name: '', line: '', track: '', pkStart: '', pkEnd: '', xsif: '', ysif: '', info: '' });
      onZonesUpdate(updatedZones);
    }
  };

  return (
    <div className="w-full mt-10 px-4">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">Zones</h2>
      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-gray-200 text-gray-700">
            <tr>
              <th className="p-2">Type</th>
              <th className="p-2">Nom</th>
              <th className="p-2">Ligne</th>
              <th className="p-2">Voie</th>
              <th className="p-2">PK Début</th>
              <th className="p-2">PK Fin</th>
              <th className="p-2">Xsif</th>
              <th className="p-2">Ysif</th>
              <th className="p-2">Info</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {zones.map((z, idx) => (
              <tr key={idx} className="border-b hover:bg-gray-50">
                <td className="p-2">{z.type}</td>
                <td className="p-2">{z.name}</td>
                <td className="p-2">{z.line}</td>
                <td className="p-2">{z.track}</td>
                <td className="p-2">{z.pkStart}</td>
                <td className="p-2">{z.pkEnd}</td>
                <td className="p-2">{z.xsif}</td>
                <td className="p-2">{z.ysif}</td>
                <td className="p-2">{z.info}</td>
                <td className="p-2 text-center text-gray-400">—</td>
              </tr>
            ))}
            <tr className="bg-green-50">
              {Object.keys(newZone).map((key, i) => (
                <td key={i} className="p-2">
                  <input
                    name={key}
                    value={newZone[key]}
                    onChange={handleChange}
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder={key}
                  />
                </td>
              ))}
              <td className="p-2">
                <button
                  onClick={handleAddZone}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded"
                >
                  Ajouter
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ZoneTable;
