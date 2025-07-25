import React, { useState, useEffect } from 'react';

const TABLES = [
  { key: 'interpolation', label: 'Interpolation', api: '/api/manual-points' }, // Affiche les points ajoutés (AddedPoints)
  { key: 'points', label: 'Points singuliers', api: '/api/type-points' },
  { key: 'zones', label: 'Zones', api: '/api/zones' },
];

const SIFTables = ({ isAdmin }) => {
  const [selectedTable, setSelectedTable] = useState('interpolation');
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Charge les données à chaque changement de table
  useEffect(() => {
    const table = TABLES.find(t => t.key === selectedTable);
    if (!table) return;
    setLoading(true);
    fetch(`http://localhost:5000${table.api}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setTableData(Array.isArray(data) ? data : []))
      .catch(() => setTableData([]))
      .finally(() => setLoading(false));
  }, [selectedTable]);

  // Fonction d'export CSV
  const handleExportCSV = () => {
    if (!tableData || tableData.length === 0) return;
    const cols = Object.keys(tableData[0]);
    const csvRows = [cols.join(',')];
    tableData.forEach(row => {
      csvRows.push(cols.map(col => JSON.stringify(row[col] ?? '')).join(','));
    });
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import CSV
  const [importPreview, setImportPreview] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const rows = text.split(/\r?\n/).filter(r => r.trim());
      const cols = rows[0].split(',');
      const data = rows.slice(1).map(row => {
        const values = row.split(',');
        const obj = {};
        cols.forEach((col, i) => { obj[col] = JSON.parse(values[i] || '""'); });
        return obj;
      });
      setImportPreview({ cols, data });
      setShowImportModal(true);
      setImportFile(file);
    };
    reader.readAsText(file);
  };
  const confirmImport = async () => {
    setShowImportModal(false);
    if (!importPreview || !importPreview.data) return;
    const table = TABLES.find(t => t.key === selectedTable);
    if (!table) return;
    try {
      const res = await fetch(`http://localhost:5000${table.api}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ data: importPreview.data })
      });
      if (res.ok) {
        alert('Import réussi !');
        setSelectedTable(selectedTable); // recharge la table
      } else {
        alert('Erreur lors de l’import.');
      }
    } catch {
      alert('Erreur réseau.');
    }
    setImportPreview(null);
    setImportFile(null);
  };

  // Affichage dynamique des colonnes
  const columns = tableData.length > 0 ? Object.keys(tableData[0]) : [];

  return (
    <div className="flex w-full min-h-screen bg-[#F5F7FA] font-sans" style={{ overflowX: 'hidden' }}>
      {/* Sidebar */}
      <aside className="w-64 min-h-screen bg-white rounded-2xl shadow-lg border border-gray-200 flex flex-col gap-6 px-6 py-8 sticky top-0 h-fit items-start mr-8">
        <h2 className="font-bold text-2xl text-[#1A237E] mb-4 tracking-wide">SIF Tables</h2>
        {TABLES.map(table => (
          <button
            key={table.key}
            className={`w-full px-4 py-3 rounded-xl text-lg font-semibold text-left transition shadow-sm border ${selectedTable === table.key ? 'bg-blue-100 text-[#1A237E] border-[#1A237E]' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-blue-50'} mb-2`}
            onClick={() => setSelectedTable(table.key)}
          >
            {table.label}
          </button>
        ))}
      </aside>
      {/* Main content */}
      <main className="flex-1 flex flex-col gap-8 pt-24">
        {/* Action bar - moved outside table card */}
        <div className="sticky top-20 z-20 bg-white rounded-xl shadow border border-gray-200 px-8 py-4 flex justify-between items-center mb-4 max-w-5xl mx-auto">
          <div className="flex items-center gap-4">
            <h3 className="text-2xl font-bold text-[#1A237E] tracking-wide">{TABLES.find(t => t.key === selectedTable)?.label}</h3>
            <span className="bg-blue-100 text-[#1A237E] rounded-full px-3 py-1 text-sm font-semibold">{tableData.length} lignes</span>
            <span className="bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-xs font-medium">{columns.length} colonnes</span>
          </div>
          {isAdmin && (
            <div className="flex gap-3">
              <button className="bg-green-600 text-white px-5 py-2 rounded-lg shadow hover:bg-green-700 flex items-center gap-2 font-semibold" onClick={handleExportCSV}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Exporter
              </button>
              <button className="bg-[#1A237E] text-white px-5 py-2 rounded-lg shadow hover:bg-blue-900 flex items-center gap-2 font-semibold" onClick={() => document.getElementById('import-csv-input').click()}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v-4a4 4 0 014-4h8a4 4 0 014 4v4" /></svg>
                Importer
              </button>
              <input id="import-csv-input" type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCSV} />
            </div>
          )}
        </div>
        {/* Table card - max width, only table scrolls horizontally */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4 max-w-5xl mx-auto flex flex-col" style={{ minHeight: 220, maxHeight: 'calc(100vh - 180px)' }}>
          <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-400 animate-spin mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /></svg>
                <p className="text-gray-500 text-base">Chargement...</p>
              </div>
            ) : tableData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0h6" /></svg>
                <p className="text-[#1A237E] text-lg font-semibold">Aucune donnée à afficher</p>
                <p className="text-gray-400 text-xs mt-2">La table est vide ou aucun résultat ne correspond.</p>
              </div>
            ) : (
              <table className={`w-full text-xs rounded-xl overflow-hidden ${columns.length > 8 ? 'text-xs' : 'text-xs'}`}
                style={{ minWidth: columns.length > 8 ? columns.length * 100 : 'auto', tableLayout: columns.length > 8 ? 'fixed' : 'auto' }}>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-blue-50 text-[#1A237E] font-semibold">
                    {columns.map(col => (
                      <th key={col} className="py-1 px-2 text-left border-b border-blue-100 whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-blue-50/50"}>
                      {columns.map(col => (
                        <td key={col} className="px-2 py-1 border-b border-blue-50 whitespace-nowrap max-w-xs overflow-hidden text-ellipsis" title={row[col]}>{row[col]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        {/* Modal import CSV */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-lg w-[500px]">
              <h2 className="text-lg font-bold mb-4">Confirmer l’import CSV</h2>
              <p className="mb-2">Vous allez écraser la table <b>{TABLES.find(t => t.key === selectedTable)?.label}</b> avec le fichier : <b>{importFile?.name}</b></p>
              <div className="overflow-auto max-h-64 border rounded mb-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      {importPreview?.cols.map(col => <th key={col} className="border-b px-2 py-1">{col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview?.data.slice(0, 10).map((row, idx) => (
                      <tr key={idx}>
                        {importPreview.cols.map(col => <td key={col} className="px-2 py-1">{row[col]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importPreview?.data.length > 10 && <div className="text-gray-500 text-xs mt-2">...et {importPreview.data.length - 10} lignes supplémentaires</div>}
              </div>
              <div className="flex gap-2 justify-end">
                <button className="bg-gray-300 px-4 py-1 rounded" onClick={() => setShowImportModal(false)}>Annuler</button>
                <button className="bg-[#1A237E] text-white px-4 py-1 rounded" onClick={confirmImport}>Confirmer l’import</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SIFTables;
