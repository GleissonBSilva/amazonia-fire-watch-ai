import React, { useState, useEffect } from 'react';
import { MainMap } from './components/MainMap';
import { FloatingWindow } from './components/FloatingWindow';
import { VideoStreamWindow } from './components/VideoStreamWindow';
import { OsintFeedWindow } from './components/OsintFeedWindow';
import { HoverPreviewCard } from './components/HoverPreviewCard';
import { AIAssistantPanel } from './components/AIAssistantPanel';
import { SearchBar } from './components/SearchBar';
import { FiresDrawer } from './components/FiresDrawer';
import { WhatsAppConfirmModal } from './components/WhatsAppConfirmModal';
import { BottomDock } from './components/BottomDock';
import { LayerNavigationBar } from './components/LayerNavigationBar';
import { DelimitedArea, OSINTAlert, FireSpot, TemporalMode, MapLayerType, MAP_LAYERS, ActiveOverlaysState } from './types';
import { fetchNationalFires, fetchHeatmapData, fetchTimelineData, fetchOsintAlerts } from './services/api';
import { sendWhatsAppFireAlert } from './services/alertService';
import { Flame, ShieldAlert, Radio, Satellite, Globe, MessageSquare, Clock, Calendar, BarChart2, Layers, Truck, Droplets, Zap, CheckCircle2, Wind } from 'lucide-react';
import { findNearestInfrastructure } from './data/emergencyInfrastructure';
import { calculateAirQuality } from './data/airQuality';
import { GoogleEarth3DWindow } from './components/GoogleEarth3DWindow';
import { StreetViewWindow } from './components/StreetViewWindow';
import { NewFireAlertBanner } from './components/NewFireAlertBanner';

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

export const App: React.FC = () => {
  const [fireSpots, setFireSpots] = useState<FireSpot[]>([]);
  const [heatmapSpots, setHeatmapSpots] = useState<any[]>([]);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [osintAlerts, setOsintAlerts] = useState<OSINTAlert[]>([]);
  
  const [selectedArea, setSelectedArea] = useState<DelimitedArea | null>(null);
  const [temporalMode, setTemporalMode] = useState<TemporalMode>('24h');
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
    heatmap: false,
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

  const [activeSpotDetail, setActiveSpotDetail] = useState<FireSpot | null>(null);
  const [alertBannerSpot, setAlertBannerSpot] = useState<FireSpot | null>(null);
  const [streetViewLocation, setStreetViewLocation] = useState<{ lat: number; lng: number; label: string; address?: string } | null>(null);

  const handleOpenStreetView = (loc: { lat: number; lng: number; label: string; address?: string }) => {
    setStreetViewLocation(loc);
    setOpenWindows(prev => ({ ...prev, streetView: true }));
    setMinimizedWindows(prev => ({ ...prev, streetView: false }));
    bringToFront('streetView');
  };

  useEffect(() => {
    // Load nationwide fires, heatmap and OSINT once on mount
    fetchNationalFires().then(spots => {
      setFireSpots(spots);
      const recent = spots.find(s => s.is_new_outbreak);
      if (recent) {
        setAlertBannerSpot(recent);
      }
    });
    fetchHeatmapData().then(setHeatmapSpots);
    fetchTimelineData().then(setTimelineData);
    fetchOsintAlerts().then(setOsintAlerts);
  }, []);

  const bringToFront = (id: string) => {
    const nextZ = topZ + 1;
    setTopZ(nextZ);
    setWindowZ(prev => ({ ...prev, [id]: nextZ }));
  };

  const toggleWindow = (id: string) => {
    if (id === 'whatsappAlert') {
      if (!activeSpotDetail && fireSpots.length > 0) {
        setActiveSpotDetail(fireSpots[0]);
      }
      setIsWhatsAppModalOpen(true);
      return;
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
    if (activeSpotDetail && activeSpotDetail.id === spotId) {
      setActiveSpotDetail(prev => (prev ? { ...prev, status: newStatus, dispatched_at: dispatchedAt } : null));
    }
  };
  const handleNewFireDetected = (spot: FireSpot) => {
    setFireSpots(prev => {
      const exists = prev.some(s => s.id === spot.id);
      if (exists) return prev;
      return [spot, ...prev];
    });
    setHoveredSpot(spot);
    setAlertBannerSpot(spot);
    setHoverPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 - 100 });
    setTargetMapLocation({
      center: [spot.latitude, spot.longitude],
      zoom: 16,
      trigger: Date.now()
    });
  };

  const handleAreaSelected = (data: DelimitedArea) => {
    setSelectedArea(data);
    setIsWhatsAppModalOpen(true);
  };

  const handleSpotClick = (spot: FireSpot) => {
    setActiveSpotDetail(spot);
    setAlertBannerSpot(spot);
    setOpenWindows(prev => ({ ...prev, spotDetail: true }));
    setMinimizedWindows(prev => ({ ...prev, spotDetail: false }));
    bringToFront('spotDetail');
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
    setActiveSpotDetail(spot);
    setAlertBannerSpot(spot);
    setTargetMapLocation({
      center: [spot.latitude, spot.longitude],
      zoom: 16,
      trigger: Date.now()
    });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 1. Telão Master Fullscreen GIS (Cobertura Nacional Brasil) */}
      <MainMap
        onAreaSelected={handleAreaSelected}
        fireSpots={onlyNewOutbreaks ? fireSpots.filter(f => f.is_new_outbreak) : fireSpots}
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

      {/* Alerta Tático de Alta Nitidez de Novo Foco (<3h) ou Selecionado */}
      {alertBannerSpot && (
        <NewFireAlertBanner
          spot={alertBannerSpot}
          onClose={() => setAlertBannerSpot(null)}
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
          position={hoverPosition}
          onOpenDetails={handleSpotClick}
          onStatusChange={handleSpotStatusChange}
        />
      )}

      {/* 3. Top Header Compacto em Linha Única (Sem Transbordamento Horizontal) */}
      <header className="absolute top-0 left-0 right-0 z-20 h-11 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-3 py-1 flex items-center justify-between text-white pointer-events-auto select-none">
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

        {/* Badge Discreto de Simulação & Relógio */}
        <div className="flex items-center space-x-2 text-xs font-mono flex-shrink-0">
          <button
            onClick={() => setIsWhatsAppModalOpen(true)}
            className="hidden xl:flex items-center space-x-1.5 text-emerald-400 bg-slate-950/80 hover:bg-emerald-950/40 px-2 py-1 rounded border border-emerald-800/80 transition cursor-pointer text-[10px]"
            title="Canal de teste seguro restrito"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>SIMULAÇÃO: +55 91 99146-3640</span>
          </button>
          <div className="hidden sm:flex items-center space-x-1 text-slate-300 bg-slate-950/80 px-2 py-1 rounded border border-slate-800 text-[11px]">
            <Clock size={11} className="text-amber-300" />
            <TacticalClock />
          </div>
        </div>
      </header>

      {/* 4. Drawer Lateral de Focos Detectados (Collapsible Sidebar) */}
      <FiresDrawer
        fireSpots={fireSpots}
        onSelectSpot={handleSelectSpotFromDrawer}
        selectedSpotId={activeSpotDetail?.id}
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
          <button
            onClick={() => setIsWhatsAppModalOpen(true)}
            className="w-full py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold rounded shadow flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <MessageSquare size={14} />
            <span>DISPARAR WHATSAPP (+55 91 99146-3640)</span>
          </button>
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

      {/* 7. Co-piloto de IA Integrado (Grounded no Estado do Mapa) */}
      <AIAssistantPanel fires={fireSpots} selectedArea={selectedArea} />

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

      {/* C. Detalhes de Foco com Vídeo Selecionado (FLIR HUD Compacto Ancorado no Canto Inferior) */}
      {activeSpotDetail && (() => {
        const infra = findNearestInfrastructure(activeSpotDetail.latitude, activeSpotDetail.longitude);
        const status = activeSpotDetail.status || 'PENDENTE';
        const airQuality = calculateAirQuality(activeSpotDetail.frp_mw, 0.8);
        return (
          <FloatingWindow
            id="spotDetail"
            title={`Evidência Tática • ${activeSpotDetail.municipality} (${activeSpotDetail.state})`}
            isOpen={openWindows.spotDetail}
            isMinimized={minimizedWindows.spotDetail}
            zIndex={windowZ.spotDetail}
            onFocus={bringToFront}
            onClose={closeWindow}
            onMinimize={minimizeWindow}
            defaultPosition={{ x: 24, y: Math.max(70, window.innerHeight - 500) }}
            defaultSize={{ width: 380, height: 430 }}
          >
            <div className="flex flex-col h-full bg-slate-950 p-2.5 text-white font-mono text-xs space-y-2 select-none">
              {/* Barra de Status Operacional Colorida */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <div className="truncate max-w-[210px]">
                  <div className="text-xs font-bold text-red-400 truncate">{activeSpotDetail.address}</div>
                  <div className="text-[10px] text-slate-400">
                    {activeSpotDetail.municipality} • {activeSpotDetail.satellite}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {activeSpotDetail.is_new_outbreak && (
                    <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-yellow-950 text-yellow-300 border border-yellow-500 animate-pulse">
                      NOVO &lt;3H
                    </span>
                  )}
                  <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold border ${
                    status === 'ACIONADO_SIMULACAO'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                      : status === 'EQUIPE_DESIGNADA'
                      ? 'bg-purple-950 text-purple-300 border-purple-500'
                      : status === 'COMBATE_ATIVO'
                      ? 'bg-red-950 text-red-300 border-red-500'
                      : 'bg-amber-950 text-amber-300 border-amber-600'
                  }`}>
                    {status === 'ACIONADO_SIMULACAO' ? 'ACIONADO (TESTE)' : status}
                  </span>
                </div>
              </div>

              {/* Sensor Térmico FLIR Reduzido (h-36 = 144px) */}
              <div className="relative h-36 bg-black rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center flex-shrink-0">
                <img
                  src={activeSpotDetail.video_url || 'http://localhost:8000/api/stream/live.mjpg'}
                  alt="Feed ao Vivo em Memória"
                  className="w-full h-full object-cover block"
                />
                <div className="absolute top-1.5 left-2 bg-red-600/90 px-1.5 py-0.2 rounded text-[8.5px] font-bold">
                  RAM ZERO-DISK
                </div>
                <div className="absolute top-1.5 right-2 bg-slate-900/90 text-cyan-300 px-1.5 py-0.2 rounded text-[8.5px] border border-cyan-800">
                  {activeSpotDetail.latitude.toFixed(4)}°, {activeSpotDetail.longitude.toFixed(4)}°
                </div>
              </div>

              {/* Telemetria Compacta */}
              <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                <div className="bg-slate-900 p-1 rounded border border-slate-800">
                  <div className="text-slate-400 text-[9px]">FRP</div>
                  <div className="text-amber-400 font-bold text-xs">{activeSpotDetail.frp_mw} MW</div>
                </div>
                <div className="bg-slate-900 p-1 rounded border border-slate-800">
                  <div className="text-slate-400 text-[9px]">TEMP</div>
                  <div className="text-red-400 font-bold text-xs">{activeSpotDetail.bright_ti4_k} K</div>
                </div>
                <div className="bg-slate-900 p-1 rounded border border-slate-800">
                  <div className="text-slate-400 text-[9px]">CONF</div>
                  <div className="text-emerald-400 font-bold text-xs">{(activeSpotDetail.confidence * 100).toFixed(0)}%</div>
                </div>
              </div>

              {/* Telemetria de Qualidade do Ar & Particulado PM2.5 */}
              <div className="bg-slate-900/95 p-1.5 rounded-lg border border-slate-800 text-[10px] space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-slate-300 font-bold">
                    <Wind size={11} className="text-sky-400" />
                    <span>Poluição do Ar (AQI)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] bg-slate-800 px-1 py-0.2 rounded text-slate-400 font-bold">
                      CAT {airQuality.categoryNumber}/6
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase border ${airQuality.badgeBg} ${airQuality.badgeText} ${airQuality.badgeBorder}`}>
                      AQI {airQuality.aqi} • {airQuality.level}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5 border-t border-slate-800/80">
                  <span>Partículas: <strong className="text-amber-300">PM2.5 {airQuality.pm25} µg/m³</strong></span>
                  <span>Gás: <strong className="text-cyan-300">CO {airQuality.co_ppm} ppm</strong></span>
                </div>
                {airQuality.alertTriggered && (
                  <div className="text-[8.5px] text-amber-300 font-bold bg-amber-950/60 border border-amber-600/60 rounded px-1.5 py-0.5 flex items-center gap-1 animate-pulse">
                    <span>⚠️ ALERTA CONAMA: Nível crítico acima de 50</span>
                  </div>
                )}
              </div>

              {/* Radar Buffer: Infraestrutura de Resposta Mais Próxima */}
              <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800 text-[9.5px] space-y-1">
                <div className="flex items-center gap-1.5 text-slate-300 truncate">
                  <Truck size={11} className="text-red-400 flex-shrink-0" />
                  <span className="truncate">
                    🚒 <strong className="text-white">{infra.nearestStation.name}</strong> • {infra.nearestStation.distanceKm} km (~{infra.nearestStation.estimatedMinutes} min)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300 truncate">
                  <Droplets size={11} className="text-cyan-400 flex-shrink-0" />
                  <span className="truncate">
                    💧 <strong className="text-white">{infra.nearestWater.name}</strong> • {infra.nearestWater.distanceKm} km
                  </span>
                </div>
              </div>

              {/* Botão de Despacho com Atualização Instantânea de Status */}
              <button
                onClick={async () => {
                  const nowStr = new Date().toLocaleTimeString('pt-BR');
                  try {
                    await sendWhatsAppFireAlert({
                      lat: activeSpotDetail.latitude,
                      lng: activeSpotDetail.longitude,
                      areaSqKm: 1.45,
                      criticidade: 'CRÍTICA',
                      airQualityAlert: { aqi: airQuality.aqi, level: airQuality.level, pm25: airQuality.pm25 }
                    });
                    handleSpotStatusChange(activeSpotDetail.id, 'ACIONADO_SIMULACAO', nowStr);
                  } catch (e) {
                    handleSpotStatusChange(activeSpotDetail.id, 'ACIONADO_SIMULACAO', nowStr);
                  }
                }}
                className="w-full py-1.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold rounded shadow flex items-center justify-center gap-1 text-[10.5px] cursor-pointer"
              >
                <Zap size={12} />
                <span>
                  {status === 'ACIONADO_SIMULACAO'
                    ? `ACIONADO (${activeSpotDetail.dispatched_at || 'TESTE'})`
                    : 'ACIONAR DESPACHO WHATSAPP (+55 91 99146-3640)'}
                </span>
              </button>
            </div>
          </FloatingWindow>
        );
      })()}

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
        url="http://localhost:8000/api/proxy?url=https%3A%2F%2Fterrabrasilis.dpi.inpe.br%2Fqueimadas%2Fbdqueimadas%2F"
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
        selectedSpot={activeSpotDetail}
      />

      {/* 10. Bottom Taskbar Dock */}
      <BottomDock
        openWindows={openWindows}
        minimizedWindows={minimizedWindows}
        onToggleWindow={toggleWindow}
      />
    </div>
  );
};

export default App;
