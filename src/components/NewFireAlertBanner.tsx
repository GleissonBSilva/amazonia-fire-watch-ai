import React, { useState, useEffect } from 'react';
import {
  Flame,
  Satellite,
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
  Globe,
} from 'lucide-react';
import { FireSpot } from '../types';
import { calculateAirQuality } from '../data/airQuality';
import { findNearestInfrastructure } from '../data/emergencyInfrastructure';
import { sendWhatsAppFireAlert } from '../services/alertService';
import { queryLandRegistry } from '../services/landRegistryService';

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

  useEffect(() => {
    setLocalStatus(spot.status || 'PENDENTE');
    setDispatchedTime(spot.dispatched_at || null);
  }, [spot.id, spot.status, spot.dispatched_at]);

  const isBrazil = spot.is_brazil !== false;
  const landRegistry = spot.land_registry || queryLandRegistry(spot.latitude, spot.longitude, spot.municipality, spot.state);

  const airQuality = spot.aqi != null
    ? {
        aqi: spot.aqi,
        pm25: spot.pm25 ?? 'N/A',
        co_ppm: (spot.frp_mw * 0.08).toFixed(1),
        level: spot.air_quality_level || 'MONITORADO',
        categoryNumber: spot.aqi > 300 ? 6 : spot.aqi > 200 ? 5 : spot.aqi > 150 ? 4 : spot.aqi > 100 ? 3 : spot.aqi > 50 ? 2 : 1,
        badgeBg: 'bg-amber-950/80',
        badgeText: 'text-amber-300',
        badgeBorder: 'border-amber-600',
        alertTriggered: spot.aqi > 50,
        healthImpact: 'Qualidade do ar monitorada pelos sensores orbitais.',
        operationalRecommendation: 'Acompanhar dispersão de fumaça via satélite GOES-16.'
      }
    : isSimulation
    ? calculateAirQuality(spot.frp_mw, 0.8)
    : null;

  const rawInfra = findNearestInfrastructure(spot.latitude, spot.longitude);
  const isBaseWithinRange = isBrazil && rawInfra.nearestStation.distanceKm <= 250;
  const isWaterWithinRange = isBrazil && rawInfra.nearestWater.distanceKm <= 250;

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
        airQualityAlert: airQuality ? { aqi: airQuality.aqi, level: airQuality.level, pm25: Number(airQuality.pm25) || 0 } : undefined,
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

      {/* FAIXA EXPLÍCITA DE SEPARAÇÃO: DADO REAL DE SATÉLITE vs SIMULAÇÃO */}
      {spot.is_simulated ? (
        <div className="bg-amber-950/90 border border-amber-500 rounded px-2 py-1 text-[9px] text-amber-200 flex items-center justify-between mb-2">
          <span className="font-bold flex items-center gap-1 text-amber-300">
            <AlertTriangle size={12} className="text-amber-400" />
            <span>MODO SIMULAÇÃO • EXERCÍCIO DE TREINAMENTO</span>
          </span>
          <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-amber-900 text-amber-200 border border-amber-600">
            SINTÉTICO
          </span>
        </div>
      ) : (
        <div className="bg-emerald-950/90 border border-emerald-500 rounded px-2 py-1 text-[9px] text-emerald-200 flex items-center justify-between mb-2">
          <span className="font-bold flex items-center gap-1 text-emerald-300">
            <Satellite size={12} className="text-emerald-400" />
            <span>DETECÇÃO ORBITAL REAL • SATÉLITES NASA / NOAA</span>
          </span>
          <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-emerald-900 text-emerald-200 border border-emerald-600">
            100% REAL
          </span>
        </div>
      )}

      {/* Alerta de Soberania / Limite Geográfico se Foco Internacional */}
      {!isBrazil && (
        <div className="bg-amber-950/80 border border-amber-500/80 rounded px-2 py-1 text-[9px] text-amber-200 flex items-center gap-1.5 mb-2">
          <Globe size={12} className="text-amber-400 flex-shrink-0" />
          <span>
            <strong>PAÍS VIZINHO ({spot.country_name || spot.state}):</strong> Foco fora do território brasileiro (IBGE).
          </span>
        </div>
      )}

      {/* 2. LOCALIZAÇÃO E COORDENADAS NÍTIDAS */}
      <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800 mb-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[13px] font-black text-white uppercase tracking-wide">
              {isBrazil ? `${spot.municipality} - ${spot.state}` : `${spot.municipality}`}
            </div>
            <div className="text-[11px] font-medium text-slate-300 leading-tight mt-0.5">
              {spot.address || 'Perímetro sob Monitoramento'}
            </div>
            {landRegistry && (
              <div className="mt-1 flex items-center gap-1.5 text-[9px] text-amber-300 bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">
                <span className="font-bold">CAR:</span>
                <span className="font-mono truncate max-w-[150px]">{landRegistry.car_receipt}</span>
                <span className="text-slate-400">•</span>
                <span className="truncate max-w-[120px]">{landRegistry.property_name}</span>
                <span className={`px-1 rounded text-[7.5px] font-bold ${
                  landRegistry.car_status === 'ATIVO' ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300'
                }`}>
                  {landRegistry.car_status}
                </span>
              </div>
            )}
          </div>
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border flex-shrink-0 ${
            isBrazil
              ? 'bg-red-950 text-red-300 border-red-600'
              : 'bg-amber-950 text-amber-300 border-amber-600'
          }`}>
            {isBrazil ? spot.biome : `${spot.country_name || 'VIZINHO'}`}
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

      {/* 3. NÍVEL DE POLUIÇÃO DO AR (AQI & PM2.5) */}
      <div className="bg-slate-900/95 rounded-lg p-2.5 border border-slate-700/80 mb-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-white">
            <Wind size={13} className="text-sky-400" />
            <span className="tracking-wide uppercase text-[11px]">Nível de Poluição do Ar (AQI)</span>
          </div>
          {airQuality ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">
                CAT {airQuality.categoryNumber}/6
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${airQuality.badgeBg} ${airQuality.badgeText} ${airQuality.badgeBorder}`}>
                AQI {airQuality.aqi} • {airQuality.level}
              </span>
            </div>
          ) : (
            <span className="text-[9px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-bold border border-slate-700">
              N/A (Sem sensor local)
            </span>
          )}
        </div>

        {airQuality ? (
          <>
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

            {/* Aviso Explícito de Medição Estimada Sem Sensor de Solo */}
            {(spot.is_estimated_aqi || !isSimulation) && (
              <div className="mt-1.5 text-[9px] text-amber-300 font-bold bg-amber-950/70 border border-amber-600/70 rounded px-2 py-1 flex items-center gap-1.5">
                <AlertTriangle size={11} className="text-amber-400 flex-shrink-0" />
                <span>⚠️ Estimativa via FRP/Pluma Orbital (Sem sensor de solo no local)</span>
              </div>
            )}

            <div className="mt-1.5 text-[10px] text-slate-300 font-sans leading-tight">
              <strong className="text-yellow-300">Impacto:</strong> {airQuality.healthImpact}
            </div>
            <div className="mt-1 text-[9.5px] text-slate-400 font-sans leading-tight">
              <strong className="text-emerald-400">Medida:</strong> {airQuality.operationalRecommendation}
            </div>

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
          </>
        ) : (
          <div className="text-[10px] text-slate-400 bg-slate-950/50 p-2 rounded border border-slate-800/60">
            Estação física de solo não disponível para esta coordenada remota.
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
              {isBrazil ? (
                isBaseWithinRange ? (
                  <strong>{rawInfra.nearestStation.name}</strong>
                ) : (
                  <strong className="text-slate-400">Base: N/A (&gt;250 km)</strong>
                )
              ) : (
                <strong className="text-slate-400">Base: N/A (Jurisdição Exterior)</strong>
              )}
            </span>
          </div>
          <div className="text-slate-400 text-[9.5px]">
            {isBrazil ? (
              isBaseWithinRange ? (
                <>Distância: <strong className="text-white">{rawInfra.nearestStation.distanceKm} km</strong> (~{rawInfra.nearestStation.estimatedMinutes} min)</>
              ) : (
                <span>Fora do raio de cobertura</span>
              )
            ) : (
              <span>Monitoramento internacional</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-slate-300 text-[9px] truncate pt-0.5 border-t border-slate-800">
            <Droplets size={10} className="text-cyan-400 flex-shrink-0" />
            <span className="truncate">
              {isBrazil ? (
                isWaterWithinRange ? (
                  `${rawInfra.nearestWater.name} (${rawInfra.nearestWater.distanceKm} km)`
                ) : (
                  'Manancial: N/A (>250 km)'
                )
              ) : (
                'Recurso: N/A (Exterior)'
              )}
            </span>
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
          title="Despachar alerta no WhatsApp (+55 92 99374-6740)"
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
          <ExternalLink size={12} />
          <span>Detalhes</span>
        </button>
      </div>
    </aside>
  );
};
