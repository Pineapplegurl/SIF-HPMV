import React from 'react';
import { FaTimes, FaMapMarkerAlt, FaRoute, FaRuler, FaInfoCircle } from 'react-icons/fa';

const PointDetailPanel = ({ point, isVisible, onClose }) => {
  if (!isVisible || !point) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl border-l border-gray-200 z-50 transform transition-transform duration-300 ease-in-out">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <FaMapMarkerAlt className="text-lg" />
          <h3 className="text-lg font-semibold">Détails du Point</h3>
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
        {/* Nom du point */}
        <div className="mb-6">
          <h4 className="text-2xl font-bold text-gray-800 mb-2">
            {point.name || point.Nom || 'Point sans nom'}
          </h4>
          {point.type && (
            <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {point.type}
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
                <p className="font-medium text-gray-800">{point.line || point.Line || 'Non défini'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Voie</span>
                <p className="font-medium text-gray-800">{point.track || point.Track || 'Non défini'}</p>
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
                <p className="font-medium text-gray-800">{point.pk || point.Pk || 'Non défini'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Coordonnée X</span>
                  <p className="font-medium text-gray-800">
                    {point.x ? parseFloat(point.x).toFixed(2) : 'Non défini'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Coordonnée Y</span>
                  <p className="font-medium text-gray-800">
                    {point.y ? parseFloat(point.y).toFixed(2) : 'Non défini'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Coordonnées SIF si disponibles */}
          {(point.xSif || point.ySif) && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <FaInfoCircle className="text-orange-600" />
                <h5 className="font-semibold text-gray-700">Coordonnées SIF</h5>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">X SIF</span>
                  <p className="font-medium text-gray-800">
                    {point.xSif ? parseFloat(point.xSif).toFixed(2) : 'Non défini'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Y SIF</span>
                  <p className="font-medium text-gray-800">
                    {point.ySif ? parseFloat(point.ySif).toFixed(2) : 'Non défini'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Informations supplémentaires */}
          {point.infos && (
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <FaInfoCircle className="text-yellow-600" />
                <h5 className="font-semibold text-gray-700">Informations</h5>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{point.infos}</p>
            </div>
          )}

          {/* Date de création si disponible */}
          {point.createdAt && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FaInfoCircle className="text-gray-600" />
                <h5 className="font-semibold text-gray-700">Date de création</h5>
              </div>
              <p className="text-gray-700">
                {new Date(point.createdAt).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          )}
        </div>

        {/* ID technique en bas */}
        <div className="mt-8 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-400">ID: {point._id || 'Non disponible'}</p>
        </div>
      </div>
    </div>
  );
};

export default PointDetailPanel;