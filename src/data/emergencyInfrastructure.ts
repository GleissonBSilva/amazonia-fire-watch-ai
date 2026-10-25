export interface EmergencyBase {
  name: string;
  type: 'bombeiros' | 'defesa_civil';
  lat: number;
  lng: number;
  city: string;
}

export interface WaterSource {
  name: string;
  lat: number;
  lng: number;
}

export interface Airfield {
  name: string;
  lat: number;
  lng: number;
}

export const EMERGENCY_BASES: EmergencyBase[] = [
  { name: 'Pelotão CBMAM Flores', type: 'bombeiros', lat: -3.0645, lng: -60.0210, city: 'Manaus/AM' },
  { name: '1º Batalhão de Incêndio CBMAM (Centro)', type: 'bombeiros', lat: -3.1250, lng: -60.0150, city: 'Manaus/AM' },
  { name: 'Pelotão CBMAM Mauazinho / Distrito', type: 'bombeiros', lat: -3.1380, lng: -59.9450, city: 'Manaus/AM' },
  { name: 'Posto Avançado CBMAM Iranduba', type: 'bombeiros', lat: -3.2800, lng: -60.1800, city: 'Iranduba/AM' },
  { name: 'Companhia CBMAM Manacapuru', type: 'bombeiros', lat: -3.2980, lng: -60.6200, city: 'Manacapuru/AM' },
  { name: 'Pelotão CBMAM Itacoatiara', type: 'bombeiros', lat: -3.1430, lng: -58.4440, city: 'Itacoatiara/AM' },
  { name: 'Pelotão CBMAM Humaitá', type: 'bombeiros', lat: -7.5080, lng: -63.0250, city: 'Humaitá/AM' },
  { name: 'Pelotão CBMAM Parintins', type: 'bombeiros', lat: -2.6280, lng: -56.7350, city: 'Parintins/AM' },
  { name: 'Pelotão CBMAM Tefé', type: 'bombeiros', lat: -3.3550, lng: -64.7110, city: 'Tefé/AM' },
  { name: 'Companhia CBMAM Tabatinga', type: 'bombeiros', lat: -4.2480, lng: -69.9380, city: 'Tabatinga/AM' },
  { name: 'Base de Defesa Civil Lábrea', type: 'defesa_civil', lat: -7.2600, lng: -64.7900, city: 'Lábrea/AM' },
  { name: 'Base de Defesa Civil Apuí', type: 'defesa_civil', lat: -7.1950, lng: -59.8900, city: 'Apuí/AM' },
  { name: 'Base de Defesa Civil Novo Progresso', type: 'defesa_civil', lat: -7.1400, lng: -55.4200, city: 'Novo Progresso/PA' },
];

export const WATER_SOURCES: WaterSource[] = [
  { name: 'Rio Negro (Orla Urbana)', lat: -3.1400, lng: -60.0300 },
  { name: 'Rio Solimões (Encontro das Águas)', lat: -3.1350, lng: -59.9050 },
  { name: 'Rio Madeira (Calha Principal)', lat: -7.5000, lng: -63.0200 },
  { name: 'Rio Purus (Lábrea)', lat: -7.2650, lng: -64.7950 },
  { name: 'Rio Amazonas (Itacoatiara)', lat: -3.1500, lng: -58.4300 },
  { name: 'Represa de Balbina', lat: -1.9160, lng: -59.4830 },
  { name: 'Rio Tapajós (Itaituba/Santarém)', lat: -4.2700, lng: -55.9800 },
];

export const AIRFIELDS: Airfield[] = [
  { name: 'Aeródromo de Flores (SWFN)', lat: -3.0760, lng: -60.0220 },
  { name: 'Aeroporto Internacional Eduardo Gomes (SBEG)', lat: -3.0380, lng: -60.0490 },
  { name: 'Pista Rural Humaitá', lat: -7.5300, lng: -63.0500 },
  { name: 'Aeródromo de Lábrea', lat: -7.2600, lng: -64.7800 },
  { name: 'Pista Rural Apuí', lat: -7.2000, lng: -59.8700 },
];

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0; // Earth radius in km
  const dlat = (lat2 - lat1) * (Math.PI / 180);
  const dlon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dlat / 2) * Math.sin(dlat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dlon / 2) * Math.sin(dlon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function findNearestInfrastructure(lat: number, lng: number) {
  let nearestStation = EMERGENCY_BASES[0];
  let minDistStation = haversineDistance(lat, lng, nearestStation.lat, nearestStation.lng);

  for (let i = 1; i < EMERGENCY_BASES.length; i++) {
    const d = haversineDistance(lat, lng, EMERGENCY_BASES[i].lat, EMERGENCY_BASES[i].lng);
    if (d < minDistStation) {
      minDistStation = d;
      nearestStation = EMERGENCY_BASES[i];
    }
  }

  const estMinutes = Math.max(8, Math.round((minDistStation / 38.0) * 60.0));

  let nearestWater = WATER_SOURCES[0];
  let minDistWater = haversineDistance(lat, lng, nearestWater.lat, nearestWater.lng);

  for (let i = 1; i < WATER_SOURCES.length; i++) {
    const d = haversineDistance(lat, lng, WATER_SOURCES[i].lat, WATER_SOURCES[i].lng);
    if (d < minDistWater) {
      minDistWater = d;
      nearestWater = WATER_SOURCES[i];
    }
  }

  return {
    nearestStation: {
      name: nearestStation.name,
      distanceKm: Number(minDistStation.toFixed(1)),
      estimatedMinutes: estMinutes,
      city: nearestStation.city,
    },
    nearestWater: {
      name: nearestWater.name,
      distanceKm: Number(minDistWater.toFixed(1)),
    },
  };
}
