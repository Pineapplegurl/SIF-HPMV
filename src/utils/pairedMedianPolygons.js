// Utility to compute paired polygons sharing a local median border
// Inputs:
// - centerA, centerB: arrays of points {x,y,pk} sorted by pk (center lines)
// - widthA, widthB: widths in pixels (optional)
// - options: { samples: number, zoom: number }
// Returns: { polyA: [[x,y],...], polyB: [[x,y],...], median: [[x,y,pk], ...] } or null if no overlap

function interpPointByPk(arr, pks) {
  if (!arr || arr.length === 0) return null;
  if (pks <= arr[0].pk) return { x: arr[0].x, y: arr[0].y };
  if (pks >= arr[arr.length-1].pk) return { x: arr[arr.length-1].x, y: arr[arr.length-1].y };
  for (let ii = 0; ii < arr.length-1; ii++) {
    const p1 = arr[ii], p2 = arr[ii+1];
    if (pks >= p1.pk && pks <= p2.pk) {
      const r = (pks - p1.pk) / (p2.pk - p1.pk || 1);
      return { x: p1.x + (p2.x - p1.x) * r, y: p1.y + (p2.y - p1.y) * r };
    }
  }
  return { x: arr[arr.length-1].x, y: arr[arr.length-1].y };
}

export function computePairedPolygons(centerA, centerB, widthA = 20, widthB = 20, options = {}) {
  const samples = options.samples || 40;
  const zoom = options.zoom || 1;
  if (!centerA || !centerB || centerA.length < 2 || centerB.length < 2) return null;
  const aMin = centerA[0].pk, aMax = centerA[centerA.length-1].pk;
  const bMin = centerB[0].pk, bMax = centerB[centerB.length-1].pk;
  const startPk = Math.max(aMin, bMin);
  const endPk = Math.min(aMax, bMax);
  if (endPk <= startPk) return null; // no overlap

  // Build dense pk list across overlap
  const pkList = [];
  for (let s = 0; s <= samples; s++) {
    pkList.push(startPk + (s / samples) * (endPk - startPk));
  }

  // Compute median polyline
  const median = pkList.map(pk => {
    const pa = interpPointByPk(centerA, pk);
    const pb = interpPointByPk(centerB, pk);
    return { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2, pk };
  });

  // For each PK, compute outer borders following their respective center lines with constant offset
  const outerA = [];
  const outerB = [];
  
  for (let i = 0; i < pkList.length; i++) {
    const pk = pkList[i];
    const ca = interpPointByPk(centerA, pk);
    const cb = interpPointByPk(centerB, pk);
    
    // Compute normal for each center line at this PK
    const normalA = computeNormalAtPk(centerA, pk);
    const normalB = computeNormalAtPk(centerB, pk);
    
    // Outer borders follow their respective lines with constant offset
    const halfA = widthA / 2;
    const halfB = widthB / 2;
    
    // For A: outer border is away from median
    const toMedianA_x = median[i].x - ca.x;
    const toMedianA_y = median[i].y - ca.y;
    const signA = (normalA.nx * toMedianA_x + normalA.ny * toMedianA_y) > 0 ? -1 : 1;
    outerA.push([(ca.x + normalA.nx * halfA * signA) * zoom, (ca.y + normalA.ny * halfA * signA) * zoom]);
    
    // For B: outer border is away from median
    const toMedianB_x = median[i].x - cb.x;
    const toMedianB_y = median[i].y - cb.y;
    const signB = (normalB.nx * toMedianB_x + normalB.ny * toMedianB_y) > 0 ? -1 : 1;
    outerB.push([(cb.x + normalB.nx * halfB * signB) * zoom, (cb.y + normalB.ny * halfB * signB) * zoom]);
  }

  // Build polygons: polyA = outerA forward + median offset; polyB = median offset + outerB reversed
  // Pour éviter la superposition, on décale légèrement chaque polygone de part et d'autre de la médiane
  const medianPtsA = median.map(m => [(m.x - 0.5) * zoom, (m.y - 0.5) * zoom]); // Légèrement à gauche
  const medianPtsB = median.map(m => [(m.x + 0.5) * zoom, (m.y + 0.5) * zoom]); // Légèrement à droite
  
  const polyA = [...outerA, ...medianPtsA.slice().reverse()];
  const polyB = [...medianPtsB, ...outerB.slice().reverse()];

  return { polyA, polyB, median };
}

function computeNormalAtPk(centerLine, pk) {
  // Find the segment containing this PK
  for (let i = 0; i < centerLine.length - 1; i++) {
    const p1 = centerLine[i];
    const p2 = centerLine[i + 1];
    if (pk >= p1.pk && pk <= p2.pk) {
      // Compute direction vector for this segment
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy) || 1;
      // Return perpendicular normal
      return { nx: -dy / len, ny: dx / len };
    }
  }
  // Fallback to last segment
  if (centerLine.length >= 2) {
    const p1 = centerLine[centerLine.length - 2];
    const p2 = centerLine[centerLine.length - 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy) || 1;
    return { nx: -dy / len, ny: dx / len };
  }
  return { nx: 0, ny: 1 };
}

export default computePairedPolygons;
