import L from 'leaflet';

export interface DelimitedArea {
  northEast: L.LatLng;
  southWest: L.LatLng;
  center: L.LatLng;
  areaSqKm: number;
  areaHa: number;
  areaM2: number;
}

export type FireSpotStatus = 'PENDENTE' | 'ACIONADO_SIMULACAO' | 'EQUIPE_DESIGNADA' | 'COMBATE_ATIVO';

export interface FireSpot {
  id: string;
  latitude: number;
  longitude: number;
  biome: string;
  state: string;
  municipality: string;
  address: string;
  satellite: string;
  frp_mw: number;
  bright_ti4_k: number;
  confidence: number;
  detected_at: string;
  detected_iso: string;
  has_video: boolean;
  is_arson_cluster: boolean;
  is_recurrent: boolean;
  video_url?: string;
  hover_thumbnail?: string;
  is_new_outbreak?: boolean; // Foco detectado há menos de 180 min
  status?: FireSpotStatus;
  dispatched_at?: string;
  minutes_ago?: number;
  aqi?: number;
  pm25?: number;
  air_quality_level?: string;
}

export interface OSINTAlert {
  id: number;
  source: string;
  author?: string;
  original_url: string;
  text: string;
  latitude: number;
  longitude: number;
  confidence: number;
  keywords_matched?: string;
  created_at: string;
}

export interface VideoDetectionStatus {
  camera_id: string;
  timestamp: string;
  fps: number;
  fire_detected: boolean;
  confidence: number;
  expansion_rate: number;
  has_snapshot: boolean;
  snapshot_base64?: string;
}

export interface WindowState {
  id: string;
  title: string;
  url?: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  defaultPosition: { x: number; y: number };
  defaultSize: { width: number; height: number };
}

export type TemporalMode = '24h' | 'month' | 'historical' | 'recent_3h';

export type MapLayerType = 'satellite' | 'google_earth' | 'streets' | 'dark' | 'topo';

export interface ActiveOverlaysState {
  nasaFirms: boolean;
  googleEarth3d: boolean;
  inpeBdqueimadas: boolean;
  goes16?: boolean;
  smokePlume: boolean;
  thermalMask: boolean;
  heatmap?: boolean;
  airQuality?: boolean;
}

export interface MapLayerOverlay {
  id: string;
  url: string;
  maxZoom?: number;
  maxNativeZoom?: number;
}

export interface MapLayerConfig {
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
  maxNativeZoom: number;
  overlays?: MapLayerOverlay[];
}

export const MAP_LAYERS: Record<MapLayerType, MapLayerConfig> = {
  satellite: {
    name: 'Satélite Híbrido',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, CNES/Airbus DS',
    maxZoom: 19,
    maxNativeZoom: 17,
    overlays: [
      {
        id: 'boundaries-places',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
        maxNativeZoom: 17,
      },
      {
        id: 'transportation',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
        maxNativeZoom: 17,
      },
    ],
  },
  google_earth: {
    name: 'Google Earth 3D',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Earth 3D / Maxar Technologies &mdash; Topografia & Imagens de Satélite',
    maxZoom: 20,
    maxNativeZoom: 18,
  },
  streets: {
    name: 'Ruas Claras',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ',
    maxZoom: 19,
    maxNativeZoom: 17,
  },
  dark: {
    name: 'Tático Noturno',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 19,
    maxNativeZoom: 16,
    overlays: [
      {
        id: 'dark-ref',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
        maxNativeZoom: 16,
      },
    ],
  },
  topo: {
    name: 'Relevo & Topografia',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
    maxZoom: 19,
    maxNativeZoom: 16,
  },
};

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}
