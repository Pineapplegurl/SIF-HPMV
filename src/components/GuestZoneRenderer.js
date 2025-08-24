import React from 'react';

const GuestZoneRenderer = ({ zonesData, coordinateSystem, zoom = 1 }) => {
  console.log('🎨 GuestZoneRenderer rendu avec:');
  console.log('- zonesData:', zonesData);
  console.log('- coordinateSystem:', coordinateSystem);
  console.log('- zoom:', zoom);
  
  if (!zonesData || zonesData.length === 0) {
    console.log('❌ Pas de données de zones à rendre');
    return null;
  }

  // Fonction pour générer les points d'un polygone rectangulaire simple
  const generateZonePolygon = (zone) => {
    const { pk_debut, pk_fin, couleur } = zone;
    
    // Conversion des PK en coordonnées pixel
    const x1 = coordinateSystem.pkToPixel(pk_debut) * zoom;
    const x2 = coordinateSystem.pkToPixel(pk_fin) * zoom;
    
    // Positions Y approximatives basées sur l'image
    const y1 = 350 * zoom; // Position haute (MV1)
    const y2 = 650 * zoom; // Position basse (MV2)
    const offset = 50 * zoom; // Décalage pour créer la largeur du polygone
    
    // Création d'un polygone rectangulaire simple entre les deux voies
    const points = [
      [x1, y1 - offset],
      [x2, y1 - offset],
      [x2, y2 + offset],
      [x1, y2 + offset]
    ];
    
    return {
      points: points.map(([x, y]) => `${x},${y}`).join(' '),
      couleur: couleur || '#3B82F6',
      zone
    };
  };

  const polygons = zonesData.map(generateZonePolygon).filter(Boolean);
  
  console.log('📐 Polygones générés:', polygons);

  return (
    <>
      {polygons.map((polygon, index) => {
        console.log(`🔺 Rendu polygon ${index}:`, polygon);
        return (
          <polygon
            key={`zone-${polygon.zone.id}-${index}`}
            points={polygon.points}
            fill={polygon.couleur}
            opacity={0.3}
            stroke="red" // Debug: bordure rouge
            strokeWidth="2"
          />
        );
      })}
    </>
  );
};

export default GuestZoneRenderer;
