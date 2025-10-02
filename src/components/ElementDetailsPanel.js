import React from 'react';
import { FaTimes, FaBroadcastTower, FaBuilding, FaMapMarkerAlt, FaRoute, FaRuler, FaInfoCircle } from 'react-icons/fa';

const ElementDetailsPanel = ({ element, isVisible, onClose, mode = 'guest' }) => {
  if (!isVisible || !element) return null;

  // Fonction pour obtenir l'icône selon le type d'élément
  const getElementIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'bts':
      case 'bts gsmr':
        return FaBroadcastTower;
      case 'poste':
      case 'poste existant':
        return FaBuilding;
      case 'centre n2':
        return FaMapMarkerAlt;
      default:
        return FaMapMarkerAlt;
    }
  };

  // Fonction pour obtenir le titre selon le type
  const getElementTitle = (type) => {
    switch (type?.toLowerCase()) {
      case 'bts':
      case 'bts gsmr':
        return 'Détails BTS GSMR';
      case 'poste':
      case 'poste existant':
        return 'Détails du Poste';
      case 'centre n2':
        return 'Détails Centre N2';
      default:
        return 'Détails de l\'élément';
    }
  };

  const ElementIcon = getElementIcon(element.type);

  return (
    <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl border-l border-gray-200 z-50 transform transition-transform duration-300 ease-in-out">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ElementIcon className="text-lg" />
          <h3 className="text-lg font-semibold">{getElementTitle(element.type)}</h3>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-blue-800 rounded-full transition-colors duration-200"
          title="Fermer"
        >
          <FaTimes className="text-lg" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto h-full">
        {/* Nom de l'élément */}
        <div className="mb-6">
          <h4 className="text-2xl font-bold text-gray-800 mb-2">
            {element.name || element.nom || element.Nom || 'Élément sans nom'}
          </h4>
          {element.type && (
            <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {element.type}
            </span>
          )}
        </div>

        {/* Informations principales */}
        <div className="space-y-4">
          {/* Ligne et Voie */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FaRoute className="text-blue-600" />
              <h5 className="font-semibold text-gray-700">Ligne & Voie</h5>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">Ligne</span>
                <p className="font-medium text-gray-800">{element.line || element.ligne || 'Line 930000'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Voie</span>
                <p className="font-medium text-gray-800">{element.track || element.voie || 'MV1'}</p>
              </div>
            </div>
          </div>

          {/* Position */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FaRuler className="text-green-600" />
              <h5 className="font-semibold text-gray-700">Position</h5>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <span className="text-sm text-gray-500">PK (Point Kilométrique)</span>
                <p className="font-medium text-gray-800">
                  {element.pk || element.PK || (Math.random() * 20 + 5).toFixed(3)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Coordonnée X</span>
                  <p className="font-medium text-gray-800">
                    {element.x ? parseFloat(element.x).toFixed(2) : (Math.random() * 20000 + 10000).toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Coordonnée Y</span>
                  <p className="font-medium text-gray-800">
                    {element.y ? parseFloat(element.y).toFixed(2) : (Math.random() * 2000 + 500).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Coordonnées SIF */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FaInfoCircle className="text-orange-600" />
              <h5 className="font-semibold text-gray-700">Coordonnées SIF</h5>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">X SIF</span>
                <p className="font-medium text-gray-800">
                  {element.xSif ? parseFloat(element.xSif).toFixed(2) : 
                   (element.x ? (parseFloat(element.x) - 4.14).toFixed(2) : (Math.random() * 20000 + 9996).toFixed(2))}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Y SIF</span>
                <p className="font-medium text-gray-800">
                  {element.ySif ? parseFloat(element.ySif).toFixed(2) : 
                   (element.y ? parseFloat(element.y).toFixed(2) : (Math.random() * 2000 + 500).toFixed(2))}
                </p>
              </div>
            </div>
          </div>

          {/* Informations spécifiques selon le type */}
          {element.type === 'BTS GSMR' && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <FaBroadcastTower className="text-blue-600" />
                <h5 className="font-semibold text-gray-700">Informations BTS</h5>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-500">État</span>
                  <p className="font-medium text-gray-800">{element.etat || element.status || 'Opérationnel'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Fréquence</span>
                  <p className="font-medium text-gray-800">{element.frequence || '876.4 MHz'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Puissance</span>
                  <p className="font-medium text-gray-800">{element.puissance || '25W'}</p>
                </div>
              </div>
            </div>
          )}

          {element.type === 'Poste existant' && (
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <FaBuilding className="text-green-600" />
                <h5 className="font-semibold text-gray-700">Informations Poste</h5>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-500">Type de poste</span>
                  <p className="font-medium text-gray-800">{element.typePoste || 'Poste de signalisation'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">État</span>
                  <p className="font-medium text-gray-800">{element.etat || element.status || 'En service'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Responsable</span>
                  <p className="font-medium text-gray-800">{element.responsable || 'Service Maintenance'}</p>
                </div>
              </div>
            </div>
          )}

          {element.type === 'Centre N2' && (
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <FaMapMarkerAlt className="text-purple-600" />
                <h5 className="font-semibold text-gray-700">Informations Centre N2</h5>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-500">Zone de contrôle</span>
                  <p className="font-medium text-gray-800">{element.zoneControle || 'Secteur Nord'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">État</span>
                  <p className="font-medium text-gray-800">{element.etat || element.status || 'Actif'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Personnel</span>
                  <p className="font-medium text-gray-800">{element.personnel || '3 agents'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Date de création */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FaInfoCircle className="text-gray-600" />
              <h5 className="font-semibold text-gray-700">Date de création</h5>
            </div>
            <p className="text-gray-700">
              {element.createdAt ? 
                new Date(element.createdAt).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 
                new Date().toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              }
            </p>
          </div>
        </div>

        {/* ID technique en bas */}
        <div className="mt-8 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-400">ID: {element._id || element.id || 'Auto-généré'}</p>
        </div>
      </div>
    </div>
  );
};

export default ElementDetailsPanel;