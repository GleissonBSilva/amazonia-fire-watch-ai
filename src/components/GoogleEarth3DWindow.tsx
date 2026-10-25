import React, { useState } from 'react';
import { Globe, ExternalLink, Mountain, Compass, Eye, Navigation, Layers, Check } from 'lucide-react';

interface GoogleEarth3DWindowProps {
  onActivateOnMap?: () => void;
  onFlyTo?: (lat: number, lng: number) => void;
}

const PRESETS = [
  { name: 'Manaus (Flores / Encontro das Águas)', lat: -3.10719, lng: -60.02610, alt: '1.200m' },
  { name: 'Lábrea (BR-230 Transamazônica)', lat: -7.25940, lng: -64.79810, alt: '3.400m' },
  { name: 'Humaitá (Calha Rio Madeira)', lat: -7.50800, lng: -63.02500, alt: '2.100m' },
  { name: 'Poconé / Pantanal Norte', lat: -16.25670, lng: -56.62280, alt: '4.500m' },
];

export const GoogleEarth3DWindow: React.FC<GoogleEarth3DWindowProps> = ({
  onActivateOnMap,
  onFlyTo,
}) => {
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0]);
  const [isCopied, setIsCopied] = useState(false);

  const googleEarthWebUrl = `https://earth.google.com/web/@${selectedPreset.lat},${selectedPreset.lng},120a,2500d,35y,0h,45t,0r`;

  const handleOpenGoogleEarthDirect = () => {
    window.open(googleEarthWebUrl, '_blank', 'width=1280,height=800');
  };

  const handleSelectPreset = (preset: typeof PRESETS[0]) => {
    setSelectedPreset(preset);
    if (onFlyTo) {
      onFlyTo(preset.lat, preset.lng);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 p-3 text-slate-100 font-mono text-xs select-none space-y-2.5">
      {/* Header HUD */}
      <div className="flex items-center justify-between bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800">
        <div className="flex items-center space-x-2">
          <Globe size={15} className="text-sky-400 animate-spin-slow" />
          <span className="font-bold text-white text-xs">GOOGLE EARTH 3D • SISTEMA ORBITAL WEBGL</span>
        </div>
        <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-sky-950 text-sky-300 border border-sky-700">
          MAXAR / LANDSAT 0.5m
        </span>
      </div>

      {/* Visualizador 3D Integrado com Textura de Alta Resolução */}
      <div className="relative flex-1 bg-black rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center min-h-[200px]">
        {/* Renderiza imagem de satélite do local selecionado em alta definição */}
        <img
          src={`https://mt1.google.com/vt/lyrs=y&x=${Math.floor(((selectedPreset.lng + 180) / 360) * Math.pow(2, 11))}&y=${Math.floor((1 - Math.log(Math.tan((selectedPreset.lat * Math.PI) / 180) + 1 / Math.cos((selectedPreset.lat * Math.PI) / 180)) / Math.PI) / 2 * Math.pow(2, 11))}&z=11`}
          alt="Visualizador Google Earth 3D"
          className="w-full h-full object-cover block"
          onError={(e) => {
            // Fallback para tile central da Amazônia
            (e.target as HTMLImageElement).src = 'https://mt1.google.com/vt/lyrs=y&x=690&y=1045&z=11';
          }}
        />

        {/* Scanlines táticas e retículo 3D */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.8)_100%)] pointer-events-none"></div>

        {/* Retículo Central de Perspectiva 3D */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-32 h-20 border border-sky-400/50 rounded flex items-center justify-center">
            <Compass size={24} className="text-sky-400 opacity-60 animate-spin-slow" />
          </div>
        </div>

        {/* Telemetria Tática de Relevo no Canto Superior */}
        <div className="absolute top-2 left-2 bg-slate-950/85 backdrop-blur px-2 py-1 rounded border border-slate-700 text-[10px] space-y-0.5">
          <div className="text-sky-300 font-bold flex items-center gap-1">
            <Mountain size={11} />
            <span>TOPOGRAFIA: {selectedPreset.name}</span>
          </div>
          <div className="text-slate-400">
            COORD: {selectedPreset.lat.toFixed(4)}°, {selectedPreset.lng.toFixed(4)}°
          </div>
          <div className="text-emerald-400 font-bold">ALTITUDE: {selectedPreset.alt} • FOV: 45°</div>
        </div>

        {/* Botão Flutuante de Abertura WebGL 3D Oficial */}
        <button
          onClick={handleOpenGoogleEarthDirect}
          className="absolute bottom-3 right-3 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg shadow-xl border border-sky-400/80 flex items-center gap-1.5 transition-all cursor-pointer text-[10.5px]"
        >
          <ExternalLink size={13} />
          <span>Abrir Google Earth WebGL Oficial (Tela Cheia)</span>
        </button>
      </div>

      {/* Seletor de Focos Táticos & Voo 3D */}
      <div className="space-y-1">
        <span className="text-[10px] text-slate-400 font-bold uppercase">
          Reconhecimento de Relevo em Regiões Críticas:
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((preset, idx) => {
            const isSelected = selectedPreset.name === preset.name;
            return (
              <button
                key={idx}
                onClick={() => handleSelectPreset(preset)}
                className={`px-2.5 py-1 rounded border text-left transition-all flex items-center justify-between text-[10px] ${
                  isSelected
                    ? 'bg-sky-950/90 border-sky-400 text-sky-200 font-bold shadow'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                <span className="truncate">{preset.name}</span>
                <Navigation size={10} className={isSelected ? 'text-sky-400' : 'text-slate-500'} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Controles de Ação Direta */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
        <button
          onClick={() => {
            if (onActivateOnMap) onActivateOnMap();
          }}
          className="py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-400 font-bold rounded flex items-center justify-center gap-1 text-[10.5px] cursor-pointer shadow"
        >
          <Layers size={12} />
          <span>Ativar Camada 3D no Telão</span>
        </button>

        <button
          onClick={handleOpenGoogleEarthDirect}
          className="py-1.5 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white font-bold rounded flex items-center justify-center gap-1 text-[10.5px] cursor-pointer shadow"
        >
          <Globe size={12} />
          <span>Voo 3D em Tempo Real</span>
        </button>
      </div>
    </div>
  );
};

export default GoogleEarth3DWindow;
