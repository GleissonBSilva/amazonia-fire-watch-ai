import React from 'react';
import { Radio, ExternalLink, MapPin, ShieldAlert, Crosshair, AlertCircle } from 'lucide-react';
import { OSINTAlert } from '../types';

interface OsintFeedWindowProps {
  alerts: OSINTAlert[];
  onSelectAlert?: (alert: OSINTAlert) => void;
  onLocateOnMap?: (loc: { lat: number; lng: number; label: string }) => void;
}

export const OsintFeedWindow: React.FC<OsintFeedWindowProps> = ({ alerts, onSelectAlert, onLocateOnMap }) => {
  const handleLocate = (alert: OSINTAlert) => {
    if (onLocateOnMap) {
      onLocateOnMap({
        lat: alert.latitude,
        lng: alert.longitude,
        label: `${alert.source}: ${alert.text.slice(0, 40)}...`,
      });
    }
    if (onSelectAlert) {
      onSelectAlert(alert);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 p-2.5 font-mono text-xs text-slate-200 select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800 mb-2">
        <div className="flex items-center space-x-2">
          <Radio size={14} className="text-amber-400 animate-pulse" />
          <span className="font-bold text-white text-xs">OSINT • CANAIS TELEGRAM & X</span>
        </div>
        <span className="text-[10px] text-amber-400/90 bg-amber-950/70 border border-amber-800/80 px-2 py-0.5 rounded font-semibold">
          PALAVRAS-CHAVE: FOGO / FUMAÇA / QUEIMADA
        </span>
      </div>

      {/* Feed List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 space-y-2">
            <Radio size={24} className="animate-spin text-slate-600" />
            <p className="text-[11px]">Varrendo frequências OSINT em tempo real...</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const urgencyLevel = alert.confidence > 0.85 ? 'URGENTE' : alert.confidence > 0.65 ? 'ALTO' : 'MODERADO';
            const urgencyColor =
              urgencyLevel === 'URGENTE'
                ? 'bg-red-950/80 text-red-300 border-red-700'
                : urgencyLevel === 'ALTO'
                ? 'bg-amber-950/80 text-amber-300 border-amber-700'
                : 'bg-slate-800 text-slate-300 border-slate-700';

            return (
              <div
                key={alert.id}
                className="p-3 bg-slate-900/90 hover:bg-slate-850 rounded-lg border border-slate-800 transition-all space-y-2 shadow"
              >
                {/* Meta Header */}
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      {alert.source}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded border font-bold ${urgencyColor}`}>
                      {urgencyLevel}
                    </span>
                  </div>
                  <span className="text-slate-400 text-[10px]">
                    {new Date(alert.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {new Date(alert.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>

                {/* Post Body */}
                <p className="text-slate-200 text-[11px] leading-relaxed bg-slate-950/60 p-2 rounded border border-slate-800/80">
                  {alert.text}
                </p>

                {/* Bottom Actions & Coords */}
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80 text-[10px]">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <MapPin size={12} className="text-cyan-400" />
                    <span className="font-mono text-cyan-300">
                      {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLocate(alert)}
                      className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 rounded border border-cyan-700 font-bold flex items-center gap-1 transition-all cursor-pointer shadow"
                      title="Mover mapa suavemente para as coordenadas deste relato"
                    >
                      <Crosshair size={11} className="text-cyan-400" />
                      <span>Localizar no Mapa</span>
                    </button>
                    <a
                      href={alert.original_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 flex items-center gap-1 transition-all"
                    >
                      <ExternalLink size={10} />
                      <span>Ver Canal</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
