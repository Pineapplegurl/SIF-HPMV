import React from 'react';
import computePairedPolygons from '../utils/pairedMedianPolygons';

const ZoneRenderer = ({ zones, zoneColors, zoom }) => {
  const allPolygons = [];
  const renderedPairs = new Set();

  zones.forEach((zone) => {
    const { zonePoints, pairedTrack, pairedPoints, zoneName } = zone;

    const width = zone.width ? Number(zone.width) : 20;
    const color = zoneColors[zoneName] || '#FFB300';

    if (pairedTrack && pairedPoints) {
      const pairKey = `${zone.line}-${zone.track}_${pairedTrack.line}-${pairedTrack.track}`;
      const reversePairKey = `${pairedTrack.line}-${pairedTrack.track}_${zone.line}-${zone.track}`;

      if (!renderedPairs.has(pairKey) && !renderedPairs.has(reversePairKey)) {
        renderedPairs.add(pairKey);

        const pairedWidth = pairedTrack.width ? Number(pairedTrack.width) : 20;
        const pairedPolygons = computePairedPolygons(
          zonePoints,
          pairedPoints,
          width,
          pairedWidth,
          { samples: 30, zoom }
        );

        if (pairedPolygons) {
          allPolygons.push({
            points: pairedPolygons.polyA.map(([x, y]) => `${x},${y}`).join(' '),
            color,
            id: `${zoneName}-${zone.line}-${zone.track}`,
            type: 'paired',
          });

          allPolygons.push({
            points: pairedPolygons.polyB.map(([x, y]) => `${x},${y}`).join(' '),
            color,
            id: `${zoneName}-${pairedTrack.line}-${pairedTrack.track}`,
            type: 'paired',
          });
        }
      }
    } else {
      // Algorithme d'offset simple pour zones individuelles
      const leftSide = [];
      const rightSide = [];

      // Calcul des bordures extérieures basées sur les normales locales
      for (let i = 0; i < zonePoints.length; i++) {
        const p = zonePoints[i];
        let dx = 0, dy = 0;

        if (i === 0 && zonePoints.length > 1) {
          // Premier point : direction vers le suivant
          dx = zonePoints[i + 1].x - p.x;
          dy = zonePoints[i + 1].y - p.y;
        } else if (i === zonePoints.length - 1 && zonePoints.length > 1) {
          // Dernier point : direction depuis le précédent
          dx = p.x - zonePoints[i - 1].x;
          dy = p.y - zonePoints[i - 1].y;
        } else if (zonePoints.length > 2) {
          // Points intermédiaires : direction moyenne
          dx = (zonePoints[i + 1].x - zonePoints[i - 1].x) / 2;
          dy = (zonePoints[i + 1].y - zonePoints[i - 1].y) / 2;
        }

        // Normalisation de la direction
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len; // Normale perpendiculaire
        const ny = dx / len;

        // Appliquer l'offset constant pour chaque bordure (augmenté)
        const offsetMultiplier = 1.5; // Augmente l'offset des lignes extérieures
        leftSide.push([(p.x + nx * width * offsetMultiplier) * zoom, (p.y + ny * width * offsetMultiplier) * zoom]);
        rightSide.push([(p.x - nx * width * offsetMultiplier) * zoom, (p.y - ny * width * offsetMultiplier) * zoom]);
      }

      const polyPoints = [...leftSide, ...rightSide.reverse()];
      const pointsStr = polyPoints.map(([x, y]) => `${x},${y}`).join(' ');

      allPolygons.push({
        points: pointsStr,
        color,
        id: `${zoneName}-${zone.line}-${zone.track}`,
        type: 'single'
      });
    }
  });

  return (
    <svg>
      {allPolygons.map((poly, idx) => (
        <polygon
          key={`${poly.id}-${idx}`}
          points={poly.points}
          fill={poly.color}
          fillOpacity={0.25}
          stroke="none"
          strokeWidth={0}
          style={{ pointerEvents: 'none' }}
        />
      ))}
    </svg>
  );
};

export default ZoneRenderer;
