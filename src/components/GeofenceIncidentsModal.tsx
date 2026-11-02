import React from 'react';
import { X, ShieldAlert, AlertTriangle, Clock, MapPin, Zap, MessageSquare, Volume2, Trash2, ExternalLink } from 'lucide-react';
import { GeofenceIncident } from '../services/geofence24hMonitorService';

interface GeofenceIncidentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidents: GeofenceIncident[];
  onClearIncidents: () => void;
  onFlyToLocation?: (lat: number, lng: number) => void;
  isAutoReportEnabled: boolean;
  onToggleAutoReport: () => void;
}

export const GeofenceIncidentsModal: React.FC<GeofenceIncidentsModalProps> = ({
  isOpen,
  onClose,
  incidents,
  onClearIncidents,
  onFlyToLocation,
  isAutoReportEnabled,
  onToggleAutoReport,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1250] flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in pointer-events-auto">
      <div className="bg-slate-950 border border-cyan-500/80 rounded-xl shadow-[0_0_50px_rgba(6,182,212,0.25)] w-full max-w-2xl max-h-[85vh] flex flex-col font-mono text-white overflow-hidden">
        {/* Top Header */}
        <div className="p-3 bg-gradient-to-r from-slate-950 via-cyan-950/40 to-slate-950 border-b border-cyan-500/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded border border-cyan-500/40">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Auditoria 24h • Ocorrências da Cerca Virtual</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </h2>
              <p className="text-[10px] text-slate-400">
                Registro contínuo e disparos automáticos de emergência C2
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleAutoReport}
              className={`px-2 py-1 rounded text-[10px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                isAutoReportEnabled
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
              title="Ativar/desativar reporte automático via WhatsApp e Voz Tática"
            >
              <Zap size={11} className={isAutoReportEnabled ? 'text-emerald-400' : 'text-slate-500'} />
              <span>Reporte Automático: {isAutoReportEnabled ? 'LIGADO' : 'DESLIGADO'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Incidents List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {incidents.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-emerald-400">
                ✓
              </div>
              <div className="text-sm font-bold text-slate-300">Nenhuma anomalia violou a cerca virtual</div>
              <div className="text-xs text-slate-500 max-w-sm mx-auto">
                O monitoramento 24h está ativo e escaneando continuamente satélites e sensores. Se qualquer foco surgir no perímetro, ele será reportado automaticamente.
              </div>
            </div>
          ) : (
            incidents.map((inc) => (
              <div
                key={inc.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 rounded-lg p-2.5 transition space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-ping shrink-0" />
                    <span className="text-xs font-black text-cyan-300 truncate">
                      {inc.geofenceName}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-600 font-bold shrink-0">
                      {inc.severity}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono shrink-0 flex items-center gap-1">
                    <Clock size={11} className="text-amber-400" />
                    <span>{inc.reportedAt}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                      <MapPin size={11} className="text-cyan-400" />
                      <span>{inc.roadAddress || `${inc.latitude.toFixed(4)}°, ${inc.longitude.toFixed(4)}°`}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Coordenadas: <strong className="text-cyan-300">{inc.latitude.toFixed(4)}°, {inc.longitude.toFixed(4)}°</strong>
                    </div>
                  </div>

                  <div className="space-y-0.5 sm:text-right">
                    <div className="text-[10px] text-slate-400">
                      Potência Térmica: <strong className="text-red-400">{inc.frpMw} MW</strong>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Sensor Orbital: <strong className="text-amber-300">{inc.satellite}</strong>
                    </div>
                  </div>
                </div>

                {/* Ações Automáticas Disparadas */}
                <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] text-slate-400 font-bold">AÇÕES 24H:</span>
                    {inc.actionsTaken.map((action, i) => (
                      <span
                        key={i}
                        className="text-[8.5px] px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-emerald-300 flex items-center gap-1"
                      >
                        {action.includes('WhatsApp') && <MessageSquare size={9} className="text-emerald-400" />}
                        {action.includes('Voz') && <Volume2 size={9} className="text-amber-400" />}
                        <span>{action}</span>
                      </span>
                    ))}
                  </div>

                  {onFlyToLocation && (
                    <button
                      onClick={() => {
                        onClose();
                        onFlyToLocation(inc.latitude, inc.longitude);
                      }}
                      className="px-2 py-0.5 rounded bg-cyan-900/80 hover:bg-cyan-800 text-cyan-200 border border-cyan-600/60 text-[9.5px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ml-auto"
                      title="Centralizar no mapa"
                    >
                      <ExternalLink size={10} />
                      <span>Focar no Mapa</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
          <div>
            Total de Ocorrências Gravadas: <strong className="text-white">{incidents.length}</strong>
          </div>
          {incidents.length > 0 && (
            <button
              onClick={onClearIncidents}
              className="px-2 py-1 rounded bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-300 border border-slate-800 hover:border-red-600 transition flex items-center gap-1 cursor-pointer"
            >
              <Trash2 size={11} />
              <span>Limpar Histórico</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

