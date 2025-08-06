import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { FaUpload, FaCheck, FaTimes, FaEye, FaPlus, FaTrash, FaFileExcel, FaExpand, FaCompress } from 'react-icons/fa';
import { useToast } from './Toast';

const SIFExcelImporter = ({ tableType, onImportComplete, onClose }) => {
  const [step, setStep] = useState(1); // 1: Upload, 2: Mapping, 3: Preview, 4: Import
  const [excelData, setExcelData] = useState([]);
  const [excelColumns, setExcelColumns] = useState([]);
  const [mapping, setMapping] = useState({});
  const [combinedMappings, setCombinedMappings] = useState([]);
  const [valueMappings, setValueMappings] = useState([]); // Nouveau : mapping de valeurs
  const [previewData, setPreviewData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [duplicateMode, setDuplicateMode] = useState('skip'); // 'skip', 'overwrite', 'ask'
  const [isFullscreen, setIsFullscreen] = useState(false); // Nouveau : état plein écran
  const { showToast, ToastContainer } = useToast();

  // Configuration des champs selon le type de table
  const getFieldsConfig = () => {
    switch (tableType) {
      case 'points': // Points BTS/GSMR
        return {
          fields: [
            { key: 'name', label: 'Nom', required: true },
            { key: 'type', label: 'Type', required: true },
            { key: 'pk', label: 'PK', required: true },
            { key: 'line', label: 'Ligne', required: true },
            { key: 'track', label: 'Voie', required: true },
            { key: 'info', label: 'Info', required: false },
            { key: 'Etats', label: 'État', required: true },
          ],
          api: '/api/add-type-point',
          types: ['BTS GSM-R existante', 'BTS GSM-R HPMV', 'Postes existants', 'Centre N2 HPMV'],
          states: ['Etude', 'Réalisation', 'Mis en service'],
          autoCalculateXY: true
        };
      case 'interpolation': // Points manuels
        return {
          fields: [
            { key: 'name', label: 'Nom', required: true },
            { key: 'pk', label: 'PK', required: true },
            { key: 'x', label: 'X', required: true },
            { key: 'y', label: 'Y', required: true },
            { key: 'line', label: 'Ligne', required: false },
            { key: 'track', label: 'Voie', required: false },
            { key: 'info', label: 'Info', required: false },
          ],
          api: '/api/add-point',
          autoCalculateXY: false
        };
      case 'zones': // Zones
        return {
          fields: [
            { key: 'name', label: 'Nom', required: true },
            { key: 'pkStart', label: 'PK Début', required: true },
            { key: 'pkEnd', label: 'PK Fin', required: true },
            { key: 'line', label: 'Ligne', required: true },
            { key: 'track', label: 'Voie', required: true },
            { key: 'info', label: 'Info', required: false },
          ],
          api: '/api/add-zone',
          autoCalculateXY: false
        };
      default:
        return { fields: [], api: '', autoCalculateXY: false };
    }
  };

  const config = getFieldsConfig();

  // Helper pour normaliser les noms de colonnes
  const normalizeColumnName = (name) => {
    return String(name || '').toLowerCase().trim();
  };

  // Auto-mapping intelligent basé sur les noms de colonnes
  const generateAutoMapping = useCallback((columns) => {
    const autoMap = {};
    const columnMap = {
      // Noms
      'nom': 'name',
      'name': 'name',
      'site': 'name',
      'nom du site': 'name',
      // Type
      'type': 'type',
      'type de site': 'type',
      'typologie': 'type',
      'typologie du site': 'type',
      // PK
      'pk': 'pk',
      'point kilométrique': 'pk',
      'kilometrage': 'pk',
      // Ligne
      'ligne': 'line',
      'line': 'line',
      'numéro ligne': 'line',
      'numero ligne': 'line',
      'numéro de ligne': 'line',
      // Voie/Track
      'voie': 'track',
      'track': 'track',
      'sens': 'track',
      'direction': 'track',
      // État
      'etat': 'Etats',
      'état': 'Etats',
      'etats': 'Etats',
      'status': 'Etats',
      'statut': 'Etats',
      // Coordonnées
      'x': 'x',
      'y': 'y',
      'latitude': 'x',
      'longitude': 'y',
      // Zone spécifique
      'pk debut': 'pkStart',
      'pk début': 'pkStart',
      'pk start': 'pkStart',
      'pk fin': 'pkEnd',
      'pk end': 'pkEnd',
    };

    columns.forEach(col => {
      const normalized = normalizeColumnName(col);
      if (columnMap[normalized]) {
        autoMap[col] = columnMap[normalized];
      }
    });

    return autoMap;
  }, []);

  // Upload du fichier Excel
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const workbook = XLSX.read(evt.target.result, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        if (data.length < 2) {
          showToast('Le fichier doit contenir au moins une ligne d\'en-têtes et une ligne de données', 'warning');
          return;
        }

        const headers = data[0].filter(h => h); // Enlève les cellules vides
        const rows = data.slice(1).filter(row => row.some(cell => cell)); // Enlève les lignes vides

        setExcelColumns(headers);
        setExcelData(rows);
        setMapping(generateAutoMapping(headers));
        setStep(2);
      } catch (error) {
        showToast('Erreur lors de la lecture du fichier Excel', 'error');
        console.error(error);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Ajouter un mapping combiné
  const addCombinedMapping = () => {
    setCombinedMappings([...combinedMappings, { 
      dbField: '', 
      excelColumns: []
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

  // Ajouter un mapping de valeur
  const addValueMapping = () => {
    setValueMappings([...valueMappings, { 
      field: '', 
      mappings: [{ from: '', to: '' }]
    }]);
  };

  // Supprimer un mapping de valeur
  const removeValueMapping = (index) => {
    setValueMappings(valueMappings.filter((_, i) => i !== index));
  };

  // Mettre à jour un mapping de valeur
  const updateValueMapping = (index, field, value) => {
    const updated = [...valueMappings];
    updated[index][field] = value;
    setValueMappings(updated);
  };

  // Ajouter une règle de mapping à un mapping de valeur
  const addMappingRule = (mappingIndex) => {
    const updated = [...valueMappings];
    updated[mappingIndex].mappings.push({ from: '', to: '' });
    setValueMappings(updated);
  };

  // Supprimer une règle de mapping
  const removeMappingRule = (mappingIndex, ruleIndex) => {
    const updated = [...valueMappings];
    updated[mappingIndex].mappings = updated[mappingIndex].mappings.filter((_, i) => i !== ruleIndex);
    setValueMappings(updated);
  };

  // Mettre à jour une règle de mapping
  const updateMappingRule = (mappingIndex, ruleIndex, field, value) => {
    const updated = [...valueMappings];
    updated[mappingIndex].mappings[ruleIndex][field] = value;
    setValueMappings(updated);
  };

  // Appliquer les mappings de valeurs
  const applyValueMappings = (data) => {
    if (valueMappings.length === 0) return data;
    
    const mapped = { ...data };
    
    valueMappings.forEach(valueMapping => {
      if (valueMapping.field && mapped[valueMapping.field]) {
        const currentValue = String(mapped[valueMapping.field]).trim();
        
        // Chercher une correspondance
        const rule = valueMapping.mappings.find(rule => 
          rule.from && String(rule.from).trim().toLowerCase() === currentValue.toLowerCase()
        );
        
        if (rule && rule.to) {
          mapped[valueMapping.field] = rule.to;
        }
      }
    });
    
    return mapped;
  };

  // Normalisation des types pour BTS/GSMR
  const normalizeType = (value) => {
    if (!value || tableType !== 'points') return value;
    const normalized = normalizeColumnName(value);
    if (normalized.includes('existant')) return 'BTS GSM-R existante';
    if (normalized.includes('hpmv')) return 'BTS GSM-R HPMV';
    if (normalized.includes('poste')) return 'Postes existants';
    if (normalized.includes('centre') || normalized.includes('n2')) return 'Centre N2 HPMV';
    return 'BTS GSM-R existante'; // Par défaut
  };

  // Normalisation des états
  const normalizeState = (value) => {
    if (!value) return value;
    const normalized = normalizeColumnName(value);
    if (normalized.includes('étude') || normalized.includes('etude')) return 'Etude';
    if (normalized.includes('réalisation') || normalized.includes('realisation')) return 'Réalisation';
    if (normalized.includes('service') || normalized.includes('exploitation')) return 'Mis en service';
    return 'Etude'; // Par défaut
  };

  // Vérifier si un élément est un doublon selon le type de table
  const findDuplicate = (newItem, existingItems) => {
    switch (tableType) {
      case 'points': // Points BTS/GSMR
        return existingItems.find(existing => 
          existing.name === newItem.name &&
          existing.pk === newItem.pk &&
          existing.line === newItem.line &&
          existing.track === newItem.track
        );
      case 'interpolation': // Points d'interpolation
        return existingItems.find(existing => 
          existing.name === newItem.name &&
          existing.pk === newItem.pk
        );
      case 'zones': // Zones
        return existingItems.find(existing => 
          existing.name === newItem.name &&
          existing.track === newItem.track &&
          existing.line === newItem.line &&
          existing.pk === newItem.pk
        );
      default:
        return null;
    }
  };

  // Version simplifiée pour vérifier juste l'existence
  const isDuplicate = (newItem, existingItems) => {
    return findDuplicate(newItem, existingItems) !== undefined;
  };

  // Récupérer les données existantes pour vérifier les doublons
  const getExistingData = async () => {
    try {
      const config = getFieldsConfig();
      let endpoint;
      
      // Déterminer l'endpoint correct selon le type de table
      switch (tableType) {
        case 'points':
          endpoint = '/api/type-points';
          break;
        case 'interpolation':
          endpoint = '/api/manual-points';
          break;
        case 'zones':
          endpoint = '/api/zones';
          break;
        default:
          return [];
      }
      
      const response = await fetch(`http://localhost:5000${endpoint}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Erreur récupération données existantes:', error);
    }
    return [];
  };

  // Générer la prévisualisation
  const generatePreview = async () => {
    setIsProcessing(true);
    try {
      const preview = [];
      
      for (let i = 0; i < Math.min(excelData.length, 5); i++) {
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
            const formattedValues = combo.excelColumns.map(col => {
              const colIndex = excelColumns.indexOf(col);
              const value = colIndex !== -1 ? (row[colIndex] || '') : '';
              return value ? `${col} : ${value}` : '';
            }).filter(v => v);
            
            mapped[combo.dbField] = formattedValues.join(' ;\n');
          }
        });

        // Normalisation selon le type de table
        if (tableType === 'points') {
          if (mapped.type) mapped.type = normalizeType(mapped.type);
          if (mapped.Etats) mapped.Etats = normalizeState(mapped.Etats);
        }

        // Application des mappings de valeurs personnalisés
        const finalMapped = applyValueMappings(mapped);

        // Conversion des nombres
        if (finalMapped.pk) finalMapped.pk = parseFloat(String(finalMapped.pk).replace(',', '.')) || 0;
        if (finalMapped.pkStart) finalMapped.pkStart = parseFloat(String(finalMapped.pkStart).replace(',', '.')) || 0;
        if (finalMapped.pkEnd) finalMapped.pkEnd = parseFloat(String(finalMapped.pkEnd).replace(',', '.')) || 0;
        if (finalMapped.x) finalMapped.x = parseFloat(String(finalMapped.x).replace(',', '.')) || 0;
        if (finalMapped.y) finalMapped.y = parseFloat(String(finalMapped.y).replace(',', '.')) || 0;

        // Auto-calcul X/Y pour les points BTS/GSMR
        if (config.autoCalculateXY && finalMapped.pk && finalMapped.line && finalMapped.track) {
          try {
            const response = await fetch('http://localhost:5000/api/interpolated-position', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                pk: parseFloat(finalMapped.pk), 
                line: String(finalMapped.line), 
                track: String(finalMapped.track) 
              })
            });
            if (response.ok) {
              const { x, y } = await response.json();
              finalMapped.x = parseFloat(x?.toFixed(2)) || 0;
              finalMapped.y = parseFloat(y?.toFixed(2)) || 0;
            } else {
              finalMapped.x = 0;
              finalMapped.y = 0;
            }
          } catch {
            finalMapped.x = 0;
            finalMapped.y = 0;
          }
        }

        preview.push(finalMapped);
      }

      setPreviewData(preview);
      setStep(3);
    } catch (error) {
      showToast('Erreur lors de la génération de la prévisualisation', 'error');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Import final
  const performImport = async () => {
    setIsProcessing(true);
    try {
      const config = getFieldsConfig();
      // Récupérer les données existantes pour vérifier les doublons
      const existingData = await getExistingData();
      const imported = [];
      const duplicatesFound = [];
      
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
            const formattedValues = combo.excelColumns.map(col => {
              const colIndex = excelColumns.indexOf(col);
              const value = colIndex !== -1 ? (row[colIndex] || '') : '';
              return value ? `${col} : ${value}` : '';
            }).filter(v => v);
            
            mapped[combo.dbField] = formattedValues.join(' ;\n');
          }
        });

        // Validation des champs requis
        const requiredFields = config.fields.filter(f => f.required);
        const isValid = requiredFields.every(field => mapped[field.key]);

        if (!isValid) continue; // Skip les lignes invalides

        // Normalisation
        if (tableType === 'points') {
          if (mapped.type) mapped.type = normalizeType(mapped.type);
          if (mapped.Etats) mapped.Etats = normalizeState(mapped.Etats);
        }

        // Application des mappings de valeurs personnalisés
        const finalMapped = applyValueMappings(mapped);

        // Conversion des nombres
        if (finalMapped.pk) finalMapped.pk = parseFloat(String(finalMapped.pk).replace(',', '.')) || 0;
        if (finalMapped.pkStart) finalMapped.pkStart = parseFloat(String(finalMapped.pkStart).replace(',', '.')) || 0;
        if (finalMapped.pkEnd) finalMapped.pkEnd = parseFloat(String(finalMapped.pkEnd).replace(',', '.')) || 0;
        if (finalMapped.x) finalMapped.x = parseFloat(String(finalMapped.x).replace(',', '.')) || 0;
        if (finalMapped.y) finalMapped.y = parseFloat(String(finalMapped.y).replace(',', '.')) || 0;

        // Auto-calcul X/Y
        if (config.autoCalculateXY && finalMapped.pk && finalMapped.line && finalMapped.track) {
          try {
            const response = await fetch('http://localhost:5000/api/interpolated-position', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                pk: parseFloat(finalMapped.pk), 
                line: String(finalMapped.line), 
                track: String(finalMapped.track) 
              })
            });
            if (response.ok) {
              const { x, y } = await response.json();
              finalMapped.x = parseFloat(x?.toFixed(2)) || 0;
              finalMapped.y = parseFloat(y?.toFixed(2)) || 0;
            } else {
              // Si l'interpolation échoue, mettre des valeurs par défaut
              finalMapped.x = 0;
              finalMapped.y = 0;
            }
          } catch {
            // Si l'interpolation échoue, mettre des valeurs par défaut
            finalMapped.x = 0;
            finalMapped.y = 0;
          }
        }

        // Vérifier les doublons
        const existingItem = findDuplicate(finalMapped, existingData);
        if (existingItem) {
          duplicatesFound.push({
            new: finalMapped,
            existing: existingItem
          });
          
          if (duplicateMode === 'skip') {
            continue; // Ignorer ce doublon
          } else if (duplicateMode === 'overwrite') {
            // Pour l'écrasement, on garde l'ID de l'élément existant
            finalMapped._id = existingItem._id;
          }
          // Pour 'add', on ne fait rien de spécial, on ajoute comme un nouvel élément
        }

        imported.push(finalMapped);
      }

      // Envoyer au backend
      let successCount = 0;
      let overwriteCount = 0;
      let errorCount = 0;
      
      for (const item of imported) {
        try {
          let endpoint = config.api;
          let method = 'POST';
          let itemToSend = { ...item };
          
          // Validation des données avant envoi
          if (config.autoCalculateXY && (itemToSend.x === undefined || itemToSend.y === undefined)) {
            itemToSend.x = 0;
            itemToSend.y = 0;
          }
          
          // Si l'élément a un ID valide, c'est un écrasement
          if (itemToSend._id && duplicateMode === 'overwrite') {
            // Vérifier que l'ID est valide (24 caractères hexadécimaux pour MongoDB)
            const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(itemToSend._id);
            
            if (isValidObjectId) {
              // Déterminer l'endpoint de mise à jour selon le type de table
              switch (tableType) {
                case 'points':
                  endpoint = `/api/type-points/${itemToSend._id}`;
                  break;
                case 'interpolation':
                  endpoint = `/api/manual-points/${itemToSend._id}`;
                  break;
                case 'zones':
                  endpoint = `/api/zones/${itemToSend._id}`;
                  break;
                default:
                  // Endpoint par défaut pour PUT, ne devrait pas arriver
                  endpoint = `/api/unknown/${itemToSend._id}`;
                  break;
              }
              method = 'PUT';
              overwriteCount++;
              
              // Supprimer l'_id du body pour éviter les conflits
              const { _id, ...itemWithoutId } = itemToSend;
              itemToSend = itemWithoutId;
            } else {
              // ID invalide, on fait un POST normal
              const { _id, ...itemWithoutId } = itemToSend;
              itemToSend = itemWithoutId;
            }
          }
          
          const response = await fetch(`http://localhost:5000${endpoint}`, {
            method: method,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify(itemToSend),
          });
          
          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
            console.error(`Erreur ${method} ${endpoint}:`, await response.text());
          }
        } catch (error) {
          errorCount++;
          console.error('Erreur import ligne:', error);
        }
      }

      // Message de résultat avec gestion des doublons détaillée
      let message = `Import terminé ! ${successCount} éléments traités avec succès.`;
      
      if (errorCount > 0) {
        message += ` ${errorCount} erreurs rencontrées.`;
      }
      
      if (duplicatesFound.length > 0) {
        switch (duplicateMode) {
          case 'skip':
            message = `Import terminé ! ${successCount} éléments ajoutés, ${duplicatesFound.length} doublons ignorés.`;
            break;
          case 'overwrite':
            message = `Import terminé ! ${successCount - overwriteCount} éléments ajoutés, ${overwriteCount} doublons écrasés.`;
            break;
          case 'add':
            message = `Import terminé ! ${successCount} éléments ajoutés (dont ${duplicatesFound.length} doublons autorisés).`;
            break;
          default:
            message = `Import terminé ! ${successCount} éléments traités.`;
            break;
        }
        if (errorCount > 0) {
          message += ` ${errorCount} erreurs rencontrées.`;
        }
      }
      
      showToast(message, successCount > 0 ? 'success' : 'info');
      onImportComplete();
      onClose();
    } catch (error) {
      showToast('Erreur lors de l\'import', 'error');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Basculer le mode plein écran
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const getTableLabel = () => {
    switch (tableType) {
      case 'points': return 'Points BTS/GSMR';
      case 'interpolation': return 'Points d\'interpolation';
      case 'zones': return 'Zones';
      default: return 'Données';
    }
  };

  // Récupérer les valeurs uniques d'un champ dans les données Excel
  const getUniqueValuesForField = (fieldName) => {
    if (!excelData || excelData.length === 0 || !fieldName) return [];
    
    // Trouver les colonnes Excel mappées vers ce champ
    const mappedColumns = [];
    
    // Vérifier le mapping simple
    Object.entries(mapping).forEach(([excelCol, dbField]) => {
      if (dbField === fieldName) {
        mappedColumns.push(excelCol);
      }
    });
    
    // Vérifier les mappings combinés
    combinedMappings.forEach(combo => {
      if (combo.dbField === fieldName) {
        mappedColumns.push(...combo.excelColumns);
      }
    });
    
    if (mappedColumns.length === 0) return [];
    
    // Extraire toutes les valeurs uniques
    const uniqueValues = new Set();
    
    excelData.forEach(row => {
      mappedColumns.forEach(colName => {
        const colIndex = excelColumns.indexOf(colName);
        if (colIndex !== -1) {
          const value = row[colIndex];
          if (value && String(value).trim()) {
            uniqueValues.add(String(value).trim());
          }
        }
      });
    });
    
    return Array.from(uniqueValues).sort();
  };

  return (
    <div className={`fixed inset-0 ${isFullscreen ? 'bg-white' : 'bg-black bg-opacity-50'} flex items-center justify-center z-50`}>
      <div className={`bg-white rounded-lg ${isFullscreen ? 'w-screen h-screen max-w-none max-h-none' : 'max-w-6xl w-full max-h-[90vh]'} overflow-y-auto p-6`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-900">Import Excel - {getTableLabel()}</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleFullscreen} 
              className="text-gray-500 hover:text-gray-700 p-2 rounded hover:bg-gray-100"
              title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
            >
              {isFullscreen ? <FaCompress size={20} /> : <FaExpand size={20} />}
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-2 rounded hover:bg-gray-100">
              <FaTimes size={20} />
            </button>
          </div>
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
            <FaFileExcel size={48} className="mx-auto text-green-600 mb-4" />
            <h3 className="text-xl font-semibold mb-4">Sélectionner un fichier Excel</h3>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="mb-4"
            />
            <p className="text-gray-600">Formats supportés: .xlsx, .xls, .csv</p>
            <div className="mt-4 text-sm text-gray-500 bg-gray-50 p-4 rounded">
              <p className="font-semibold mb-2">Exemples de colonnes reconnues automatiquement :</p>
              <div className="grid grid-cols-2 gap-2">
                <div>• Nom, Site → name</div>
                <div>• Type de Site → type</div>
                <div>• PK → pk</div>
                <div>• Ligne → line</div>
                <div>• Sens, Voie → track</div>
                <div>• Status, État → Etats</div>
              </div>
            </div>
          </div>
        )}

        {/* Étape 2: Mapping */}
        {step === 2 && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Configuration du mapping</h3>
            
            {/* Mapping simple */}
            <div className="mb-6">
              <h4 className="font-semibold mb-2">Mapping simple (1 colonne Excel → 1 champ)</h4>
              <div className={`grid grid-cols-2 gap-4 ${isFullscreen ? 'max-h-96' : 'max-h-64'} overflow-y-auto`}>
                <div>
                  <label className="block font-medium mb-1">Colonne Excel</label>
                </div>
                <div>
                  <label className="block font-medium mb-1">Champ base de données</label>
                </div>
                {excelColumns.map(col => (
                  <React.Fragment key={col}>
                    <div className="p-2 bg-gray-100 rounded text-sm">{col}</div>
                    <select
                      value={mapping[col] || ''}
                      onChange={e => setMapping({...mapping, [col]: e.target.value})}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="">-- Non mappé --</option>
                      {config.fields.map(field => (
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
                        {config.fields.map(field => (
                          <option key={field.key} value={field.key}>{field.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium mb-1 text-gray-700">Colonnes sources</label>
                      <select
                        multiple
                        value={combo.excelColumns}
                        onChange={e => updateCombinedMapping(index, 'excelColumns', 
                          Array.from(e.target.selectedOptions, option => option.value)
                        )}
                        className="border border-gray-300 rounded px-2 py-1 w-full h-20 text-xs bg-white text-gray-800"
                      >
                        {excelColumns.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium mb-1 text-gray-700">Séparateur</label>
                      <input
                        type="text"
                        value={combo.separator}
                        onChange={e => updateCombinedMapping(index, 'separator', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 w-full bg-white text-gray-800"
                        placeholder=" - "
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
                </div>
              ))}
            </div>

            {/* Mapping de valeurs */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-700">Mapping de valeurs (remplacer les valeurs)</h4>
                <button onClick={addValueMapping} className="bg-green-600 text-white px-3 py-1 rounded flex items-center gap-2">
                  <FaPlus /> Ajouter
                </button>
              </div>
              <div className="text-sm text-gray-600 mb-3 bg-green-50 p-2 rounded">
                <strong>Exemple :</strong> Transformez automatiquement MV1 → V1, MV2 → V2 lors de l'import
              </div>
              {valueMappings.map((valueMapping, index) => (
                <div key={index} className="border p-4 rounded mb-2 bg-green-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-1/3">
                      <label className="block font-medium mb-1 text-gray-700">Champ à transformer</label>
                      <select
                        value={valueMapping.field}
                        onChange={e => updateValueMapping(index, 'field', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 w-full bg-white text-gray-800"
                      >
                        <option value="">-- Choisir un champ --</option>
                        {config.fields.map(field => (
                          <option key={field.key} value={field.key}>{field.label}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => removeValueMapping(index)}
                      className="bg-red-600 text-white p-2 rounded"
                      title="Supprimer ce mapping de valeurs"
                    >
                      <FaTrash />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block font-medium text-gray-700">Règles de transformation</label>
                      <button
                        onClick={() => addMappingRule(index)}
                        className="bg-blue-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1"
                      >
                        <FaPlus size={10} /> Règle
                      </button>
                    </div>
                    {valueMapping.mappings.map((rule, ruleIndex) => {
                      const availableValues = getUniqueValuesForField(valueMapping.field);
                      return (
                        <div key={ruleIndex} className="grid grid-cols-5 gap-2 items-center">
                          <div>
                            {availableValues.length > 0 ? (
                              <select
                                value={rule.from}
                                onChange={e => updateMappingRule(index, ruleIndex, 'from', e.target.value)}
                                className="border border-gray-300 rounded px-2 py-1 w-full text-sm bg-white text-gray-800"
                              >
                                <option value="">Sélectionner...</option>
                                {availableValues.map(value => (
                                  <option key={value} value={value}>{value}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={rule.from}
                                onChange={e => updateMappingRule(index, ruleIndex, 'from', e.target.value)}
                                className="border border-gray-300 rounded px-2 py-1 w-full text-sm bg-white text-gray-800"
                                placeholder="Valeur Excel"
                              />
                            )}
                          </div>
                          <div className="text-center">→</div>
                          <div>
                            <input
                              type="text"
                              value={rule.to}
                              onChange={e => updateMappingRule(index, ruleIndex, 'to', e.target.value)}
                              className="border rounded px-2 py-1 w-full text-sm"
                              placeholder="Valeur finale"
                            />
                          </div>
                          <div className="text-xs text-gray-500 px-1">
                            {rule.from && rule.to ? `${rule.from} → ${rule.to}` : 'Ex: MV1 → V1'}
                          </div>
                          <div>
                            <button
                              onClick={() => removeMappingRule(index, ruleIndex)}
                              className="bg-red-500 text-white p-1 rounded text-xs"
                              title="Supprimer cette règle"
                            >
                              <FaTrash size={10} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Gestion des doublons */}
            <div className="mb-6">
              <h4 className="font-semibold mb-2">Gestion des doublons</h4>
              <div className="text-sm text-gray-600 mb-3 bg-orange-50 p-2 rounded">
                <strong>Critères de détection :</strong><br/>
                {tableType === 'points' && '• Points BTS/GSMR : même nom ET même PK ET même ligne ET même voie'}
                {tableType === 'interpolation' && '• Points d\'interpolation : même nom ET même PK'}
                {tableType === 'zones' && '• Zones : même nom ET même voie ET même ligne ET même PK'}
              </div>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="duplicateMode"
                    value="skip"
                    checked={duplicateMode === 'skip'}
                    onChange={e => setDuplicateMode(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm">Ignorer les doublons (recommandé)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="duplicateMode"
                    value="overwrite"
                    checked={duplicateMode === 'overwrite'}
                    onChange={e => setDuplicateMode(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm">Écraser les doublons (remplacer par les nouvelles données)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="duplicateMode"
                    value="add"
                    checked={duplicateMode === 'add'}
                    onChange={e => setDuplicateMode(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm">Ajouter même s'il y a des doublons (créer des entrées multiples)</span>
                </label>
              </div>
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
            <div className={`overflow-x-auto mb-6 ${isFullscreen ? 'max-h-96' : 'max-h-64'} overflow-y-auto`}>
              <table className={`w-full border border-gray-300 ${isFullscreen ? 'text-sm' : 'text-xs'}`}>
                <thead>
                  <tr className="bg-gray-100">
                    {config.fields.map(field => (
                      <th key={field.key} className="border px-2 py-1 text-left">
                        {field.label} {field.required && '*'}
                      </th>
                    ))}
                    {config.autoCalculateXY && (
                      <>
                        <th className="border px-2 py-1">X (calculé)</th>
                        <th className="border px-2 py-1">Y (calculé)</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, idx) => (
                    <tr key={idx}>
                      {config.fields.map(field => (
                        <td key={field.key} className="border px-2 py-1">
                          {row[field.key] || '-'}
                        </td>
                      ))}
                      {config.autoCalculateXY && (
                        <>
                          <td className="border px-2 py-1">{row.x || '-'}</td>
                          <td className="border px-2 py-1">{row.y || '-'}</td>
                        </>
                      )}
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
      <ToastContainer />
    </div>
  );
};

export default SIFExcelImporter;
