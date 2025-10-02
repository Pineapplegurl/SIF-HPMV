import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaPlus, FaEdit, FaSave, FaTimes, FaTrash, FaEye, FaDownload, 
  FaUpload, FaCloudUploadAlt, FaHistory, FaChevronDown, FaChevronUp,
  FaLayerGroup, FaImage
} from 'react-icons/fa';
import { API_BASE_URL } from '../utils/config';
import { useToast } from '../hooks/useToast';

const AdminLayersPage = () => {
  const [layers, setLayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingLayer, setEditingLayer] = useState(null);
  const [showNewLayerForm, setShowNewLayerForm] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [showAllVersions, setShowAllVersions] = useState({});
  const [newLayer, setNewLayer] = useState({
    name: '',
    description: '',
    opacity: 1,
    visible: true,
    zIndex: 0
  });

  const { showToast, ToastContainer } = useToast();

  // Récupérer les calques depuis le backend
  const fetchLayers = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/layers`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLayers(data);
      } else {
        showToast('Erreur lors du chargement', 'error');
      }
    } catch (error) {
      console.error('Erreur:', error);
      showToast('Erreur réseau', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchLayers();
  }, [fetchLayers]);

  // Créer un nouveau calque
  const handleCreateLayer = async () => {
    if (!newLayer.name.trim()) {
      showToast('Le nom est requis', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/layers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newLayer)
      });

      if (response.ok) {
        showToast('Calque créé avec succès', 'success');
        setNewLayer({ name: '', description: '', opacity: 1, visible: true, zIndex: 0 });
        setShowNewLayerForm(false);
        fetchLayers();
      } else {
        showToast('Erreur lors de la création', 'error');
      }
    } catch (error) {
      console.error('Erreur:', error);
      showToast('Erreur réseau', 'error');
    }
  };

  // Sauvegarder les modifications d'un calque
  const handleSaveLayer = async (layer) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/layers/${layer._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(layer)
      });

      if (response.ok) {
        showToast('Calque mis à jour', 'success');
        setEditingLayer(null);
        fetchLayers();
      } else {
        showToast('Erreur lors de la mise à jour', 'error');
      }
    } catch (error) {
      console.error('Erreur:', error);
      showToast('Erreur réseau', 'error');
    }
  };

  // Supprimer un calque
  const handleDeleteLayer = async (layerId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce calque ?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/layers/${layerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        showToast('Calque supprimé', 'success');
        fetchLayers();
      } else {
        showToast('Erreur lors de la suppression', 'error');
      }
    } catch (error) {
      console.error('Erreur:', error);
      showToast('Erreur réseau', 'error');
    }
  };

  // Upload d'image pour un calque
  const handleImageUpload = async (layerId, file) => {
    const formData = new FormData();
    formData.append('image', file);

    try {
      setUploadProgress(prev => ({ ...prev, [layerId]: 0 }));

      const response = await fetch(`${API_BASE_URL}/api/layers/${layerId}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        showToast('Image mise à jour', 'success');
        setUploadProgress(prev => ({ ...prev, [layerId]: 100 }));
        setTimeout(() => {
          setUploadProgress(prev => ({ ...prev, [layerId]: 0 }));
        }, 1000);
        fetchLayers();
      } else {
        showToast('Erreur lors de l\'upload', 'error');
        setUploadProgress(prev => ({ ...prev, [layerId]: 0 }));
      }
    } catch (error) {
      console.error('Erreur:', error);
      showToast('Erreur réseau', 'error');
      setUploadProgress(prev => ({ ...prev, [layerId]: 0 }));
    }
  };

  // Télécharger une image
  const handleDownloadImage = async (layer) => {
    try {
      const response = await fetch(`${API_BASE_URL}${layer.imageUrl}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${layer.name}.${layer.imageUrl.split('.').pop()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      showToast('Erreur lors du téléchargement', 'error');
    }
  };

  // Restaurer une version
  const handleRestoreVersion = async (layerId, versionIndex) => {
    if (!window.confirm('Restaurer cette version ?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/layers/${layerId}/restore/${versionIndex}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        showToast('Version restaurée avec succès', 'success');
        fetchLayers();
      } else {
        showToast('Erreur lors de la restauration', 'error');
      }
    } catch (error) {
      console.error('Erreur:', error);
      showToast('Erreur réseau', 'error');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="text-xl text-gray-600">Chargement des calques...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* En-tête moderne */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des Calques</h1>
            <p className="text-gray-600">Gérez les images et métadonnées de chaque calque de visualisation SIF</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Total des calques</div>
            <div className="text-2xl font-bold text-blue-600">{layers.length}</div>
          </div>
        </div>
        
        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <FaEye className="text-blue-600 mr-2" />
              <div>
                <div className="text-sm text-gray-600">Calques visibles</div>
                <div className="text-lg font-semibold text-blue-600">
                  {layers.filter(l => l.visible !== false).length}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <FaLayerGroup className="text-green-600 mr-2" />
              <div>
                <div className="text-sm text-gray-600">Total calques</div>
                <div className="text-lg font-semibold text-green-600">{layers.length}</div>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center">
              <FaHistory className="text-yellow-600 mr-2" />
              <div>
                <div className="text-sm text-gray-600">Versions</div>
                <div className="text-lg font-semibold text-yellow-600">
                  {layers.reduce((sum, l) => sum + (l.versions ? l.versions.length : 0), 0)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <FaCloudUploadAlt className="text-purple-600 mr-2" />
              <div>
                <div className="text-sm text-gray-600">Dernière MAJ</div>
                <div className="text-xs font-medium text-purple-600">
                  {layers.length > 0 ? 
                    new Date(Math.max(...layers.map(l => new Date(l.lastModified || l.createdAt)))).toLocaleDateString('fr-FR')
                    : 'N/A'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bouton Nouveau Calque */}
      <div className="mb-6">
        <button
          onClick={() => setShowNewLayerForm(!showNewLayerForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <FaPlus /> Nouveau Calque
        </button>
      </div>

      {/* Formulaire nouveau calque */}
      {showNewLayerForm && (
        <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Créer un nouveau calque</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input
                type="text"
                value={newLayer.name}
                onChange={(e) => setNewLayer({ ...newLayer, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nom du calque"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Z-Index</label>
              <input
                type="number"
                value={newLayer.zIndex}
                onChange={(e) => setNewLayer({ ...newLayer, zIndex: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newLayer.description}
                onChange={(e) => setNewLayer({ ...newLayer, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
                placeholder="Description du calque"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowNewLayerForm(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Annuler
            </button>
            <button
              onClick={handleCreateLayer}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Créer le calque
            </button>
          </div>
        </div>
      )}

      {/* Liste des calques */}
      <div className="grid gap-6">
        {layers.map((layer) => (
          <LayerCard
            key={layer._id}
            layer={layer}
            isEditing={editingLayer === layer._id}
            uploadProgress={uploadProgress[layer._id] || 0}
            onEdit={() => setEditingLayer(layer._id)}
            onSave={handleSaveLayer}
            onCancel={() => setEditingLayer(null)}
            onDelete={() => handleDeleteLayer(layer._id)}
            onUpload={(file) => handleImageUpload(layer._id, file)}
            onDownload={() => handleDownloadImage(layer)}
            onRestoreVersion={(versionIndex) => handleRestoreVersion(layer._id, versionIndex)}
            showAllVersions={showAllVersions[layer._id]}
            setShowAllVersions={(show) => setShowAllVersions(prev => ({ ...prev, [layer._id]: show }))}
          />
        ))}
      </div>

      <ToastContainer />
    </div>
  );
};

// Composant pour chaque carte de calque (version simplifiée sans images)
const LayerCard = ({ 
  layer, isEditing, uploadProgress, onEdit, onSave, onCancel, 
  onDelete, onUpload, onDownload, onRestoreVersion, showAllVersions, setShowAllVersions
}) => {
  const [editData, setEditData] = useState(layer);

  useEffect(() => {
    setEditData(layer);
  }, [layer]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) onUpload(file);
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* En-tête avec informations principales */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="text-lg font-semibold text-gray-900 bg-transparent border-b-2 border-blue-500 outline-none w-full"
                />
                <textarea
                  value={editData.description || ''}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="text-sm text-gray-600 w-full p-2 border rounded resize-none"
                  rows="2"
                  placeholder="Description du calque..."
                />
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{layer.name}</h3>
                <p className="text-sm text-gray-600">{layer.description || 'Aucune description'}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-4">
            {isEditing ? (
              <>
                <button
                  onClick={() => onSave(editData)}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="Sauvegarder"
                >
                  <FaSave size={16} />
                </button>
                <button
                  onClick={onCancel}
                  className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
                  title="Annuler"
                >
                  <FaTimes size={16} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onEdit}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Modifier"
                >
                  <FaEdit size={16} />
                </button>
                <button
                  onClick={() => window.open(`${API_BASE_URL}${layer.imageUrl}`, '_blank')}
                  className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  title="Voir l'image"
                >
                  <FaEye size={16} />
                </button>
                <button
                  onClick={onDownload}
                  className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  title="Télécharger"
                >
                  <FaDownload size={16} />
                </button>
                <button
                  onClick={() => onDelete(layer._id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer"
                >
                  <FaTrash size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Informations du fichier */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 bg-gray-50 rounded-lg px-4">
          <div>
            <span className="text-xs text-gray-500 block">Opacité</span>
            {isEditing ? (
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={editData.opacity || 1}
                onChange={(e) => setEditData({ ...editData, opacity: parseFloat(e.target.value) })}
                className="w-full"
              />
            ) : (
              <span className="text-sm font-medium">{Math.round((layer.opacity || 1) * 100)}%</span>
            )}
          </div>
          
          <div>
            <span className="text-xs text-gray-500 block">Ordre</span>
            {isEditing ? (
              <input
                type="number"
                value={editData.zIndex || 0}
                onChange={(e) => setEditData({ ...editData, zIndex: parseInt(e.target.value) })}
                className="w-full text-sm border rounded px-2 py-1"
              />
            ) : (
              <span className="text-sm font-medium">{layer.zIndex || 0}</span>
            )}
          </div>

          <div>
            <span className="text-xs text-gray-500 block">Visible</span>
            {isEditing ? (
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={editData.visible !== false}
                  onChange={(e) => setEditData({ ...editData, visible: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm">{editData.visible !== false ? 'Oui' : 'Non'}</span>
              </label>
            ) : (
              <span className="text-sm font-medium">{layer.visible !== false ? 'Oui' : 'Non'}</span>
            )}
          </div>

          <div>
            <span className="text-xs text-gray-500 block">Taille</span>
            <span className="text-sm font-medium">
              {layer.fileSize ? `${(layer.fileSize / 1024 / 1024).toFixed(1)} MB` : 'N/A'}
            </span>
          </div>
        </div>

        {/* Zone de remplacement d'image */}
        <div className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors">
          <div className="text-center">
            <FaCloudUploadAlt className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 mb-2">
              Glisser une nouvelle image ici ou cliquer pour sélectionner
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id={`file-${layer._id}`}
            />
            <label
              htmlFor={`file-${layer._id}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
            >
              <FaUpload size={14} />
              Remplacer l'image
            </label>
            
            {/* Barre de progression */}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Historique des versions (simplifié) */}
        {layer.versions && layer.versions.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <button
              onClick={() => setShowAllVersions(!showAllVersions)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-3"
            >
              <FaHistory />
              Historique des versions ({layer.versions.length})
              {showAllVersions ? <FaChevronUp /> : <FaChevronDown />}
            </button>
            
            {showAllVersions && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {layer.versions.reverse().map((version, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Version {version.version || index + 1}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(version.uploadedAt).toLocaleDateString('fr-FR')} à {new Date(version.uploadedAt).toLocaleTimeString('fr-FR')}
                      </p>
                      {version.dimensions && (
                        <p className="text-xs text-gray-500">
                          {version.dimensions.width}×{version.dimensions.height}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onRestoreVersion(index)}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                      >
                        Restaurer
                      </button>
                      <button
                        onClick={() => window.open(`${API_BASE_URL}${version.imageUrl}`, '_blank')}
                        className="p-1 text-gray-500 hover:text-gray-700"
                        title="Voir"
                      >
                        <FaEye size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLayersPage;