import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, WMSTileLayer, Circle, Marker, Popup, Polygon, Rectangle, useMap } from 'react-leaflet';
import { INDUSTRIAL_FACILITIES, Facility } from '../data/facilityFloorPlans';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { Crosshair, ExternalLink, Wind, Thermometer } from 'lucide-react';
import {
  DelimitedArea,
  OSINTAlert,
  FireSpot,
  TemporalMode,
  MapLayerType,
  MAP_LAYERS,
  ActiveOverlaysState,
} from '../types';

interface MainMapProps {
  onAreaSelected: (data: DelimitedArea) => void;
  fireSpots: FireSpot[];
  heatmapSpots: any[];
  osintAlerts: OSINTAlert[];
  onOsintClick: (alert: OSINTAlert) => void;
  onHoverSpot: (spot: FireSpot, pos: { x: number; y: number }) => void;
  onLeaveSpot: () => void;
  onSpotClick: (spot: FireSpot) => void;
  temporalMode: TemporalMode;
  currentLayer?: MapLayerType;
  activeOverlays?: ActiveOverlaysState;
  showHeatmapOverlay?: boolean;
  externalTargetView?: { center: [number, number]; zoom: number; trigger?: number } | null;
  searchMarker?: { lat: number; lng: number; label: string; address?: string } | null;
  onOpenStreetView?: (location: { lat: number; lng: number; label: string; address?: string }) => void;
  activeGeofence?: {
    id: string;
    name: string;
    bounds?: [[number, number], [number, number]];
    polygon?: [number, number][];
    areaKm2: number;
    facilityId?: string;
  } | null;
  onClearGeofence?: () => void;
  onOpenFloorPlan?: (facilityId?: string) => void;
  onActivateGeofence?: (facility: Facility) => void;
  onTriggerAutoEmergency?: (facility: Facility) => void;
  isSimulation?: boolean;
}

// Quick Viewports for Brazilian Biomes
const BRAZIL_VIEWPORTS = {
  brasil: { center: [-14.235, -51.925] as [number, number], zoom: 4 },
  amazonia: { center: [-4.2, -63.0] as [number, number], zoom: 6 },
  manaus: { center: [-3.089, -60.021] as [number, number], zoom: 12 },
  distritoIndustrial: { center: [-3.1015, -59.9445] as [number, number], zoom: 16 },
  pantanal: { center: [-17.5, -56.8] as [number, number], zoom: 7 },
  cerrado: { center: [-12.5, -46.5] as [number, number], zoom: 6 },
};

// Map Fly-To Helper Component
const MapViewNavigator: React.FC<{
  targetView: { center: [number, number]; zoom: number; trigger?: number } | null;
}> = ({ targetView }) => {
  const map = useMap();
  useEffect(() => {
    if (targetView) {
      map.flyTo(targetView.center, targetView.zoom, { duration: 1.5, animate: true });
    }
  }, [targetView, map]);
  return null;
};

// Native Leaflet Draw Control (Zero react-leaflet-draw & Zero 403)
const LeafletDrawControl: React.FC<{ onAreaSelected: (data: DelimitedArea) => void }> = ({
  onAreaSelected,
}) => {
  const map = useMap();
  const drawnItemsRef = useRef<L.FeatureGroup>(new L.FeatureGroup());

  useEffect(() => {
    const drawnItems = drawnItemsRef.current;
    map.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        rectangle: {
          shapeOptions: {
            color: '#ef4444',
            fillOpacity: 0.2,
            weight: 2,
          },
        },
        polygon: {
          shapeOptions: {
            color: '#f97316',
            fillOpacity: 0.25,
            weight: 2,
          },
        },
        circle: false,
        circlemarker: false,
        polyline: false,
        marker: false,
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
    });

    map.addControl(drawControl);

    const handleCreated = (e: any) => {
      const layer = e.layer;
      drawnItems.clearLayers();
      drawnItems.addLayer(layer);

      if (layer instanceof L.Rectangle || layer instanceof L.Polygon) {
        const bounds = layer.getBounds();
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const center = bounds.getCenter();

        const latDiff = Math.abs(ne.lat - sw.lat) * 111;
        const lngDiff = Math.abs(ne.lng - sw.lng) * 111 * Math.cos((sw.lat * Math.PI) / 180);
        const areaSqKm = parseFloat((latDiff * lngDiff).toFixed(2));
        const areaHa = parseFloat((areaSqKm * 100).toFixed(1));
        const areaM2 = Math.round(areaSqKm * 1000000);

        onAreaSelected({
          northEast: ne,
          southWest: sw,
          center,
          areaSqKm,
          areaHa,
          areaM2,
        });
      }
    };

    map.on(L.Draw.Event.CREATED, handleCreated);

    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.removeControl(drawControl);
      map.removeLayer(drawnItems);
    };
  }, [map, onAreaSelected]);

  return null;
};

// Static WMS Configuration Objects to prevent Leaflet layer.setParams / redraw flicker
// Data recente válida para garantir retorno 100% de raster no NASA GIBS WMS
const getGibsDate = () => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 2); // 2 dias atrás garante mosaico completo gerado pela NASA
  return d.toISOString().split('T')[0];
};

const GIBS_DATE = getGibsDate();

const STATIC_WMS_CONFIG = {
  goes16: {
    layers: 'GOES-East_ABI_GeoColor',
    format: 'image/png',
    transparent: true,
    version: '1.1.1',
  },
  smokePlume: {
    layers: 'MODIS_Terra_Aerosol',
    format: 'image/png',
    transparent: true,
    version: '1.3.0',
    time: GIBS_DATE,
  },
  thermalMask: {
    layers: 'MODIS_Terra_Land_Surface_Temp_Day',
    format: 'image/png',
    transparent: true,
    version: '1.3.0',
    time: GIBS_DATE,
  },
  nasaFirms: {
    layers: 'VIIRS_SNPP_Thermal_Anomalies_375m_All',
    format: 'image/png',
    transparent: true,
    version: '1.3.0',
    time: GIBS_DATE,
  },
  inpeBdqueimadas: {
    layers: 'bdqueimadas:focos_24h',
    format: 'image/png',
    transparent: true,
    version: '1.3.0',
  },
};

export const MainMap: React.FC<MainMapProps> = React.memo(({
  onAreaSelected,
  fireSpots,
  heatmapSpots,
  osintAlerts,
  onOsintClick,
  onHoverSpot,
  onLeaveSpot,
  onSpotClick,
  temporalMode,
  currentLayer = 'satellite',
  activeOverlays,
  showHeatmapOverlay = false,
  externalTargetView = null,
  searchMarker = null,
  onOpenStreetView,
  activeGeofence = null,
  onClearGeofence,
  onOpenFloorPlan,
  onActivateGeofence,
  onTriggerAutoEmergency,
  isSimulation = true,
}) => {
  const [currentView, setCurrentView] = React.useState<{
    center: [number, number];
    zoom: number;
    trigger?: number;
  } | null>(null);

  // Consolidated Overlays State
  const overlays: ActiveOverlaysState = activeOverlays || {
    nasaFirms: false,
    googleEarth3d: false,
    inpeBdqueimadas: false,
    smokePlume: false,
    thermalMask: false,
    heatmap: showHeatmapOverlay || false,
  };

  // ========================================================
  // MARCADOR TÁTICO MILITAR SVG (RETÍCULO C2 + RADAR PING RIPPLE)
  // Sem cliparts ou emojis infantis de fogo
  // ========================================================
  const getTacticalRadarIcon = (spot: FireSpot) => {
    let color = '#ffb703'; // Anomalia Moderada (< 25 MW)
    let tag = 'MOD';

    const isNew = spot.is_new_outbreak;
    const isDispatched = spot.status === 'ACIONADO_SIMULACAO';

    if (spot.is_arson_cluster) {
      color = '#b5179e'; // Suspeita de Ação Criminosa / Reincidência
      tag = 'ARSON';
    } else if (spot.frp_mw >= 50) {
      color = '#ff1e27'; // Severidade Crítica (FRP > 50 MW)
      tag = 'CRIT';
    } else if (spot.frp_mw >= 25) {
      color = '#ff6b00'; // Alerta Alto (25 - 50 MW)
      tag = 'HIGH';
    }

    if (isNew) {
      tag = 'NOVO <3H';
    }
    if (isDispatched) {
      tag = 'ACIONADO';
    }

    const hasVideo = spot.has_video;

    return L.divIcon({
      className: 'custom-tactical-radar-marker',
      html: `
        <div class="relative flex items-center justify-center -top-5 -left-5 w-10 h-10 select-none pointer-events-auto">
          <!-- Anel Tático Sonar de Alerta para Novos Surgimentos (< 180 min) -->
          ${
            isNew
              ? `<span class="absolute inline-flex h-12 w-12 rounded-full border-2 border-yellow-300 opacity-90 animate-ping"></span>`
              : `<span class="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style="background-color: ${color};"></span>`
          }
          <span class="absolute inline-flex h-7 w-7 rounded-full opacity-35" style="border: 1px dashed ${isNew ? '#facc15' : color};"></span>

          <!-- Retículo Concêntrico Militar SVG -->
          <svg class="relative w-8 h-8 drop-shadow-[0_0_8px_${color}]" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Anel Externo Graduado -->
            <circle cx="16" cy="16" r="13" stroke="${color}" stroke-width="1.2" stroke-dasharray="2 1.5" opacity="0.85" />
            <!-- Cantos de Enquadramento Militar [ ] -->
            <path d="M7 11V7H11" stroke="${color}" stroke-width="1.5" stroke-linecap="round" />
            <path d="M25 11V7H21" stroke="${color}" stroke-width="1.5" stroke-linecap="round" />
            <path d="M7 21V25H11" stroke="${color}" stroke-width="1.5" stroke-linecap="round" />
            <path d="M25 21V25H21" stroke="${color}" stroke-width="1.5" stroke-linecap="round" />
            <!-- Mira Central e Núcleo Térmico -->
            <line x1="16" y1="5" x2="16" y2="9" stroke="${color}" stroke-width="1.2" />
            <line x1="16" y1="23" x2="16" y2="27" stroke="${color}" stroke-width="1.2" />
            <line x1="5" y1="16" x2="9" y2="16" stroke="${color}" stroke-width="1.2" />
            <line x1="23" y1="16" x2="27" y2="16" stroke="${color}" stroke-width="1.2" />
            <circle cx="16" cy="16" r="3.2" fill="${color}" stroke="#050b14" stroke-width="1" />
          </svg>

          <!-- Tag Visual de Alerta Tático (FRP / Novo Surgimento / Acionado) -->
          <div class="absolute -bottom-3 bg-slate-950/95 text-[8px] font-mono px-1 py-0.2 rounded border ${
            isNew
              ? 'border-yellow-400 text-yellow-300 font-bold shadow-[0_0_8px_rgba(250,204,21,0.5)]'
              : isDispatched
              ? 'border-emerald-500 text-emerald-300 font-bold'
              : 'border-slate-700 text-slate-200'
          } tracking-tighter whitespace-nowrap shadow-xl">
            ${isNew ? 'NOVO // RISCO IMEDIATO' : hasVideo ? 'FLIR' : tag} ${Math.round(spot.frp_mw)}M
          </div>
        </div>
      `,
      iconSize: [40, 40],
    });
  };

  // Marcador Tático OSINT (Radar Ciano de Fontes Abertas)
  const osintIcon = L.divIcon({
    className: 'custom-tactical-osint-marker',
    html: `
      <div class="relative flex items-center justify-center -top-4 -left-4 w-8 h-8 select-none">
        <span class="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-50 animate-ping"></span>
        <svg class="relative w-6 h-6 text-cyan-400 drop-shadow-[0_0_6px_#00f0ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9" stroke-dasharray="2 2" />
          <circle cx="12" cy="12" r="3" fill="#00f0ff" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
        </svg>
      </div>
    `,
    iconSize: [32, 32],
  });

  // Custom Icon for Industrial Facilities (LG / Samsung Floor Plans)
  const industrialFacilityIcon = L.divIcon({
    className: 'custom-facility-marker',
    html: `
      <div class="relative flex items-center justify-center -top-4 -left-4 w-9 h-9 cursor-pointer group">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60"></span>
        <div class="relative w-8 h-8 rounded-lg bg-slate-950/95 border-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)] flex items-center justify-center text-cyan-300 font-bold text-xs group-hover:scale-110 transition-transform">
          🏢
        </div>
      </div>
    `,
    iconSize: [36, 36],
  });

  const activeLayerConfig = MAP_LAYERS[currentLayer] || MAP_LAYERS.satellite;

  return (
    <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-slate-950">
      <MapContainer
        center={[-14.235, -51.925]} // Centro Geográfico do Brasil
        zoom={5}
        maxZoom={22}
        scrollWheelZoom={true}
        zoomControl={false}
        className="w-full h-full"
      >
        <MapViewNavigator targetView={externalTargetView || currentView} />

        {/* ========================================================
            1. CAMADA BASE DINÂMICA (Exclusiva, sem reload do mapa)
            ======================================================== */}
        <TileLayer
          key={`base-${currentLayer}`}
          url={activeLayerConfig.url}
          attribution={activeLayerConfig.attribution}
          maxZoom={activeLayerConfig.maxZoom || 22}
          maxNativeZoom={activeLayerConfig.maxNativeZoom || 20}
        />

        {/* Camadas Transparentes de Referência da Base (Bairros, Ruas e Rodovias) */}
        {activeLayerConfig.overlays &&
          activeLayerConfig.overlays.map((ov) => (
            <TileLayer
              key={`overlay-${currentLayer}-${ov.id}`}
              url={ov.url}
              maxZoom={activeLayerConfig.maxZoom || 22}
              maxNativeZoom={ov.maxNativeZoom || 16}
              zIndex={2}
            />
          ))}

        {/* ========================================================
            2. OVERLAYS SOBREPOSTOS REATIVOS (Sem desmontar o mapa)
            ======================================================== */}

        {/* OVERLAY: Google Earth 3D (Textura de Relevo Sombreado 3D Oficial Google) */}
        {overlays.googleEarth3d && (
          <TileLayer
            key="overlay-google-earth-3d"
            url="https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}"
            attribution="&copy; Google Earth 3D &mdash; Topografia e Terreno Sombreado"
            maxZoom={20}
            maxNativeZoom={18}
            opacity={0.70}
            zIndex={6}
          />
        )}

        {/* OVERLAY: Satélite Meteorológico GOES-16 (Fumaça & Nuvens ao Vivo via NOAA / NASA GIBS WMS) */}
        {overlays.goes16 && (
          <WMSTileLayer
            key="overlay-goes16-geocolor"
            url="https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi"
            params={STATIC_WMS_CONFIG.goes16}
            attribution="&copy; NOAA / NASA GIBS &mdash; GOES-East ABI GeoColor (Satélite Meteorológico & Fumaça)"
            opacity={0.65}
            className="goes16-weather-overlay mix-blend-screen"
            zIndex={7}
          />
        )}

        {/* OVERLAY: Pluma de Fumaça (Aerossol / Dispersão Atmosférica via NASA GIBS WMS) */}
        {overlays.smokePlume && (
          <WMSTileLayer
            key="overlay-smoke-plume-wms"
            url="https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi"
            params={STATIC_WMS_CONFIG.smokePlume}
            attribution="&copy; NASA GIBS &mdash; MODIS Aerosol Optical Depth (Smoke Plume)"
            opacity={0.78}
            zIndex={8}
          />
        )}

        {/* OVERLAY: Máscara Térmica (Land Surface Temp - LST Day via NASA GIBS WMS) */}
        {overlays.thermalMask && (
          <WMSTileLayer
            key="overlay-thermal-mask-wms"
            url="https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi"
            params={STATIC_WMS_CONFIG.thermalMask}
            attribution="&copy; NASA GIBS &mdash; MODIS Land Surface Temp Day"
            opacity={0.75}
            zIndex={9}
          />
        )}

        {/* OVERLAY: NASA FIRMS (Focos Térmicos VIIRS 375m via WMS Oficial) */}
        {overlays.nasaFirms && (
          <WMSTileLayer
            key="overlay-nasa-firms-wms"
            url="https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi"
            params={STATIC_WMS_CONFIG.nasaFirms}
            attribution="&copy; NASA FIRMS &mdash; VIIRS 375m Thermal Anomalies"
            opacity={0.88}
            zIndex={10}
          />
        )}

        {/* OVERLAY: INPE BDQueimadas (Anomalias Térmicas 24h via WMS Oficial) */}
        {overlays.inpeBdqueimadas && (
          <WMSTileLayer
            key="overlay-inpe-bdqueimadas-wms"
            url="https://terrabrasilis.dpi.inpe.br/geoserver/wms"
            params={STATIC_WMS_CONFIG.inpeBdqueimadas}
            attribution="&copy; INPE BDQueimadas &mdash; TerraBrasilis"
            opacity={0.88}
            zIndex={11}
          />
        )}

        {/* OVERLAY: Heatmap de Densidade Térmica */}
        {(overlays.heatmap || showHeatmapOverlay || temporalMode === 'month') &&
          heatmapSpots.map((spot, idx) => (
            <Circle
              key={`heat-overlay-${idx}`}
              center={[spot.latitude, spot.longitude]}
              radius={20000}
              pathOptions={{
                color: '#ff5500',
                fillColor: '#ff2200',
                fillOpacity: 0.22,
                weight: 0,
              }}
            />
          ))}

        {/* Marcador Tático de Pesquisa de Local */}
        {searchMarker && (
          <Marker
            position={[searchMarker.lat, searchMarker.lng]}
            icon={L.divIcon({
              className: 'custom-search-marker',
              html: `
                <div class="relative flex items-center justify-center -top-4 -left-4 w-9 h-9">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <div class="relative w-7 h-7 rounded-lg bg-cyan-950/90 border-2 border-cyan-400 shadow-[0_0_15px_#00f0ff] flex items-center justify-center text-cyan-300 font-mono font-bold text-xs">
                    ⊕
                  </div>
                </div>
              `,
              iconSize: [36, 36],
            })}
          >
            <Popup autoPan={false}>
              <div className="font-mono text-xs text-slate-100 max-w-xs bg-slate-950 p-2 rounded border border-cyan-500/70">
                <div className="font-bold text-cyan-400 mb-1 flex items-center gap-1">
                  <span>🎯 COORDENADA SELECIONADA:</span>
                </div>
                <div className="text-[11.5px] font-bold text-white leading-tight">{searchMarker.label}</div>
                {searchMarker.address && (
                  <div className="text-[10px] text-slate-300 mt-0.5 leading-tight">{searchMarker.address}</div>
                )}
                <div className="text-[9.5px] text-cyan-300 mt-1 font-mono">
                  LAT: {searchMarker.lat.toFixed(5)}° // LON: {searchMarker.lng.toFixed(5)}°
                </div>

                <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center gap-1.5">
                  {onOpenStreetView && (
                    <button
                      type="button"
                      onClick={() => onOpenStreetView({
                        lat: searchMarker.lat,
                        lng: searchMarker.lng,
                        label: searchMarker.label,
                        address: searchMarker.address
                      })}
                      className="flex-1 py-1 px-1.5 bg-sky-700 hover:bg-sky-600 text-white rounded font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <span>🚶‍♂️ Visão da Rua (Street View)</span>
                    </button>
                  )}
                  <a
                    href={`https://earth.google.com/web/@${searchMarker.lat},${searchMarker.lng},50a,500d,35y,0t,0r`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded font-bold text-[10px] flex items-center justify-center gap-1 transition"
                    title="Abrir no Google Earth 3D"
                  >
                    <span>🌐 3D</span>
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* ========================================================
            3. MARCADORES TÁTICOS C2 & POPUP DE COMANDO AEROESPACIAL
            ======================================================== */}
        {(temporalMode === '24h' || temporalMode === 'historical') &&
          fireSpots.map((spot) => (
            <Marker
              key={spot.id}
              position={[spot.latitude, spot.longitude]}
              icon={getTacticalRadarIcon(spot)}
              eventHandlers={{
                mouseover: (e) => {
                  const mapPoint = e.target._map.latLngToContainerPoint(e.latlng);
                  onHoverSpot(spot, { x: mapPoint.x, y: mapPoint.y });
                },
                mouseout: () => {
                  onLeaveSpot();
                },
                click: () => {
                  onSpotClick(spot);
                },
              }}
            >
              <Popup>
                {/* HUD Tático Aeroespacial no Popup Leaflet */}
                <div className="font-mono text-xs text-white max-w-[280px] bg-slate-950 p-2.5 rounded-lg border border-slate-700 shadow-2xl">
                  {/* Cabeçalho Cockpit */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        spot.is_arson_cluster
                          ? 'bg-purple-950 text-purple-300 border border-purple-500'
                          : 'bg-red-950 text-red-300 border border-red-500'
                      }`}
                    >
                      {spot.is_arson_cluster ? 'ARSON // CRIME' : 'CRITICAL // 01'}
                    </span>
                    <span className="text-[8.5px] text-emerald-400 font-bold">LIVE FEED // RAM</span>
                  </div>

                  {/* FLIR IR Miniatura Tática */}
                  <div
                    className="relative w-full h-24 rounded border border-slate-800 overflow-hidden mb-2 flex items-center justify-center"
                    style={{
                      background:
                        'radial-gradient(circle at 50% 50%, #ffffff 0%, #ffff55 15%, #ff5500 35%, #150022 80%, #030712 100%)',
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center opacity-60">
                      <div className="w-16 h-12 border border-dashed border-cyan-400"></div>
                      <div className="absolute w-4 h-4 border border-cyan-300 rounded-full"></div>
                    </div>
                    <div className="absolute top-1 left-1 text-[7.5px] text-cyan-300 bg-black/70 px-1 rounded">
                      LAT: {spot.latitude.toFixed(4)}°
                    </div>
                    <div className="absolute bottom-1 right-1 text-[7.5px] text-amber-300 bg-black/70 px-1 rounded font-bold">
                      FRP: {spot.frp_mw} MW
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-300 truncate mb-1">
                    {spot.address || `${spot.municipality} - ${spot.state}`}
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[9px] text-slate-400 mb-2">
                    <div>Sensor: <span className="text-white">{spot.satellite}</span></div>
                    <div>Confiança: <span className="text-emerald-400 font-bold">{(spot.confidence * 100).toFixed(0)}%</span></div>
                  </div>

                  <button
                    onClick={() => onSpotClick(spot)}
                    className="w-full py-1.5 bg-gradient-to-r from-cyan-950 via-slate-900 to-cyan-950 hover:from-cyan-900 hover:to-cyan-800 text-cyan-300 hover:text-white border border-cyan-600/70 rounded text-[9px] font-bold tracking-wider uppercase flex items-center justify-center gap-1 transition-all"
                  >
                    <Crosshair size={11} className="text-cyan-400" />
                    <span>EXPANDIR FEED // JANELA FLUTUANTE</span>
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Marcadores de Relatos OSINT (Redes Sociais / Cidadão) */}
        {osintAlerts.map((alert) => (
          <Marker
            key={`osint-${alert.id}`}
            position={[alert.latitude, alert.longitude]}
            icon={osintIcon}
            eventHandlers={{ click: () => onOsintClick(alert) }}
          >
            <Popup>
              <div className="font-mono text-xs text-slate-100 max-w-xs bg-slate-950 p-2.5 rounded-lg border border-cyan-800/80 shadow-2xl">
                <div className="font-bold text-cyan-400 mb-0.5 flex items-center gap-1">
                  <span>📡 FONTE OSINT:</span>
                  <span className="text-white">{alert.source}</span>
                </div>
                <div className="text-[11px] text-slate-300 mb-2">{alert.text}</div>
                <button
                  onClick={() => onOsintClick(alert)}
                  className="w-full py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-600 text-cyan-200 hover:text-white font-bold rounded text-[10px] flex items-center justify-center gap-1 transition-all"
                >
                  <ExternalLink size={11} />
                  <span>ABRIR RELATÓRIO OSINT ↗</span>
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        
        {/* ========================================================
            CERCA VIRTUAL / GEOFENCE ATIVA (POLÍGONO NEON ILUMINADO)
            ======================================================== */}
        {activeGeofence && activeGeofence.polygon && (
          <Polygon
            positions={activeGeofence.polygon}
            pathOptions={{
              color: '#06b6d4',
              fillColor: '#0891b2',
              fillOpacity: 0.16,
              weight: 3,
              dashArray: '8, 6',
            }}
          />
        )}

        {activeGeofence && !activeGeofence.polygon && activeGeofence.bounds && (
          <Rectangle
            bounds={activeGeofence.bounds}
            pathOptions={{
              color: '#06b6d4',
              fillColor: '#0891b2',
              fillOpacity: 0.16,
              weight: 3,
              dashArray: '8, 6',
            }}
          />
        )}

        {/* ========================================================
            INSTALAÇÕES INDUSTRIAIS COM PLANTA BAIXA
            (Informações simuladas só aparecem se Simulação estiver ativa)
            ======================================================== */}
        {INDUSTRIAL_FACILITIES.map((facility) => {
          const hasIncident = Boolean(isSimulation && facility.activeIncident);
          return (
            <Marker
              key={`facility-${facility.id}`}
              position={[facility.coordinates.lat, facility.coordinates.lng]}
              icon={industrialFacilityIcon}
            >
              <Popup>
                <div className="font-mono text-xs text-white max-w-[280px] bg-slate-950 p-2.5 rounded-lg border border-cyan-500/70 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1.5">
                    <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider">
                      PLANTA INDUSTRIAL • PIM
                    </span>
                    {hasIncident ? (
                      <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-red-950 text-red-300 border border-red-600/60 animate-pulse">
                        FOCO INTERNO (SIMULAÇÃO)
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/60">
                        OPERAÇÃO NOMINAL
                      </span>
                    )}
                  </div>

                  <div className="font-bold text-white text-[12px] leading-tight mb-1">
                    {facility.name}
                  </div>
                  <div className="text-[10px] text-slate-300 mb-2 leading-tight">
                    {facility.address} ({facility.totalAreaM2.toLocaleString('pt-BR')} m²)
                  </div>

                  {hasIncident && facility.activeIncident && (
                    <div className="bg-red-950/40 border border-red-800/40 rounded p-1.5 mb-2 text-[10px]">
                      <div className="text-red-300 font-bold flex items-center gap-1">
                        <span>🔥 {facility.activeIncident.sectorName}</span>
                      </div>
                      <div className="text-slate-300 mt-0.5">
                        Pico: <strong className="text-orange-300">{facility.activeIncident.peakTempC.toFixed(1)}°C</strong> | Fumaça: <strong className="text-amber-300">{facility.activeIncident.smokeConcentrationPpm} ppm</strong>
                      </div>
                    </div>
                  )}

                  {!hasIncident && (
                    <div className="bg-emerald-950/20 border border-emerald-800/30 rounded p-1.5 mb-2 text-[9.5px] text-emerald-300">
                      Instalação sob monitoramento IOT nominal. Zero focos térmicos detectados.
                    </div>
                  )}

                  <div className="space-y-1.5 pt-1 border-t border-slate-800">
                    {onOpenFloorPlan && (
                      <button
                        type="button"
                        onClick={() => onOpenFloorPlan(facility.id)}
                        className="w-full py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
                      >
                        <span>🏢 Abrir Planta Baixa &amp; Térmica</span>
                      </button>
                    )}

                    {onActivateGeofence && (
                      <button
                        type="button"
                        onClick={() => onActivateGeofence(facility)}
                        className="w-full py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-700/60 rounded font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
                      >
                        <span>🔒 Isolar Cerca Virtual Neste Galpão</span>
                      </button>
                    )}

                    {hasIncident && onTriggerAutoEmergency && (
                      <button
                        type="button"
                        onClick={() => onTriggerAutoEmergency(facility)}
                        className="w-full py-1 bg-red-950 hover:bg-red-900 text-red-300 border border-red-700/60 rounded font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer animate-pulse"
                      >
                        <span>🚨 Protocolo de Emergência (30s Simulado)</span>
                      </button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Leaflet Draw Component - Delimitação por Retângulo / Polígono */}
        <LeafletDrawControl onAreaSelected={onAreaSelected} />
      </MapContainer>

      {/* HUD: Legenda Dinâmica de Poluição do Ar (AQI & Aerossóis MODIS) */}
      {overlays.smokePlume && (
        <div className="absolute bottom-14 left-4 z-20 bg-slate-950/95 backdrop-blur-md border border-purple-500/70 rounded-xl p-2.5 shadow-2xl font-mono text-white text-xs max-w-xs animate-fade-in pointer-events-auto">
          <div className="flex items-center justify-between border-b border-purple-900/50 pb-1 mb-1.5">
            <span className="text-[10.5px] font-bold text-purple-300 flex items-center gap-1.5">
              <Wind size={13} className="text-purple-400" /> POLUIÇÃO DO AR (AQI / PM2.5)
            </span>
            <span className="text-[8px] bg-purple-950 text-purple-200 border border-purple-600 px-1 py-0.2 rounded font-bold">
              NASA GIBS
            </span>
          </div>
          <div className="text-[9.5px] text-slate-300 mb-2 leading-tight">
            Pluma de aerossóis ópticos (AOD) e dispersão de fuligem atmosférica (MODIS Terra).
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-slate-400">Escala de Severidade (CONAMA / EPA):</span>
              <span className="text-purple-300 font-bold">{GIBS_DATE}</span>
            </div>
            <div className="grid grid-cols-6 gap-0.5 h-2.5 rounded overflow-hidden">
              <div className="bg-[#10b981]" title="Boa (0-50)" />
              <div className="bg-[#eab308]" title="Moderada (51-100)" />
              <div className="bg-[#f97316]" title="Ruim (101-150)" />
              <div className="bg-[#ef4444]" title="Muito Ruim (151-200)" />
              <div className="bg-[#a855f7]" title="Péssima (201-300)" />
              <div className="bg-[#7e22ce]" title="Perigosa (>300)" />
            </div>
            <div className="flex justify-between text-[8px] text-slate-400 font-bold">
              <span className="text-emerald-400">0 (Boa)</span>
              <span className="text-yellow-400">50 (Alerta)</span>
              <span className="text-purple-400">300+ (Perigosa)</span>
            </div>
          </div>
        </div>
      )}

      {/* HUD: Legenda Dinâmica de Temperatura da Superfície (LST Day) */}
      {overlays.thermalMask && (
        <div className="absolute bottom-14 left-4 z-20 bg-slate-950/95 backdrop-blur-md border border-orange-500/70 rounded-xl p-2.5 shadow-2xl font-mono text-white text-xs max-w-xs animate-fade-in pointer-events-auto">
          <div className="flex items-center justify-between border-b border-orange-900/50 pb-1 mb-1.5">
            <span className="text-[10.5px] font-bold text-orange-300 flex items-center gap-1.5">
              <Thermometer size={13} className="text-orange-400" /> MÁSCARA TÉRMICA (LST DAY)
            </span>
            <span className="text-[8px] bg-orange-950 text-orange-200 border border-orange-600 px-1 py-0.2 rounded font-bold">
              MODIS 1KM
            </span>
          </div>
          <div className="text-[9.5px] text-slate-300 mb-2 leading-tight">
            Mapeamento da temperatura radiométrica da superfície terrestre diurna.
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-slate-400">Gradiente Radiométrico:</span>
              <span className="text-orange-300 font-bold">{GIBS_DATE}</span>
            </div>
            <div className="w-full h-2.5 rounded overflow-hidden bg-gradient-to-r from-blue-600 via-green-500 via-yellow-400 via-orange-500 to-red-600" />
            <div className="flex justify-between text-[8px] text-slate-400 font-bold">
              <span className="text-blue-400">&lt; 15°C (Água/Frio)</span>
              <span className="text-yellow-400">30°C</span>
              <span className="text-red-400">&gt; 50°C (Crítico)</span>
            </div>
          </div>
        </div>
      )}

      {/* Barra Flutuante de Atalhos Regionais */}
      <div className="absolute top-16 left-12 z-20 flex flex-wrap items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-1.5 shadow-2xl font-mono text-xs pointer-events-auto">
        <span className="text-[10px] text-slate-400 px-1 font-bold">REGIONAL:</span>
        <button
          onClick={() => setCurrentView(BRAZIL_VIEWPORTS.brasil)}
          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
        >
          🇧🇷 Brasil
        </button>
        <button
          onClick={() => setCurrentView(BRAZIL_VIEWPORTS.amazonia)}
          className="px-2 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 font-bold"
        >
          🌳 Amazônia
        </button>
        <button
          onClick={() => setCurrentView(BRAZIL_VIEWPORTS.manaus)}
          className="px-2 py-0.5 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 font-bold"
        >
          🏙️ Manaus
        </button>
        <button
          onClick={() => setCurrentView(BRAZIL_VIEWPORTS.distritoIndustrial)}
          className="px-2 py-0.5 rounded bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-700 font-bold"
          title="Distrito Industrial I - Complexo Industrial de Manaus"
        >
          🏭 Distrito Industrial (PIM)
        </button>
        <button
          onClick={() => setCurrentView(BRAZIL_VIEWPORTS.pantanal)}
          className="px-2 py-0.5 rounded bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-700 font-bold"
        >
          🐾 Pantanal
        </button>
        <button
          onClick={() => setCurrentView(BRAZIL_VIEWPORTS.cerrado)}
          className="px-2 py-0.5 rounded bg-orange-950 hover:bg-orange-900 text-orange-300 border border-orange-700 font-bold"
        >
          🌾 Cerrado
        </button>
      </div>
    </div>
  );
});

export default MainMap;
