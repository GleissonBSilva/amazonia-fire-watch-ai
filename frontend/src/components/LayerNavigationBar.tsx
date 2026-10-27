import React, { useState, useRef, useEffect } from 'react';
import { Layers, ChevronDown, Satellite, Globe, Radio, Wind, Thermometer, CloudRain, Building } from 'lucide-react';
import { MapLayerType, MAP_LAYERS, ActiveOverlaysState } from '../types';

export interface GlobalSector {
  id: string;
  name: string;
  flag: string;
  center: [number, number];
  zoom: number;
}

export const GLOBAL_SECTORS: GlobalSector[] = [
  { id: 'global', name: 'Mundo (Visão Global 360°)', flag: '🌐', center: [15, 0], zoom: 2 },
  { id: 'amazonia', name: 'América do Sul (Amazônia/Pantanal)', flag: '🇧🇷', center: [-4.0, -62.0], zoom: 5 },
  { id: 'north_america', name: 'América do Norte (EUA/Canadá)', flag: '🇺🇸', center: [42.0, -100.0], zoom: 4 },
  { id: 'europe', name: 'Europa & Mediterrâneo', flag: '🇪🇺', center: [42.0, 15.0], zoom: 4 },
  { id: 'africa', name: 'África (Bacia do Congo/Savanas)', flag: '🌍', center: [-2.0, 24.0], zoom: 4 },
  { id: 'asia', name: 'Ásia & Indonésia (Bornéu)', flag: '🇮🇩', center: [2.0, 115.0], zoom: 4 },
  { id: 'oceania', name: 'Oceania & Austrália (Bushfires)', flag: '🇦🇺', center: [-25.0, 134.0], zoom: 4 },
  { id: 'siberia', name: 'Sibéria & Taiga Boreal', flag: '🏔️', center: [62.0, 110.0], zoom: 3 },
];

export interface LayerNavigationBarProps {
  currentLayer: MapLayerType;
  onSelectBaseLayer: (layer: MapLayerType) => void;
  activeOverlays: ActiveOverlaysState;
  onToggleOverlay: (overlayKey: keyof ActiveOverlaysState) => void;
  onSelectGlobalSector?: (center: [number, number], zoom: number, label: string) => void;
}

export const LayerNavigationBar: React.FC<LayerNavigationBarProps> = ({
  currentLayer,
  onSelectBaseLayer,
  activeOverlays,
  onToggleOverlay,
  onSelectGlobalSector,
}) => {
  const [isBaseDropdownOpen, setIsBaseDropdownOpen] = useState(false);
  const [isSectorDropdownOpen, setIsSectorDropdownOpen] = useState(false);
  const [currentSector, setCurrentSector] = useState<string>('global');
  const sectorRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsBaseDropdownOpen(false);
      }
      if (sectorRef.current && !sectorRef.current.contains(e.target as Node)) {
        setIsSectorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLayerName = MAP_LAYERS[currentLayer]?.name || 'Satélite Híbrido';

  return (
    <div className="flex items-center space-x-1.5 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-lg p-0.5 text-xs font-mono select-none">
      {/* SELETOR 0: TEATRO DE OPERAÇÕES GLOBAL (Continentes / Planeta) */}
      <div className="relative" ref={sectorRef}>
        <button
          onClick={() => setIsSectorDropdownOpen(!isSectorDropdownOpen)}
          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-cyan-700/80 hover:bg-slate-800 text-cyan-300 transition-all font-bold h-7 shadow-sm"
          title="Navegar por Continente / Teatro Operacional Planetário"
        >
          <Globe size={13} className="text-cyan-400 animate-spin-slow" />
          <span className="truncate max-w-[125px]">
            {GLOBAL_SECTORS.find(s => s.id === currentSector)?.name.split(' (')[0] || 'Mundo'}
          </span>
          <ChevronDown size={11} className={`text-cyan-400 transition-transform ${isSectorDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isSectorDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-slate-950 border border-cyan-800 rounded-lg shadow-2xl py-1 z-50 overflow-hidden backdrop-blur-md">
            <div className="px-3 py-1 text-[10px] text-cyan-400 uppercase tracking-wider font-bold border-b border-slate-800 flex items-center justify-between">
              <span>Teatros Globais</span>
              <span className="text-[9px] bg-cyan-950 text-cyan-300 px-1 rounded">PLANETÁRIO</span>
            </div>
            {GLOBAL_SECTORS.map((sec) => {
              const isSelected = currentSector === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => {
                    setCurrentSector(sec.id);
                    setIsSectorDropdownOpen(false);
                    if (onSelectGlobalSector) {
                      onSelectGlobalSector(sec.center, sec.zoom, sec.name);
                    }
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-cyan-950/80 text-cyan-200 font-bold border-l-2 border-cyan-400'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span>{sec.flag}</span>
                    <span className="truncate">{sec.name}</span>
                  </span>
                  {isSelected && <span className="text-[9px] text-cyan-400 flex-shrink-0">Ativo</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="h-4 w-[1px] bg-slate-800" />

      {/* SELETOR 1: CAMADA BASE (Dropdown compacto) */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsBaseDropdownOpen(!isBaseDropdownOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-200 transition-all font-semibold h-7"
          title="Selecionar Mapa Base"
        >
          <Layers size={13} className="text-cyan-400" />
          <span className="truncate max-w-[130px]">{currentLayerName}</span>
          <ChevronDown size={12} className={`text-slate-400 transition-transform ${isBaseDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isBaseDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-slate-950 border border-slate-800 rounded-lg shadow-2xl py-1 z-50 overflow-hidden">
            <div className="px-3 py-1 text-[10px] text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800">
              Mapas Base
            </div>
            {(Object.keys(MAP_LAYERS) as MapLayerType[]).map((layerKey) => {
              const layer = MAP_LAYERS[layerKey];
              const isSelected = currentLayer === layerKey;
              return (
                <button
                  key={layerKey}
                  onClick={() => {
                    onSelectBaseLayer(layerKey);
                    setIsBaseDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-cyan-950/70 text-cyan-300 font-bold border-l-2 border-cyan-400'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span>{layer.name}</span>
                  {isSelected && <span className="text-[10px] text-cyan-400">Ativo</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="h-4 w-[1px] bg-slate-800" />

      {/* SELETOR 2: OVERLAYS DE SATÉLITE EM TEMPO REAL (Pílulas Toggle Multi-seleção) */}
      <div className="flex items-center space-x-1">
        {/* OVERLAY: NASA FIRMS (VIIRS 375m) */}
        <button
          onClick={() => onToggleOverlay('nasaFirms')}
          className={`h-7 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 border ${
            activeOverlays.nasaFirms
              ? 'bg-amber-600/90 text-white border-amber-400 font-bold shadow-sm shadow-amber-950'
              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800'
          }`}
          title="Focos de Calor VIIRS 375m em Tempo Quase-Real (NASA FIRMS / GIBS)"
        >
          <Satellite size={12} className={activeOverlays.nasaFirms ? 'text-amber-200 animate-pulse' : 'text-amber-400'} />
          <span>FIRMS</span>
        </button>

        {/* OVERLAY: Google Earth 3D */}
        <button
          onClick={() => onToggleOverlay('googleEarth3d')}
          className={`h-7 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 border ${
            activeOverlays.googleEarth3d
              ? 'bg-blue-600/90 text-white border-blue-400 font-bold shadow-sm shadow-blue-950'
              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800'
          }`}
          title="Auditoria 3D em Alta Resolução (Google Earth / Topografia de Terreno)"
        >
          <Globe size={12} className={activeOverlays.googleEarth3d ? 'text-blue-200 animate-pulse' : 'text-blue-400'} />
          <span>Earth 3D</span>
        </button>

        {/* OVERLAY: INPE BDQueimadas */}
        <button
          onClick={() => onToggleOverlay('inpeBdqueimadas')}
          className={`h-7 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 border ${
            activeOverlays.inpeBdqueimadas
              ? 'bg-red-600/90 text-white border-red-400 font-bold shadow-sm shadow-red-950'
              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800'
          }`}
          title="Anomalias térmicas 24h (INPE BDQueimadas)"
        >
          <Radio size={12} className={activeOverlays.inpeBdqueimadas ? 'text-red-200 animate-pulse' : 'text-red-400'} />
          <span>INPE</span>
        </button>

        {/* OVERLAY: Satélite Meteorológico GOES-16 (Fumaça & Nuvens ao Vivo a cada 10-15m) */}
        <button
          onClick={() => onToggleOverlay('goes16')}
          className={`h-7 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 border ${
            activeOverlays.goes16
              ? 'bg-cyan-600/90 text-white border-cyan-400 font-bold shadow-sm shadow-cyan-950'
              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800'
          }`}
          title="Satélite Meteorológico NOAA GOES-16 ABI • Varreduras a cada 10-15 min • Detecção instantânea de calor"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <CloudRain size={12} className={activeOverlays.goes16 ? 'text-cyan-200 animate-pulse' : 'text-cyan-400'} />
          <span>GOES-16 (~10m)</span>
        </button>

        {/* OVERLAY: Malha Fundiária CAR / SICAR / Terras Indígenas / UCs */}
        <button
          onClick={() => onToggleOverlay('carCadastre')}
          className={`h-7 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 border ${
            activeOverlays.carCadastre
              ? 'bg-amber-600/90 text-white border-amber-400 font-bold shadow-sm shadow-amber-950'
              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800'
          }`}
          title="Malha Fundiária de Imóveis Rurais (CAR / SICAR / Terras Indígenas / UCs)"
        >
          <Building size={12} className={activeOverlays.carCadastre ? 'text-amber-200 animate-pulse' : 'text-amber-400'} />
          <span>CAR/SICAR</span>
        </button>

        {/* OVERLAY: Poluição do Ar & Pluma de Fumaça (Aerossol MODIS/GOES / AQI) */}
        <button
          onClick={() => onToggleOverlay('smokePlume')}
          className={`h-7 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 border ${
            activeOverlays.smokePlume
              ? 'bg-purple-600/90 text-white border-purple-400 font-bold shadow-sm shadow-purple-950'
              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800'
          }`}
          title="Medição da poluição do ar, dispersão de fumaça e fuligem PM2.5 (Índice Aerossol UV / AQI)"
        >
          <Wind size={12} className={activeOverlays.smokePlume ? 'text-purple-200 animate-pulse' : 'text-purple-400'} />
          <span>Ar/AQI</span>
        </button>

        {/* OVERLAY: Máscara Térmica (LST Day) */}
        <button
          onClick={() => onToggleOverlay('thermalMask')}
          className={`h-7 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 border ${
            activeOverlays.thermalMask
              ? 'bg-orange-600/90 text-white border-orange-400 font-bold shadow-sm shadow-orange-950'
              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800'
          }`}
          title="Gradiente térmico de temperatura da superfície terrestre (LST Day)"
        >
          <Thermometer size={12} className={activeOverlays.thermalMask ? 'text-orange-200 animate-pulse' : 'text-orange-400'} />
          <span>Térmica</span>
        </button>
      </div>
    </div>
  );
};
