import React, { useState } from 'react';
import { Crosshair, ExternalLink, Activity, Radio, Eye, ShieldAlert, Truck, Droplets, Zap, CheckCircle2, Wind } from 'lucide-react';
import { FireSpot } from '../types';
import { findNearestInfrastructure } from '../data/emergencyInfrastructure';
import { calculateAirQuality } from '../data/airQuality';
import { sendWhatsAppFireAlert } from '../services/alertService';

interface HoverPreviewCardProps {
  spot: FireSpot;
  position: { x: number; y: number };
  onOpenDetails: (spot: FireSpot) => void;
  onStatusChange?: (spotId: string, newStatus: any, dispatchedAt: string) => void;
  isSimulation?: boolean;
}

export const HoverPreviewCard: React.FC<HoverPreviewCardProps> = ({
  spot,
  position,
  onOpenDetails,
  onStatusChange,
  isSimulation = true,
}) => {
  // Constrain position to anchor cleanly without covering the map center
  const cardWidth = 360;
  const cardHeight = 440;
  const left = Math.min(window.innerWidth - cardWidth - 16, Math.max(16, position.x + 20));
  const top = Math.min(window.innerHeight - cardHeight - 55, Math.max(50, position.y - 120));

  const [isDispatching, setIsDispatching] = useState(false);
  const [localStatus, setLocalStatus] = useState<string>(spot.status || 'PENDENTE');
  const [dispatchedTime, setDispatchedTime] = useState<string | null>(spot.dispatched_at || null);

  const isCrimeSuspect = spot.is_arson_cluster;
  const isNew = spot.is_new_outbreak;
  const now = new Date();
  const utcTimestamp = now.toISOString().slice(11, 19) + 'Z';

  // FRP Scale percentage (capped at 100 MW for bar)
  const frpPct = Math.min(100, Math.max(5, (spot.frp_mw / 100) * 100));

  // Emergency Infrastructure proximity calculation
  const infra = findNearestInfrastructure(spot.latitude, spot.longitude);
  const airQuality = calculateAirQuality(spot.frp_mw, 0.8);

  const handleQuickDispatch = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDispatching(true);
    const nowStr = new Date().toLocaleTimeString('pt-BR');

    try {
      await sendWhatsAppFireAlert({
        lat: spot.latitude,
        lng: spot.longitude,
        areaSqKm: 1.45,
        criticidade: spot.frp_mw >= 40 ? 'CRÍTICA' : 'ALTA',
        airQualityAlert: { aqi: airQuality.aqi, level: airQuality.level, pm25: airQuality.pm25 },
        isSimulation,
      });

      setLocalStatus('ACIONADO_SIMULACAO');
      setDispatchedTime(nowStr);
      if (onStatusChange) {
        onStatusChange(spot.id, 'ACIONADO_SIMULACAO', nowStr);
      }
    } catch (err) {
      console.warn('Erro no despacho:', err);
    } finally {
      setIsDispatching(false);
    }
  };

  const getStatusBadge = () => {
    switch (localStatus) {
      case 'ACIONADO_SIMULACAO':
        return { text: 'ACIONADO (TESTE)', color: 'bg-emerald-950 text-emerald-300 border-emerald-500' };
      case 'EQUIPE_DESIGNADA':
        return { text: 'EQUIPE DESIGNADA', color: 'bg-purple-950 text-purple-300 border-purple-500' };
      case 'COMBATE_ATIVO':
        return { text: 'COMBATE ATIVO', color: 'bg-red-950 text-red-300 border-red-500' };
      default:
        return { text: 'PENDENTE DE TRIAGEM', color: 'bg-amber-950 text-amber-300 border-amber-600' };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div
      style={{ top: `${top}px`, left: `${left}px` }}
      className="fixed z-50 w-[360px] bg-slate-950/95 backdrop-blur-xl border border-slate-700/70 shadow-[0_12px_45px_rgba(0,0,0,0.9),0_0_20px_rgba(0,240,255,0.08)] rounded-xl p-3 font-mono text-xs text-white pointer-events-auto transition-all animate-fade-in select-none"
    >
      {/* 1. CABEÇALHO HUD */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase border ${
            isSimulation
              ? 'bg-amber-950 text-amber-300 border-amber-600'
              : 'bg-emerald-950 text-emerald-300 border-emerald-500'
          }`}>
            {isSimulation ? 'SIMULAÇÃO' : 'REAL ORBITAL'}
          </span>
          {isNew && (
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-yellow-950 text-yellow-300 border border-yellow-500 animate-pulse">
              NOVO &lt;3H
            </span>
          )}
          <span
            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${
              isCrimeSuspect
                ? 'bg-purple-950/80 text-purple-300 border-purple-500'
                : 'bg-red-950/80 text-red-300 border-red-500'
            }`}
          >
            {isCrimeSuspect ? 'ARSON CLUSTER' : 'CRITICAL'}
          </span>
          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${statusBadge.color}`}>
            {statusBadge.text}
          </span>
        </div>

        <div className="flex items-center gap-1 text-[8.5px] text-emerald-400 font-bold tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span>FLIR LIVE</span>
        </div>
      </div>

      {/* 2. JANELA DO SENSOR TÉRMICO FLIR (h-36 = 144px) */}
      <div className="relative w-full h-36 rounded-lg overflow-hidden border border-slate-700/70 mb-2 bg-black flex items-center justify-center">
        {(isSimulation && spot.video_url) ? (
          <img
            src={spot.video_url}
            alt="Live Stream"
            className="w-full h-full object-cover block"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : null}

        {/* Gradiente térmico White-Hot / Ironbow simulado */}
        <div
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 52% 46%, #ffffff 0%, #ffff44 14%, #ff6600 30%, #880055 52%, #180028 75%, #030712 100%)',
            opacity: spot.video_url ? 0.35 : 0.95,
          }}
        />

        {/* Scanlines CRT */}
        <div className="absolute inset-0 w-full h-full pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_3px]"></div>

        {/* Retículo Tático Central */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="relative w-24 h-16 border border-dashed border-cyan-400/50">
            <span className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-cyan-300"></span>
            <span className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-cyan-300"></span>
            <span className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-cyan-300"></span>
            <span className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-cyan-300"></span>

            <div className="absolute inset-1.5 border border-emerald-400 bg-emerald-500/10 flex flex-col justify-between p-0.5">
              <span className="bg-emerald-950/90 text-emerald-300 text-[7.5px] font-bold px-1 py-0.2 self-start rounded border border-emerald-500/80">
                CONF: {(spot.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Coordenadas */}
        <div className="absolute top-1 left-1.5 pointer-events-none text-[8px] font-mono text-cyan-300 bg-black/75 px-1 py-0.2 rounded border border-cyan-800/60">
          {spot.latitude.toFixed(4)}°, {spot.longitude.toFixed(4)}°
        </div>

        {/* Timestamp */}
        <div className="absolute top-1 right-1.5 pointer-events-none text-[8px] font-mono text-amber-300 bg-black/75 px-1 py-0.2 rounded border border-slate-700/80">
          {utcTimestamp}
        </div>

        {/* Radiância Lateral */}
        <div className="absolute right-1.5 bottom-1.5 pointer-events-none text-[8px] font-mono font-bold text-amber-300 bg-black/80 px-1 py-0.2 rounded border border-amber-900/60">
          {spot.frp_mw} MW
        </div>
      </div>

      {/* 3. TELEMETRIA TÉCNICA COMPACTA (text-[10px] & text-[11px]) */}
      <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800 mb-2 text-[10px] space-y-1">
        <div className="text-white font-bold truncate text-[11px] border-b border-slate-800 pb-1 flex items-center justify-between">
          <span className="truncate">{spot.address || `${spot.municipality} - ${spot.state}`}</span>
          <span className="text-cyan-400 text-[9px] uppercase">{spot.biome}</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-0.5 text-slate-300">
          <div>
            <span className="text-slate-500 text-[9px]">Temp. Radiométrica:</span>
            <div className="text-amber-300 font-semibold text-[10px]">
              {spot.bright_ti4_k} K ({Math.round(spot.bright_ti4_k - 273.15)}°C)
            </div>
          </div>
          <div>
            <span className="text-slate-500 text-[9px]">Potência FRP:</span>
            <div className="text-red-400 font-semibold text-[10px]">{spot.frp_mw} MW</div>
          </div>
        </div>

        {/* Poluição do Ar e Material Particulado PM2.5 */}
        <div className="pt-1 mt-1 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[9.5px] text-slate-300">
            <Wind size={11} className="text-sky-400" />
            <span>Poluição: <strong className="text-white">PM2.5 {airQuality.pm25} µg/m³</strong></span>
          </div>
          <div className="flex items-center gap-1">
            {airQuality.alertTriggered && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" title="Alerta CONAMA: AQI > 50"></span>
            )}
            <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold uppercase border ${airQuality.badgeBg} ${airQuality.badgeText} ${airQuality.badgeBorder}`}>
              AQI {airQuality.aqi} • {airQuality.level}
            </span>
          </div>
        </div>
      </div>

      {/* 4. RADAR BUFFER DE INFRAESTRUTURA DE RESPOSTA */}
      <div className="bg-slate-900/80 rounded-lg p-1.5 border border-slate-800 mb-2 text-[9.5px] space-y-1">
        <div className="flex items-center gap-1 text-slate-300">
          <Truck size={11} className="text-red-400 flex-shrink-0" />
          <span className="truncate">
            <strong className="text-white">{infra.nearestStation.name}</strong> • {infra.nearestStation.distanceKm} km (ETA: ~{infra.nearestStation.estimatedMinutes} min)
          </span>
        </div>
        <div className="flex items-center gap-1 text-slate-300">
          <Droplets size={11} className="text-cyan-400 flex-shrink-0" />
          <span className="truncate">
            <strong className="text-white">{infra.nearestWater.name}</strong> • {infra.nearestWater.distanceKm} km
          </span>
        </div>
      </div>

      {/* 5. AÇÕES RÁPIDAS: DESPACHO E EXPANSÃO */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          onClick={handleQuickDispatch}
          disabled={isDispatching}
          className="py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-bold text-[9.5px] tracking-wider uppercase flex items-center justify-center gap-1 shadow transition-all cursor-pointer"
        >
          {localStatus === 'ACIONADO_SIMULACAO' ? (
            <>
              <CheckCircle2 size={11} />
              <span>Acionado ({dispatchedTime || 'OK'})</span>
            </>
          ) : (
            <>
              <Zap size={11} />
              <span>{isDispatching ? 'Enviando...' : 'Despachar WhatsApp'}</span>
            </>
          )}
        </button>

        <button
          onClick={() => onOpenDetails(spot)}
          className="py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-md font-bold text-[9.5px] tracking-wider uppercase flex items-center justify-center gap-1 transition-all cursor-pointer"
        >
          <Crosshair size={11} />
          <span>Detalhes C2</span>
        </button>
      </div>
    </div>
  );
};

export default HoverPreviewCard;
