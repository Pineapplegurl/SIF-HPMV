import React, { useState, useEffect } from 'react';
import { FaFileExcel } from 'react-icons/fa';
import SIFExcelImporter from './SIFExcelImporter';

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

  // Import CSV - supprimé car géré par l'import Excel
  const [showExcelImporter, setShowExcelImporter] = useState(false);
  const refreshTable = () => {
    const table = TABLES.find(t => t.key === selectedTable);
    if (!table) return;
    setLoading(true);
    fetch(`http://localhost:5000${table.api}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setTableData(Array.isArray(data) ? data : []))
      .catch(() => setTableData([]))
      .finally(() => setLoading(false));
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
                Exporter CSV
              </button>
              <button className="bg-orange-600 text-white px-5 py-2 rounded-lg shadow hover:bg-orange-700 flex items-center gap-2 font-semibold" onClick={() => setShowExcelImporter(true)}>
                <FaFileExcel />
                Importer Excel
              </button>
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
        {/* Modal Excel Importer */}
        {showExcelImporter && (
          <SIFExcelImporter
            tableType={selectedTable}
            onImportComplete={() => {
              setShowExcelImporter(false);
              refreshTable();
            }}
            onClose={() => setShowExcelImporter(false)}
          />
        )}
      </main>
    </div>
  );
};

export default SIFTables;
