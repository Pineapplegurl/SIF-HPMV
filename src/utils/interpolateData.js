import * as d3 from 'd3-interpolate';

export function interpolateData(pkArray, latArray, lonArray, step = 0.1) {
  const minPk = Math.min(...pkArray);
  const maxPk = Math.max(...pkArray);

  const pkInterp = [];
  for (let pk = minPk; pk <= maxPk; pk += step) {
    pkInterp.push(pk);
  }

  const latInterpFunc = d3.interpolateBasis(latArray);
  const lonInterpFunc = d3.interpolateBasis(lonArray);

  const latInterp = pkInterp.map((_, i) =>
    latInterpFunc(i / (pkInterp.length - 1))
  );
  const lonInterp = pkInterp.map((_, i) =>
    lonInterpFunc(i / (pkInterp.length - 1))
  );

  return pkInterp.map((pk, i) => ({
    pk,
    latitude: latInterp[i],
    longitude: lonInterp[i],
  }));
}