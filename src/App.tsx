import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MainMap } from './components/MainMap';
import { FloatingWindow } from './components/FloatingWindow';
import { VideoStreamWindow } from './components/VideoStreamWindow';
import { OsintFeedWindow } from './components/OsintFeedWindow';
import { HoverPreviewCard } from './components/HoverPreviewCard';
import { AIAssistantPanel } from './components/AIAssistantPanel';
import { FiresDrawer } from './components/FiresDrawer';
import { WhatsAppConfirmModal } from './components/WhatsAppConfirmModal';
import L from 'leaflet';
import { BottomDock } from './components/BottomDock';
import { SettingsModal, DEFAULT_CONFIG, SystemConfigState } from './components/SettingsModal';
import { Settings, Compass, User as UserIcon, LogOut, UserCheck, ExternalLink } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/AuthPage';
import { LandingPage } from './components/LandingPage';
import { Globe2 } from 'lucide-react';
import { LayerNavigationBar } from './components/LayerNavigationBar';
import { DelimitedArea, OSINTAlert, FireSpot, TemporalMode, MapLayerType, MAP_LAYERS, ActiveOverlaysState, ActiveGeofenceState } from './types';
import {
  normalizeGeofenceToPolygon,
  isPointInPolygon,
  scalePolygon,
  scalePolygonXY,
  getPolygonDimensionsKm,
  createGeofencePolygon,
  calculatePolygonAreaKm2,
  getPolygonBoundingBox,
  getPolygonCentroid,
} from './services/geofenceGeometryService';
import { fetchNationalFires, fetchHeatmapData, fetchTimelineData, fetchOsintAlerts } from './services/api';
import { reverseGeocode } from './services/geocodingService';
import { queryLandRegistry } from './services/landRegistryService';
import { sendWhatsAppFireAlert } from './services/alertService';
import { goes16Manager } from './services/goes16PollingService';
import { upsertFireSpots } from './services/spotUpsertService';
import { geofence24hMonitor, GeofenceIncident } from './services/geofence24hMonitorService';
import { GeofenceIncidentsModal } from './components/GeofenceIncidentsModal';
import { Flame, ShieldAlert, Radio, Satellite, Globe, MessageSquare, Clock, Calendar, BarChart2, Layers, Truck, Droplets, Zap, CheckCircle2, Wind, Bot, BellRing, Plus, Trash2 } from 'lucide-react';
import { findNearestInfrastructure } from './data/emergencyInfrastructure';
import { calculateAirQuality } from './data/airQuality';
import { GoogleEarth3DWindow } from './components/GoogleEarth3DWindow';
import { StreetViewWindow } from './components/StreetViewWindow';
import { NewFireAlertBanner } from './components/NewFireAlertBanner';
import { TacticalEvidenceWindow } from './components/TacticalEvidenceWindow';
import { AutoEmergencyCountdown } from './components/AutoEmergencyCountdown';
import { INDUSTRIAL_FACILITIES, Facility } from './data/facilityFloorPlans';

// Dynamic Code-Splitting para Modais sob Demanda (Redução drástica do Bundle inicial)
const FloorPlanModal = React.lazy(() =>
  import('./components/FloorPlanModal').then((m) => ({ default: m.FloorPlanModal }))
);
const AreaInspectionModal = React.lazy(() =>
  import('./components/AreaInspectionModal').then((m) => ({ default: m.AreaInspectionModal }))
);
const ReportsModal = React.lazy(() =>
  import('./components/ReportsModal').then((m) => ({ default: m.ReportsModal }))
);

// Encapsulated Tactical Clock Component to prevent full App / Leaflet re-renders every 1s
const TacticalClock: React.FC = () => {
  const [time, setTime] = useState<string>('');
  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Manaus' }));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);
  return <span>{time || '--:--:--'}</span>;
};

const AppContent: React.FC = () => {
  const [fireSpots, setFireSpots] = useState<FireSpot[]>(() => {
    try {
      const isSim = localStorage.getItem('isSimulation') === 'true';
      const key = isSim ? 'amazonia_fire_spots_cache_sim' : 'amazonia_fire_spots_cache_real';
      const local = localStorage.getItem(key);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return isSim ? parsed : parsed.filter((s: FireSpot) => !s.is_simulated);
        }
      }
    } catch {}
    return [];
  });
  const [heatmapSpots, setHeatmapSpots] = useState<any[]>([]);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [osintAlerts, setOsintAlerts] = useState<OSINTAlert[]>([]);
  
  const [selectedArea, setSelectedArea] = useState<DelimitedArea | null>(null);
  const [temporalMode, setTemporalMode] = useState<TemporalMode>('24h');
  const [isAreaInspectionOpen, setIsAreaInspectionOpen] = useState<boolean>(false);
  const [isReportsOpen, setIsReportsOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'landing'>(() => {
    return (localStorage.getItem('afw_current_view') as any) || 'dashboard';
  });

  const handleSwitchView = (view: 'dashboard' | 'landing') => {
    setCurrentView(view);
    localStorage.setItem('afw_current_view', view);
  };
  const { user, profile, signOut } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [systemConfig, setSystemConfig] = useState<SystemConfigState>(() => {
    try {
      const saved = localStorage.getItem('amazonia_fire_watch_config');
      return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [currentLayer, setCurrentLayer] = useState<MapLayerType>('google_hybrid');
  const [showHeatmapOverlay, setShowHeatmapOverlay] = useState<boolean>(false);
  const [activeOverlays, setActiveOverlays] = useState<ActiveOverlaysState>({
    nasaFirms: false,
    googleEarth3d: false,
    inpeBdqueimadas: false,
    goes16: false,
    smokePlume: false,
    thermalMask: false,
    rainRadar: false,
    heatmap: false,
    carCadastre: false,
    clustering: true,
  });
  const [onlyNewOutbreaks, setOnlyNewOutbreaks] = useState<boolean>(false);

  const handleToggleOverlay = (overlayKey: keyof ActiveOverlaysState) => {
    setActiveOverlays(prev => {
      const updated = { ...prev, [overlayKey]: !prev[overlayKey] };
      if (overlayKey === 'heatmap') {
        setShowHeatmapOverlay(Boolean(updated.heatmap));
      }
      return updated;
    });
  };
  const [currentTime, setCurrentTime] = useState<string>('');

  // Map Interactive Target & Search Marker
  const [targetMapLocation, setTargetMapLocation] = useState<{ center: [number, number]; zoom: number; trigger?: number } | null>(null);
  const [currentMapCenter, setCurrentMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [searchMarker, setSearchMarker] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [triggerDrawGeofence, setTriggerDrawGeofence] = useState<number>(0);
  const geofenceEnrichTimeoutRef = useRef<any>(null);

  // Módulo de Cerca Virtual (Isolamento Geográfico Total: Mover e Dimensionar) & Planta Baixa
  const [activeGeofence, setActiveGeofence] = useState<ActiveGeofenceState | null>(() => {
    try {
      const saved = localStorage.getItem('afw_active_geofence');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [isEditingGeofence, setIsEditingGeofence] = useState<boolean>(false);
  const [geofenceIncidents, setGeofenceIncidents] = useState<GeofenceIncident[]>(() =>
    geofence24hMonitor.getIncidents()
  );
  const [isIncidentsModalOpen, setIsIncidentsModalOpen] = useState<boolean>(false);
  const [isAutoReportActive, setIsAutoReportActive] = useState<boolean>(() =>
    geofence24hMonitor.isAutoReportActive()
  );
  const [perimeterBreachAlert, setPerimeterBreachAlert] = useState<{
    incident: GeofenceIncident;
    spot: FireSpot;
  } | null>(null);
  const [isFloorPlanOpen, setIsFloorPlanOpen] = useState<boolean>(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('samsung-manaus');
  const [isAutoEmergencyOpen, setIsAutoEmergencyOpen] = useState<boolean>(false);
  const [emergencyFacility, setEmergencyFacility] = useState<Facility | null>(null);

  // WhatsApp Confirmation Modal
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  // Hover Preview State for Video Pins
  const [hoveredSpot, setHoveredSpot] = useState<FireSpot | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Floating Window Management State
  const [topZ, setTopZ] = useState<number>(100);
  const [windowZ, setWindowZ] = useState<{ [id: string]: number }>({
    videoStream: 105,
    aiAssistant: 110,
    osintFeed: 104,
    firms: 101,
    googleEarth: 102,
    bdqueimadas: 103,
    spotDetail: 107,
    streetView: 108
  });

  const [openWindows, setOpenWindows] = useState<{ [id: string]: boolean }>(() => {
    try {
      const saved = localStorage.getItem('afw_open_windows');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      aiAssistant: true,
      videoStream: false,
      osintFeed: false,
      firms: false,
      googleEarth: false,
      bdqueimadas: false,
      whatsappAlert: false,
      spotDetail: false,
      streetView: false,
    };
  });

  const [minimizedWindows, setMinimizedWindows] = useState<{ [id: string]: boolean }>(() => {
    try {
      const saved = localStorage.getItem('afw_min_windows');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      aiAssistant: false,
      videoStream: false,
      osintFeed: false,
      firms: false,
      googleEarth: false,
      bdqueimadas: false,
      whatsappAlert: false,
      spotDetail: false,
      streetView: false,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('afw_open_windows', JSON.stringify(openWindows));
    } catch {}
  }, [openWindows]);

  useEffect(() => {
    try {
      localStorage.setItem('afw_min_windows', JSON.stringify(minimizedWindows));
    } catch {}
  }, [minimizedWindows]);

  const [isSimulation, setIsSimulation] = useState<boolean>(() => {
    const saved = localStorage.getItem('isSimulation');
    return saved !== null ? saved === 'true' : false; // Padrão: DADOS REAIS DE SATÉLITE
  });

  const toggleSimulationMode = () => {
    const nextVal = !isSimulation;
    setIsSimulation(nextVal);
    localStorage.setItem('isSimulation', String(nextVal));
    if (!nextVal) {
      // Switching to REAL: limpa estritamente itens simulados do estado imediatamente!
      setFireSpots(prev => prev.filter(s => !s.is_simulated));
      setHoveredSpot(null);
      setSelectedSpot(null);
      setOpenWindows(prev => ({ ...prev, videoStream: false }));
    }
  };

  // Unified Single Source of Truth for Selected Fire Hotspot across all components
  const [selectedSpot, setSelectedSpot] = useState<FireSpot | null>(null);
  const [isBannerVisible, setIsBannerVisible] = useState<boolean>(true);
  const [streetViewLocation, setStreetViewLocation] = useState<{ lat: number; lng: number; label: string; address?: string } | null>(null);

  const handleOpenStreetView = (loc: { lat: number; lng: number; label: string; address?: string }) => {
    setStreetViewLocation(loc);
    setOpenWindows(prev => ({ ...prev, streetView: true }));
    setMinimizedWindows(prev => ({ ...prev, streetView: false }));
    bringToFront('streetView');
  };

  // Trava de concorrência para evitar chamadas de rede simultâneas duplicadas
  const isFetchingRef = useRef<boolean>(false);

  // Sincronização e hidratação imediata: carrega e consolida o feed local com cobertura planetária
  useEffect(() => {
    const targetFile = isSimulation ? '/simulation_fires.json' : '/real_firms_cache.json';
    fetch(targetFile)
      .then(res => (res.ok ? res.json() : []))
      .then((cachedSpots: FireSpot[]) => {
        if (cachedSpots && Array.isArray(cachedSpots) && cachedSpots.length > 0) {
          const sanitized = isSimulation ? cachedSpots : cachedSpots.filter(s => !s.is_simulated);
          if (sanitized.length > 0) {
            setFireSpots(prev => upsertFireSpots(prev, sanitized));
          }
        }
      })
      .catch(() => {});
  }, [isSimulation]);

  useEffect(() => {
    let isCancelled = false;

    // Carregamento coordenado dos dados de satélite e OSINT
    const loadData = async (isInitial = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const [spots, heatmap, osint] = await Promise.all([
          fetchNationalFires(isSimulation),
          fetchHeatmapData(isSimulation),
          fetchOsintAlerts(25, isSimulation),
        ]);

        if (isCancelled) return;

        if (spots && spots.length > 0) {
          let combined = isSimulation ? spots : spots.filter(s => !s.is_simulated);

          // Anomalias da constelação GOES preliminares são ativadas estritamente na Simulação
          if (isSimulation) {
            goes16Manager.reconcileWithPolarFires(spots);
            const goesSpots = goes16Manager.getActiveGoesSpots();
            combined = [...goesSpots, ...combined];
          }
          
          // Upsert direto no mesmo registro: consolida mesmo raio <= 2.5km, congela início e atualiza voláteis
          setFireSpots(prevActiveSpots => {
            const baseSpots = isSimulation ? prevActiveSpots : prevActiveSpots.filter(s => !s.is_simulated);
            const upserted = upsertFireSpots(baseSpots, combined);
            try {
              const cacheKey = isSimulation ? 'amazonia_fire_spots_cache_sim' : 'amazonia_fire_spots_cache_real';
              localStorage.setItem(cacheKey, JSON.stringify(upserted));
            } catch {}
            return upserted;
          });
        }
        setHeatmapSpots(heatmap && heatmap.length > 0 ? heatmap : spots.map(s => [s.latitude, s.longitude, Math.min(1.0, (s.frp_mw || 20) / 100)]));
        setOsintAlerts(osint);

        // Atualiza foco selecionado inicial ou se nenhum estiver ativo
        setSelectedSpot(prev => {
          if (prev && spots.some(s => s.id === prev.id)) {
            // Mantém o foco ativo sincronizado com a telemetria mais recente
            return spots.find(s => s.id === prev.id) || prev;
          }
          if (isInitial || !prev) {
            if (isSimulation) {
              const recent = spots.find(s => s.is_new_outbreak);
              if (recent) {
                setIsBannerVisible(true);
                return recent;
              }
            } else {
              const realRecent = spots.find(s => s.is_new_outbreak && !s.is_simulated) || (spots.length > 0 ? spots[0] : null);
              if (realRecent) {
                setIsBannerVisible(true);
                return realRecent;
              }
            }
          }
          return prev;
        });
      } catch (err) {
        console.warn('Erro ao atualizar telemetria de focos:', err);
      } finally {
        isFetchingRef.current = false;
      }
    };

    // Disparo inicial imediato na montagem ou na alternância de modo
    loadData(true);

    // Linha do tempo histórica (2020-2026) carregada apenas uma vez
    fetchTimelineData().then(timeline => {
      if (!isCancelled) setTimelineData(timeline);
    });

    // Polling seguro configurado para 45 segundos (evita rajadas e vazamentos de memória)
    const pollTimer = setInterval(() => {
      loadData(false);
    }, 45000);

    return () => {
      isCancelled = true;
      clearInterval(pollTimer);
    };
  }, [isSimulation]);

  // Varredura Automática Contínua 24h de Anomalias na Cerca Virtual
  useEffect(() => {
    if (!activeGeofence || fireSpots.length === 0) return;
    geofence24hMonitor.scanGeofenceForAnomalies(activeGeofence, fireSpots, isSimulation);
  }, [activeGeofence, fireSpots, isSimulation]);

  // Inscrição no serviço 24h e captura de violações de perímetro
  useEffect(() => {
    const unsub = geofence24hMonitor.subscribe(setGeofenceIncidents);
    const unsubAlert = geofence24hMonitor.onPerimeterBreach((incident, spot) => {
      setPerimeterBreachAlert({ incident, spot });
      setSelectedSpot(spot);
      setIsBannerVisible(true);
    });
    return () => {
      unsub();
      unsubAlert();
    };
  }, []);

  // Auto-dismiss do aviso de violação após 9 segundos
  useEffect(() => {
    if (!perimeterBreachAlert) return;
    const timer = setTimeout(() => {
      setPerimeterBreachAlert(null);
    }, 9000);
    return () => clearTimeout(timer);
  }, [perimeterBreachAlert]);
  useEffect(() => {
    if (selectedSpot) {
      const fresh = fireSpots.find(s => s.id === selectedSpot.id);
      if (
        fresh &&
        (fresh.frp_mw !== selectedSpot.frp_mw ||
          fresh.last_detected_at !== selectedSpot.last_detected_at ||
          fresh.latitude !== selectedSpot.latitude ||
          fresh.longitude !== selectedSpot.longitude ||
          fresh.fire_trend !== selectedSpot.fire_trend)
      ) {
        setSelectedSpot(fresh);
      }
    }
  }, [fireSpots]);

  const bringToFront = (id: string) => {
    const nextZ = topZ + 1;
    setTopZ(nextZ);
    setWindowZ(prev => ({ ...prev, [id]: nextZ }));
  };

  const toggleWindow = (id: string) => {
    if (id === 'whatsappAlert') {
      if (!selectedSpot && fireSpots.length > 0) {
        setSelectedSpot(fireSpots[0]);
      }
      setIsWhatsAppModalOpen(true);
      return;
    }
    if (id === 'spotDetail') {
      if (!selectedSpot && fireSpots.length > 0) {
        setSelectedSpot(fireSpots[0]);
      }
    }

    if (!openWindows[id]) {
      setOpenWindows(prev => ({ ...prev, [id]: true }));
      setMinimizedWindows(prev => ({ ...prev, [id]: false }));
      bringToFront(id);
    } else if (minimizedWindows[id]) {
      setMinimizedWindows(prev => ({ ...prev, [id]: false }));
      bringToFront(id);
    } else {
      setMinimizedWindows(prev => ({ ...prev, [id]: true }));
    }
  };

  const closeWindow = (id: string) => {
    setOpenWindows(prev => ({ ...prev, [id]: false }));
  };

  const minimizeWindow = (id: string) => {
    setMinimizedWindows(prev => ({ ...prev, [id]: true }));
  };

  const handleSpotStatusChange = (spotId: string, newStatus: any, dispatchedAt: string) => {
    setFireSpots(prev =>
      prev.map(s => (s.id === spotId ? { ...s, status: newStatus, dispatched_at: dispatchedAt } : s))
    );
    if (selectedSpot && selectedSpot.id === spotId) {
      setSelectedSpot(prev => (prev ? { ...prev, status: newStatus, dispatched_at: dispatchedAt } : null));
    }
  };
  const handleNewFireDetected = (spot: FireSpot) => {
    if (!isSimulation) {
      console.warn('Detecção de vídeo descartada: Modo Operacional Real ativo.');
      return;
    }
    // Upsert no mesmo registro se estiver no raio de foco existente
    setFireSpots(prev => upsertFireSpots(prev, [spot]));
    setHoveredSpot(spot);
    setSelectedSpot(spot);
    setIsBannerVisible(true);
    setHoverPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 - 100 });
    setTargetMapLocation({
      center: [spot.latitude, spot.longitude],
      zoom: 16,
      trigger: Date.now()
    });
  };

  const handleAreaSelected = (data: DelimitedArea) => {
    setSelectedArea(data);
    setTriggerDrawGeofence(0);

    // Converte diretamente a área demarcada por clique-e-arraste em Cerca Virtual 24h Ativa!
    const ne = data.northEast;
    const sw = data.southWest;
    const polygon: [number, number][] = [
      [sw.lat, sw.lng],
      [ne.lat, sw.lng],
      [ne.lat, ne.lng],
      [sw.lat, ne.lng],
    ];
    const bounds: [[number, number], [number, number]] = [
      [sw.lat, sw.lng],
      [ne.lat, ne.lng],
    ];

    const newGeofence: ActiveGeofenceState = {
      id: `cerca-tatica-${Date.now()}`,
      name: `Cerca Tática (${data.center.lat.toFixed(4)}°, ${data.center.lng.toFixed(4)}°)`,
      polygon,
      bounds,
      areaKm2: data.areaSqKm,
    };

    setActiveGeofence(newGeofence);
    setIsEditingGeofence(true);
    try {
      localStorage.setItem('afw_active_geofence', JSON.stringify(newGeofence));
    } catch {}

    reverseGeocode(data.center.lat, data.center.lng)
      .then((rev) => {
        const land = queryLandRegistry(data.center.lat, data.center.lng, rev.city, rev.state);
        const placeLabel = rev.road
          ? `${rev.road}${rev.neighborhood ? `, ${rev.neighborhood}` : ''} (${rev.city} - ${rev.state})`
          : land.property_name && land.property_name !== 'Setor Territorial'
          ? `${land.property_name} (${rev.city || 'AM'})`
          : `${rev.city} - ${rev.state}`;

        setSelectedArea((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            address: rev.fullAddress,
            road: rev.road || rev.formattedStreet,
            neighborhood: rev.neighborhood,
            city: rev.city,
            state: rev.state,
            postcode: rev.postcode,
            landPropertyName: land.property_name,
            carReceipt: land.car_receipt,
          };
        });

        setActiveGeofence((prev) => {
          if (!prev || prev.id !== newGeofence.id) return prev;
          const enriched: ActiveGeofenceState = {
            ...prev,
            name: placeLabel,
            address: rev.fullAddress,
            road: rev.road || rev.formattedStreet,
            neighborhood: rev.neighborhood,
            city: rev.city,
            state: rev.state,
            postcode: rev.postcode,
            landPropertyName: land.property_name,
            carReceipt: land.car_receipt,
          };
          try {
            localStorage.setItem('afw_active_geofence', JSON.stringify(enriched));
          } catch {}
          return enriched;
        });
      })
      .catch((err) => {
        console.warn('Erro ao enriquecer dados do lugar para área delimitada:', err);
      });
  };

  const handleInspectMapPoint = (lat: number, lng: number) => {
    const delta = 0.08;
    const ne = L.latLng(lat + delta, lng + delta);
    const sw = L.latLng(lat - delta, lng - delta);
    const center = L.latLng(lat, lng);
    const latDiff = delta * 2 * 111;
    const lngDiff = delta * 2 * 111 * Math.cos((lat * Math.PI) / 180);
    const areaSqKm = parseFloat((latDiff * lngDiff).toFixed(2));
    const areaHa = parseFloat((areaSqKm * 100).toFixed(1));
    const areaM2 = Math.round(areaSqKm * 1000000);

    const inspectedArea: DelimitedArea = {
      northEast: ne,
      southWest: sw,
      center,
      areaSqKm,
      areaHa,
      areaM2,
    };
    handleAreaSelected(inspectedArea);
  };

  const handleSpotClick = useCallback((spot: FireSpot) => {
    setSelectedSpot(spot);
    setIsBannerVisible(true);
    setOpenWindows(prev => ({ ...prev, spotDetail: true }));
    setMinimizedWindows(prev => ({ ...prev, spotDetail: false }));
    bringToFront('spotDetail');
  }, []);

  const handleHoverSpot = useCallback((spot: FireSpot, pos: { x: number; y: number }) => {
    setHoveredSpot(spot);
    setHoverPosition(pos);
  }, []);

  const handleLeaveSpot = useCallback(() => {
    setHoveredSpot(null);
  }, []);

  // Enriquecimento e Geocodificação Reversa Automática para a Cerca Virtual Ativa
  const enrichGeofencePlaceInfo = async (geofence: ActiveGeofenceState, centerLat: number, centerLng: number) => {
    try {
      const rev = await reverseGeocode(centerLat, centerLng);
      const land = queryLandRegistry(centerLat, centerLng, rev.city, rev.state);

      const placeLabel = rev.road
        ? `${rev.road}${rev.neighborhood ? `, ${rev.neighborhood}` : ''} (${rev.city} - ${rev.state})`
        : land.property_name && land.property_name !== 'Setor Territorial'
        ? `${land.property_name} (${rev.city || 'AM'})`
        : `${rev.city} - ${rev.state}`;

      setActiveGeofence((prev) => {
        if (!prev || prev.id !== geofence.id) return prev;
        const enriched: ActiveGeofenceState = {
          ...prev,
          name: placeLabel,
          address: rev.fullAddress,
          road: rev.road || rev.formattedStreet,
          neighborhood: rev.neighborhood,
          city: rev.city,
          state: rev.state,
          postcode: rev.postcode,
          landPropertyName: land.property_name,
          carReceipt: land.car_receipt,
        };
        try {
          localStorage.setItem('afw_active_geofence', JSON.stringify(enriched));
        } catch {}
        return enriched;
      });
    } catch (e) {
      console.warn('Erro ao enriquecer dados do lugar para a cerca virtual:', e);
    }
  };

  const enrichGeofencePlaceInfoDebounced = (geofence: ActiveGeofenceState, centerLat: number, centerLng: number) => {
    if (geofenceEnrichTimeoutRef.current) {
      clearTimeout(geofenceEnrichTimeoutRef.current);
    }
    geofenceEnrichTimeoutRef.current = setTimeout(() => {
      enrichGeofencePlaceInfo(geofence, centerLat, centerLng);
    }, 450);
  };

  const handleActivateGeofence = (target: Facility | DelimitedArea | any) => {
    let id = target.id || `cerca-tatica-${Date.now()}`;
    let name = target.name || target.road || target.landPropertyName || `Cerca Tática ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    let polygon: [number, number][] = [];
    let bounds: [[number, number], [number, number]] | undefined = undefined;
    let facilityId = target.facilityId || (target.coordinates ? target.id : undefined);
    let centerLat = -3.1019;
    let centerLng = -60.0250;

    // Se for DelimitedArea (com northEast e southWest)
    if (target.northEast && target.southWest) {
      const sw = target.southWest;
      const ne = target.northEast;
      bounds = [[sw.lat, sw.lng], [ne.lat, ne.lng]];
      polygon = [
        [sw.lat, sw.lng],
        [ne.lat, sw.lng],
        [ne.lat, ne.lng],
        [sw.lat, ne.lng],
      ];
      centerLat = target.center ? target.center.lat : (sw.lat + ne.lat) / 2;
      centerLng = target.center ? target.center.lng : (sw.lng + ne.lng) / 2;
    } else if (target.polygon && target.polygon.length >= 3) {
      polygon = target.polygon;
      bounds = target.bounds || getPolygonBoundingBox(polygon);
      const c = getPolygonCentroid(polygon);
      centerLat = c[0];
      centerLng = c[1];
    } else if (target.coordinates) {
      centerLat = target.coordinates.lat;
      centerLng = target.coordinates.lng;
      polygon = createGeofencePolygon(centerLat, centerLng, 1.5, 1.5);
      bounds = getPolygonBoundingBox(polygon);
    } else if (target.center) {
      centerLat = target.center.lat || target.center[0];
      centerLng = target.center.lng || target.center[1];
      polygon = createGeofencePolygon(centerLat, centerLng, 1.5, 1.5);
      bounds = getPolygonBoundingBox(polygon);
    }

    const calculatedArea = calculatePolygonAreaKm2(polygon);

    const newGeofence: ActiveGeofenceState = {
      id,
      name,
      bounds,
      polygon,
      areaKm2: calculatedArea > 0 ? calculatedArea : (target.areaKm2 || target.areaSqKm || 1.45),
      facilityId,
      address: target.address,
      road: target.road,
      neighborhood: target.neighborhood,
      city: target.city,
      state: target.state,
      postcode: target.postcode,
      landPropertyName: target.landPropertyName,
    };

    setActiveGeofence(newGeofence);
    try {
      localStorage.setItem('afw_active_geofence', JSON.stringify(newGeofence));
    } catch {}

    setTargetMapLocation({
      center: [centerLat, centerLng],
      zoom: 16,
      trigger: Date.now(),
    });

    enrichGeofencePlaceInfo(newGeofence, centerLat, centerLng);
  };

  const handleUpdateGeofence = (updated: ActiveGeofenceState) => {
    setActiveGeofence(updated);
    try {
      localStorage.setItem('afw_active_geofence', JSON.stringify(updated));
    } catch {}

    if (updated.polygon && updated.polygon.length >= 3) {
      const c = getPolygonCentroid(updated.polygon);
      enrichGeofencePlaceInfoDebounced(updated, c[0], c[1]);
    }
  };

  const handleScaleGeofence = (factor: number) => {
    handleScaleGeofenceXY(factor, factor);
  };

  const handleScaleGeofenceXY = (factorX: number, factorY: number) => {
    if (!activeGeofence) return;
    const poly = normalizeGeofenceToPolygon(activeGeofence);
    const scaled = scalePolygonXY(poly, factorX, factorY);
    const newAreaKm2 = calculatePolygonAreaKm2(scaled);
    const newBounds = getPolygonBoundingBox(scaled);
    const updated: ActiveGeofenceState = {
      ...activeGeofence,
      polygon: scaled,
      bounds: newBounds,
      areaKm2: newAreaKm2,
    };
    handleUpdateGeofence(updated);
  };

  const handleCreateNewGeofence = () => {
    // Ativa o modo intuitivo: clique em um ponto do mapa, segure e arraste até o tamanho desejado!
    setTriggerDrawGeofence(Date.now());
  };

  const handleClearGeofence = () => {
    setActiveGeofence(null);
    setIsEditingGeofence(false);
    try {
      localStorage.removeItem('afw_active_geofence');
    } catch {}
  };

  const handleOpenFloorPlan = (facilityId?: string) => {
    if (facilityId) setSelectedFacilityId(facilityId);
    setIsFloorPlanOpen(true);
  };

  const handleTriggerAutoEmergency = (facility: Facility) => {
    if (!isSimulation) {
      console.warn('Protocolo automatizado simulado bloqueado em Modo Operacional Real.');
      return;
    }
    setEmergencyFacility(facility);
    setIsAutoEmergencyOpen(true);
  };

  const handleLocationSelected = (loc: { lat: number; lng: number; label: string; address?: string }) => {
    setSearchMarker(loc);
    setTargetMapLocation({
      center: [loc.lat, loc.lng],
      zoom: 16,
      trigger: Date.now()
    });
  };

  const handleSelectSpotFromDrawer = (spot: FireSpot) => {
    setSelectedSpot(spot);
    setIsBannerVisible(true);
    setOpenWindows(prev => ({ ...prev, spotDetail: true }));
    setMinimizedWindows(prev => ({ ...prev, spotDetail: false }));
    bringToFront('spotDetail');
    setTargetMapLocation({
      center: [spot.latitude, spot.longitude],
      zoom: 16,
      trigger: Date.now()
    });
  };

  if (currentView === 'landing') {
    return <LandingPage onEnterDashboard={() => handleSwitchView('dashboard')} />;
  }

  return (
    <div className="relative w-full h-full min-h-[100dvh] max-h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 1. Telão Master Fullscreen GIS (Cobertura Nacional Brasil) */}
      {(() => {
        // Filtragem estrita: no Modo Real, exclui terminantemente qualquer dado simulado
        let displayFireSpots = isSimulation ? fireSpots : fireSpots.filter(s => !s.is_simulated);
        if (activeGeofence) {
          const poly = normalizeGeofenceToPolygon(activeGeofence);
          if (poly.length >= 3) {
            displayFireSpots = displayFireSpots.filter((s) =>
              isPointInPolygon([s.latitude, s.longitude], poly)
            );
          }

          // Se a instalação fabril tiver incidente, simulação estiver ativa e o filtro estiver vazio, injetar ponto térmico
          const matchedFacility = INDUSTRIAL_FACILITIES.find(f => f.id === activeGeofence.facilityId);
          if (isSimulation && matchedFacility && matchedFacility.activeIncident && displayFireSpots.length === 0) {
            displayFireSpots = [{
              id: matchedFacility.activeIncident.id,
              latitude: matchedFacility.coordinates.lat,
              longitude: matchedFacility.coordinates.lng,
              frp_mw: 85.4,
              confidence: 0.99,
              municipality: 'Manaus',
              state: 'AM',
              address: `${matchedFacility.shortName} - ${matchedFacility.activeIncident.sectorName}`,
              satellite: 'FLIR / IOT TÉRMICO',
              biome: 'Amazônia (PIM Urbano)',
              status: 'PENDENTE',
              is_new_outbreak: true,
              has_video: true,
              bright_ti4_k: 457.6,
              detected_at: matchedFacility.activeIncident.firstDetectedAt,
              detected_iso: new Date().toISOString(),
              is_recurrent: false,
              is_arson_cluster: false,
              is_simulated: true
            }];
          }
        }

        // 3. Filtro de Novos Focos (< 3h): Cumulativo e independente
        if (onlyNewOutbreaks) {
          displayFireSpots = displayFireSpots.filter(f => f.is_new_outbreak);
        }

        return (
          <MainMap
            onAreaSelected={handleAreaSelected}
            onClearArea={() => setSelectedArea(null)}
            onMapCenterChange={(c) => setCurrentMapCenter(c)}
            onInspectMapPoint={handleInspectMapPoint}
            fireSpots={displayFireSpots}
            activeGeofence={activeGeofence}
            isEditingGeofence={isEditingGeofence}
            onToggleEditGeofence={() => setIsEditingGeofence(!isEditingGeofence)}
            onUpdateGeofence={handleUpdateGeofence}
            onClearGeofence={handleClearGeofence}
            onOpenFloorPlan={handleOpenFloorPlan}
            onActivateGeofence={handleActivateGeofence}
            onTriggerAutoEmergency={handleTriggerAutoEmergency}
            isSimulation={isSimulation}
            triggerDrawGeofence={triggerDrawGeofence}
            onDrawCompleted={() => setTriggerDrawGeofence(0)}
        heatmapSpots={heatmapSpots}
        osintAlerts={osintAlerts}
        onOsintClick={(alert) => {
          setOpenWindows(prev => ({ ...prev, osintFeed: true }));
          setMinimizedWindows(prev => ({ ...prev, osintFeed: false }));
          bringToFront('osintFeed');
        }}
        onHoverSpot={handleHoverSpot}
        onLeaveSpot={handleLeaveSpot}
        onSpotClick={handleSpotClick}
        temporalMode={temporalMode}
        currentLayer={currentLayer}
        activeOverlays={activeOverlays}
        showHeatmapOverlay={Boolean(activeOverlays.heatmap || showHeatmapOverlay)}
        externalTargetView={targetMapLocation}
        searchMarker={searchMarker}
        onLocationSelected={handleLocationSelected}
        onOpenStreetView={handleOpenStreetView}
        onOpenEarth3D={(lat, lng) => {
          setCurrentLayer('google_earth');
          setTargetMapLocation({ center: [lat, lng], zoom: 16, trigger: Date.now() });
        }}
      />
        );
      })()}

      {/* Alerta Tático de Alta Nitidez de Novo Foco (<3h) ou Selecionado */}
      {selectedSpot && isBannerVisible && (
        <NewFireAlertBanner
          spot={selectedSpot}
          isSimulation={isSimulation}
          onClose={() => setIsBannerVisible(false)}
          onFlyTo={(lat, lng) => {
            setTargetMapLocation({
              center: [lat, lng],
              zoom: 16,
              trigger: Date.now()
            });
          }}
          onOpenDetails={handleSpotClick}
          onStatusChange={handleSpotStatusChange}
        />
      )}

      {/* 2. Hover Preview Card para Marcadores com Vídeo */}
      {hoveredSpot && (
        <HoverPreviewCard
          spot={hoveredSpot}
          isSimulation={isSimulation}
          position={hoverPosition}
          onOpenDetails={handleSpotClick}
          onStatusChange={handleSpotStatusChange}
        />
      )}

      {/* 3. Top Header Tático Compacto e Totalmente Responsivo (Zero Transbordamento em 100% Zoom) */}
      <header className="absolute top-0 left-0 right-0 z-[1250] h-11 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-2 sm:px-3 py-1 flex items-center justify-between text-white pointer-events-auto select-none gap-1 sm:gap-2 max-w-full overflow-visible">
        {/* Lado Esquerdo: Logo & Navegação de Camadas/Filtros */}
        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0 min-w-0">
          {/* Logo & Identificação Compacta */}
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-red-600/20 border border-red-500/60 shadow-[0_0_8px_rgba(255,30,39,0.3)]">
              <Flame className="w-3.5 h-3.5 text-red-500" />
            </div>
            <div className="flex items-center space-x-1">
              <span className="font-bold text-[11px] sm:text-xs tracking-wider whitespace-nowrap">FIRE WATCH AI</span>
              <span className="hidden md:inline px-1 py-0.2 text-[8px] font-mono font-semibold bg-red-950 text-red-400 border border-red-800 rounded">
                BRASIL
              </span>
            </div>
          </div>

          {/* Seletor Compacto de Camadas e Overlays */}
          <LayerNavigationBar
            currentLayer={currentLayer}
            onSelectBaseLayer={setCurrentLayer}
            activeOverlays={activeOverlays}
            onToggleOverlay={handleToggleOverlay}
            onSelectGlobalSector={(center, zoom) => {
              setTargetMapLocation({ center, zoom, trigger: Date.now() });
            }}
          />

          {/* Filtro Rápido de Novos Surgimentos (< 3h) */}
          <button
            onClick={() => setOnlyNewOutbreaks(!onlyNewOutbreaks)}
            className={`h-7 px-1.5 sm:px-2 py-0.5 rounded-md text-[10.5px] font-mono font-medium transition-all flex items-center gap-1 border shrink-0 cursor-pointer ${
              onlyNewOutbreaks
                ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400 font-bold shadow-sm shadow-yellow-950 animate-pulse'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
            }`}
            title="Filtrar apenas focos detectados há menos de 180 minutos"
          >
            <span>🚨</span>
            <span className="whitespace-nowrap hidden sm:inline">Novos &lt;3h</span>
          </button>

          {/* Botão de Alternar Copiloto Tático IA */}
          <button
            onClick={() => toggleWindow('aiAssistant')}
            className={`h-7 px-1.5 sm:px-2 py-0.5 rounded-md text-[10.5px] font-mono font-medium transition-all flex items-center gap-1 border shrink-0 cursor-pointer ${
              openWindows.aiAssistant && !minimizedWindows.aiAssistant
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500 font-bold shadow-sm'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
            }`}
            title="Abrir / Ocultar Copiloto Tático de Inteligência Artificial"
          >
            <Bot size={13} className="text-emerald-400" />
            <span className="whitespace-nowrap hidden sm:inline">Copiloto IA</span>
          </button>

          {/* Filtro Temporal Compacto */}
          <div className="hidden sm:flex items-center space-x-0.5 bg-slate-950/80 border border-slate-800 rounded-md p-0.5 text-xs font-mono shrink-0">
            <button
              onClick={() => setTemporalMode('24h')}
              className={`h-7 px-1.5 py-0.5 rounded text-[10.5px] transition-all flex items-center gap-1 cursor-pointer ${
                temporalMode === '24h'
                  ? 'bg-red-950 text-red-300 border border-red-700 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>
              <span>Hoje</span>
            </button>
            <button
              onClick={() => setTemporalMode('month')}
              className={`h-7 px-1.5 py-0.5 rounded text-[10.5px] transition-all flex items-center gap-1 cursor-pointer ${
                temporalMode === 'month'
                  ? 'bg-amber-950 text-amber-300 border border-amber-700 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Mês</span>
            </button>
            <button
              onClick={() => setTemporalMode('historical')}
              className={`h-7 px-1.5 py-0.5 rounded text-[10.5px] transition-all flex items-center gap-1 cursor-pointer ${
                temporalMode === 'historical'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Anual</span>
            </button>
          </div>
        </div>

        {/* Lado Direito: Ações Operacionais, Alternância de Modo & Login */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 text-xs font-mono flex-shrink-0">
          {/* Toggle Switch: Modo Simulação vs Operação Real */}
          <button
            onClick={toggleSimulationMode}
            className={`h-7 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm border cursor-pointer shrink-0 ${
              isSimulation
                ? 'bg-amber-950/90 text-amber-300 border-amber-500/80 hover:bg-amber-900/90'
                : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/80 hover:bg-emerald-900/90'
            }`}
            title={isSimulation ? 'Modo Simulação Ativo. Clique para mudar para Dados Reais de Satélite' : 'Modo Operação Real Ativo. Clique para alternar para Simulação'}
          >
            <span className="text-[10px]">{isSimulation ? '🧪' : '🛰️'}</span>
            <span className="hidden md:inline">{isSimulation ? 'SIMULAÇÃO' : 'DADOS REAIS'}</span>
            
            <div
              className={`w-6 h-3 rounded-full p-0.5 transition-colors flex items-center ${
                isSimulation ? 'bg-amber-600 justify-start' : 'bg-emerald-500 justify-end'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-white shadow-sm transition-transform" />
            </div>
          </button>

          {/* Botão de Relatórios */}
          <button
            onClick={() => setIsReportsOpen(true)}
            className="h-7 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1 bg-purple-950/90 hover:bg-purple-900 text-purple-200 border border-purple-700/80 transition-all shadow-sm cursor-pointer shrink-0"
            title="Abrir Centro de Relatórios e Estatísticas de Queimadas"
          >
            <BarChart2 size={12} className="text-purple-400 shrink-0" />
            <span className="hidden lg:inline">Relatórios</span>
          </button>

          {/* Botão ROI / Cerca Virtual 24h (Definição Instantânea por Clique-e-Arrasto) */}
          <button
            onClick={() => setTriggerDrawGeofence(Date.now())}
            className={`h-7 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1 border transition-all shadow-sm cursor-pointer shrink-0 ${
              triggerDrawGeofence > 0
                ? 'bg-cyan-600 text-white border-white animate-pulse'
                : activeGeofence
                ? 'bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border-cyan-500/70'
                : 'bg-cyan-950 hover:bg-cyan-900 text-cyan-200 border-cyan-400 animate-pulse hover:animate-none'
            }`}
            title="Definir Região de Interesse (ROI): Clique em um ponto, segure e arraste o retângulo no mapa. Solte para fixar. (Atalho: Segure Shift e arraste no mapa)"
          >
            <ShieldAlert size={12} className="text-cyan-400 shrink-0" />
            <span className="hidden sm:inline">
              {triggerDrawGeofence > 0
                ? '✏️ Arraste a ROI no Mapa'
                : activeGeofence
                ? '📐 Redefinir ROI'
                : '🛰️ Definir ROI'}
            </span>
          </button>

          {/* Botão de Portal SaaS / Demonstração Comercial */}
          <button
            onClick={() => handleSwitchView('landing')}
            className="h-7 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1 bg-zinc-900/90 hover:bg-zinc-800 text-amber-300 border border-amber-600/70 transition-all shadow-sm cursor-pointer shrink-0"
            title="Abrir Portal Comercial SaaS, Simulador e Planos"
          >
            <Globe2 size={12} className="text-amber-400 shrink-0" />
            <span className="hidden xl:inline">Portal SaaS</span>
          </button>

          {/* Botão de Configurações */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="h-7 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-all shadow-sm cursor-pointer shrink-0"
            title="Abrir Centro de Configurações do Sistema"
          >
            <Settings size={12} className="text-slate-400 shrink-0" />
            <span className="hidden lg:inline">Config</span>
          </button>

          {/* Autenticação / Operador C2 */}
          {user ? (
            <div className="flex items-center gap-1 bg-slate-900/90 border border-emerald-600/70 rounded-md px-1.5 sm:px-2 py-0.5 text-xs font-mono shadow-sm shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <span className="text-[10px] text-emerald-300 font-bold truncate max-w-[80px] sm:max-w-[120px]" title={profile?.full_name || user.email || 'Operador'}>
                {profile?.full_name || user.email?.split('@')[0]}
              </span>
              <button
                onClick={() => signOut()}
                className="p-0.5 text-slate-400 hover:text-red-400 rounded transition cursor-pointer"
                title="Encerrar Sessão Tática"
              >
                <LogOut size={11} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="h-7 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-orange-600 text-white shadow-sm cursor-pointer transition border border-orange-500/60 shrink-0"
              title="Acesso Operacional / Login C2"
            >
              <UserIcon size={12} className="shrink-0" />
              <span className="hidden sm:inline">Entrar</span>
            </button>
          )}

          {/* Relógio Tático */}
          <div className="hidden xl:flex items-center space-x-1 text-slate-300 bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800 text-[10.5px] shrink-0 font-mono">
            <Clock size={11} className="text-amber-300 shrink-0" />
            <TacticalClock />
          </div>
        </div>
      </header>

      {/* Faixa Indicadora de Cerca Virtual Ativa (Isolamento Geográfico da IA com Edição Total) */}
      {activeGeofence && (
        <div className="absolute top-11 left-0 right-0 z-[1140] bg-cyan-950/95 border-b-2 border-cyan-400 px-4 py-1.5 flex items-center justify-between text-xs font-mono text-cyan-200 pointer-events-auto backdrop-blur-md shadow-2xl flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-bold text-white text-xs flex items-center gap-1.5">
              <span>🔒 CERCA VIRTUAL:</span>
              <span className="text-cyan-300 font-bold">{activeGeofence.name}</span>
            </span>
            {(activeGeofence.road || activeGeofence.city) && (
              <>
                <span className="text-slate-500">|</span>
                <span className="text-amber-300 font-semibold flex items-center gap-1 text-[11px]" title={activeGeofence.address || activeGeofence.road}>
                  <span>📍</span>
                  <span className="truncate max-w-[280px] lg:max-w-[420px]">
                    {[activeGeofence.road, activeGeofence.neighborhood, `${activeGeofence.city || ''}${activeGeofence.state ? ` - ${activeGeofence.state}` : ''}`].filter(Boolean).join(' • ')}
                  </span>
                </span>
              </>
            )}
            {activeGeofence.landPropertyName && (
              <>
                <span className="text-slate-500">|</span>
                <span className="text-emerald-300 text-[10.5px] truncate max-w-[180px]" title={`Imóvel CAR: ${activeGeofence.landPropertyName}`}>
                  🏛️ {activeGeofence.landPropertyName}
                </span>
              </>
            )}
            <span className="text-slate-500">|</span>
            <span className="text-slate-300">
              Área: <strong className="text-white">{activeGeofence.areaKm2.toFixed(3)} km²</strong> ({(activeGeofence.areaKm2 * 100).toFixed(1)} ha)
            </span>
            <span className="text-slate-500">|</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-950 border border-emerald-500 text-emerald-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>24H VIGILÂNCIA ATIVA</span>
            </span>
            <span className="text-slate-500">|</span>
            <span className={`font-bold text-[11px] flex items-center gap-1 ${isEditingGeofence ? 'text-emerald-300 animate-pulse' : 'text-amber-300 hidden md:inline'}`}>
              {isEditingGeofence
                ? '✏️ MODO EDIÇÃO ATIVO: Arraste os vértices (1, 2, 3...) para dimensionar ou o centro ✋ para mover a cerca'
                : '⚡ Monitoramento contínuo 24h com disparo automático'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Toggle de Reporte Automático 24h */}
            <button
              onClick={() => {
                const nextVal = !isAutoReportActive;
                setIsAutoReportActive(nextVal);
                geofence24hMonitor.setAutoReportActive(nextVal);
              }}
              className={`px-2 py-1 rounded text-[10px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                isAutoReportActive
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
              title={isAutoReportActive ? 'Reporte automático ativado: Voz e WhatsApp automáticos em caso de invasão' : 'Reporte automático pausado'}
            >
              <Zap size={11} className={isAutoReportActive ? 'text-emerald-400' : 'text-slate-500'} />
              <span>Reporte Automático: {isAutoReportActive ? 'LIGADO' : 'OFF'}</span>
            </button>

            {/* Histórico de Violações 24h */}
            <button
              onClick={() => setIsIncidentsModalOpen(true)}
              className={`px-2 py-1 rounded text-[10px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                geofenceIncidents.length > 0
                  ? 'bg-red-950 text-red-200 border-red-500 shadow-sm'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
              }`}
              title="Abrir auditoria e histórico de ocorrências 24h da cerca virtual"
            >
              <BellRing size={11} className={geofenceIncidents.length > 0 ? 'text-red-400 animate-bounce' : 'text-cyan-400'} />
              <span>Violações ({geofenceIncidents.length})</span>
            </button>

            {/* Botão de Ativar / Concluir Edição da Cerca Virtual */}
            <button
              onClick={() => setIsEditingGeofence(!isEditingGeofence)}
              className={`px-2.5 py-1 rounded text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer shadow-md ${
                isEditingGeofence
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 ring-2 ring-emerald-400/50'
                  : 'bg-cyan-800 hover:bg-cyan-700 text-white border border-cyan-400'
              }`}
              title={isEditingGeofence ? 'Concluir edição e travar cerca' : 'Habilitar alças para mover e dimensionar a cerca'}
            >
              {isEditingGeofence ? <span>✓ Concluir Edição</span> : <span>✏️ Mover / Dimensionar</span>}
            </button>

            {/* Controles de Dimensionamento X, Y e Escala */}
            <div className="flex items-center gap-1 bg-slate-900/90 border border-cyan-700/70 rounded px-1.5 py-0.5">
              {/* Eixo X: Largura */}
              <div className="flex items-center gap-0.5 border-r border-slate-700 pr-1.5 mr-0.5">
                <span className="text-[9px] text-amber-300 font-bold px-0.5" title="Dimensionar Largura (Eixo X / Leste-Oeste)">↔️ X:</span>
                <button
                  onClick={() => handleScaleGeofenceXY(0.90, 1.0)}
                  className="px-1.5 py-0.5 rounded bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-600/60 text-[9.5px] font-bold transition cursor-pointer"
                  title="Reduzir Largura (Eixo X) em 10%"
                >
                  -10%
                </button>
                <button
                  onClick={() => handleScaleGeofenceXY(1.10, 1.0)}
                  className="px-1.5 py-0.5 rounded bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-600/60 text-[9.5px] font-bold transition cursor-pointer"
                  title="Aumentar Largura (Eixo X) em 10%"
                >
                  +10%
                </button>
              </div>

              {/* Eixo Y: Altura */}
              <div className="flex items-center gap-0.5 border-r border-slate-700 pr-1.5 mr-0.5">
                <span className="text-[9px] text-purple-300 font-bold px-0.5" title="Dimensionar Altura (Eixo Y / Norte-Sul)">↕️ Y:</span>
                <button
                  onClick={() => handleScaleGeofenceXY(1.0, 0.90)}
                  className="px-1.5 py-0.5 rounded bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-600/60 text-[9.5px] font-bold transition cursor-pointer"
                  title="Reduzir Altura (Eixo Y) em 10%"
                >
                  -10%
                </button>
                <button
                  onClick={() => handleScaleGeofenceXY(1.0, 1.10)}
                  className="px-1.5 py-0.5 rounded bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-600/60 text-[9.5px] font-bold transition cursor-pointer"
                  title="Aumentar Altura (Eixo Y) em 10%"
                >
                  +10%
                </button>
              </div>

              {/* Proporcional */}
              <div className="flex items-center gap-0.5">
                <span className="text-[9px] text-cyan-300 font-bold px-0.5" title="Dimensionar Ambos os Eixos (Proporcional)">🔲:</span>
                <button
                  onClick={() => handleScaleGeofence(0.90)}
                  className="px-1.5 py-0.5 rounded bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 border border-cyan-600/60 text-[9.5px] font-bold transition cursor-pointer"
                  title="Reduzir perímetro total em 10%"
                >
                  -10%
                </button>
                <button
                  onClick={() => handleScaleGeofence(1.10)}
                  className="px-1.5 py-0.5 rounded bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 border border-cyan-600/60 text-[9.5px] font-bold transition cursor-pointer"
                  title="Aumentar perímetro total em 10%"
                >
                  +10%
                </button>
              </div>
            </div>

            {/* Adicionar / Nova Cerca */}
            <button
              onClick={handleCreateNewGeofence}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-cyan-950 text-cyan-300 border border-slate-700 hover:border-cyan-500 text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer"
              title="Criar / Reposicionar uma nova cerca virtual no centro da visualização"
            >
              <Plus size={11} className="text-cyan-400" />
              <span>Nova</span>
            </button>

            {activeGeofence.facilityId && (
              <button
                onClick={() => handleOpenFloorPlan(activeGeofence.facilityId)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-cyan-950 text-cyan-200 border border-slate-700 text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <span>🏢 Planta</span>
              </button>
            )}

            {/* Excluir Cerca Virtual */}
            <button
              onClick={handleClearGeofence}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-red-900/90 text-red-300 hover:text-white border border-slate-700 hover:border-red-600 text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer"
              title="Excluir cerca virtual ativa"
            >
              <Trash2 size={11} className="text-red-400" />
              <span>Excluir</span>
            </button>
          </div>
        </div>
      )}

      {/* Faixa Indicadora de Modo Simulação */}
      {isSimulation && (
        <div className="absolute top-11 left-0 right-0 z-[1130] bg-amber-500/10 border-b border-amber-500/30 px-3 py-0.5 flex items-center justify-between text-[10px] font-mono text-amber-300 pointer-events-none backdrop-blur-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="font-bold">MODO SIMULAÇÃO ATIVO</span>
            <span className="text-slate-400">• Ocorrências fictícias de demonstração</span>
          </div>
          <span className="text-amber-400/90 font-bold">🔒 TRAVA DE SEGURANÇA LIGADA: DESPACHOS EXTERNOS BLOQUEADOS</span>
        </div>
      )}

      {/* 4. Drawer Lateral de Focos Detectados (Collapsible Sidebar) */}
      <FiresDrawer
        fireSpots={isSimulation ? fireSpots : fireSpots.filter(s => !s.is_simulated)}
        isSimulation={isSimulation}
        onSelectSpot={handleSelectSpotFromDrawer}
        selectedSpotId={selectedSpot?.id}
      />

      {/* 5. Banner Flutuante de Área Delimitada */}
      {selectedArea && (
        <div className="absolute top-16 left-12 z-[950] bg-slate-900/95 backdrop-blur-md border border-red-500/80 rounded-lg p-3 shadow-2xl font-mono text-xs text-white max-w-sm animate-fade-in pointer-events-auto">
          <div className="flex items-center justify-between text-red-400 font-bold border-b border-red-900/60 pb-1 mb-2">
            <span>📍 ÁREA DELIMITADA (LEAFLET-DRAW)</span>
            <span className="text-white text-sm font-bold">~{selectedArea.areaSqKm} km²</span>
          </div>
          <div className="text-[11px] text-slate-300 space-y-1 mb-3">
            {selectedArea.road && (
              <div className="text-amber-300 font-bold flex items-start gap-1">
                <span>📍</span>
                <span className="truncate">{selectedArea.road}</span>
              </div>
            )}
            {selectedArea.city && (
              <div className="text-slate-300 text-[10.5px]">
                {selectedArea.neighborhood ? `${selectedArea.neighborhood}, ` : ''}{selectedArea.city} - {selectedArea.state || 'AM'}
                {selectedArea.postcode ? ` • CEP: ${selectedArea.postcode}` : ''}
              </div>
            )}
            {selectedArea.landPropertyName && (
              <div className="text-emerald-400 text-[10px] font-semibold truncate">
                🏛️ CAR: {selectedArea.landPropertyName}
              </div>
            )}
            <div className="pt-1 border-t border-slate-800 text-[10.5px] flex justify-between">
              <span>Hectares: <strong className="text-amber-400">{selectedArea.areaHa} ha</strong></span>
              <span>Área: <strong className="text-cyan-400">{selectedArea.areaSqKm} km²</strong></span>
            </div>
            <div className="truncate text-[9.5px] text-slate-400">Coord: {selectedArea.center.lat.toFixed(5)}, {selectedArea.center.lng.toFixed(5)}</div>
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => setIsAreaInspectionOpen(true)}
              className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded shadow flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs"
            >
              <Compass size={13} />
              <span>VER TODAS AS INFORMAÇÕES DA ÁREA</span>
            </button>
            <button
              onClick={() => setIsWhatsAppModalOpen(true)}
              className="w-full py-1.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold rounded shadow flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs"
            >
              <MessageSquare size={13} />
              <span>DISPARAR WHATSAPP (+55 92 99374-6740)</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. Slider Temporal para Modo Histórico */}
      {temporalMode === 'historical' && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-[950] bg-slate-900/95 backdrop-blur-md border border-cyan-500/60 rounded-xl p-3 shadow-2xl font-mono text-xs text-white flex items-center gap-4 min-w-[420px] pointer-events-auto">
          <div className="font-bold text-cyan-300">LINHA TEMPORAL HISTÓRICA:</div>
          <input
            type="range"
            min="2020"
            max="2026"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="flex-1 cursor-pointer"
          />
          <div className="bg-cyan-950 px-2.5 py-1 rounded border border-cyan-700 text-cyan-300 font-bold text-sm">
            {selectedYear}
          </div>
        </div>
      )}

      {/* 7. Co-piloto de IA Integrado (Grounded no Estado do Mapa & Cerca Virtual - Draggable e Fechável) */}
      <AIAssistantPanel
        isOpen={openWindows.aiAssistant !== false}
        isMinimized={minimizedWindows.aiAssistant === true}
        zIndex={windowZ.aiAssistant || 110}
        onFocus={() => bringToFront('aiAssistant')}
        onClose={() => closeWindow('aiAssistant')}
        onMinimize={() => minimizeWindow('aiAssistant')}
        fires={
          activeGeofence
            ? fireSpots.filter((s) => {
                const poly = normalizeGeofenceToPolygon(activeGeofence);
                return poly.length >= 3 && isPointInPolygon([s.latitude, s.longitude], poly);
              })
            : selectedArea
            ? fireSpots.filter((s) => {
                const minLat = Math.min(selectedArea.northEast.lat, selectedArea.southWest.lat);
                const maxLat = Math.max(selectedArea.northEast.lat, selectedArea.southWest.lat);
                const minLng = Math.min(selectedArea.northEast.lng, selectedArea.southWest.lng);
                const maxLng = Math.max(selectedArea.northEast.lng, selectedArea.southWest.lng);
                return (
                  s.latitude >= minLat &&
                  s.latitude <= maxLat &&
                  s.longitude >= minLng &&
                  s.longitude <= maxLng
                );
              })
            : fireSpots
        }
        selectedArea={selectedArea}
        geofence={activeGeofence}
        activeFacility={selectedFacilityId}
        isSimulation={isSimulation}
      />

      {/* 8. Janelas Flutuantes Desktop UI */}
      
      {/* A. Câmera de Rua In-Memory (Zero-Disk) */}
      <FloatingWindow
        id="videoStream"
        title="Câmera de Rua • Streaming em Memória (Zero-Disk) • OpenCV & YOLOv8"
        isOpen={openWindows.videoStream}
        isMinimized={minimizedWindows.videoStream}
        zIndex={windowZ.videoStream}
        onFocus={bringToFront}
        onClose={closeWindow}
        onMinimize={minimizeWindow}
        defaultPosition={{ x: window.innerWidth - 460, y: 65 }}
        defaultSize={{ width: 440, height: 420 }}
      >
        <VideoStreamWindow onNewFireDetected={handleNewFireDetected} />
      </FloatingWindow>

      {/* B. OSINT Social Feed */}
      <FloatingWindow
        id="osintFeed"
        title="Monitoramento OSINT • Canais Públicos de Fogo e Queimadas"
        isOpen={openWindows.osintFeed}
        isMinimized={minimizedWindows.osintFeed}
        zIndex={windowZ.osintFeed}
        onFocus={bringToFront}
        onClose={closeWindow}
        onMinimize={minimizeWindow}
        defaultPosition={{ x: 60, y: 140 }}
        defaultSize={{ width: 460, height: 420 }}
      >
        <OsintFeedWindow
          alerts={osintAlerts}
          onSelectAlert={(a) => {}}
          onLocateOnMap={handleLocationSelected}
        />
      </FloatingWindow>

      {/* C. Detalhes de Foco Selecionado - Evidência Tática Dinâmica (Zero Mock) */}
      <TacticalEvidenceWindow
        key={selectedSpot?.id || 'none'}
        spot={selectedSpot}
        isOpen={openWindows.spotDetail}
        isMinimized={minimizedWindows.spotDetail}
        zIndex={windowZ.spotDetail}
        onFocus={bringToFront}
        onClose={closeWindow}
        onMinimize={minimizeWindow}
        onStatusChange={handleSpotStatusChange}
        isSimulation={isSimulation}
      />

      {/* D. NASA FIRMS VIIRS (Painel Tático com Telemetria e Camada WMS Integrada) */}
      <FloatingWindow
        id="firms"
        title="NASA FIRMS • Focos Térmicos VIIRS / MODIS"
        isOpen={openWindows.firms}
        isMinimized={minimizedWindows.firms}
        zIndex={windowZ.firms}
        onFocus={bringToFront}
        onClose={closeWindow}
        onMinimize={minimizeWindow}
        defaultPosition={{ x: 120, y: 90 }}
        defaultSize={{ width: 660, height: 460 }}
      >
        <div className="p-4 bg-slate-950 font-mono text-xs text-white h-full flex flex-col justify-between overflow-y-auto">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-amber-900/60 pb-2">
              <div className="flex items-center gap-2">
                <Satellite className="w-5 h-5 text-amber-400 animate-pulse" />
                <div>
                  <h3 className="font-bold text-amber-300 text-sm">NASA FIRMS (Earthdata GIBS)</h3>
                  <p className="text-[10px] text-slate-400">Fire Information for Resource Management System</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold border ${activeOverlays.nasaFirms ? 'bg-amber-950 text-amber-300 border-amber-500' : 'bg-slate-900 text-slate-400 border-slate-700'}`}>
                {activeOverlays.nasaFirms ? 'CAMADA MAPA ATIVA' : 'CAMADA MAPA INATIVA'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5">
                <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Sensores Primários</span>
                <span className="text-white font-bold">VIIRS S-NPP (375m) & NOAA-20</span>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5">
                <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Resolução Radiométrica</span>
                <span className="text-amber-300 font-bold">Canal Térmico I4 (3.74 µm)</span>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5">
                <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Cobertura Global</span>
                <span className="text-emerald-300 font-bold">Órbita Heliossíncrona (~13:30 LT)</span>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5">
                <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Alimentação WMS</span>
                <span className="text-cyan-300 font-bold">EPSG:3857 / EPSG:4326</span>
              </div>
            </div>

            <div className="bg-amber-950/30 border border-amber-800/40 rounded p-2.5 text-[10.5px] text-amber-200/90 leading-relaxed">
              💡 <strong>Dica Operacional:</strong> Ative a camada WMS diretamente no mapa tático principal para visualizar a mancha térmica sincronizada com os alertas sonoros e radares de chuva.
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex flex-wrap gap-2">
            <button
              onClick={() => handleToggleOverlay('nasaFirms')}
              className={`flex-1 py-2 px-3 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 shadow ${
                activeOverlays.nasaFirms
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-amber-950 hover:bg-amber-900 text-amber-200 border border-amber-600'
              }`}
            >
              <Satellite size={13} />
              <span>{activeOverlays.nasaFirms ? 'Desativar Camada no Mapa' : 'Ativar Camada WMS no Mapa'}</span>
            </button>
            <button
              onClick={() => window.open('https://firms.modaps.eosdis.nasa.gov/map/#d:24hrs;@-60.0,-3.1,8z', '_blank')}
              className="py-2 px-3 rounded text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
            >
              <ExternalLink size={13} />
              <span>Portal NASA FIRMS ↗</span>
            </button>
            <button
              onClick={() => window.open('https://zoom.earth/maps/satellite/#view=-5.790675,-66.643552,8z/overlays=heat,fires', '_blank')}
              className="py-2 px-3 rounded text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition flex items-center gap-1.5"
            >
              <ExternalLink size={13} />
              <span>Zoom.earth Focos ↗</span>
            </button>
          </div>
        </div>
      </FloatingWindow>

      {/* E. Google Earth 3D (Visualizador Tático com Telemetria e Voo Direto) */}
      <FloatingWindow
        id="googleEarth"
        title="Google Earth 3D • Reconhecimento Topográfico e Relevo"
        isOpen={openWindows.googleEarth}
        isMinimized={minimizedWindows.googleEarth}
        zIndex={windowZ.googleEarth}
        onFocus={bringToFront}
        onClose={closeWindow}
        onMinimize={minimizeWindow}
        defaultPosition={{ x: 240, y: 110 }}
        defaultSize={{ width: 620, height: 440 }}
      >
        <GoogleEarth3DWindow
          onActivateOnMap={() => {
            setCurrentLayer('google_earth');
          }}
          onFlyTo={(lat, lng) => {
            setTargetMapLocation({ center: [lat, lng], zoom: 14, trigger: Date.now() });
          }}
        />
      </FloatingWindow>

      {/* F. INPE BDQueimadas (Painel Tático com Telemetria Oficial e Camada WMS) */}
      <FloatingWindow
        id="bdqueimadas"
        title="INPE • Portal BDQueimadas (Bioma Amazônia)"
        isOpen={openWindows.bdqueimadas}
        isMinimized={minimizedWindows.bdqueimadas}
        zIndex={windowZ.bdqueimadas}
        onFocus={bringToFront}
        onClose={closeWindow}
        onMinimize={minimizeWindow}
        defaultPosition={{ x: 320, y: 140 }}
        defaultSize={{ width: 620, height: 460 }}
      >
        <div className="p-4 bg-slate-950 font-mono text-xs text-white h-full flex flex-col justify-between overflow-y-auto">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-red-900/60 pb-2">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-500 animate-pulse" />
                <div>
                  <h3 className="font-bold text-red-400 text-sm">INPE BDQueimadas (TerraBrasilis)</h3>
                  <p className="text-[10px] text-slate-400">Programa Queimadas • Monitoramento Oficial do Brasil</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold border ${activeOverlays.inpeBdqueimadas ? 'bg-red-950 text-red-300 border-red-500' : 'bg-slate-900 text-slate-400 border-slate-700'}`}>
                {activeOverlays.inpeBdqueimadas ? 'CAMADA MAPA ATIVA' : 'CAMADA MAPA INATIVA'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5">
                <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Satélite de Referência</span>
                <span className="text-white font-bold">AQUA M-T (Sensor MODIS)</span>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5">
                <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Satélites Geoestacionários</span>
                <span className="text-red-300 font-bold">GOES-16 & MSG-3</span>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5">
                <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Órgãos Vinculados</span>
                <span className="text-emerald-300 font-bold">IBAMA, PrevFogo, ICMBio, CBMAM</span>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5">
                <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Filtro de Ruído</span>
                <span className="text-cyan-300 font-bold">Máscara Solar e Nuvem Ativa</span>
              </div>
            </div>

            <div className="bg-red-950/30 border border-red-800/40 rounded p-2.5 text-[10.5px] text-red-200/90 leading-relaxed">
              🇧🇷 <strong>Base Oficial Laudos:</strong> Os dados do INPE alimentam os boletins diários de situação da Defesa Civil e autos de infração ambiental do IBAMA e IPAAM.
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex flex-wrap gap-2">
            <button
              onClick={() => handleToggleOverlay('inpeBdqueimadas')}
              className={`flex-1 py-2 px-3 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 shadow ${
                activeOverlays.inpeBdqueimadas
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-red-950 hover:bg-red-900 text-red-200 border border-red-600'
              }`}
            >
              <Flame size={13} />
              <span>{activeOverlays.inpeBdqueimadas ? 'Desativar Camada no Mapa' : 'Ativar Camada WMS no Mapa'}</span>
            </button>
            <button
              onClick={() => window.open('https://terrabrasilis.dpi.inpe.br/queimadas/bdqueimadas/', '_blank')}
              className="py-2 px-3 rounded text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
            >
              <ExternalLink size={13} />
              <span>Portal INPE BDQueimadas ↗</span>
            </button>
            <button
              onClick={() => window.open('https://terrabrasilis.dpi.inpe.br/app/dashboard/alerts/biomes/legal_amazon/aggregated/', '_blank')}
              className="py-2 px-3 rounded text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 transition flex items-center gap-1.5"
            >
              <ExternalLink size={13} />
              <span>Painel Amazônia Legal ↗</span>
            </button>
          </div>
        </div>
      </FloatingWindow>

      {/* G. Visão da Rua (Street View 360° em Tempo Real) */}
      <FloatingWindow
        id="streetView"
        title={`Visão da Rua • ${streetViewLocation?.label || 'Street View 360°'}`}
        isOpen={openWindows.streetView}
        isMinimized={minimizedWindows.streetView}
        zIndex={windowZ.streetView}
        onFocus={bringToFront}
        onClose={closeWindow}
        onMinimize={minimizeWindow}
        defaultPosition={{ x: 80, y: 70 }}
        defaultSize={{ width: 620, height: 440 }}
      >
        {streetViewLocation ? (
          <StreetViewWindow
            location={streetViewLocation}
            onFlyTo={(lat, lng) => {
              setTargetMapLocation({ center: [lat, lng], zoom: 17, trigger: Date.now() });
            }}
          />
        ) : (
          <div className="p-6 text-center text-slate-300 space-y-3 font-mono flex flex-col items-center justify-center h-full">
            <Compass className="w-12 h-12 text-cyan-400 animate-spin-slow" />
            <p className="text-sm font-semibold text-white">Nenhum Ponto Selecionado</p>
            <p className="text-xs text-slate-400 max-w-sm">
              Selecione qualquer foco de calor, instalação industrial ou clique no botão abaixo para abrir a visão 360° no centro atual da câmera do radar.
            </p>
            <button
              onClick={() => {
                const lat = currentMapCenter?.lat ?? -3.1019;
                const lng = currentMapCenter?.lng ?? -60.0250;
                setStreetViewLocation({
                  lat,
                  lng,
                  label: 'Centro Tático do Mapa',
                });
              }}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold transition-all shadow cursor-pointer"
            >
              Abrir no Centro Atual ({currentMapCenter?.lat ? currentMapCenter.lat.toFixed(4) : '-3.1019'}, {currentMapCenter?.lng ? currentMapCenter.lng.toFixed(4) : '-60.0250'})
            </button>
          </div>
        )}
      </FloatingWindow>

      {/* 9. Modal de Confirmação e Despacho Seguro WhatsApp */}
      <WhatsAppConfirmModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        selectedArea={selectedArea}
        selectedSpot={selectedSpot}
      />

      {/* 10. Bottom Taskbar Dock */}
      <BottomDock
        openWindows={openWindows}
        minimizedWindows={minimizedWindows}
        onToggleWindow={(id) => {
          if (id === 'whatsappAlert') {
            setIsWhatsAppModalOpen(true);
            return;
          }
          if (id === 'floorPlan') {
            setIsFloorPlanOpen(true);
            return;
          }
          if (id === 'reports') {
            setIsReportsOpen(true);
            return;
          }
          if (id === 'settings') {
            setIsSettingsOpen(true);
            return;
          }
          if (id === 'spotDetail') {
            if (!selectedSpot && fireSpots.length > 0) {
              setSelectedSpot(fireSpots[0]);
            }
            toggleWindow('spotDetail');
            return;
          }
          if (id === 'streetView') {
            if (!streetViewLocation) {
              const lat = currentMapCenter?.lat ?? (targetMapLocation?.center?.[0] || -3.1019);
              const lng = currentMapCenter?.lng ?? (targetMapLocation?.center?.[1] || -60.0250);
              setStreetViewLocation({
                lat,
                lng,
                label: 'Área Central do Radar Tático',
              });
            }
            toggleWindow('streetView');
            return;
          }
          if (id === 'geofence') {
            if (activeGeofence) {
              const nextEdit = !isEditingGeofence;
              setIsEditingGeofence(nextEdit);
              const centroid = getPolygonCentroid(normalizeGeofenceToPolygon(activeGeofence));
              setTargetMapLocation({ center: centroid, zoom: 16, trigger: Date.now() });
            } else {
              handleCreateNewGeofence();
              setIsEditingGeofence(true);
            }
            return;
          }
          toggleWindow(id);
        }}
        isGeofenceActive={Boolean(activeGeofence)}
      />

      {/* 11. Modal de Planta Baixa Estrutural e Mapeamento Térmico Dinâmico (Lazy) */}
      <React.Suspense fallback={null}>
        <FloorPlanModal
          isOpen={isFloorPlanOpen}
          onClose={() => setIsFloorPlanOpen(false)}
          selectedFacilityId={selectedFacilityId}
          isSimulation={isSimulation}
          onActivateGeofence={(fac) => {
            handleActivateGeofence(fac);
          }}
          onTriggerAutoEmergency={(fac) => {
            handleTriggerAutoEmergency(fac);
          }}
          onFlyToFacility={(lat, lng) => {
            setTargetMapLocation({ center: [lat, lng], zoom: 17, trigger: Date.now() });
          }}
        />
      </React.Suspense>

      {/* 12. Modal de Protocolo Automatizado de Emergência (30s) */}
      <AutoEmergencyCountdown
        isOpen={isAutoEmergencyOpen}
        onClose={() => setIsAutoEmergencyOpen(false)}
        facility={emergencyFacility || INDUSTRIAL_FACILITIES[0]}
        incident={(emergencyFacility || INDUSTRIAL_FACILITIES[0]).activeIncident}
        defaultCountdownSeconds={30}
      />

      {/* 13. Modal de Informações Detalhadas da Área Clicada / Delimitada (Lazy) */}
      {selectedArea && (
        <React.Suspense fallback={null}>
          <AreaInspectionModal
            isOpen={isAreaInspectionOpen}
            onClose={() => setIsAreaInspectionOpen(false)}
            area={selectedArea}
            allFires={fireSpots}
            onOpenReport={() => {
              setIsReportsOpen(true);
            }}
            onDispatchWhatsApp={(area) => {
              setIsWhatsAppModalOpen(true);
            }}
            onActivateGeofence={(area) => {
              handleActivateGeofence({
                id: 'geofence-custom-area',
                name: `Área Delimitada (~${area.areaSqKm} km²)`,
                lat: area.center.lat,
                lng: area.center.lng,
                areaKm2: area.areaSqKm,
                description: 'Área delimitada pelo operador para isolamento e vigilância de IA',
                bounds: [
                  [area.northEast.lat, area.northEast.lng],
                  [area.southWest.lat, area.southWest.lng],
                ],
              } as any);
            }}
          />
        </React.Suspense>
      )}

      {/* 14. Centro de Relatórios e Estatísticas (Lazy) */}
      <React.Suspense fallback={null}>
        <ReportsModal
          isOpen={isReportsOpen}
          onClose={() => setIsReportsOpen(false)}
          fireSpots={fireSpots}
          selectedArea={selectedArea}
          onSelectLocation={(lat, lng) => {
            setTargetMapLocation({ center: [lat, lng], zoom: 13, trigger: Date.now() });
          }}
        />
      </React.Suspense>

      {/* 15. Centro de Configurações do Sistema */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={systemConfig}
        onSaveConfig={(newCfg) => {
          setSystemConfig(newCfg);
          localStorage.setItem('amazonia_fire_watch_config', JSON.stringify(newCfg));
          if (newCfg.defaultBaseLayer) {
            setCurrentLayer(newCfg.defaultBaseLayer);
          }
        }}
      />
      {/* Modal de Autenticação / Cadastro C2 */}
      {isAuthModalOpen && (
        <AuthPage
          onSuccess={() => setIsAuthModalOpen(false)}
          onCancel={() => setIsAuthModalOpen(false)}
        />
      )}

      {/* 16. Modal de Auditoria e Ocorrências 24h da Cerca Virtual */}
      <GeofenceIncidentsModal
        isOpen={isIncidentsModalOpen}
        onClose={() => setIsIncidentsModalOpen(false)}
        incidents={geofenceIncidents}
        onClearIncidents={() => geofence24hMonitor.clearIncidents()}
        onFlyToLocation={(lat, lng) => {
          setTargetMapLocation({ center: [lat, lng], zoom: 16, trigger: Date.now() });
        }}
        isAutoReportEnabled={isAutoReportActive}
        onToggleAutoReport={() => {
          const nextVal = !isAutoReportActive;
          setIsAutoReportActive(nextVal);
          geofence24hMonitor.setAutoReportActive(nextVal);
        }}
      />

      {/* 17. Toast Alerta de Violação de Perímetro da Cerca Virtual 24h */}
      {perimeterBreachAlert && (
        <div className="fixed top-20 right-4 z-[1300] max-w-md bg-red-950/95 border-2 border-red-500 rounded-xl p-3 shadow-[0_0_35px_rgba(239,68,68,0.5)] font-mono text-white animate-bounce pointer-events-auto">
          <div className="flex items-start justify-between gap-2 border-b border-red-800 pb-1.5 mb-1.5">
            <div className="flex items-center gap-1.5 font-black text-xs text-red-200">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping" />
              <span>🚨 INVASÃO DE CERCA VIRTUAL 24H DETECTADA!</span>
            </div>
            <button
              onClick={() => setPerimeterBreachAlert(null)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="text-[11px] text-slate-200 space-y-1">
            <div>
              Cerca: <strong className="text-cyan-300">{perimeterBreachAlert.incident.geofenceName}</strong>
            </div>
            <div>
              Potência Térmica: <strong className="text-amber-300">{perimeterBreachAlert.incident.frpMw} MW</strong> • Sensor: <strong className="text-slate-300">{perimeterBreachAlert.incident.satellite}</strong>
            </div>
            <div className="text-[10px] text-emerald-300 font-bold bg-slate-950/80 p-1 rounded border border-emerald-800/60">
              ✓ Protocolo executado: Alerta de voz sintetizado e reporte WhatsApp despachado automaticamente!
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
