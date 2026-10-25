import React, { useState, useRef, useEffect } from 'react';
import { Layers, ChevronDown, Satellite, Globe, Radio, Wind, Thermometer, CloudRain } from 'lucide-react';
import { MapLayerType, MAP_LAYERS, ActiveOverlaysState } from '../types';

export interface LayerNavigationBarProps {
  currentLayer: MapLayerType;
  onSelectBaseLayer: (layer: MapLayerType) => void;
  activeOverlays: ActiveOverlaysState;
  onToggleOverlay: (overlayKey: keyof ActiveOverlaysState) => void;
}

export const LayerNavigationBar: React.FC<LayerNavigationBarProps> = ({
  currentLayer,
  onSelectBaseLayer,
  activeOverlays,
  onToggleOverlay,
}) => {
  const [isBaseDropdownOpen, setIsBaseDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsBaseDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLayerName = MAP_LAYERS[currentLayer]?.name || 'Satélite Híbrido';

  return (
    <div className="flex items-center space-x-1.5 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-lg p-0.5 text-xs font-mono select-none">
      {/* 1. SELETOR BASE COMPACTO (DROPDOWN PILL) */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsBaseDropdownOpen(!isBaseDropdownOpen)}
          className="h-7 px-2.5 py-0.5 rounded-md bg-slate-900 hover:bg-slate-850 border border-slate-700/80 text-white font-medium text-[11px] flex items-center gap-1.5 transition-all shadow-sm"
          title="Alternar textura base do mapa"
        >
          <Layers size={13} className="text-emerald-400" />
          <span className="truncate max-w-[110px]">{currentLayerName}</span>
          <ChevronDown
            size={12}
            className={`text-slate-400 transition-transform ${isBaseDropdownOpen ? 'rotate-180 text-emerald-400' : ''}`}
          />
        </button>

        {/* Dropdown Menu das Camadas Base */}
        {isBaseDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-44 bg-slate-900/95 border border-slate-700 rounded-lg shadow-2xl backdrop-blur-md overflow-hidden z-50 divide-y divide-slate-800 animate-fade-in font-mono text-[11px]">
            <div className="px-2.5 py-1 text-[9px] uppercase font-bold text-slate-400 bg-slate-950/60">
              Textura Base do Mapa
            </div>
            {(Object.keys(MAP_LAYERS) as MapLayerType[]).map((layerKey) => {
              const isSelected = currentLayer === layerKey;
              return (
                <button
                  key={layerKey}
                  onClick={() => {
                    onSelectBaseLayer(layerKey);
                    setIsBaseDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-emerald-600/30 text-emerald-300 font-bold border-l-2 border-emerald-400'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span>{MAP_LAYERS[layerKey].name}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Separador Tático Discreto */}
      <div className="h-4 w-[1px] bg-slate-800 mx-0.5 flex-shrink-0" />

      {/* 2. BOTÕES DE OVERLAYS SOBREPOSTOS COMPACTOS (PILLS 28px) */}
      <div className="flex items-center space-x-1">
        {/* OVERLAY: NASA FIRMS */}
        <button
          onClick={() => onToggleOverlay('nasaFirms')}
          className={`h-7 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 border ${
            activeOverlays.nasaFirms
              ? 'bg-amber-600/90 text-white border-amber-400 font-bold shadow-sm shadow-amber-950'
              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800'
          }`}
          title="Focos térmicos VIIRS 375m (NASA FIRMS WMS)"
        >
          <Satellite size={12} className={activeOverlays.nasaFirms ? 'text-amber-200 animate-pulse' : 'text-amber-400'} />
          <span>NASA</span>
        </button>

        {/* OVERLAY: Google Earth 3D */}
        <button
          onClick={() => onToggleOverlay('googleEarth3d')}
          className={`h-7 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 border ${
            activeOverlays.googleEarth3d
              ? 'bg-sky-600/90 text-white border-sky-400 font-bold shadow-sm shadow-sky-950'
              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800'
          }`}
          title="Textura e relevo topográfico 3D (Google Earth)"
        >
          <Globe size={12} className={activeOverlays.googleEarth3d ? 'text-sky-200' : 'text-sky-400'} />
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

        {/* OVERLAY: Satélite Meteorológico GOES-16 (Fumaça & Nuvens ao Vivo) */}
        <button
          onClick={() => onToggleOverlay('goes16')}
          className={`h-7 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 border ${
            activeOverlays.goes16
              ? 'bg-cyan-600/90 text-white border-cyan-400 font-bold shadow-sm shadow-cyan-950'
              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800'
          }`}
          title="Satélite Meteorológico GOES-16 (GeoColor NOAA/NASA / Fumaça e Nuvens ao Vivo)"
        >
          <CloudRain size={12} className={activeOverlays.goes16 ? 'text-cyan-200 animate-pulse' : 'text-cyan-400'} />
          <span>GOES-16</span>
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
          <Thermometer size={12} className={activeOverlays.thermalMask ? 'text-orange-200' : 'text-orange-400'} />
          <span>Temp</span>
        </button>
      </div>
    </div>
  );
};

export default LayerNavigationBar;
