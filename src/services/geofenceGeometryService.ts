/**
 * Geofence Geometry & Editing Engine for Amazônia Fire-Watch AI.
 * Supports:
 * - Spherical area calculation (km² and hectares) via Gauss-Legendre spherical polygon formulation
 * - Centroid calculation
 * - Dynamic translation (moving entire fence)
 * - Proportional scaling (resizing / dimensioning)
 * - Vertex insertion & removal
 */

/**
 * Calculates real-world surface area of a geographic polygon in km².
 */
export function calculatePolygonAreaKm2(coords?: [number, number][]): number {
  if (!coords || !Array.isArray(coords) || coords.length < 3) return 0;
  let total = 0;
  const R = 6378.137; // Raio equatorial da Terra em km
  const len = coords.length;

  for (let i = 0; i < len; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % len];
    if (!p1 || !p2 || isNaN(p1[0]) || isNaN(p1[1]) || isNaN(p2[0]) || isNaN(p2[1])) continue;
    const lat1 = (p1[0] * Math.PI) / 180;
    const lat2 = (p2[0] * Math.PI) / 180;
    const dLng = ((p2[1] - p1[1]) * Math.PI) / 180;
    total += dLng * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  const areaKm2 = Math.abs((total * R * R) / 2.0);
  return isNaN(areaKm2) ? 0 : parseFloat(areaKm2.toFixed(4));
}

/**
 * Calculates centroid [lat, lng] of a polygon.
 */
export function getPolygonCentroid(coords?: [number, number][]): [number, number] {
  if (!coords || !Array.isArray(coords) || coords.length === 0) return [-3.1019, -60.0250];
  let sumLat = 0;
  let sumLng = 0;
  let validCount = 0;
  coords.forEach((pt) => {
    if (Array.isArray(pt) && pt.length >= 2) {
      const lat = Number(pt[0]);
      const lng = Number(pt[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        sumLat += lat;
        sumLng += lng;
        validCount++;
      }
    }
  });
  if (validCount === 0) return [-3.1019, -60.0250];
  return [sumLat / validCount, sumLng / validCount];
}

/**
 * Ensures any geofence (with bounds or polygon) is converted into a full editable polygon vertex list.
 */
export function normalizeGeofenceToPolygon(geofence?: {
  bounds?: [[number, number], [number, number]] | any;
  polygon?: [number, number][] | any;
} | null): [number, number][] {
  if (!geofence) return [];

  // 1. Tenta extrair vértices de polygon
  if (geofence.polygon && Array.isArray(geofence.polygon) && geofence.polygon.length >= 3) {
    const validPts = geofence.polygon
      .map((pt: any) => {
        if (Array.isArray(pt) && pt.length >= 2) {
          const lat = Number(pt[0]);
          const lng = Number(pt[1]);
          if (!isNaN(lat) && !isNaN(lng)) return [lat, lng] as [number, number];
        } else if (pt && typeof pt === 'object' && 'lat' in pt && 'lng' in pt) {
          const lat = Number(pt.lat);
          const lng = Number(pt.lng);
          if (!isNaN(lat) && !isNaN(lng)) return [lat, lng] as [number, number];
        }
        return null;
      })
      .filter((pt): pt is [number, number] => pt !== null);

    if (validPts.length >= 3) {
      return validPts;
    }
  }

  // 2. Tenta extrair vértices a partir de bounds
  if (geofence.bounds && Array.isArray(geofence.bounds) && geofence.bounds.length >= 2) {
    const sw = geofence.bounds[0];
    const ne = geofence.bounds[1];
    const lat1 = Array.isArray(sw) ? Number(sw[0]) : Number(sw?.lat);
    const lng1 = Array.isArray(sw) ? Number(sw[1]) : Number(sw?.lng);
    const lat2 = Array.isArray(ne) ? Number(ne[0]) : Number(ne?.lat);
    const lng2 = Array.isArray(ne) ? Number(ne[1]) : Number(ne?.lng);

    if (!isNaN(lat1) && !isNaN(lng1) && !isNaN(lat2) && !isNaN(lng2)) {
      const minLat = Math.min(lat1, lat2);
      const maxLat = Math.max(lat1, lat2);
      const minLng = Math.min(lng1, lng2);
      const maxLng = Math.max(lng1, lng2);

      // 4 vértices no sentido horário
      return [
        [maxLat, minLng], // Noroeste
        [maxLat, maxLng], // Nordeste
        [minLat, maxLng], // Sudeste
        [minLat, minLng], // Sudoeste
      ];
    }
  }

  return [];
}

/**
 * Translates (moves) all polygon vertices by deltaLat and deltaLng.
 */
export function translatePolygon(
  coords: [number, number][],
  deltaLat: number,
  deltaLng: number
): [number, number][] {
  return coords.map(([lat, lng]) => [lat + deltaLat, lng + deltaLng]);
}

/**
 * Scales the polygon independently along X (longitude / width) and Y (latitude / height) axes around its centroid.
 */
export function scalePolygonXY(
  coords: [number, number][],
  factorX: number,
  factorY: number
): [number, number][] {
  if (coords.length === 0) return [];
  const [cLat, cLng] = getPolygonCentroid(coords);

  return coords.map(([lat, lng]) => {
    const newLng = cLng + (lng - cLng) * factorX;
    const newLat = cLat + (lat - cLat) * factorY;
    return [newLat, newLng];
  });
}

/**
 * Calculates real-world bounding dimensions in kilometers (width along X, height along Y).
 */
export function getPolygonDimensionsKm(coords: [number, number][]): {
  widthKm: number;
  heightKm: number;
} {
  if (!coords || coords.length === 0) return { widthKm: 0, heightKm: 0 };
  const [[minLat, minLng], [maxLat, maxLng]] = getPolygonBoundingBox(coords);
  const midLat = (minLat + maxLat) / 2;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((midLat * Math.PI) / 180);

  const widthKm = Math.abs((maxLng - minLng) * metersPerDegLng) / 1000;
  const heightKm = Math.abs((maxLat - minLat) * metersPerDegLat) / 1000;

  return {
    widthKm: parseFloat(widthKm.toFixed(3)),
    heightKm: parseFloat(heightKm.toFixed(3)),
  };
}

/**
 * Adjusts polygon to exact target width (X) and height (Y) in kilometers around its centroid.
 */
export function setPolygonDimensionsKm(
  coords: [number, number][],
  targetWidthKm: number,
  targetHeightKm: number
): [number, number][] {
  if (!coords || coords.length === 0) return coords;
  const current = getPolygonDimensionsKm(coords);
  const safeCurrentW = Math.max(0.05, current.widthKm);
  const safeCurrentH = Math.max(0.05, current.heightKm);

  const factorX = Math.max(0.05, targetWidthKm) / safeCurrentW;
  const factorY = Math.max(0.05, targetHeightKm) / safeCurrentH;

  return scalePolygonXY(coords, factorX, factorY);
}

/**
 * Creates a brand new rectangular geofence around center [lat, lng] with dimensions widthKm (X) and heightKm (Y).
 */
export function createGeofencePolygon(
  centerLat: number,
  centerLng: number,
  widthKm: number = 2.0,
  heightKm: number = 2.0
): [number, number][] {
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((centerLat * Math.PI) / 180);

  const halfWidthDeg = ((widthKm * 1000) / 2) / metersPerDegLng;
  const halfHeightDeg = ((heightKm * 1000) / 2) / metersPerDegLat;

  return [
    [centerLat + halfHeightDeg, centerLng - halfWidthDeg], // Noroeste
    [centerLat + halfHeightDeg, centerLng + halfWidthDeg], // Nordeste
    [centerLat - halfHeightDeg, centerLng + halfWidthDeg], // Sudeste
    [centerLat - halfHeightDeg, centerLng - halfWidthDeg], // Sudoeste
  ];
}

/**
 * Scales (resizes) the polygon uniformly around its centroid by a scale factor (e.g. 1.2 = +20%, 0.8 = -20%).
 */
export function scalePolygon(
  coords: [number, number][],
  factor: number
): [number, number][] {
  return scalePolygonXY(coords, factor, factor);
}

/**
 * Inserts a new vertex between index and index + 1 (at the edge midpoint).
 */
export function addVertexAtMidpoint(
  coords: [number, number][],
  index: number
): [number, number][] {
  if (coords.length === 0) return coords;
  const nextIdx = (index + 1) % coords.length;
  const p1 = coords[index];
  const p2 = coords[nextIdx];
  const midLat = (p1[0] + p2[0]) / 2;
  const midLng = (p1[1] + p2[1]) / 2;

  const newCoords = [...coords];
  newCoords.splice(index + 1, 0, [midLat, midLng]);
  return newCoords;
}

/**
 * Removes a vertex by index (maintains at least 3 vertices for a valid polygon).
 */
export function removeVertex(
  coords: [number, number][],
  index: number
): [number, number][] {
  if (coords.length <= 3) return coords;
  const newCoords = [...coords];
  newCoords.splice(index, 1);
  return newCoords;
}

/**
 * Ray-casting algorithm to test whether [lat, lng] is inside a polygon.
 */
export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  if (!polygon || polygon.length < 3) return false;
  const [lat, lng] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Computes bounding box [[minLat, minLng], [maxLat, maxLng]] of a polygon safely.
 */
export function getPolygonBoundingBox(polygon?: [number, number][]): [[number, number], [number, number]] {
  if (!polygon || !Array.isArray(polygon) || polygon.length === 0) {
    return [[-3.15, -60.05], [-3.05, -59.95]];
  }
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;
  let count = 0;
  polygon.forEach((pt) => {
    if (Array.isArray(pt) && pt.length >= 2) {
      const lat = Number(pt[0]);
      const lng = Number(pt[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        count++;
      }
    }
  });

  if (count === 0 || !isFinite(minLat) || !isFinite(maxLat) || !isFinite(minLng) || !isFinite(maxLng)) {
    return [[-3.15, -60.05], [-3.05, -59.95]];
  }
  return [[minLat, minLng], [maxLat, maxLng]];
}
