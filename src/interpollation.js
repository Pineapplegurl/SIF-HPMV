// interpolation.js

// Interpolation linéaire
export function interpolate(pk, pk1, pk2, coord1, coord2) {
    const ratio = (pk - pk1) / (pk2 - pk1);
    const x = coord1.x + ratio * (coord2.x - coord1.x);
    const y = coord1.y + ratio * (coord2.y - coord1.y);
    return { x, y };
  }
  
  // Fonction pour trouver la position interpolée
  export function findInterpolatedCoords(pk, referencePoints) {
    for (let i = 0; i < referencePoints.length - 1; i++) {
      const p1 = referencePoints[i];
      const p2 = referencePoints[i + 1];
      if (pk >= p1.pk && pk <= p2.pk) {
        return interpolate(pk, p1.pk, p2.pk, { x: p1.x, y: p1.y }, { x: p2.x, y: p2.y });
      }
    }
    return null; // hors de portée
  }