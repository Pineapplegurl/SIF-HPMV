import * as d3 from 'd3-interpolate';
export function interpolateData(pkArray, xArray, yArray, step = 0.1) {
  const minPk = Math.min(...pkArray);
  const maxPk = Math.max(...pkArray);

  const pkInterp = [];
  for (let pk = minPk; pk <= maxPk; pk += step) {
    pkInterp.push(pk);
  }

  const xInterpFunc = d3.interpolateBasis(xArray);
  const yInterpFunc = d3.interpolateBasis(yArray);

  const xInterp = pkInterp.map((_, i) =>
    xInterpFunc(i / (pkInterp.length - 1))
  );
  const yInterp = pkInterp.map((_, i) =>
    yInterpFunc(i / (pkInterp.length - 1))
  );

  return pkInterp.map((pk, i) => ({
    pk,
    x: xInterp[i],
    y: yInterp[i],
  }));
}