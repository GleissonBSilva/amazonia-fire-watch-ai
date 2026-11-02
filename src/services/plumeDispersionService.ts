/**
 * Atmospheric Smoke Plume Vector Dispersion Engine (Gaussian / Conical approximation).
 * Computes aerodynamic downwind polygon coordinates according to real-time wind speed and direction.
 */

export interface PlumeVector {
  outerPolygon: [number, number][];
  innerPolygon: [number, number][];
  downwindAngleDeg: number;
  lengthKm: number;
  widthKm: number;
  windSpeedKmh: number;
}

export function calculatePlumeVector(
  lat: number,
  lng: number,
  baseRadiusMeters: number,
  windSpeedKmh: number = 12,
  windDirectionDeg: number = 85 // Direção meteorológica (de onde o vento sopra)
): PlumeVector {
  const effectiveWindSpeed = Math.max(0, windSpeedKmh || 12);
  const isCalm = effectiveWindSpeed < 3;

  // Sentido a favor do vento (downwind): vento de 90° (Leste) sopra em direção a 270° (Oeste)
  const downwindDeg = (windDirectionDeg + 180) % 360;
  // Ângulo trigonométrico no plano cartesiano (0 rad = Leste / +X, PI/2 rad = Norte / +Y)
  const theta = ((90 - downwindDeg) * Math.PI) / 180;

  // Alongamento vetorial da pluma pela velocidade do vento
  const elongationFactor = isCalm ? 1.0 : Math.min(4.5, 1.25 + effectiveWindSpeed / 8);
  const lengthMeters = Math.max(baseRadiusMeters, baseRadiusMeters * elongationFactor);
  // Abertura cônica lateral por difusão turbulenta atmosférica
  const widthMeters = isCalm ? baseRadiusMeters : Math.max(baseRadiusMeters * 0.7, baseRadiusMeters * 0.45 + lengthMeters * 0.28);

  const latRad = (lat * Math.PI) / 180;
  const metersPerDegLat = 111320;
  const metersPerDegLng = Math.max(10000, 111320 * Math.cos(latRad));

  const generatePolygon = (scale: number): [number, number][] => {
    const l = lengthMeters * scale;
    const w = widthMeters * scale;
    const r0 = Math.max(120, (baseRadiusMeters * 0.3) * scale);

    const points: [number, number][] = [];

    // Vetores unitários: u (na direção do vento) e v (ortogonal à direita)
    const ux = Math.cos(theta);
    const uy = Math.sin(theta);
    const vx = -Math.sin(theta);
    const vy = Math.cos(theta);

    if (isCalm) {
      // Quando quase não há vento, dispersão isotrópica (círculo)
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const dx = Math.cos(a) * l;
        const dy = Math.sin(a) * l;
        points.push([lat + dy / metersPerDegLat, lng + dx / metersPerDegLng]);
      }
      return points;
    }

    // 1. Arco na retaguarda (montante / cabeceira do foco)
    const arcSteps = 5;
    for (let i = 0; i <= arcSteps; i++) {
      const a = (Math.PI / 2) + (i / arcSteps) * Math.PI;
      const localX = -r0 + Math.cos(a) * r0;
      const localY = Math.sin(a) * r0;
      const dx = localX * ux + localY * vx;
      const dy = localX * uy + localY * vy;
      points.push([lat + dy / metersPerDegLat, lng + dx / metersPerDegLng]);
    }

    // 2. Flanco direito expandindo a favor do vento
    const rightSideSteps = 5;
    for (let i = 1; i <= rightSideSteps; i++) {
      const t = i / rightSideSteps;
      const distDownwind = t * l;
      const spread = r0 + (w - r0) * Math.pow(t, 0.75);
      const localX = distDownwind;
      const localY = -spread;
      const dx = localX * ux + localY * vx;
      const dy = localX * uy + localY * vy;
      points.push([lat + dy / metersPerDegLat, lng + dx / metersPerDegLng]);
    }

    // 3. Vértice arredondado na frente da pluma (downwind head)
    const headSteps = 6;
    for (let i = 1; i < headSteps; i++) {
      const a = (-Math.PI / 2) + (i / headSteps) * Math.PI;
      const headRadius = w * 0.35;
      const localX = l - headRadius + Math.cos(a) * headRadius;
      const localY = Math.sin(a) * w;
      const dx = localX * ux + localY * vx;
      const dy = localX * uy + localY * vy;
      points.push([lat + dy / metersPerDegLat, lng + dx / metersPerDegLng]);
    }

    // 4. Flanco esquerdo retornando ao ponto de origem
    for (let i = rightSideSteps; i >= 1; i--) {
      const t = i / rightSideSteps;
      const distDownwind = t * l;
      const spread = r0 + (w - r0) * Math.pow(t, 0.75);
      const localX = distDownwind;
      const localY = spread;
      const dx = localX * ux + localY * vx;
      const dy = localX * uy + localY * vy;
      points.push([lat + dy / metersPerDegLat, lng + dx / metersPerDegLng]);
    }

    return points;
  };

  return {
    outerPolygon: generatePolygon(1.0),
    innerPolygon: generatePolygon(0.45),
    downwindAngleDeg: Math.round(downwindDeg),
    lengthKm: parseFloat((lengthMeters / 1000).toFixed(1)),
    widthKm: parseFloat((widthMeters / 1000).toFixed(1)),
    windSpeedKmh: Math.round(effectiveWindSpeed),
  };
}

