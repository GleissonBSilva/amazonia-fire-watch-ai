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
    id: 'lg-eletronics-manaus',
    name: 'LG Electronics do Brasil - Planta Industrial Manaus',
    shortName: 'LG Electronics (Galpão 01)',
    category: 'Indústria Eletroeletrônica & Componentes',
    address: 'Av. Buriti, 5005 - Distrito Industrial I',
    neighborhood: 'Distrito Industrial',
    city: 'Manaus',
    state: 'AM',
    coordinates: { lat: -3.10250, lng: -59.94500 },
    bounds: [
      [-3.10080, -59.94720],
      [-3.10420, -59.94280],
    ],
    polygon: [
      [-3.10080, -59.94720],
      [-3.10080, -59.94280],
      [-3.10420, -59.94280],
      [-3.10420, -59.94720],
    ],
    areaKm2: 0.042,
    totalAreaM2: 42000,
    buildingFloors: 1,
    sensorCount: 64,
    cameraCount: 16,
    sectors: [
      {
        id: 'sec-a',
        name: 'Linha SMT & Fornos de Refusão (SMD)',
        code: 'SET-A (SMT)',
        description: 'Soldagem de placas-mãe, fornos convectivos e pasta de solda',
        x: 60,
        y: 80,
        width: 410,
        height: 380,
        type: 'production',
        baselineTempC: 24.5,
        currentTempC: 184.6, // Critical Hotspot
        smokePpm: 485,
        isHotspot: true,
        evacuationStatus: 'evacuate',
      },
      {
        id: 'sec-b',
        name: 'Montagem Final & Calibração de Telas',
        code: 'SET-B (Telas)',
        description: 'Esteiras rolantes de integração de painéis OLED/LED e teste de imagem',
        x: 520,
        y: 80,
        width: 420,
        height: 380,
        type: 'production',
        baselineTempC: 23.8,
        currentTempC: 62.4, // Threatened by heat dissipation
        smokePpm: 210,
        isHotspot: false,
        evacuationStatus: 'warning',
      },
      {
        id: 'sec-c',
        name: 'Almoxarifado de Baterias e Insumos Químicos',
        code: 'SET-C (Químico)',
        description: 'Armazenamento de células de íon-lítio, solventes e resinas de fluxo',
        x: 60,
        y: 520,
        width: 280,
        height: 380,
        type: 'chemical',
        baselineTempC: 22.0,
        currentTempC: 38.5,
        smokePpm: 95,
        isHotspot: false,
        evacuationStatus: 'warning',
      },
      {
        id: 'sec-d',
        name: 'Docas de Expedição & Hub Logístico',
        code: 'SET-D (Logística)',
        description: 'Portões de carga/descarga, empilhadeiras e pallets de saída',
        x: 390,
        y: 520,
        width: 320,
        height: 380,
        type: 'dock',
        baselineTempC: 27.0,
        currentTempC: 28.2,
        smokePpm: 45,
        isHotspot: false,
        evacuationStatus: 'clear',
      },
      {
        id: 'sec-e',
        name: 'Data Center & Subestação de Energia',
        code: 'SET-E (Subestação)',
        description: 'Nobreaks de 500kVA, transformadores e racks de servidores de controle',
        x: 760,
        y: 520,
        width: 180,
        height: 380,
        type: 'server_room',
        baselineTempC: 20.5,
        currentTempC: 22.1,
        smokePpm: 18,
        isHotspot: false,
        evacuationStatus: 'clear',
      },
    ],
    equipment: [
      // Extintores Setor A
      { id: 'eq-1', type: 'extinguisher_co2', label: 'EXT-01 (CO₂ 5kg)', x: 120, y: 120, sectorId: 'sec-a', status: 'operational', specification: 'Classe B:C - Gás Dióxido de Carbono para eletrônica sensível' },
      { id: 'eq-2', type: 'extinguisher_pqs', label: 'EXT-02 (PQS ABC 6kg)', x: 420, y: 120, sectorId: 'sec-a', status: 'operational', specification: 'Classe A:B:C - Monofosfato de Amônia' },
      { id: 'eq-3', type: 'hydrant', label: 'HID-01 (Carretel 30m)', x: 70, y: 410, sectorId: 'sec-a', status: 'operational', specification: 'Vazão 300 LPM - Conexão Storz 1.5"' },
      { id: 'eq-4', type: 'emergency_exit', label: 'SAÍDA EMERGÊNCIA NORTE', x: 260, y: 80, sectorId: 'sec-a', status: 'operational', specification: 'Barra antipânico com rota para o pátio norte' },

      // Extintores Setor B
      { id: 'eq-5', type: 'extinguisher_pqs', label: 'EXT-03 (PQS 6kg)', x: 560, y: 120, sectorId: 'sec-b', status: 'operational', specification: 'Classe A:B:C' },
      { id: 'eq-6', type: 'extinguisher_water', label: 'EXT-04 (Água Press. 10L)', x: 890, y: 120, sectorId: 'sec-b', status: 'operational', specification: 'Classe A - Materiais sólidos' },
      { id: 'eq-7', type: 'hydrant', label: 'HID-02 (Carretel 30m)', x: 930, y: 410, sectorId: 'sec-b', status: 'operational', specification: 'Vazão 300 LPM' },
      { id: 'eq-8', type: 'emergency_exit', label: 'SAÍDA EMERGÊNCIA LESTE', x: 940, y: 260, sectorId: 'sec-b', status: 'operational', specification: 'Acesso direto à via de escape de ambulâncias' },

      // Extintores Setor C (Químico)
      { id: 'eq-9', type: 'extinguisher_pqs', label: 'EXT-05 (PQS 12kg Especial)', x: 100, y: 560, sectorId: 'sec-c', status: 'operational', specification: 'Pó químico especial para combate a solventes e baterias' },
      { id: 'eq-10', type: 'extinguisher_co2', label: 'EXT-06 (CO₂ 10kg)', x: 300, y: 560, sectorId: 'sec-c', status: 'operational', specification: 'Classe B:C' },
      { id: 'eq-11', type: 'hydrant', label: 'HID-03 (Hidrante Espuma AFFF)', x: 70, y: 860, sectorId: 'sec-c', status: 'operational', specification: 'Proporcionador de Líquido Gerador de Espuma (LGE)' },
      { id: 'eq-12', type: 'fire_door', label: 'PORTA CORTA-FOGO P90', x: 340, y: 700, sectorId: 'sec-c', status: 'operational', specification: 'Resistência térmica 90 minutos com fechamento magnético automático' },

      // Docas e Data Center
      { id: 'eq-13', type: 'extinguisher_pqs', label: 'EXT-07 (PQS 6kg)', x: 540, y: 560, sectorId: 'sec-d', status: 'operational', specification: 'Classe A:B:C' },
      { id: 'eq-14', type: 'emergency_exit', label: 'PORTÃO DOCAS SUL', x: 550, y: 900, sectorId: 'sec-d', status: 'operational', specification: 'Abertura total para escoamento rápido' },
      { id: 'eq-15', type: 'extinguisher_co2', label: 'EXT-08 (CO₂ FM-200)', x: 840, y: 560, sectorId: 'sec-e', status: 'operational', specification: 'Inundação total de gás limpo não condutivo' },
      { id: 'eq-16', type: 'fire_door', label: 'PORTA BLINDADA CORTA-FOGO', x: 760, y: 700, sectorId: 'sec-e', status: 'operational', specification: 'Isolamento estanque com vedação pneumática' },
    ],
    activeIncident: {
      id: 'inc-lg-2026-01',
      sectorId: 'sec-a',
      sectorName: 'Setor A - Linha SMT (Forno Convectivo 03)',
      focalPoint: { x: 235, y: 220 },
      peakTempC: 184.6,
      ambientTempC: 24.5,
      deltaTempC: 160.1,
      smokeConcentrationPpm: 485,
      smokePM25: 382.0, // Insalubre Severo
      propagation: {
        velocityMs: 1.6,
        angleDeg: 68,
        directionText: 'Nordeste rumo ao Setor B (Esteiras de Montagem de Telas)',
        riskPathway: 'Dutos de exaustão de solda e canaletas de fiação elétrica suspensa',
        containmentEtaMin: 4.2,
      },
      criticality: 'CRÍTICA',
      firstDetectedAt: '14:18:22 (há 5 min)',
      recommendedExtinguisher: 'CO₂ (EXT-01) ou Gás Limpo FM-200 (Evitar água pressurizada direta na linha SMT ligada)',
    },
  },
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
