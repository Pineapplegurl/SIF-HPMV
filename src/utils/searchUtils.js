// Utilitaires de recherche partagés entre GuestMapPage et PlanViewer

/**
 * Fonction pour centrer la vue sur un point spécifique
 * @param {Object} params - Paramètres de centrage
 * @param {number} params.targetPK - PK cible
 * @param {number} params.targetX - Coordonnée X (optionnelle)
 * @param {number} params.targetY - Coordonnée Y (optionnelle)
 * @param {Object} params.containerRef - Référence du conteneur
 * @param {Object} params.naturalSize - Taille naturelle de l'image
 * @param {number} params.zoom - Niveau de zoom
 * @param {Array} params.interpolatedPoints - Points interpolés
 */
export const centerViewOnPoint = ({
  targetPK,
  targetX = null,
  targetY = null,
  containerRef,
  naturalSize,
  zoom,
  interpolatedPoints
}) => {
  if (!containerRef || !containerRef.current || !naturalSize.width) {
    console.warn('centerViewOnPoint: containerRef or naturalSize not available');
    return;
  }

  let centerX, centerY;

  if (targetX !== null && targetY !== null) {
    // Si on a des coordonnées directes, les utiliser
    centerX = targetX * zoom;
    centerY = targetY * zoom;
  } else if (targetPK !== null) {
    // Sinon, trouver un point avec ce PK dans les données interpolées
    const pointAtPK = interpolatedPoints.find(p => Math.abs(p.pk - targetPK) < 0.1);
    if (pointAtPK) {
      centerX = pointAtPK.x * zoom;
      centerY = pointAtPK.y * zoom;
    } else {
      // Si pas trouvé dans interpolatedPoints, estimer la position
      const minPK = Math.min(...interpolatedPoints.map(p => p.pk));
      const maxPK = Math.max(...interpolatedPoints.map(p => p.pk));
      const pkRatio = (targetPK - minPK) / (maxPK - minPK);
      centerX = (naturalSize.width * pkRatio) * zoom;
      centerY = (naturalSize.height * 0.5) * zoom; // Centre vertical
    }
  }

  if (centerX !== undefined && centerY !== undefined) {
    const container = containerRef.current;
    const scrollLeft = centerX - container.clientWidth / 2;
    const scrollTop = centerY - container.clientHeight / 2;
    
    // S'assurer que le scroll ne dépasse pas les limites
    container.scrollLeft = Math.max(0, Math.min(scrollLeft, naturalSize.width * zoom - container.clientWidth));
    container.scrollTop = Math.max(0, Math.min(scrollTop, naturalSize.height * zoom - container.clientHeight));
  }
};

/**
 * Fonction de recherche intelligente
 * @param {string} searchValue - Valeur de recherche
 * @param {Array} zonesActions - Zones d'actions
 * @param {Array} validManualPoints - Points manuels valides
 * @param {Object} centerFunction - Fonction de centrage
 */
export const performSearch = (searchValue, zonesActions, validManualPoints, centerFunction) => {
  const value = searchValue.toLowerCase().trim();
  const suggestions = [];

  // 1. Recherche par PK (format: "PK 45.2" ou juste "45.2")
  const pkMatch = value.match(/(?:pk\s*)?(\d+(?:\.\d+)?)/);
  if (pkMatch) {
    const pk = parseFloat(pkMatch[1]);
    suggestions.push({
      label: `PK ${pk}`,
      type: 'pk',
      pk: pk,
      action: () => centerFunction(pk)
    });
  }

  // 2. Recherche dans les zones d'actions
  if (zonesActions && Array.isArray(zonesActions)) {
    zonesActions.forEach(zone => {
      if (zone.name && zone.name.toLowerCase().includes(value)) {
        const centerPK = (zone.pkStart + zone.pkEnd) / 2;
        suggestions.push({
          label: `Zone: ${zone.name} (PK ${zone.pkStart}-${zone.pkEnd})`,
          type: 'zone',
          pk: centerPK,
          zone: zone,
          action: () => centerFunction(centerPK)
        });
      }
    });
  }

  // 3. Recherche dans les points manuels (s'ils ont des noms/descriptions)
  if (validManualPoints && Array.isArray(validManualPoints)) {
    validManualPoints.forEach(point => {
      if (point.name && point.name.toLowerCase().includes(value)) {
        suggestions.push({
          label: `Point: ${point.name} (PK ${point.pk})`,
          type: 'point',
          pk: point.pk,
          point: point,
          action: () => centerFunction(point.pk, point.x, point.y)
        });
      }
      // Recherche aussi par description si elle existe
      if (point.description && point.description.toLowerCase().includes(value)) {
        suggestions.push({
          label: `${point.description} (PK ${point.pk})`,
          type: 'point',
          pk: point.pk,
          point: point,
          action: () => centerFunction(point.pk, point.x, point.y)
        });
      }
    });
  }

  // 4. Recherche de gares/stations spécifiques au projet (vous pouvez ajouter vos vraies gares ici)
  // Laissez cette section vide pour l'instant ou ajoutez vos vraies gares
  const projectStations = [
    // Ajoutez ici vos vraies gares/stations si vous en avez
    // { name: 'Station A', pk: XX.X },
    // { name: 'Station B', pk: XX.X },
  ];
  
  projectStations.forEach(station => {
    if (station.name.toLowerCase().includes(value)) {
      suggestions.push({
        label: `Station: ${station.name} (PK ${station.pk})`,
        type: 'station',
        pk: station.pk,
        action: () => centerFunction(station.pk)
      });
    }
  });

  return suggestions.slice(0, 8); // Limiter à 8 suggestions
};

/**
 * Composant de suggestions réutilisable
 */
export const SearchSuggestions = ({ suggestions, onSuggestionClick }) => {
  if (suggestions.length === 0) return null;

  return (
    <div className="absolute left-0 right-0 top-12 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
      {suggestions.map((s, idx) => (
        <div
          key={idx}
          className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex items-center gap-3 border-b border-gray-100 last:border-b-0"
          onClick={() => onSuggestionClick(s)}
        >
          {/* Icône selon le type */}
          {s.type === 'station' && <span className="text-blue-600 flex-shrink-0">🏢</span>}
          {s.type === 'pk' && <span className="text-green-600 flex-shrink-0">🚂</span>}
          {s.type === 'zone' && <span className="text-orange-600 flex-shrink-0">⚙️</span>}
          {s.type === 'point' && <span className="text-purple-600 flex-shrink-0">📡</span>}
          
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-800">{s.label}</span>
            {s.pk && (
              <span className="text-xs text-gray-500">PK {s.pk}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
