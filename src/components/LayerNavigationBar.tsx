import React, { useState, useRef, useEffect } from 'react';
import { Layers, ChevronDown, Satellite, Globe, Radio, Wind, Thermometer, CloudRain, Building, LucideIcon } from 'lucide-react';
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

interface OverlayConfigItem {
  key: keyof ActiveOverlaysState;
  label: string;
  sublabel: string;
  icon: LucideIcon;
  activeBg: string;
  activeText: string;
  activeBorder: string;
  iconActiveColor: string;
}

const OVERLAYS_CONFIG: OverlayConfigItem[] = [
  {
    key: 'clustering',
    label: 'Agrupamento Tático (Cluster)',
    sublabel: 'FRP Sintetizado e Alta Fluidez',
    icon: Layers,
    activeBg: 'bg-emerald-950/90',
    activeText: 'text-emerald-200',
    activeBorder: 'border-emerald-500/80',
    iconActiveColor: 'text-emerald-400',
  },
  {
    key: 'nasaFirms',
    label: 'NASA FIRMS (VIIRS 375m)',
    sublabel: 'Órbita Polar NOAA / NASA',
    icon: Satellite,
    activeBg: 'bg-amber-950/90',
    activeText: 'text-amber-200',
    activeBorder: 'border-amber-500/80',
    iconActiveColor: 'text-amber-400',
  },
  {
    key: 'goes16',
    label: 'GOES-16 ABI (~10-15m)',
    sublabel: 'Tempo Real Geoestacionário',
    icon: CloudRain,
    activeBg: 'bg-cyan-950/90',
    activeText: 'text-cyan-200',
    activeBorder: 'border-cyan-500/80',
    iconActiveColor: 'text-cyan-400',
  },
  {
    key: 'inpeBdqueimadas',
    label: 'INPE BDQueimadas',
    sublabel: 'Detecção Oficial Nacional',
    icon: Radio,
    activeBg: 'bg-red-950/90',
    activeText: 'text-red-200',
    activeBorder: 'border-red-500/80',
    iconActiveColor: 'text-red-400',
  },
  {
    key: 'googleEarth3d',
    label: 'Google Earth 3D',
    sublabel: 'Topografia e Terreno 3D',
    icon: Globe,
    activeBg: 'bg-blue-950/90',
    activeText: 'text-blue-200',
    activeBorder: 'border-blue-500/80',
    iconActiveColor: 'text-blue-400',
  },
  {
    key: 'carCadastre',
    label: 'Malha Fundiária (CAR/SICAR)',
    sublabel: 'Propriedades Rurais e Terras Indígenas',
    icon: Building,
    activeBg: 'bg-amber-950/90',
    activeText: 'text-amber-200',
    activeBorder: 'border-amber-500/80',
    iconActiveColor: 'text-amber-400',
  },
  {
    key: 'smokePlume',
    label: 'Poluição do Ar (AQI / Fumaça)',
    sublabel: 'Material Particulado PM2.5',
    icon: Wind,
    activeBg: 'bg-purple-950/90',
    activeText: 'text-purple-200',
    activeBorder: 'border-purple-500/80',
    iconActiveColor: 'text-purple-400',
  },
  {
    key: 'thermalMask',
    label: 'Máscara Térmica (LST Day)',
    sublabel: 'Gradiente de Calor de Superfície',
    icon: Thermometer,
    activeBg: 'bg-orange-950/90',
    activeText: 'text-orange-200',
    activeBorder: 'border-orange-500/80',
    iconActiveColor: 'text-orange-400',
  },
];

export const LayerNavigationBar: React.FC<LayerNavigationBarProps> = ({
  currentLayer,
  onSelectBaseLayer,
  activeOverlays,
  onToggleOverlay,
  onSelectGlobalSector,
}) => {
  const [isBaseDropdownOpen, setIsBaseDropdownOpen] = useState(false);
  const [isSectorDropdownOpen, setIsSectorDropdownOpen] = useState(false);
  const [isOverlaysDropdownOpen, setIsOverlaysDropdownOpen] = useState(false);
  const [currentSector, setCurrentSector] = useState<string>('global');

  const sectorRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const overlaysRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsBaseDropdownOpen(false);
      }
      if (sectorRef.current && !sectorRef.current.contains(e.target as Node)) {
        setIsSectorDropdownOpen(false);
      }
      if (overlaysRef.current && !overlaysRef.current.contains(e.target as Node)) {
        setIsOverlaysDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLayerName = MAP_LAYERS[currentLayer]?.name || 'Satélite Híbrido';

  // Contagem de overlays ativos
  const activeOverlaysCount = [
    activeOverlays.clustering !== false,
    Boolean(activeOverlays.nasaFirms),
    Boolean(activeOverlays.goes16),
    Boolean(activeOverlays.inpeBdqueimadas),
    Boolean(activeOverlays.googleEarth3d),
    Boolean(activeOverlays.carCadastre),
    Boolean(activeOverlays.smokePlume),
    Boolean(activeOverlays.thermalMask),
  ].filter(Boolean).length;

  return (
    <div className="flex items-center space-x-1 sm:space-x-1.5 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-lg p-0.5 text-xs font-mono select-none flex-shrink-0">
      {/* SELETOR 0: TEATRO DE OPERAÇÕES GLOBAL (Continentes / Planeta) */}
      <div className="relative" ref={sectorRef}>
        <button
          onClick={() => setIsSectorDropdownOpen(!isSectorDropdownOpen)}
          className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded bg-slate-900 border border-cyan-700/80 hover:bg-slate-800 text-cyan-300 transition-all font-bold h-7 shadow-sm cursor-pointer"
          title="Navegar por Continente / Teatro Operacional Planetário"
        >
          <Globe size={13} className="text-cyan-400 animate-spin-slow shrink-0" />
          <span className="hidden md:inline truncate max-w-[85px]">
            {GLOBAL_SECTORS.find(s => s.id === currentSector)?.name.split(' (')[0] || 'Mundo'}
          </span>
          <ChevronDown size={11} className={`text-cyan-400 transition-transform shrink-0 ${isSectorDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isSectorDropdownOpen && (
          <div className="absolute top-full left-0 mt-1.5 w-64 bg-slate-950/98 border border-cyan-800 rounded-lg shadow-[0_12px_40px_rgba(0,0,0,0.9)] py-1 z-[1300] overflow-hidden backdrop-blur-xl">
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
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-200 transition-all font-semibold h-7 cursor-pointer"
          title="Selecionar Mapa Base"
        >
          <Layers size={13} className="text-cyan-400 shrink-0" />
          <span className="hidden sm:inline truncate max-w-[95px]">{currentLayerName}</span>
          <ChevronDown size={12} className={`text-slate-400 transition-transform shrink-0 ${isBaseDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isBaseDropdownOpen && (
          <div className="absolute top-full left-0 mt-1.5 w-56 bg-slate-950/98 border border-slate-700 rounded-lg shadow-[0_12px_40px_rgba(0,0,0,0.9)] py-1 z-[1300] overflow-hidden backdrop-blur-xl">
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

      {/* SELETOR 2: OVERLAYS DE SATÉLITE EM TEMPO REAL (Menu Suspenso Compacto Tático) */}
      <div className="relative" ref={overlaysRef}>
        <button
          onClick={() => setIsOverlaysDropdownOpen(!isOverlaysDropdownOpen)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded border h-7 transition-all font-semibold shadow-sm cursor-pointer ${
            activeOverlaysCount > 0
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600/80 hover:bg-emerald-900/90'
              : 'bg-slate-900 text-slate-300 border-slate-700/80 hover:bg-slate-800'
          }`}
          title="Ativar/Desativar Camadas & Satélites em Tempo Real"
        >
          <Radio size={13} className={activeOverlaysCount > 0 ? 'text-emerald-400 animate-pulse shrink-0' : 'text-cyan-400 shrink-0'} />
          <span>Camadas</span>
          <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/60">
            {activeOverlaysCount}
          </span>
          <ChevronDown size={11} className={`text-slate-400 transition-transform shrink-0 ${isOverlaysDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOverlaysDropdownOpen && (
          <div className="absolute top-full left-0 mt-1.5 w-72 bg-slate-950/98 border border-slate-700 rounded-lg shadow-[0_12px_40px_rgba(0,0,0,0.9)] p-2 z-[1300] backdrop-blur-xl space-y-1 animate-fade-in text-[11px]">
            <div className="px-1.5 py-1 text-[9.5px] text-cyan-400 uppercase tracking-wider font-bold border-b border-slate-800 flex items-center justify-between mb-1">
              <span>Camadas & Satélites</span>
              <span className="text-[8.5px] text-slate-400 font-mono">{activeOverlaysCount}/8 Ativas</span>
            </div>

            {/* Lista dos 8 Overlays com Toggle Tático */}
            {OVERLAYS_CONFIG.map((ov) => {
              const isActive = ov.key === 'clustering' ? activeOverlays.clustering !== false : Boolean(activeOverlays[ov.key]);
              const Icon = ov.icon;
              return (
                <button
                  key={ov.key}
                  onClick={() => onToggleOverlay(ov.key)}
                  className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between transition-colors border cursor-pointer ${
                    isActive
                      ? `${ov.activeBg} ${ov.activeText} ${ov.activeBorder} font-bold shadow-sm`
                      : 'bg-slate-900/60 text-slate-400 border-slate-800/80 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Icon size={12} className={isActive ? ov.iconActiveColor : 'text-slate-500 shrink-0'} />
                    <span className="truncate text-[10.5px]">{ov.label}</span>
                  </div>
                  <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase shrink-0 ${
                    isActive ? 'bg-white/10 text-white border border-white/20' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {isActive ? 'ON' : 'OFF'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
