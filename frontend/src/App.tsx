import React, { useState, useEffect, useRef } from 'react';
import { MainMap } from './components/MainMap';
import { FloatingWindow } from './components/FloatingWindow';
import { VideoStreamWindow } from './components/VideoStreamWindow';
import { OsintFeedWindow } from './components/OsintFeedWindow';
import { HoverPreviewCard } from './components/HoverPreviewCard';
import { AIAssistantPanel } from './components/AIAssistantPanel';
import { SearchBar } from './components/SearchBar';
import { FiresDrawer } from './components/FiresDrawer';
import { WhatsAppConfirmModal } from './components/WhatsAppConfirmModal';
import L from 'leaflet';
import { BottomDock } from './components/BottomDock';
import { AreaInspectionModal } from './components/AreaInspectionModal';
import { ReportsModal } from './components/ReportsModal';
import { SettingsModal, DEFAULT_CONFIG, SystemConfigState } from './components/SettingsModal';
import { Settings, Compass, User as UserIcon, LogOut, UserCheck } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/AuthPage';
import { LandingPage } from './components/LandingPage';
import { Globe2 } from 'lucide-react';
import { LayerNavigationBar } from './components/LayerNavigationBar';
import { DelimitedArea, OSINTAlert, FireSpot, TemporalMode, MapLayerType, MAP_LAYERS, ActiveOverlaysState } from './types';
import { fetchNationalFires, fetchHeatmapData, fetchTimelineData, fetchOsintAlerts } from './services/api';
import { sendWhatsAppFireAlert } from './services/alertService';
import { goes16Manager } from './services/goes16PollingService';
import { Flame, ShieldAlert, Radio, Satellite, Globe, MessageSquare, Clock, Calendar, BarChart2, Layers, Truck, Droplets, Zap, CheckCircle2, Wind } from 'lucide-react';
import { findNearestInfrastructure } from './data/emergencyInfrastructure';
import { calculateAirQuality } from './data/airQuality';
import { GoogleEarth3DWindow } from './components/GoogleEarth3DWindow';
import { StreetViewWindow } from './components/StreetViewWindow';
import { NewFireAlertBanner } from './components/NewFireAlertBanner';
import { TacticalEvidenceWindow } from './components/TacticalEvidenceWindow';
import { FloorPlanModal } from './components/FloorPlanModal';
import { AutoEmergencyCountdown } from './components/AutoEmergencyCountdown';
import { INDUSTRIAL_FACILITIES, Facility } from './data/facilityFloorPlans';

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
      const local = localStorage.getItem('amazonia_fire_spots_cache');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
  const [searchMarker, setSearchMarker] = useState<{ lat: number; lng: number; label: string } | null>(null);

  // Módulo de Cerca Virtual (Isolamento Geográfico) & Planta Baixa
  const [activeGeofence, setActiveGeofence] = useState<{
    id: string;
    name: string;
    bounds?: [[number, number], [number, number]];
    polygon?: [number, number][];
    areaKm2: number;
    facilityId?: string;
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
    osintFeed: 104,
    firms: 101,
    googleEarth: 102,
    bdqueimadas: 103,
    spotDetail: 107,
    streetView: 108
  });

  const [openWindows, setOpenWindows] = useState<{ [id: string]: boolean }>({
    videoStream: false,
    osintFeed: false,
    firms: false,
    googleEarth: false,
    bdqueimadas: false,
    whatsappAlert: false,
    spotDetail: false,
    streetView: false
  });

  const [minimizedWindows, setMinimizedWindows] = useState<{ [id: string]: boolean }>({
    videoStream: false,
    osintFeed: false,
    firms: false,
    googleEarth: false,
    bdqueimadas: false,
    whatsappAlert: false,
    spotDetail: false,
    streetView: false
  });

  const [isSimulation, setIsSimulation] = useState<boolean>(() => {
    const saved = localStorage.getItem('isSimulation');
    return saved !== null ? saved === 'true' : false; // Padrão: DADOS REAIS DE SATÉLITE
  });

  const toggleSimulationMode = () => {
    const nextVal = !isSimulation;
    setIsSimulation(nextVal);
    localStorage.setItem('isSimulation', String(nextVal));
    if (!nextVal) {
      // Switching to REAL: clear simulated items
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

  // Hidratação instantânea (0ms): se o estado inicial estiver vazio, carrega imediatamente o cache local da NASA
  useEffect(() => {
    if (fireSpots.length === 0) {
      fetch('/real_firms_cache.json')
        .then(res => (res.ok ? res.json() : []))
        .then((cachedSpots: FireSpot[]) => {
          if (cachedSpots && Array.isArray(cachedSpots) && cachedSpots.length > 0) {
            setFireSpots(prev => (prev.length === 0 ? cachedSpots : prev));
          }
        })
        .catch(() => {});
    }
  }, []);

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
          // Reconcilia focos do GOES-16 (geoestacionário) com passagens de alta resolução do VIIRS/MODIS
          goes16Manager.reconcileWithPolarFires(spots);
          const goesSpots = goes16Manager.getActiveGoesSpots();
          const combined = [...goesSpots, ...spots];
          const seen = new Set();
          const uniqueSpots = combined.filter(s => {
            if (seen.has(s.id)) return false;
            seen.add(s.id);
            return true;
          });
          setFireSpots(uniqueSpots);
          try {
            localStorage.setItem('amazonia_fire_spots_cache', JSON.stringify(uniqueSpots));
          } catch {}
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
    setFireSpots(prev => {
      const exists = prev.some(s => s.id === spot.id);
      if (exists) return prev;
      return [spot, ...prev];
    });
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
    setIsAreaInspectionOpen(true);
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
    setSelectedArea(inspectedArea);
    setIsAreaInspectionOpen(true);
  };

  const handleSpotClick = (spot: FireSpot) => {
    setSelectedSpot(spot);
    setIsBannerVisible(true);
    setOpenWindows(prev => ({ ...prev, spotDetail: true }));
    setMinimizedWindows(prev => ({ ...prev, spotDetail: false }));
    bringToFront('spotDetail');
  };

  const handleActivateGeofence = (facility: Facility) => {
    setActiveGeofence({
      id: facility.id,
      name: facility.name,
      bounds: facility.bounds,
      polygon: facility.polygon,
      areaKm2: facility.areaKm2,
      facilityId: facility.id,
    });
    setSelectedFacilityId(facility.id);
    setTargetMapLocation({
      center: [facility.coordinates.lat, facility.coordinates.lng],
      zoom: 17,
      trigger: Date.now(),
    });
  };

  const handleClearGeofence = () => {
    setActiveGeofence(null);
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
        // Filtragem estrita do Ecossistema IA quando a Cerca Virtual está ativa
        let displayFireSpots = fireSpots;
        if (activeGeofence) {
          displayFireSpots = fireSpots.filter((s) => {
            if (activeGeofence.bounds) {
              const [sw, ne] = activeGeofence.bounds;
              const minLat = Math.min(sw[0], ne[0]);
              const maxLat = Math.max(sw[0], ne[0]);
              const minLng = Math.min(sw[1], ne[1]);
              const maxLng = Math.max(sw[1], ne[1]);
              return s.latitude >= minLat && s.latitude <= maxLat && s.longitude >= minLng && s.longitude <= maxLng;
            }
            return true;
          });

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
              is_arson_cluster: false
            }];
          }
        } else if (onlyNewOutbreaks) {
          displayFireSpots = fireSpots.filter(f => f.is_new_outbreak);
        }

        return (
          <MainMap
            onAreaSelected={handleAreaSelected}
            onInspectMapPoint={handleInspectMapPoint}
            fireSpots={displayFireSpots}
            activeGeofence={activeGeofence}
            onClearGeofence={handleClearGeofence}
            onOpenFloorPlan={handleOpenFloorPlan}
            onActivateGeofence={handleActivateGeofence}
            onTriggerAutoEmergency={handleTriggerAutoEmergency}
            isSimulation={isSimulation}
        heatmapSpots={heatmapSpots}
        osintAlerts={osintAlerts}
        onOsintClick={(alert) => {
          setOpenWindows(prev => ({ ...prev, osintFeed: true }));
          setMinimizedWindows(prev => ({ ...prev, osintFeed: false }));
          bringToFront('osintFeed');
        }}
        onHoverSpot={(spot, pos) => {
          setHoveredSpot(spot);
          setHoverPosition(pos);
        }}
        onLeaveSpot={() => setHoveredSpot(null)}
        onSpotClick={handleSpotClick}
        temporalMode={temporalMode}
        currentLayer={currentLayer}
        activeOverlays={activeOverlays}
        showHeatmapOverlay={Boolean(activeOverlays.heatmap || showHeatmapOverlay)}
        externalTargetView={targetMapLocation}
        searchMarker={searchMarker}
        onOpenStreetView={handleOpenStreetView}
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

      {/* 3. Top Header Compacto em Linha Única (Sem Transbordamento Horizontal) */}
      <header className="absolute top-0 left-0 right-0 z-20 h-11 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-3 py-1 flex items-center justify-between text-white pointer-events-auto select-none overflow-x-auto scrollbar-none gap-2">
        {/* Logo & Identificação Compacta */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-red-600/20 border border-red-500/60 shadow-[0_0_8px_rgba(255,30,39,0.3)]">
            <Flame className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="font-bold text-xs tracking-wider">FIRE WATCH AI</span>
            <span className="px-1 py-0.2 text-[8.5px] font-mono font-semibold bg-red-950 text-red-400 border border-red-800 rounded">
              BRASIL
            </span>
          </div>
        </div>

        {/* Campo de Busca Compacto (w-48 ou w-56) */}
        <div className="hidden lg:block flex-shrink-0">
          <SearchBar
            onLocationSelected={handleLocationSelected}
            onOpenStreetView={handleOpenStreetView}
            onOpenEarth3D={(lat, lng) => {
              setCurrentLayer('google_earth');
              setTargetMapLocation({ center: [lat, lng], zoom: 16, trigger: Date.now() });
            }}
          />
        </div>

        {/* Seletor Compacto de Camadas e Overlays */}
        <div className="flex items-center space-x-1.5 flex-shrink-0">
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
            className={`h-7 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium transition-all flex items-center gap-1 border ${
              onlyNewOutbreaks
                ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400 font-bold shadow-sm shadow-yellow-950 animate-pulse'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
            }`}
            title="Filtrar apenas focos detectados há menos de 180 minutos"
          >
            <span>🚨</span>
            <span className="whitespace-nowrap">Novos (&lt;3h)</span>
          </button>

          {/* Filtro Temporal Compacto */}
          <div className="flex items-center space-x-1 bg-slate-950/80 border border-slate-800 rounded-md p-0.5 text-xs font-mono">
            <button
              onClick={() => setTemporalMode('24h')}
              className={`h-7 px-2 py-0.5 rounded text-[11px] transition-all flex items-center gap-1 ${
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
              className={`h-7 px-2 py-0.5 rounded text-[11px] transition-all flex items-center gap-1 ${
                temporalMode === 'month'
                  ? 'bg-amber-950 text-amber-300 border border-amber-700 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Mês</span>
            </button>
            <button
              onClick={() => setTemporalMode('historical')}
              className={`h-7 px-2 py-0.5 rounded text-[11px] transition-all flex items-center gap-1 ${
                temporalMode === 'historical'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Anual</span>
            </button>
          </div>
        </div>

        {/* Toggle Switch: Modo Simulação vs Operação Real */}
        <div className="flex items-center space-x-2 text-xs font-mono flex-shrink-0">
          <div className="flex items-center space-x-1.5">
            <button
              onClick={toggleSimulationMode}
              className={`h-7 px-2.5 py-0.5 rounded-md text-[10.5px] font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm border cursor-pointer ${
                isSimulation
                  ? 'bg-amber-950/90 text-amber-300 border-amber-500/80 hover:bg-amber-900/90 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                  : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/80 hover:bg-emerald-900/90 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
              }`}
              title={isSimulation ? 'Modo Simulação Ativo. Clique para mudar para Dados Reais de Satélite' : 'Modo Operação Real Ativo. Clique para alternar para Simulação'}
            >
              <span className="text-[11px]">{isSimulation ? '🧪' : '🛰️'}</span>
              <span>{isSimulation ? 'SIMULAÇÃO' : 'DADOS REAIS'}</span>
              
              <div
                className={`w-7 h-3.5 rounded-full p-0.5 transition-colors flex items-center ${
                  isSimulation ? 'bg-amber-600 justify-start' : 'bg-emerald-500 justify-end'
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-transform" />
              </div>
            </button>

            {isSimulation ? (
              <button
                onClick={() => setIsWhatsAppModalOpen(true)}
                className="hidden 2xl:flex items-center space-x-1.5 text-amber-400 bg-slate-950/80 hover:bg-amber-950/40 px-2 py-1 rounded border border-amber-800/80 transition cursor-pointer text-[10px]"
                title="Canal de teste de homologação (+55 92 99374-6740)"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                <span>TESTE: +55 92 99374-6740</span>
              </button>
            ) : (
              <div
                className="hidden 2xl:flex items-center space-x-1.5 text-emerald-400 bg-slate-950/80 px-2 py-1 rounded border border-emerald-800/80 text-[10px] font-bold"
                title="Consumindo órbitas reais NASA FIRMS e INPE"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>NASA FIRMS &amp; INPE (REAL)</span>
              </div>
            )}
          </div>

          {/* Botão de Relatórios */}
          <button
            onClick={() => setIsReportsOpen(true)}
            className="h-7 px-2.5 py-0.5 rounded-md text-[10.5px] font-mono font-bold flex items-center gap-1.5 bg-purple-950/90 hover:bg-purple-900 text-purple-200 border border-purple-700/80 transition-all shadow-sm cursor-pointer"
            title="Abrir Centro de Relatórios e Estatísticas de Queimadas"
          >
            <BarChart2 size={12} className="text-purple-400" />
            <span>Relatórios</span>
          </button>

          {/* Botão de Portal SaaS / Demonstração Comercial */}
          <button
            onClick={() => handleSwitchView('landing')}
            className="h-7 px-2.5 py-0.5 rounded-md text-[10.5px] font-mono font-bold flex items-center gap-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-amber-300 border border-amber-600/70 transition-all shadow-sm cursor-pointer"
            title="Abrir Portal Comercial SaaS, Simulador e Planos"
          >
            <Globe2 size={12} className="text-amber-400" />
            <span>Portal SaaS</span>
          </button>

          {/* Botão de Configurações */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="h-7 px-2.5 py-0.5 rounded-md text-[10.5px] font-mono font-bold flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-all shadow-sm cursor-pointer"
            title="Abrir Centro de Configurações do Sistema"
          >
            <Settings size={12} className="text-slate-400" />
            <span>Config</span>
          </button>

          {/* Autenticação / Operador C2 */}
          {user ? (
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-emerald-600/70 rounded-md px-2 py-0.5 text-xs font-mono shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] text-emerald-300 font-bold truncate max-w-[130px]" title={profile?.full_name || user.email || 'Operador'}>
                {profile?.full_name || user.email?.split('@')[0]}
              </span>
              <button
                onClick={() => signOut()}
                className="p-1 text-slate-400 hover:text-red-400 rounded transition"
                title="Encerrar Sessão Tática"
              >
                <LogOut size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="h-7 px-2.5 py-0.5 rounded-md text-[10.5px] font-mono font-bold flex items-center gap-1.5 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white shadow-sm cursor-pointer transition border border-orange-500/60"
              title="Acesso Operacional / Login C2"
            >
              <UserIcon size={12} />
              <span>Entrar / Cadastrar</span>
            </button>
          )}

          <div className="hidden sm:flex items-center space-x-1 text-slate-300 bg-slate-950/80 px-2 py-1 rounded border border-slate-800 text-[11px]">
            <Clock size={11} className="text-amber-300" />
            <TacticalClock />
          </div>
        </div>
      </header>

      {/* Faixa Indicadora de Cerca Virtual Ativa (Isolamento Geográfico da IA) */}
      {activeGeofence && (
        <div className="absolute top-11 left-0 right-0 z-30 bg-cyan-950/95 border-b-2 border-cyan-400 px-4 py-1.5 flex items-center justify-between text-xs font-mono text-cyan-200 pointer-events-auto backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-bold text-white text-xs">
              🔒 CERCA VIRTUAL ATIVA: <span className="text-cyan-300">{activeGeofence.name}</span>
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300">
              Área: <strong className="text-white">{activeGeofence.areaKm2.toFixed(3)} km²</strong> ({(activeGeofence.areaKm2 * 100).toFixed(1)} ha)
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-amber-300 font-bold hidden md:inline">
              ⚡ Ecossistema IA focado e isolado exclusivamente nesta zona
            </span>
          </div>

          <div className="flex items-center gap-2">
            {activeGeofence.facilityId && (
              <button
                onClick={() => handleOpenFloorPlan(activeGeofence.facilityId)}
                className="px-2.5 py-1 rounded bg-cyan-800 hover:bg-cyan-700 text-white border border-cyan-400 text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer shadow-md"
              >
                <span>🏢 Planta Baixa</span>
              </button>
            )}
            <button
              onClick={handleClearGeofence}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-red-900/90 text-slate-300 hover:text-white border border-slate-700 text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <span>✕ Desativar Isolamento</span>
            </button>
          </div>
        </div>
      )}

      {/* Faixa Indicadora de Modo Simulação */}
      {isSimulation && (
        <div className="absolute top-11 left-0 right-0 z-10 bg-amber-500/10 border-b border-amber-500/30 px-3 py-0.5 flex items-center justify-between text-[10px] font-mono text-amber-300 pointer-events-none backdrop-blur-xs">
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
        fireSpots={fireSpots}
        onSelectSpot={handleSelectSpotFromDrawer}
        selectedSpotId={selectedSpot?.id}
      />

      {/* 5. Banner Flutuante de Área Delimitada */}
      {selectedArea && (
        <div className="absolute top-16 left-12 z-20 bg-slate-900/95 backdrop-blur-md border border-red-500/80 rounded-lg p-3 shadow-2xl font-mono text-xs text-white max-w-sm animate-fade-in pointer-events-auto">
          <div className="flex items-center justify-between text-red-400 font-bold border-b border-red-900/60 pb-1 mb-2">
            <span>📍 ÁREA DELIMITADA (LEAFLET-DRAW)</span>
            <span className="text-white text-sm font-bold">~{selectedArea.areaSqKm} km²</span>
          </div>
          <div className="text-[11px] text-slate-300 space-y-1 mb-3">
            <div>Hectares: <span className="text-amber-400 font-bold">{selectedArea.areaHa} ha</span></div>
            <div>Metros²: <span className="text-cyan-400 font-bold">{selectedArea.areaM2.toLocaleString('pt-BR')} m²</span></div>
            <div className="truncate">Centro: {selectedArea.center.lat.toFixed(5)}, {selectedArea.center.lng.toFixed(5)}</div>
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
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-20 bg-slate-900/95 backdrop-blur-md border border-cyan-500/60 rounded-xl p-3 shadow-2xl font-mono text-xs text-white flex items-center gap-4 min-w-[420px] pointer-events-auto">
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

      {/* 7. Co-piloto de IA Integrado (Grounded no Estado do Mapa & Cerca Virtual) */}
      <AIAssistantPanel
        fires={activeGeofence ? fireSpots.filter(s => s.latitude >= -3.15 && s.latitude <= -3.05) : fireSpots}
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

      {/* D. NASA FIRMS VIIRS (Via Backend Proxy Anti-403) */}
      <FloatingWindow
        id="firms"
        title="NASA FIRMS • Focos VIIRS / MODIS (Amazonas)"
        url="http://localhost:8000/api/proxy?url=https%3A%2F%2Fzoom.earth%2Fmaps%2Fsatellite%2F%23view%3D-5.790675%2C-66.643552%2C11z%2Foverlays%3Dheat%2Cfires"
        isOpen={openWindows.firms}
        isMinimized={minimizedWindows.firms}
        zIndex={windowZ.firms}
        onFocus={bringToFront}
        onClose={closeWindow}
        onMinimize={minimizeWindow}
        defaultPosition={{ x: 120, y: 90 }}
        defaultSize={{ width: 660, height: 450 }}
      />

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

      {/* F. INPE BDQueimadas (Via Backend Proxy Anti-403) */}
      <FloatingWindow
        id="bdqueimadas"
        title="INPE • Portal BDQueimadas (Bioma Amazônia)"
        url="https://terrabrasilis.dpi.inpe.br/queimadas/bdqueimadas/"
        isOpen={openWindows.bdqueimadas}
        isMinimized={minimizedWindows.bdqueimadas}
        zIndex={windowZ.bdqueimadas}
        onFocus={bringToFront}
        onClose={closeWindow}
        onMinimize={minimizeWindow}
        defaultPosition={{ x: 320, y: 140 }}
        defaultSize={{ width: 620, height: 430 }}
      />

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
        {streetViewLocation && (
          <StreetViewWindow
            location={streetViewLocation}
            onFlyTo={(lat, lng) => {
              setTargetMapLocation({ center: [lat, lng], zoom: 17, trigger: Date.now() });
            }}
          />
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
          if (id === 'geofence') {
            if (activeGeofence) {
              setActiveGeofence(null);
            } else {
              handleActivateGeofence(INDUSTRIAL_FACILITIES[0]);
            }
            return;
          }
          toggleWindow(id);
        }}
        isGeofenceActive={Boolean(activeGeofence)}
      />

      {/* 11. Modal de Planta Baixa Estrutural e Mapeamento Térmico Dinâmico */}
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

      {/* 12. Modal de Protocolo Automatizado de Emergência (30s) */}
      <AutoEmergencyCountdown
        isOpen={isAutoEmergencyOpen}
        onClose={() => setIsAutoEmergencyOpen(false)}
        facility={emergencyFacility || INDUSTRIAL_FACILITIES[0]}
        incident={(emergencyFacility || INDUSTRIAL_FACILITIES[0]).activeIncident}
        defaultCountdownSeconds={30}
      />

      {/* 13. Modal de Informações Detalhadas da Área Clicada / Delimitada */}
      {selectedArea && (
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
      )}

      {/* 14. Centro de Relatórios e Estatísticas */}
      <ReportsModal
        isOpen={isReportsOpen}
        onClose={() => setIsReportsOpen(false)}
        fireSpots={fireSpots}
        selectedArea={selectedArea}
        onSelectLocation={(lat, lng) => {
          setTargetMapLocation({ center: [lat, lng], zoom: 13, trigger: Date.now() });
        }}
      />

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
