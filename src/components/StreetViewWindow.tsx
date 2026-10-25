import React, { useState } from 'react';
import { ExternalLink, Globe, Compass, Copy, Check, Navigation, Maximize2, RefreshCw } from 'lucide-react';

export interface StreetViewLocation {
  lat: number;
  lng: number;
  label?: string;
  address?: string;
}

interface StreetViewWindowProps {
  location: StreetViewLocation;
  onFlyTo?: (lat: number, lng: number) => void;
}

export const StreetViewWindow: React.FC<StreetViewWindowProps> = ({ location, onFlyTo }) => {
  const [copied, setCopied] = useState(false);
  const [key, setKey] = useState(0);

  const lat = location.lat;
  const lng = location.lng;
  const label = location.label || `${lat.toFixed(5)}°, ${lng.toFixed(5)}°`;
  const address = location.address || label;

  const embedUrl = `https://maps.google.com/maps?q=&layer=c&cbll=${lat},${lng}&cbp=11,0,0,0,0&output=svembed`;
  const mapsPanoUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
  const earth3DUrl = `https://earth.google.com/web/@${lat},${lng},50a,500d,35y,0t,0r`;

  const copyCoords = () => {
    navigator.clipboard.writeText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white font-mono text-xs select-none">
      {/* 1. BARRA SUPERIOR DE TELEMETRIA E CONTROLES */}
      <div className="flex items-center justify-between p-2.5 bg-slate-900/90 border-b border-slate-800 flex-shrink-0">
        <div className="truncate max-w-[280px]">
          <div className="text-xs font-bold text-cyan-300 truncate flex items-center gap-1.5">
            <Compass size={13} className="text-cyan-400 flex-shrink-0 animate-spin-slow" />
            <span className="truncate">{label}</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            {address}
          </div>
        </div>

        <div className="flex items-center space-x-1.5 flex-shrink-0">
          <button
            onClick={() => setKey(prev => prev + 1)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 transition"
            title="Recarregar panorama"
          >
            <RefreshCw size={11} />
          </button>
          <button
            onClick={copyCoords}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 transition flex items-center gap-1 text-[10px]"
            title="Copiar coordenadas"
          >
            {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
            <span>{lat.toFixed(4)}°, {lng.toFixed(4)}°</span>
          </button>
        </div>
      </div>

      {/* 2. PLAYER INTERATIVO GOOGLE STREET VIEW 360° */}
      <div className="relative flex-1 bg-black overflow-hidden border-b border-slate-800">
        <iframe
          key={key}
          title="Google Street View 360"
          src={embedUrl}
          className="w-full h-full border-0"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />

        {/* Badge Tático HUD */}
        <div className="absolute top-2 left-2 bg-slate-950/85 backdrop-blur-md px-2 py-0.5 rounded text-[9px] text-cyan-300 font-bold border border-cyan-800/80 pointer-events-none flex items-center gap-1 shadow">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>STREET VIEW 360° • TEMPO REAL</span>
        </div>
      </div>

      {/* 3. BARRA DE ATALHOS EXTERNOS (GOOGLE EARTH 3D & FULLSCREEN MAPS) */}
      <div className="p-2 bg-slate-900/95 flex items-center justify-between gap-1.5 flex-shrink-0 text-[10px]">
        <div className="flex items-center space-x-1.5">
          {onFlyTo && (
            <button
              onClick={() => onFlyTo(lat, lng)}
              className="py-1 px-2.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded font-bold flex items-center gap-1 transition"
              title="Centralizar câmera do mapa neste local"
            >
              <Navigation size={11} />
              <span>Focar Mapa</span>
            </button>
          )}

          <a
            href={earth3DUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-1 px-2.5 bg-sky-900/80 hover:bg-sky-800 text-sky-200 border border-sky-700 rounded font-bold flex items-center gap-1 transition"
            title="Abrir perspectiva tridimensional no Google Earth 3D"
          >
            <Globe size={11} />
            <span>Google Earth 3D</span>
            <ExternalLink size={10} className="text-sky-400" />
          </a>
        </div>

        <a
          href={mapsPanoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded font-bold flex items-center gap-1 transition"
          title="Abrir em aba cheia no Google Maps"
        >
          <Maximize2 size={11} />
          <span>Tela Cheia</span>
          <ExternalLink size={10} className="text-slate-400" />
        </a>
      </div>
    </div>
  );
};

export default StreetViewWindow;
