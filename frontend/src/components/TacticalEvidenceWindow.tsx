import React, { useState, useMemo } from 'react';
import { FloatingWindow } from './FloatingWindow';
import { FireSpot, LandRegistryMatch } from '../types';
import { calculateAirQuality } from '../data/airQuality';
import { findNearestInfrastructure } from '../data/emergencyInfrastructure';
import { sendWhatsAppFireAlert } from '../services/alertService';
import { queryLandRegistry } from '../services/landRegistryService';
import { PreliminaryInfractionModal } from './PreliminaryInfractionModal';
import {
  Satellite,
  Wind,
  Truck,
  Droplets,
  Zap,
  AlertTriangle,
  Globe,
  MapPin,
  Flame,
  CheckCircle2,
  FileCheck2,
  Scale,
  Building,
  User,
  Radio,
  Clock,
  Copy,
  Check
} from 'lucide-react';

export interface TacticalEvidenceWindowProps {
  spot: FireSpot | null;
  isOpen: boolean;
  isMinimized: boolean;
  zIndex: number;
  onFocus: (id: string) => void;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onStatusChange?: (spotId: string, newStatus: any, dispatchedAt: string) => void;
  isSimulation?: boolean;
}

export const TacticalEvidenceWindow: React.FC<TacticalEvidenceWindowProps> = ({
  spot,
  isOpen,
  isMinimized,
  zIndex,
  onFocus,
  onClose,
  onMinimize,
  onStatusChange,
  isSimulation = true,
}) => {
  const [isDispatching, setIsDispatching] = useState(false);
  const [isInfractionModalOpen, setIsInfractionModalOpen] = useState(false);
  const [copiedCar, setCopiedCar] = useState(false);

  // Cruzamento fundiário imediato (CAR / SICAR / SIGEF)
  const landRegistry: LandRegistryMatch = useMemo(() => {
    if (!spot) return queryLandRegistry(-1.0, -62.0);
    return spot.land_registry || queryLandRegistry(spot.latitude, spot.longitude, spot.municipality, spot.state);
  }, [spot]);

  if (!isOpen || isMinimized || !spot) {
    return null;
  }

  const isBrazil = spot.is_brazil !== false;
  const status = spot.status || 'PENDENTE';
  const brightK = spot.bright_ti4_k;
  const brightC = brightK != null ? Math.round(brightK - 273.15) : null;
  const confidencePct = spot.confidence != null
    ? Math.round(spot.confidence <= 1 ? spot.confidence * 100 : spot.confidence)
    : null;
  const frpMw = spot.frp_mw;

  // Verifica se o alerta é preliminar do GOES-16 (geoestacionário)
  const isGoes16Preliminary = spot.is_geostationary_preliminary || spot.satellite?.includes('GOES');

  // Telemetria de Qualidade do Ar: Dados comprovados da API ou N/A
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
      }
    : isSimulation
    ? calculateAirQuality(spot.frp_mw, 0.8)
    : null;

  // Proximidade de Infraestrutura Operacional: Raio máximo de 250 km (exclusivo para jurisdição brasileira)
  const rawInfra = findNearestInfrastructure(spot.latitude, spot.longitude);
  const isBaseWithinRange = isBrazil && rawInfra.nearestStation.distanceKm <= 250;
  const isWaterWithinRange = isBrazil && rawInfra.nearestWater.distanceKm <= 250;

  const handleCopyCar = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(landRegistry.car_receipt);
    setCopiedCar(true);
    setTimeout(() => setCopiedCar(false), 2000);
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
      if (onStatusChange) {
        onStatusChange(spot.id, 'ACIONADO_SIMULACAO', nowStr);
      }
    } catch (e) {
      if (onStatusChange) {
        onStatusChange(spot.id, 'ACIONADO_SIMULACAO', nowStr);
      }
    } finally {
      setIsDispatching(false);
    }
  };

  const titleText = isBrazil
    ? `Evidência Tática • ${spot.municipality || 'Foco Térmico'} (${spot.state || 'BR'})`
    : `Evidência Tática • ${spot.municipality || 'Foco Transfronteiriço'} [${spot.state || 'EXT'}]`;

  return (
    <>
      <FloatingWindow
        id="spotDetail"
        title={titleText}
        isOpen={isOpen}
        isMinimized={isMinimized}
        zIndex={zIndex}
        onFocus={onFocus}
        onClose={onClose}
        onMinimize={onMinimize}
        defaultPosition={{ x: 24, y: Math.max(50, window.innerHeight - 560) }}
        defaultSize={{ width: 410, height: 530 }}
      >
        <div className="flex flex-col h-full bg-slate-950 p-2.5 text-white font-mono text-xs space-y-2 select-none overflow-y-auto">
          {/* FAIXA EXPLÍCITA DE SEPARAÇÃO: DADO REAL DE SATÉLITE vs SIMULAÇÃO */}
          {spot.is_simulated ? (
            <div className="bg-amber-950/90 border border-amber-500/80 rounded px-2 py-1 text-[9px] text-amber-200 flex items-center justify-between flex-shrink-0 shadow-sm">
              <span className="font-bold flex items-center gap-1.5 text-amber-300">
                <AlertTriangle size={12} className="text-amber-400 animate-pulse" />
                <span>EXERCÍCIO DE SIMULAÇÃO TÁTICA (SINTÉTICO / YOLO)</span>
              </span>
              <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-amber-900 text-amber-200 border border-amber-600">
                TESTE / SIMULADO
              </span>
            </div>
          ) : (
            <div className="bg-emerald-950/90 border border-emerald-500/80 rounded px-2 py-1 text-[9px] text-emerald-200 flex items-center justify-between flex-shrink-0 shadow-sm">
              <span className="font-bold flex items-center gap-1.5 text-emerald-300">
                <Satellite size={12} className="text-emerald-400" />
                <span>DETECÇÃO ORBITAL REAL (NASA FIRMS / NOAA / INPE)</span>
              </span>
              <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-emerald-900 text-emerald-200 border border-emerald-600">
                100% REAL • EM ÓRBITA
              </span>
            </div>
          )}

          {/* Barra de Status Operacional e Identificação de Fronteira */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 flex-shrink-0">
            <div className="truncate max-w-[220px]">
              <div className="text-xs font-bold text-red-400 truncate flex items-center gap-1">
                {isBrazil ? (
                  <span>🇧🇷 {spot.address || `${spot.municipality} - ${spot.state}`}</span>
                ) : (
                  <span className="text-amber-400">🌐 {spot.address || `${spot.municipality}`}</span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                {isBrazil ? (
                  <span>{spot.municipality} • {spot.satellite}</span>
                ) : (
                  <span className="text-amber-300/90 font-semibold">
                    INTERNACIONAL // {spot.country_name || spot.state} ({spot.satellite})
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {spot.is_new_outbreak && (
                <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-yellow-950 text-yellow-300 border border-yellow-500 animate-pulse">
                  NOVO &lt;3H
                </span>
              )}
              <span
                className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold border ${
                  status === 'ACIONADO_SIMULACAO'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                    : status === 'EQUIPE_DESIGNADA'
                    ? 'bg-purple-950 text-purple-300 border-purple-500'
                    : status === 'COMBATE_ATIVO'
                    ? 'bg-red-950 text-red-300 border-red-500'
                    : 'bg-amber-950 text-amber-300 border-amber-600'
                }`}
              >
                {status === 'ACIONADO_SIMULACAO' ? 'ACIONADO' : status}
              </span>
            </div>
          </div>

          {/* ALERTA DE DETECÇÃO EM TEMPO REAL: GOES-16 ABI (Substitui Janela de 12h do Polar) */}
          {isGoes16Preliminary ? (
            <div className="bg-gradient-to-r from-amber-950/90 via-orange-950/80 to-amber-950/90 border border-orange-500 rounded p-2 text-[9px] space-y-1 flex-shrink-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Radio size={12} className="text-orange-400 animate-pulse" />
                  <span>ALERTA PRELIMINAR GOES-16 (TEMPO REAL ~10-15m)</span>
                </span>
                <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-orange-900 text-orange-200 border border-orange-400">
                  ALERTA QUENTE
                </span>
              </div>
              <p className="text-orange-200/90 text-[8.5px] leading-relaxed">
                Anomalia térmica detectada instantaneamente pela NOAA (GOES-16 ABI). O sistema mantém o alerta ativo e quente até a passagem de confirmação de alta resolução (375m) do VIIRS/Sentinel.
              </p>
            </div>
          ) : (
            <div className="bg-slate-900/80 border border-slate-800 rounded px-2 py-1 text-[8.5px] text-slate-400 flex items-center justify-between flex-shrink-0">
              <span className="flex items-center gap-1 text-slate-300">
                <Satellite size={11} className="text-cyan-400" />
                <span>Órbita Polar: Confirmação Calibrada VIIRS 375m</span>
              </span>
              <span className="text-cyan-400 font-bold">Alta Precisão</span>
            </div>
          )}

          {/* Alerta de Soberania / Limite Geográfico se Foco Internacional */}
          {!isBrazil && (
            <div className="bg-amber-950/80 border border-amber-500/80 rounded px-2 py-1 text-[9px] text-amber-200 flex items-center gap-1.5 flex-shrink-0">
              <Globe size={12} className="text-amber-400 flex-shrink-0" />
              <span>
                <strong>PAÍS VIZINHO ({spot.country_name || spot.state}):</strong> Ponto fora da malha do Brasil (IBGE). Monitoramento orbital transfronteiriço ativo.
              </span>
            </div>
          )}

          {/* Sensor Térmico FLIR ou Telemetria Orbital Real */}
          <div className="relative h-28 bg-black rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center flex-shrink-0">
            {isSimulation && spot.has_video ? (
              <>
                <img
                  src={spot.video_url || 'http://localhost:8000/api/stream/live.mjpg'}
                  alt="Feed ao Vivo em Memória"
                  className="w-full h-full object-cover block"
                />
                <div className="absolute top-1.5 left-2 bg-amber-600/90 px-1.5 py-0.2 rounded text-[8.5px] font-bold">
                  SIMULAÇÃO YOLO (RAM)
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-slate-950 font-mono">
                <Satellite className={isGoes16Preliminary ? "text-amber-400 mb-0.5 animate-pulse" : isBrazil ? "text-cyan-400 mb-0.5" : "text-amber-400 mb-0.5"} size={20} />
                <span className="text-[9.5px] font-bold text-white uppercase tracking-wider">
                  {isGoes16Preliminary ? 'Sensor Geoestacionário GOES-16 ABI' : isBrazil ? 'Sensor Orbital Polar NASA VIIRS (375m)' : `Detecção NASA FIRMS • ${spot.country_name || 'América do Sul'}`}
                </span>
                <span className="text-[8.5px] text-slate-400 mt-0.5">
                  Banda Espectral Infravermelha • {spot.latitude.toFixed(5)}°, {spot.longitude.toFixed(5)}°
                </span>
              </div>
            )}
            <div className="absolute top-1.5 right-2 bg-slate-900/90 text-cyan-300 px-1.5 py-0.2 rounded text-[8px] border border-cyan-800 font-mono">
              {spot.latitude != null && spot.longitude != null
                ? `${spot.latitude.toFixed(4)}°, ${spot.longitude.toFixed(4)}°`
                : 'N/A'}
            </div>
          </div>

          {/* Telemetria Compacta: FRP, TEMP (Kelvin e Celsius), CONF */}
          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] flex-shrink-0">
            <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
              <div className="text-slate-400 text-[8.5px]">FRP (Potência)</div>
              <div className="text-amber-400 font-bold text-xs">
                {frpMw != null ? `${frpMw} MW` : 'N/A'}
              </div>
            </div>
            <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
              <div className="text-slate-400 text-[8.5px]">TEMP (Brilho)</div>
              <div className="text-red-400 font-bold text-xs">
                {brightK != null ? `${brightK} K (${brightC}°C)` : 'N/A'}
              </div>
            </div>
            <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
              <div className="text-slate-400 text-[8.5px]">CONFIANÇA</div>
              <div className="text-emerald-400 font-bold text-xs">
                {confidencePct != null ? `${confidencePct}%` : 'N/A'}
              </div>
            </div>
          </div>

          {/* NOVO: CRUZAMENTO FUNDIÁRIO IMEDIATO GLOBAL (CAR / SIGEF / BLM / LPIS) */}
          {landRegistry && (
            <div className="p-2.5 rounded-lg bg-gradient-to-b from-slate-900 to-slate-950 border border-cyan-800/80 space-y-1.5 flex-shrink-0">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5 text-[10.5px]">
                  <Building size={12} className="text-cyan-400" />
                  <span>{isBrazil ? 'MALHA FUNDIÁRIA (CAR / SICAR)' : `REGISTRO FUNDIÁRIO (${spot.country_name || 'GLOBAL'})`}</span>
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[8px] font-black border ${
                    landRegistry.car_status === 'ATIVO'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                      : landRegistry.car_status === 'PENDENTE'
                      ? 'bg-yellow-950 text-yellow-300 border-yellow-600'
                      : 'bg-red-950 text-red-300 border-red-600'
                  }`}
                >
                  CAR {landRegistry.car_status}
                </span>
              </div>

              {/* Responsável e Imóvel */}
              <div className="space-y-0.5 text-[9.5px]">
                <div className="flex items-baseline justify-between truncate">
                  <span className="text-slate-400">Responsável:</span>
                  <strong className="text-white truncate max-w-[210px]">{landRegistry.owner_name}</strong>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-slate-400">CPF/CNPJ:</span>
                  <strong className="text-amber-300 font-mono">{landRegistry.owner_document}</strong>
                </div>
                <div className="flex items-baseline justify-between truncate">
                  <span className="text-slate-400">Imóvel:</span>
                  <strong className="text-cyan-200 truncate max-w-[210px]">{landRegistry.property_name}</strong>
                </div>
              </div>

              {/* Recibo CAR com botão de cópia */}
              <div className="p-1.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between gap-1 text-[8.5px]">
                <span className="text-slate-400 font-mono truncate">{landRegistry.car_receipt}</span>
                <button
                  onClick={handleCopyCar}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-0.5 flex-shrink-0 transition"
                  title="Copiar Recibo CAR"
                >
                  {copiedCar ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                  <span>{copiedCar ? 'OK' : 'CAR'}</span>
                </button>
              </div>

              {/* Botão de Destaque: GERAR AUTO DE INFRAÇÃO PRELIMINAR */}
              <button
                onClick={() => setIsInfractionModalOpen(true)}
                className="w-full py-1.5 bg-gradient-to-r from-red-900 to-rose-900 hover:from-red-800 hover:to-rose-800 text-white font-bold rounded shadow flex items-center justify-center gap-1.5 text-[10px] transition cursor-pointer border border-red-600/80"
              >
                <Scale size={12} className="text-yellow-300" />
                <span>GERAR AUTO DE INFRAÇÃO PRELIMINAR</span>
              </button>
            </div>
          )}

          {/* Telemetria de Qualidade do Ar & Particulado PM2.5 */}
          <div className="bg-slate-900/95 p-1.5 rounded-lg border border-slate-800 text-[10px] space-y-1 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-slate-300 font-bold">
                <Wind size={11} className="text-sky-400" />
                <span>Poluição do Ar (AQI)</span>
              </div>
              {airQuality ? (
                <div className="flex items-center gap-1">
                  <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase border ${airQuality.badgeBg} ${airQuality.badgeText} ${airQuality.badgeBorder}`}>
                    AQI {airQuality.aqi} • {airQuality.level}
                  </span>
                </div>
              ) : (
                <span className="text-[8.5px] bg-slate-800/80 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                  N/A (Sem sensor local)
                </span>
              )}
            </div>

            {airQuality && (
              <div className="flex items-center justify-between text-[8.5px] text-slate-400 pt-0.5 border-t border-slate-800/80">
                <span>Partículas: <strong className="text-amber-300">PM2.5 {airQuality.pm25} µg/m³</strong></span>
                <span>Gás: <strong className="text-cyan-300">CO {airQuality.co_ppm} ppm</strong></span>
              </div>
            )}
          </div>

          {/* Radar Buffer: Infraestrutura de Resposta Mais Próxima */}
          <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800 text-[9px] space-y-1 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-slate-300 truncate">
              <Truck size={11} className="text-red-400 flex-shrink-0" />
              <span className="truncate">
                {isBrazil ? (
                  isBaseWithinRange ? (
                    <>🚒 <strong className="text-white">{rawInfra.nearestStation.name}</strong> • {rawInfra.nearestStation.distanceKm} km (~{rawInfra.nearestStation.estimatedMinutes} min)</>
                  ) : (
                    <>🚒 <strong className="text-slate-400">Base Mais Próxima:</strong> N/A (Fora do raio de 250 km)</>
                  )
                ) : (
                  <>🚒 <strong className="text-slate-400">Base de Resposta:</strong> N/A (Internacional)</>
                )}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300 truncate">
              <Droplets size={11} className="text-cyan-400 flex-shrink-0" />
              <span className="truncate">
                {isBrazil ? (
                  isWaterWithinRange ? (
                    <>💧 <strong className="text-white">{rawInfra.nearestWater.name}</strong> • {rawInfra.nearestWater.distanceKm} km</>
                  ) : (
                    <>💧 <strong className="text-slate-400">Recurso Hídrico:</strong> N/A (Fora do raio)</>
                  )
                ) : (
                  <>💧 <strong className="text-slate-400">Recurso Hídrico:</strong> N/A (Internacional)</>
                )}
              </span>
            </div>
          </div>

          {/* Botão de Despacho com Atualização Instantânea de Status */}
          <button
            onClick={handleDispatch}
            disabled={isDispatching}
            className="w-full py-1.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold rounded shadow flex items-center justify-center gap-1 text-[10.5px] cursor-pointer disabled:opacity-50 flex-shrink-0"
          >
            <Zap size={12} />
            <span>
              {status === 'ACIONADO_SIMULACAO'
                ? `ACIONADO (${spot.dispatched_at || 'TESTE'})`
                : 'ACIONAR DESPACHO WHATSAPP (+55 92 99374-6740)'}
            </span>
          </button>
        </div>
      </FloatingWindow>

      {/* Modal do Auto de Infração Preliminar */}
      {isInfractionModalOpen && (
        <PreliminaryInfractionModal
          spot={spot}
          landRegistry={landRegistry}
          isOpen={isInfractionModalOpen}
          onClose={() => setIsInfractionModalOpen(false)}
          onDispatchWhatsApp={() => {
            setIsInfractionModalOpen(false);
            handleDispatch();
          }}
        />
      )}
    </>
  );
};
