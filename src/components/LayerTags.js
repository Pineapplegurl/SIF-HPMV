import React from 'react';

const LayerTags = ({ layers, activeLayers, setActiveLayers, title = "Calques" }) => {
  // Fonction pour grouper les calques par catégorie (optionnel)
  const getLayerCategory = (layer) => {
    if (layer.includes('Phase')) return 'Phases';
    if (layer.includes('HPMV')) return 'HPMV';
    if (layer.includes('BTS') || layer.includes('Postes') || layer.includes('Centre')) return 'Équipements';
    if (layer.includes('Zone')) return 'Zones';
    if (layer === 'Situation actuelle') return 'Base';
    return 'Général';
  };

  // Couleurs par catégorie - plus compactes et harmonieuses
  const categoryColors = {
    'Base': 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200',
    'Général': 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100',
    'Phases': 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100',
    'HPMV': 'bg-violet-50 text-violet-700 border-violet-300 hover:bg-violet-100',
    'Équipements': 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100',
    'Zones': 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
  };

  // Couleurs pour l'état actif - plus vives
  const activeCategoryColors = {
    'Base': 'bg-slate-600 text-white border-slate-700 shadow-sm',
    'Général': 'bg-[#1A237E] text-white border-blue-800 shadow-sm',
    'Phases': 'bg-emerald-600 text-white border-emerald-700 shadow-sm',
    'HPMV': 'bg-violet-600 text-white border-violet-700 shadow-sm',
    'Équipements': 'bg-amber-600 text-white border-amber-700 shadow-sm',
    'Zones': 'bg-rose-600 text-white border-rose-700 shadow-sm'
  };

  const handleToggle = (layer) => {
    setActiveLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-bold text-blue-900 mb-3 text-center">{title}</h3>
      
      {/* Container optimisé pour plus de compacité */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {layers.map(layer => {
          const isActive = !!activeLayers[layer];
          const category = getLayerCategory(layer);
          const baseColors = categoryColors[category];
          const activeColors = activeCategoryColors[category];
          
          return (
            <button
              key={layer}
              onClick={() => handleToggle(layer)}
              className={`
                px-2 py-1 rounded-md border font-medium text-xs
                transition-all duration-200 ease-in-out
                transform hover:scale-105 active:scale-95
                focus:outline-none focus:ring-1 focus:ring-blue-400 focus:ring-offset-1
                ${isActive ? activeColors : baseColors}
                min-w-0 whitespace-nowrap
              `}
              title={`${isActive ? 'Désactiver' : 'Activer'} le calque "${layer}"`}
              aria-pressed={isActive}
            >
              <span className="relative inline-flex items-center">
                {/* Raccourcir les noms longs pour économiser l'espace */}
                {layer.length > 15 ? `${layer.substring(0, 12)}...` : layer}
                {/* Point indicateur pour l'état actif */}
                {isActive && (
                  <span className="ml-1 w-1.5 h-1.5 bg-white rounded-full opacity-90"></span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Compteur compact */}
      <div className="mt-2 text-center">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium border border-blue-200">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
          {Object.values(activeLayers).filter(Boolean).length} actif(s)
        </span>
      </div>
    </div>
  );
};

export default LayerTags;