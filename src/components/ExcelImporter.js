import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { FaUpload, FaDownload, FaCheck, FaTimes, FaEye, FaPlus, FaTrash } from 'react-icons/fa';

const ExcelImporter = ({ onImportComplete, onClose }) => {
  const [step, setStep] = useState(1); // 1: Upload, 2: Mapping, 3: Preview, 4: Import
  const [excelData, setExcelData] = useState([]);
  const [excelColumns, setExcelColumns] = useState([]);
  const [mapping, setMapping] = useState({});
  const [combinedMappings, setCombinedMappings] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Champs de la base de données BTS/GSMR
  const dbFields = [
    { key: 'name', label: 'Nom', required: true },
    { key: 'type', label: 'Type', required: true },
    { key: 'pk', label: 'PK', required: true },
    { key: 'line', label: 'Ligne', required: true },
    { key: 'track', label: 'Voie', required: true },
    { key: 'info', label: 'Info', required: false },
    { key: 'Etats', label: 'État', required: true },
    // x et y seront calculés automatiquement
  ];

  // Types disponibles
  const availableTypes = [
    'BTS GSM-R existante',
    'BTS GSM-R HPMV',
    'Postes existants',
    'Centre N2 HPMV'
  ];

  const availableStates = [
    'Etude',
    'Réalisation',
    'Mis en service'
  ];

  // Helper pour normaliser les noms de colonnes
  const normalizeColumnName = (name) => {
    return String(name || '').toLowerCase().trim();
  };

  // Auto-mapping intelligent basé sur les noms de colonnes
  const generateAutoMapping = useCallback((columns) => {
    const autoMap = {};
    const columnMap = {
      'nom': 'name',
      'name': 'name',
      'site': 'name',
      'type': 'type',
      'type de site': 'type',
      'typologie': 'type',
      'pk': 'pk',
      'point kilométrique': 'pk',
      'ligne': 'line',
      'numéro ligne': 'line',
      'voie': 'track',
      'track': 'track',
      'sens': 'track',
      'info': 'info',
      'adresse': 'info',
      'status': 'Etats',
      'état': 'Etats',
      'criticité': 'Etats'
    };

    columns.forEach(col => {
      const normalized = normalizeColumnName(col);
      if (columnMap[normalized]) {
        autoMap[col] = columnMap[normalized];
      }
    });

    return autoMap;
  }, []);

  // Traitement du fichier Excel
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        if (jsonData.length < 2) {
          alert('Le fichier doit contenir au moins un en-tête et une ligne de données.');
          return;
        }

        const headers = jsonData[0].filter(h => h); // Supprime les colonnes vides
        const rows = jsonData.slice(1).filter(row => row.some(cell => cell)); // Supprime les lignes vides

        setExcelColumns(headers);
        setExcelData(rows);
        setMapping(generateAutoMapping(headers));
        setStep(2);
      } catch (error) {
        alert('Erreur lors de la lecture du fichier Excel.');
        console.error(error);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Ajouter un mapping combiné
  const addCombinedMapping = () => {
    setCombinedMappings([...combinedMappings, { 
      dbField: '', 
      excelColumns: [], 
      separator: ' - ',
      staticValue: ''
    }]);
  };

  // Supprimer un mapping combiné
  const removeCombinedMapping = (index) => {
    setCombinedMappings(combinedMappings.filter((_, i) => i !== index));
  };

  // Mettre à jour un mapping combiné
  const updateCombinedMapping = (index, field, value) => {
    const updated = [...combinedMappings];
    updated[index][field] = value;
    setCombinedMappings(updated);
  };

  // Générer la prévisualisation
  const generatePreview = async () => {
    setIsProcessing(true);
    try {
      const preview = [];
      
      for (let i = 0; i < Math.min(excelData.length, 5); i++) { // Preview des 5 premières lignes
        const row = excelData[i];
        const mapped = {};

        // Mapping simple (1:1)
        Object.entries(mapping).forEach(([excelCol, dbField]) => {
          if (dbField) {
            const colIndex = excelColumns.indexOf(excelCol);
            if (colIndex !== -1) {
              mapped[dbField] = row[colIndex] || '';
            }
          }
        });

        // Mapping combiné (N:1)
        combinedMappings.forEach(combo => {
          if (combo.dbField && combo.excelColumns.length > 0) {
            const values = combo.excelColumns.map(col => {
              const colIndex = excelColumns.indexOf(col);
              return colIndex !== -1 ? (row[colIndex] || '') : '';
            }).filter(v => v);
            
            if (combo.staticValue) {
              values.push(combo.staticValue);
            }
            
            mapped[combo.dbField] = values.join(combo.separator);
          }
        });

        // Normalisation des types
        if (mapped.type) {
          const normalizedType = normalizeColumnName(mapped.type);
          if (normalizedType.includes('existant')) mapped.type = 'BTS GSM-R existante';
          else if (normalizedType.includes('hpmv')) mapped.type = 'BTS GSM-R HPMV';
          else if (normalizedType.includes('poste')) mapped.type = 'Postes existants';
          else if (normalizedType.includes('centre') || normalizedType.includes('n2')) mapped.type = 'Centre N2 HPMV';
          else mapped.type = 'BTS GSM-R existante'; // Par défaut
        }

        // Normalisation des états
        if (mapped.Etats) {
          const normalizedState = normalizeColumnName(mapped.Etats);
          if (normalizedState.includes('étude') || normalizedState.includes('etude')) mapped.Etats = 'Etude';
          else if (normalizedState.includes('réalisation') || normalizedState.includes('realisation')) mapped.Etats = 'Réalisation';
          else if (normalizedState.includes('service') || normalizedState.includes('exploitation')) mapped.Etats = 'Mis en service';
          else mapped.Etats = 'Etude'; // Par défaut
        }

        // Conversion PK
        if (mapped.pk) {
          mapped.pk = parseFloat(String(mapped.pk).replace(',', '.')) || 0;
        }

        // Interpolation automatique X/Y
        if (mapped.pk && mapped.line && mapped.track) {
          try {
            const response = await fetch('http://localhost:5000/api/interpolated-position', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                pk: parseFloat(mapped.pk), 
                line: String(mapped.line), 
                track: String(mapped.track) 
              })
            });
            if (response.ok) {
              const { x, y } = await response.json();
              mapped.x = x?.toFixed(2) || '';
              mapped.y = y?.toFixed(2) || '';
            } else {
              mapped.x = 'Erreur';
              mapped.y = 'Erreur';
            }
          } catch {
            mapped.x = 'Erreur';
            mapped.y = 'Erreur';
          }
        }

        preview.push(mapped);
      }

      setPreviewData(preview);
      setStep(3);
    } catch (error) {
      alert('Erreur lors de la génération de la prévisualisation.');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Import final
  const performImport = async () => {
    setIsProcessing(true);
    try {
      const imported = [];
      
      for (const row of excelData) {
        const mapped = {};

        // Mapping simple (1:1)
        Object.entries(mapping).forEach(([excelCol, dbField]) => {
          if (dbField) {
            const colIndex = excelColumns.indexOf(excelCol);
            if (colIndex !== -1) {
              mapped[dbField] = row[colIndex] || '';
            }
          }
        });

        // Mapping combiné (N:1)
        combinedMappings.forEach(combo => {
          if (combo.dbField && combo.excelColumns.length > 0) {
            const values = combo.excelColumns.map(col => {
              const colIndex = excelColumns.indexOf(col);
              return colIndex !== -1 ? (row[colIndex] || '') : '';
            }).filter(v => v);
            
            if (combo.staticValue) {
              values.push(combo.staticValue);
            }
            
            mapped[combo.dbField] = values.join(combo.separator);
          }
        });

        // Validation des champs requis
        const requiredFields = dbFields.filter(f => f.required);
        const isValid = requiredFields.every(field => mapped[field]);

        if (!isValid) continue; // Skip les lignes invalides

        // Normalisation
        if (mapped.type) {
          const normalizedType = normalizeColumnName(mapped.type);
          if (normalizedType.includes('existant')) mapped.type = 'BTS GSM-R existante';
          else if (normalizedType.includes('hpmv')) mapped.type = 'BTS GSM-R HPMV';
          else if (normalizedType.includes('poste')) mapped.type = 'Postes existants';
          else if (normalizedType.includes('centre') || normalizedType.includes('n2')) mapped.type = 'Centre N2 HPMV';
          else mapped.type = 'BTS GSM-R existante';
        }

        if (mapped.Etats) {
          const normalizedState = normalizeColumnName(mapped.Etats);
          if (normalizedState.includes('étude') || normalizedState.includes('etude')) mapped.Etats = 'Etude';
          else if (normalizedState.includes('réalisation') || normalizedState.includes('realisation')) mapped.Etats = 'Réalisation';
          else if (normalizedState.includes('service') || normalizedState.includes('exploitation')) mapped.Etats = 'Mis en service';
          else mapped.Etats = 'Etude';
        }

        if (mapped.pk) {
          mapped.pk = parseFloat(String(mapped.pk).replace(',', '.')) || 0;
        }

        // Interpolation X/Y
        if (mapped.pk && mapped.line && mapped.track) {
          try {
            const response = await fetch('http://localhost:5000/api/interpolated-position', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                pk: parseFloat(mapped.pk), 
                line: String(mapped.line), 
                track: String(mapped.track) 
              })
            });
            if (response.ok) {
              const { x, y } = await response.json();
              mapped.x = parseFloat(x?.toFixed(2)) || 0;
              mapped.y = parseFloat(y?.toFixed(2)) || 0;
            }
          } catch {
            continue; // Skip si pas d'interpolation possible
          }
        }

        imported.push(mapped);
      }

      // Envoyer au backend
      for (const item of imported) {
        try {
          await fetch('http://localhost:5000/api/add-type-point', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify(item),
          });
        } catch (error) {
          console.error('Erreur import ligne:', error);
        }
      }

      alert(`Import terminé ! ${imported.length} points ajoutés.`);
      onImportComplete();
      onClose();
    } catch (error) {
      alert('Erreur lors de l\'import.');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-900">Import Excel BTS/GSMR</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FaTimes size={24} />
          </button>
        </div>

        {/* Étapes */}
        <div className="flex items-center mb-6">
          {[1, 2, 3].map(stepNum => (
            <div key={stepNum} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                step >= stepNum ? 'bg-blue-600' : 'bg-gray-300'
              }`}>
                {stepNum}
              </div>
              {stepNum < 3 && <div className={`w-16 h-1 ${step > stepNum ? 'bg-blue-600' : 'bg-gray-300'}`} />}
            </div>
          ))}
        </div>

        {/* Étape 1: Upload */}
        {step === 1 && (
          <div className="text-center py-12">
            <FaUpload size={48} className="mx-auto text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-4">Sélectionner un fichier Excel</h3>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="mb-4"
            />
            <p className="text-gray-600">Formats supportés: .xlsx, .xls</p>
          </div>
        )}

        {/* Étape 2: Mapping */}
        {step === 2 && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Configuration du mapping</h3>
            
            {/* Mapping simple */}
            <div className="mb-6">
              <h4 className="font-semibold mb-2">Mapping simple (1 colonne Excel → 1 champ)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Colonne Excel</label>
                </div>
                <div>
                  <label className="block font-medium mb-1">Champ base de données</label>
                </div>
                {excelColumns.map(col => (
                  <React.Fragment key={col}>
                    <div className="p-2 bg-gray-100 rounded">{col}</div>
                    <select
                      value={mapping[col] || ''}
                      onChange={e => setMapping({...mapping, [col]: e.target.value})}
                      className="border rounded px-2 py-1"
                    >
                      <option value="">-- Non mappé --</option>
                      {dbFields.map(field => (
                        <option key={field.key} value={field.key}>
                          {field.label} {field.required && '*'}
                        </option>
                      ))}
                    </select>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Mapping combiné */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Mapping combiné (N colonnes → 1 champ)</h4>
                <button onClick={addCombinedMapping} className="bg-blue-600 text-white px-3 py-1 rounded flex items-center gap-2">
                  <FaPlus /> Ajouter
                </button>
              </div>
              {combinedMappings.map((combo, index) => (
                <div key={index} className="border p-4 rounded mb-2">
                  <div className="grid grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="block font-medium mb-1">Champ destination</label>
                      <select
                        value={combo.dbField}
                        onChange={e => updateCombinedMapping(index, 'dbField', e.target.value)}
                        className="border rounded px-2 py-1 w-full"
                      >
                        <option value="">-- Choisir --</option>
                        {dbFields.map(field => (
                          <option key={field.key} value={field.key}>{field.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Colonnes sources</label>
                      <select
                        multiple
                        value={combo.excelColumns}
                        onChange={e => updateCombinedMapping(index, 'excelColumns', 
                          Array.from(e.target.selectedOptions, option => option.value)
                        )}
                        className="border rounded px-2 py-1 w-full h-20"
                      >
                        {excelColumns.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Séparateur</label>
                      <input
                        type="text"
                        value={combo.separator}
                        onChange={e => updateCombinedMapping(index, 'separator', e.target.value)}
                        className="border rounded px-2 py-1 w-full"
                      />
                    </div>
                    <div>
                      <button
                        onClick={() => removeCombinedMapping(index)}
                        className="bg-red-600 text-white p-2 rounded"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="block font-medium mb-1">Valeur statique (optionnel)</label>
                    <input
                      type="text"
                      value={combo.staticValue}
                      onChange={e => updateCombinedMapping(index, 'staticValue', e.target.value)}
                      className="border rounded px-2 py-1 w-full"
                      placeholder="Texte à ajouter systématiquement"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="px-4 py-2 bg-gray-300 rounded">
                Retour
              </button>
              <button 
                onClick={generatePreview} 
                disabled={isProcessing}
                className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2"
              >
                <FaEye /> {isProcessing ? 'Génération...' : 'Prévisualiser'}
              </button>
            </div>
          </div>
        )}

        {/* Étape 3: Prévisualisation */}
        {step === 3 && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Prévisualisation (5 premières lignes)</h3>
            <div className="overflow-x-auto mb-6">
              <table className="w-full border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    {dbFields.map(field => (
                      <th key={field.key} className="border px-2 py-1 text-left">
                        {field.label} {field.required && '*'}
                      </th>
                    ))}
                    <th className="border px-2 py-1">X (calculé)</th>
                    <th className="border px-2 py-1">Y (calculé)</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, idx) => (
                    <tr key={idx}>
                      {dbFields.map(field => (
                        <td key={field.key} className="border px-2 py-1">
                          {row[field.key] || '-'}
                        </td>
                      ))}
                      <td className="border px-2 py-1">{row.x || '-'}</td>
                      <td className="border px-2 py-1">{row.y || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="px-4 py-2 bg-gray-300 rounded">
                Modifier mapping
              </button>
              <button 
                onClick={performImport} 
                disabled={isProcessing}
                className="px-4 py-2 bg-green-600 text-white rounded flex items-center gap-2"
              >
                <FaCheck /> {isProcessing ? 'Import...' : `Importer ${excelData.length} lignes`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExcelImporter;
