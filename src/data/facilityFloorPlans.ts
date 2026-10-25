/**
 * Structural Floor Plans and Facility Infrastructure for Manaus Industrial District (PIM).
 * Encapsulates structural layout, sectors, geolocated fire safety equipment,
 * real-time thermal variations, smoke concentrations, and flame propagation vectors.
 */

export interface FloorPlanSector {
  id: string;
  name: string;
  code: string; // e.g. "SET-A"
  description: string;
  x: number; // SVG Grid Units (0-1000)
  y: number;
  width: number;
  height: number;
  type: 'production' | 'warehouse' | 'server_room' | 'dock' | 'chemical' | 'office';
  baselineTempC: number;
  currentTempC: number;
  smokePpm: number;
  isHotspot: boolean;
  evacuationStatus: 'clear' | 'warning' | 'evacuate';
}

export interface SafetyEquipment {
  id: string;
  type: 'extinguisher_pqs' | 'extinguisher_co2' | 'extinguisher_water' | 'hydrant' | 'emergency_exit' | 'fire_door';
  label: string;
  x: number; // SVG Grid Units (0-1000)
  y: number;
  sectorId: string;
  status: 'operational' | 'in_use' | 'blocked';
  specification: string;
}

export interface FlamePropagation {
  velocityMs: number; // Speed in meters per second (e.g. 1.6 m/s)
  angleDeg: number; // 0 = North, 90 = East, 180 = South, 270 = West
  directionText: string; // e.g. "Norte-Nordeste rumo ao Setor B (Montagem de Telas)"
  riskPathway: string; // e.g. "Dutos de exaustão central e cabeamento em bandeja aérea"
  containmentEtaMin: number;
}

export interface ThermalIncident {
  id: string;
  sectorId: string;
  sectorName: string;
  focalPoint: { x: number; y: number }; // SVG Grid Coordinates (0-1000)
  peakTempC: number;
  ambientTempC: number;
  deltaTempC: number;
  smokeConcentrationPpm: number;
  smokePM25: number; // in µg/m³
  propagation: FlamePropagation;
  criticality: 'ALTA' | 'CRÍTICA' | 'EMERGÊNCIA GERAL';
  firstDetectedAt: string;
  recommendedExtinguisher: string;
}

export interface Facility {
  id: string;
  name: string;
  shortName: string;
  category: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  coordinates: { lat: number; lng: number };
  bounds: [[number, number], [number, number]]; // Leaflet LatLngBoundsExpression
  polygon: [number, number][]; // Geofence polygon vertices
  areaKm2: number;
  totalAreaM2: number;
  buildingFloors: number;
  structuralPlanUrl?: string;
  sectors: FloorPlanSector[];
  equipment: SafetyEquipment[];
  activeIncident: ThermalIncident | null;
  sensorCount: number;
  cameraCount: number;
}

export const INDUSTRIAL_FACILITIES: Facility[] = [
  {
    id: 'samsung-manaus',
    name: 'Samsung Eletrônica da Amazônia - Complexo Fabril',
    shortName: 'Samsung Eletrônica (Complexo)',
    category: 'Manufatura de Smartphones e Televisores',
    address: 'Av. dos Oitis, 1460 - Distrito Industrial I',
    neighborhood: 'Distrito Industrial',
    city: 'Manaus',
    state: 'AM',
    coordinates: { lat: -3.09918, lng: -59.94411 },
    bounds: [
      [-3.09750, -59.94600],
      [-3.10080, -59.94220],
    ],
    polygon: [
      [-3.09750, -59.94600],
      [-3.09750, -59.94220],
      [-3.10080, -59.94220],
      [-3.10080, -59.94600],
    ],
    areaKm2: 0.058,
    totalAreaM2: 58000,
    buildingFloors: 2,
    sensorCount: 88,
    cameraCount: 24,
    sectors: [
      {
        id: 'sec-sam-1',
        name: 'Sala Limpa ISO 7 & Linhas SMD',
        code: 'SET-01 (Cleanroom)',
        description: 'Microeletrônica, soldagem de chipsets e placas de alta densidade',
        x: 60,
        y: 80,
        width: 430,
        height: 380,
        type: 'production',
        baselineTempC: 22.0,
        currentTempC: 24.2,
        smokePpm: 25,
        isHotspot: false,
        evacuationStatus: 'clear',
      },
      {
        id: 'sec-sam-2',
        name: 'Bancadas de Burn-in Test & Carga de Baterias',
        code: 'SET-02 (Burn-in)',
        description: 'Ciclos de estresse elétrico e câmaras de aquecimento controlado de baterias',
        x: 530,
        y: 80,
        width: 410,
        height: 380,
        type: 'production',
        baselineTempC: 25.0,
        currentTempC: 142.3, // Hotspot
        smokePpm: 310,
        isHotspot: true,
        evacuationStatus: 'evacuate',
      },
      {
        id: 'sec-sam-3',
        name: 'Depósito de Polímeros & Resinas Inflamáveis',
        code: 'SET-03 (Químico)',
        description: 'Matéria-prima de carcaças, álcool isopropílico e solventes',
        x: 60,
        y: 520,
        width: 430,
        height: 380,
        type: 'chemical',
        baselineTempC: 21.5,
        currentTempC: 44.0, // Risk zone
        smokePpm: 120,
        isHotspot: false,
        evacuationStatus: 'warning',
      },
      {
        id: 'sec-sam-4',
        name: 'Centro Logístico Automatizado & Docas A/B',
        code: 'SET-04 (Logística)',
        description: 'Triagem robótica AGV e empacotamento para distribuição aérea',
        x: 530,
        y: 520,
        width: 410,
        height: 380,
        type: 'dock',
        baselineTempC: 26.5,
        currentTempC: 27.5,
        smokePpm: 30,
        isHotspot: false,
        evacuationStatus: 'clear',
      },
    ],
    equipment: [
      { id: 'eq-sam-1', type: 'extinguisher_co2', label: 'EXT-01 (CO₂ 5kg)', x: 100, y: 120, sectorId: 'sec-sam-1', status: 'operational', specification: 'Classe B:C' },
      { id: 'eq-sam-2', type: 'extinguisher_co2', label: 'EXT-02 (CO₂ 5kg)', x: 570, y: 120, sectorId: 'sec-sam-2', status: 'operational', specification: 'Classe B:C - Apropriado para ensaios térmicos' },
      { id: 'eq-sam-3', type: 'extinguisher_pqs', label: 'EXT-03 (PQS ABC 6kg)', x: 900, y: 120, sectorId: 'sec-sam-2', status: 'operational', specification: 'Classe A:B:C' },
      { id: 'eq-sam-4', type: 'hydrant', label: 'HID-01 (Coluna Predial)', x: 540, y: 440, sectorId: 'sec-sam-2', status: 'operational', specification: 'Pressão 6.5 bar' },
      { id: 'eq-sam-5', type: 'emergency_exit', label: 'SAÍDA DE EMERGÊNCIA LESTE', x: 940, y: 270, sectorId: 'sec-sam-2', status: 'operational', specification: 'Rota primária de evacuação' },
      { id: 'eq-sam-6', type: 'fire_door', label: 'PORTA CORTA-FOGO SETOR 3', x: 490, y: 650, sectorId: 'sec-sam-3', status: 'operational', specification: 'Fechamento hermético P120' },
    ],
    activeIncident: {
      id: 'inc-sam-2026-02',
      sectorId: 'sec-sam-2',
      sectorName: 'Setor 02 - Bancada de Burn-in Test (Linha Galaxy)',
      focalPoint: { x: 720, y: 240 },
      peakTempC: 142.3,
      ambientTempC: 25.0,
      deltaTempC: 117.3,
      smokeConcentrationPpm: 310,
      smokePM25: 245.0,
      propagation: {
        velocityMs: 1.2,
        angleDeg: 195,
        directionText: 'Sul em direção ao Depósito de Polímeros (Setor 03)',
        riskPathway: 'Canaletas subterrâneas de cabos de força e ar condicionado',
        containmentEtaMin: 5.5,
      },
      criticality: 'ALTA',
      firstDetectedAt: '14:21:05 (há 2 min)',
      recommendedExtinguisher: 'Extintores CO₂ (EXT-02) e PQS (EXT-03). Acionar brigada interna imediatamente.',
    },
  },
];
