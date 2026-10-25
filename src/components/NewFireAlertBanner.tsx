import React, { useState } from 'react';
import {
  Flame,
  AlertTriangle,
  Wind,
  Truck,
  Droplets,
  Crosshair,
  Zap,
  CheckCircle2,
  X,
  Copy,
  Check,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { FireSpot } from '../types';
import { calculateAirQuality } from '../data/airQuality';
import { findNearestInfrastructure } from '../data/emergencyInfrastructure';
import { sendWhatsAppFireAlert } from '../services/alertService';

export interface NewFireAlertBannerProps {
  spot: FireSpot;
  onClose: () => void;
  onFlyTo: (lat: number, lng: number) => void;
  onOpenDetails: (spot: FireSpot) => void;
  onStatusChange?: (spotId: string, newStatus: any, dispatchedAt: string) => void;
  isSimulation?: boolean;
}

export const NewFireAlertBanner: React.FC<NewFireAlertBannerProps> = ({
  spot,
  onClose,
  onFlyTo,
  onOpenDetails,
  onStatusChange,
  isSimulation = true,
}) => {
  const [copied, setCopied] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [localStatus, setLocalStatus] = useState<string>(spot.status || 'PENDENTE');
  const [dispatchedTime, setDispatchedTime] = useState<string | null>(spot.dispatched_at || null);

  const airQuality = calculateAirQuality(spot.frp_mw, 0.8);
  const infra = findNearestInfrastructure(spot.latitude, spot.longitude);

  const copyCoords = () => {
    navigator.clipboard.writeText(`${spot.latitude.toFixed(5)}, ${spot.longitude.toFixed(5)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDispatch = async () => {
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
      setLocalStatus('ACIONADO_SIMULACAO');
      setDispatchedTime(nowStr);
      if (onStatusChange) {
        onStatusChange(spot.id, 'ACIONADO_SIMULACAO', nowStr);
      }
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <aside
      aria-label="Alerta de Novo Foco Detectado"
      className="fixed top-14 right-4 z-50 w-[420px] max-w-[calc(100vw-2rem)] bg-slate-950/98 border-2 border-yellow-500/90 shadow-[0_0_35px_rgba(234,179,8,0.35),0_15px_40px_rgba(0,0,0,0.95)] rounded-xl p-3.5 font-mono text-white select-none animate-slide-in backdrop-blur-xl"
    >
      {/* 1. TOPO: ALERTA TÁTICO PISCANTE DE NOVO SURGIMENTO */}
      <div className="flex items-center justify-between border-b border-yellow-500/40 pb-2 mb-2.5">
        <div className="flex items-center space-x-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <div className="flex items-center gap-1.5">
            <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase border ${
              isSimulation
                ? 'bg-amber-950 text-amber-300 border-amber-600'
                : 'bg-emerald-950 text-emerald-300 border-emerald-500'
            }`}>
              {isSimulation ? 'SIMULAÇÃO' : 'REAL NASA/INPE'}
            </span>
            <span className="text-[11.5px] font-black tracking-wider text-yellow-300 uppercase truncate max-w-[200px]">
              {spot.is_new_outbreak ? '🚨 NOVO FOCO (<3H)' : '🔥 FOCO SELECIONADO'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <span className="text-[9px] bg-slate-900 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded font-bold">
            {spot.satellite || 'VIIRS 375m'}
          </span>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition"
            title="Dispensar alerta"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* 2. LOCALIZAÇÃO E COORDENADAS NÍTIDAS */}
      <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800 mb-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[13px] font-black text-white uppercase tracking-wide">
              {spot.municipality} - {spot.state}
            </div>
            <div className="text-[11px] font-medium text-slate-300 leading-tight mt-0.5">
              {spot.address || 'Perímetro Rural sob Monitoramento'}
            </div>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-950 text-red-300 border border-red-600 flex-shrink-0">
            {spot.biome}
          </span>
        </div>

        {/* Coordenadas e Detecção */}
        <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400">
          <div className="flex items-center space-x-1 font-mono text-cyan-300 font-bold">
            <span>{spot.latitude.toFixed(5)}°, {spot.longitude.toFixed(5)}°</span>
            <button
              onClick={copyCoords}
              className="p-0.5 hover:text-white text-cyan-400 transition ml-1"
              title="Copiar coordenadas"
            >
              {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
            </button>
          </div>
          <div className="text-amber-300 font-medium">
            {spot.detected_at || 'Tempo Real'}
          </div>
        </div>
      </div>

      {/* 3. NÍVEL DE POLUIÇÃO DO AR (AQI & PM2.5) - DESTAQUE CRISTALINO */}
      <div className="bg-slate-900/95 rounded-lg p-2.5 border border-slate-700/80 mb-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-white">
            <Wind size={13} className="text-sky-400" />
            <span className="tracking-wide uppercase text-[11px]">Nível de Poluição do Ar (AQI)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">
              CAT {airQuality.categoryNumber}/6
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${airQuality.badgeBg} ${airQuality.badgeText} ${airQuality.badgeBorder}`}>
              AQI {airQuality.aqi} • {airQuality.level}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10.5px] bg-slate-950/70 rounded p-1.5 border border-slate-800/80">
          <div>
            <span className="text-slate-400 text-[9.5px]">Material Particulado:</span>
            <div className="text-white font-bold text-[11px]">
              PM2.5: <span className="text-amber-400">{airQuality.pm25} µg/m³</span>
            </div>
          </div>
          <div>
            <span className="text-slate-400 text-[9.5px]">Monóxido de Carbono:</span>
            <div className="text-white font-bold text-[11px]">
              CO: <span className="text-cyan-400">{airQuality.co_ppm} ppm</span>
            </div>
          </div>
        </div>

        <div className="mt-1.5 text-[10px] text-slate-300 font-sans leading-tight">
          <strong className="text-yellow-300">Impacto:</strong> {airQuality.healthImpact}
        </div>
        <div className="mt-1 text-[9.5px] text-slate-400 font-sans leading-tight">
          <strong className="text-emerald-400">Medida:</strong> {airQuality.operationalRecommendation}
        </div>

        {/* ALERTA DE POLUIÇÃO ATIVADO QUANDO AQI > 50 */}
        {airQuality.alertTriggered && (
          <div className="mt-2 bg-amber-950/90 border border-amber-500/80 rounded p-1.5 flex items-center justify-between text-[10px] text-amber-200 animate-pulse">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />
              <span>ALERTA DE AR ATIVO: AQI {airQuality.aqi} &gt; 50 ({airQuality.level})</span>
            </div>
            <span className="text-[8.5px] bg-amber-900/90 text-amber-100 border border-amber-600 px-1 py-0.2 rounded font-black uppercase">
              CONAMA 491
            </span>
          </div>
        )}
      </div>

      {/* 4. TELEMETRIA TÉRMICA & RADAR BUFFER DE RESPOSTA */}
      <div className="grid grid-cols-2 gap-2 mb-2.5">
        <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800 text-[10px]">
          <div className="text-slate-400 text-[9px] uppercase font-bold">Potência Térmica</div>
          <div className="text-red-400 font-black text-sm mt-0.5">{spot.frp_mw} MW</div>
          <div className="text-slate-400 text-[9px]">
            Temp: {spot.bright_ti4_k} K ({Math.round(spot.bright_ti4_k - 273.15)}°C)
          </div>
        </div>

        <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800 text-[10px] space-y-1">
          <div className="flex items-center gap-1 text-slate-300 truncate">
            <Truck size={11} className="text-red-400 flex-shrink-0" />
            <span className="truncate">
              <strong>{infra.nearestStation.name}</strong>
            </span>
          </div>
          <div className="text-slate-400 text-[9.5px]">
            Distância: <strong className="text-white">{infra.nearestStation.distanceKm} km</strong> (~{infra.nearestStation.estimatedMinutes} min)
          </div>
          <div className="flex items-center gap-1 text-slate-300 text-[9px] truncate pt-0.5 border-t border-slate-800">
            <Droplets size={10} className="text-cyan-400 flex-shrink-0" />
            <span className="truncate">{infra.nearestWater.name} ({infra.nearestWater.distanceKm} km)</span>
          </div>
        </div>
      </div>

      {/* 5. BOTÕES DE AÇÃO IMEDIATA */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={() => onFlyTo(spot.latitude, spot.longitude)}
          className="py-1.5 px-2 bg-sky-700 hover:bg-sky-600 text-white font-bold rounded-md text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 shadow transition cursor-pointer"
          title="Centralizar e aproximar no mapa"
        >
          <Crosshair size={12} />
          <span>Focar</span>
        </button>

        <button
          onClick={handleDispatch}
          disabled={isDispatching}
          className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-md text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 shadow transition cursor-pointer"
          title="Despachar alerta no WhatsApp (+55 91 99146-3640)"
        >
          {localStatus === 'ACIONADO_SIMULACAO' ? (
            <>
              <CheckCircle2 size={12} />
              <span>{dispatchedTime || 'Acionado'}</span>
            </>
          ) : (
            <>
              <Zap size={12} />
              <span>{isDispatching ? 'Enviando...' : 'Despachar'}</span>
            </>
          )}
        </button>

        <button
          onClick={() => onOpenDetails(spot)}
          className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold rounded-md text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition cursor-pointer"
          title="Abrir telemetria FLIR completa"
        >
          <Flame size={12} />
          <span>FLIR C2</span>
        </button>
      </div>
    </aside>
  );
};

export default NewFireAlertBanner;
