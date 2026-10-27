import React, { useState, useEffect, useMemo } from 'react';
import { Rnd } from 'react-rnd';
import { DelimitedArea, FireSpot, FireWeatherInfo, LandRegistryMatch } from '../types';
import { fetchRealWeather } from '../services/weatherService';
import { queryLandRegistryForArea } from '../services/landRegistryService';
import { PreliminaryInfractionModal } from './PreliminaryInfractionModal';
import {
  X,
  MapPin,
  Flame,
  Thermometer,
  Wind,
  Droplets,
  CloudRain,
  ShieldAlert,
  FileText,
  MessageSquare,
  Compass,
  AlertTriangle,
  Maximize2,
  Square,
  Minus,
  Building,
  Scale,
  Copy,
  Check
} from 'lucide-react';

interface AreaInspectionModalProps {
  area: DelimitedArea;
  allFires: FireSpot[];
  isOpen: boolean;
  onClose: () => void;
  onOpenReport?: (area: DelimitedArea) => void;
  onDispatchWhatsApp?: (area: DelimitedArea, fires: FireSpot[]) => void;
  onActivateGeofence?: (area: DelimitedArea) => void;
}

export const AreaInspectionModal: React.FC<AreaInspectionModalProps> = ({
  area,
  allFires,
  isOpen,
  onClose,
  onOpenReport,
  onDispatchWhatsApp,
  onActivateGeofence,
}) => {
  const [weather, setWeather] = useState<FireWeatherInfo | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState<boolean>(true);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [selectedInfraction, setSelectedInfraction] = useState<{ parcel: LandRegistryMatch; spot: FireSpot } | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Filtra todos os focos reais contidos nos limites da área delimitada
  const firesInArea = useMemo(() => {
    const minLat = Math.min(area.northEast.lat, area.southWest.lat);
    const maxLat = Math.max(area.northEast.lat, area.southWest.lat);
    const minLng = Math.min(area.northEast.lng, area.southWest.lng);
    const maxLng = Math.max(area.northEast.lng, area.southWest.lng);

    return allFires.filter((spot) => {
      return (
        spot.latitude >= minLat &&
        spot.latitude <= maxLat &&
        spot.longitude >= minLng &&
        spot.longitude <= maxLng
      );
    });
  }, [area, allFires]);

  // Cruzamento espacial da Malha Fundiária (CAR / SICAR / SIGEF / UCs) no quadrante
  const landParcels = useMemo(() => {
    const minLat = Math.min(area.northEast.lat, area.southWest.lat);
    const maxLat = Math.max(area.northEast.lat, area.southWest.lat);
    const minLng = Math.min(area.northEast.lng, area.southWest.lng);
    const maxLng = Math.max(area.northEast.lng, area.southWest.lng);

    return queryLandRegistryForArea(minLat, maxLat, minLng, maxLng);
  }, [area]);

  // Consulta telemetria climática em tempo real para o ponto central da área
  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingWeather(true);
    fetchRealWeather(area.center.lat, area.center.lng)
      .then((info) => {
        setWeather(info);
      })
      .finally(() => {
        setIsLoadingWeather(false);
      });
  }, [isOpen, area]);

  // Cálculos consolidados da área
  const stats = useMemo(() => {
    const count = firesInArea.length;
    const totalFrp = firesInArea.reduce((acc, f) => acc + (f.frp_mw || 0), 0);
    const avgFrp = count > 0 ? totalFrp / count : 0;
    const maxBright = count > 0 ? Math.max(...firesInArea.map((f) => f.bright_ti4_k || 300)) : 300;
    const maxTempC = Math.round(maxBright - 273.15);
    const criticalFires = firesInArea.filter((f) => f.frp_mw >= 50).length;

    return {
      count,
      totalFrp: Math.round(totalFrp * 10) / 10,
      avgFrp: Math.round(avgFrp * 10) / 10,
      maxTempC,
      criticalFires,
    };
  }, [firesInArea]);

  const handleCopyCar = (receipt: string, idx: number) => {
    navigator.clipboard.writeText(receipt);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <>
      <Rnd
        default={{
          x: Math.max(20, (window.innerWidth - 680) / 2),
          y: Math.max(20, (window.innerHeight - 620) / 2),
          width: 680,
          height: 620,
        }}
        minWidth={380}
        minHeight={320}
        bounds="window"
        dragHandleClassName="area-inspection-handle"
        enableResizing={!isMaximized}
        disableDragging={isMaximized}
        className={`fixed z-50 flex flex-col bg-slate-900/95 border border-slate-700/90 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md font-mono select-none ${
          isMaximized ? '!inset-3 !w-auto !h-auto !transform-none' : ''
        }`}
      >
        {/* Header Tático Móvel (Draggable Handle) */}
        <div className="area-inspection-handle px-4 py-2.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between cursor-move select-none flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-950 text-red-400 border border-red-700/60">
              <Compass size={16} />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
                <span>INTELIGÊNCIA GEOGRÁFICA & FUNDIÁRIA DA ÁREA</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                  TEMPO REAL
                </span>
              </h2>
              <p className="text-[9.5px] text-slate-400">
                Centro: {area.center.lat.toFixed(5)}, {area.center.lng.toFixed(5)} • Perímetro Selecionado
              </p>
            </div>
          </div>

          {/* Controles de Janela Flutuante (Mover / Maximizar / Fechar) */}
          <div className="flex items-center gap-1 text-slate-400">
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1 hover:text-white hover:bg-slate-800 rounded transition"
              title={isMaximized ? 'Restaurar tamanho' : 'Maximizar'}
            >
              {isMaximized ? <Square size={12} /> : <Maximize2 size={12} />}
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:text-red-400 hover:bg-slate-800 rounded transition"
              title="Fechar janela flutuante"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="p-4 space-y-3.5 overflow-y-auto flex-1 text-xs text-slate-200">
          {/* 1. Métricas Espaciais da Área */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-[9.5px] text-slate-400 block mb-0.5">ÁREA TOTAL</span>
              <span className="text-base font-bold text-cyan-400">{area.areaSqKm.toLocaleString('pt-BR')} km²</span>
              <span className="text-[8.5px] text-slate-500 block mt-0.5">
                {area.areaM2.toLocaleString('pt-BR')} m²
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-[9.5px] text-slate-400 block mb-0.5">EXTENSÃO RURAL</span>
              <span className="text-base font-bold text-amber-400">{area.areaHa.toLocaleString('pt-BR')} ha</span>
              <span className="text-[8.5px] text-slate-500 block mt-0.5">Hectares delimitados</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-[9.5px] text-slate-400 block mb-0.5">FOCOS DETECTADOS</span>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-base font-bold ${stats.count > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {stats.count}
                </span>
                {stats.criticalFires > 0 && (
                  <span className="text-[9px] text-red-500 font-bold">
                    ({stats.criticalFires} críticos)
                  </span>
                )}
              </div>
              <span className="text-[8.5px] text-slate-500 block mt-0.5">
                {stats.totalFrp > 0 ? `${stats.totalFrp} MW acumulados` : 'Nenhum foco ativo'}
              </span>
            </div>
          </div>

          {/* 2. CRUZAMENTO FUNDIÁRIO IMEDIATO NO PERÍMETRO (CAR / SICAR / SIGEF) */}
          <div className="p-3 rounded-lg bg-slate-950/90 border border-cyan-800/80 space-y-2">
            <div className="flex items-center justify-between border-b border-cyan-950 pb-1.5">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5 text-[11px]">
                <Building size={13} className="text-cyan-400" />
                MALHA FUNDIÁRIA NO QUADRANTE ({landParcels.length} Imóveis Interceptados)
              </span>
              <span className="text-[8.5px] text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-700">
                SICAR / SIGEF
              </span>
            </div>

            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {landParcels.map((p, idx) => (
                <div key={idx} className="p-2 rounded bg-slate-900 border border-slate-800 text-[9.5px] space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-white text-[10.5px] truncate">{p.property_name}</strong>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[8px] font-black border ${
                        p.car_status === 'ATIVO'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                          : p.car_status === 'PENDENTE'
                          ? 'bg-yellow-950 text-yellow-300 border-yellow-600'
                          : 'bg-red-950 text-red-300 border-red-600'
                      }`}
                    >
                      CAR {p.car_status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400 text-[8.5px]">
                    <span>Responsável: <strong className="text-slate-200">{p.owner_name}</strong> ({p.owner_document})</span>
                    <span>Área: {p.total_area_ha} ha</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <div className="flex items-center gap-1 text-[8px] text-amber-300/90 truncate max-w-[280px]">
                      <span>Recibo:</span>
                      <span className="font-mono truncate">{p.car_receipt}</span>
                      <button
                        onClick={() => handleCopyCar(p.car_receipt, idx)}
                        className="p-0.5 hover:text-white rounded"
                        title="Copiar Recibo CAR"
                      >
                        {copiedIndex === idx ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        const referenceSpot = firesInArea[0] || {
                          id: `SPOT-AREA-${idx}`,
                          latitude: area.center.lat,
                          longitude: area.center.lng,
                          municipality: p.property_name,
                          state: 'AM',
                          biome: 'Amazônia',
                          satellite: 'GOES-16 ABI / VIIRS 375m',
                          frp_mw: stats.totalFrp || 35.0,
                          bright_ti4_k: 360,
                          confidence: 0.95,
                          detected_at: 'Detecção em Área Delimitada',
                          detected_iso: new Date().toISOString(),
                          address: p.property_name,
                          has_video: false,
                          is_arson_cluster: false,
                          is_recurrent: false,
                        };
                        setSelectedInfraction({ parcel: p, spot: referenceSpot });
                      }}
                      className="px-2 py-0.5 rounded bg-red-950 hover:bg-red-900 text-red-200 border border-red-700/80 flex items-center gap-1 text-[8.5px] font-bold transition cursor-pointer"
                    >
                      <Scale size={10} className="text-yellow-400" />
                      <span>Auto de Infração</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Telemetria Meteorológica em Tempo Real (Open-Meteo) */}
          <div className="p-3 rounded-lg bg-slate-950/90 border border-sky-900/60 space-y-2">
            <div className="flex items-center justify-between border-b border-sky-950 pb-1.5">
              <span className="font-bold text-sky-300 flex items-center gap-1.5 text-[11px]">
                <Thermometer size={13} className="text-sky-400" />
                TELEMETRIA METEOROLÓGICA DO QUADRANTE (AO VIVO)
              </span>
              <span className="text-[8.5px] text-sky-400/80 bg-sky-950 px-1.5 py-0.2 rounded border border-sky-800">
                ECMWF / OPEN-METEO
              </span>
            </div>

            {isLoadingWeather ? (
              <div className="py-2 text-center text-slate-400 text-xs">
                Consultando dados meteorológicos do quadrante em tempo real...
              </div>
            ) : weather ? (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[8.5px] text-slate-400 block">TEMP DO AR</span>
                    <span className="text-xs font-bold text-orange-300">{weather.temperature_c}°C</span>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[8.5px] text-slate-400 block">UMIDADE</span>
                    <span className="text-xs font-bold text-cyan-300">{weather.relative_humidity}%</span>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[8.5px] text-slate-400 block">VENTO</span>
                    <span className="text-xs font-bold text-emerald-300">{weather.wind_speed_kmh} km/h</span>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[8.5px] text-slate-400 block">PRECIPITAÇÃO</span>
                    <span className="text-xs font-bold text-blue-300">{weather.precipitation_mm} mm</span>
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex items-start gap-2">
                  <AlertTriangle
                    size={14}
                    className={
                      weather.fire_spread_risk === 'EXTREMO'
                        ? 'text-red-400 flex-shrink-0 mt-0.5'
                        : weather.fire_spread_risk === 'ALTO'
                        ? 'text-amber-400 flex-shrink-0 mt-0.5'
                        : 'text-emerald-400 flex-shrink-0 mt-0.5'
                    }
                  />
                  <div>
                    <span className="font-bold text-[9.5px] text-white">
                      Índice de Risco: <span className="text-amber-300">{weather.fire_spread_risk}</span>
                    </span>
                    <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">
                      {weather.risk_reason}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* 4. Lista de Focos Ativos no Perímetro */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Flame size={13} className="text-red-400" />
                FOCOS INTERNOS NO PERÍMETRO ({firesInArea.length})
              </span>
              {stats.maxTempC > 0 && (
                <span className="text-[9.5px] text-slate-400">
                  Pico Térmico: <span className="text-red-400 font-bold">{stats.maxTempC}°C</span>
                </span>
              )}
            </div>

            {firesInArea.length === 0 ? (
              <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800 text-center text-slate-500 text-xs">
                Nenhum foco de queima detectado nos satélites dentro deste perímetro.
              </div>
            ) : (
              <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-800 divide-y divide-slate-800 bg-slate-950/60">
                {firesInArea.map((spot) => (
                  <div key={spot.id} className="p-2 flex items-center justify-between hover:bg-slate-900/60 transition text-[9.5px]">
                    <div>
                      <div className="font-bold text-white flex items-center gap-1">
                        <MapPin size={9} className="text-red-400" />
                        <span>{spot.municipality || spot.address}</span>
                      </div>
                      <div className="text-[8.5px] text-slate-400">
                        Lat: {spot.latitude.toFixed(4)}, Lng: {spot.longitude.toFixed(4)} • {spot.satellite}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-amber-400">{spot.frp_mw} MW</div>
                      <div className="text-[8.5px] text-red-300">{Math.round(spot.bright_ti4_k - 273.15)}°C</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé com Ações Táticas */}
        <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            {onOpenReport && (
              <button
                onClick={() => {
                  onClose();
                  onOpenReport(area);
                }}
                className="px-2.5 py-1 rounded bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-700/80 font-bold flex items-center gap-1 transition text-[10.5px]"
              >
                <FileText size={12} />
                <span>Relatório</span>
              </button>
            )}

            {onActivateGeofence && (
              <button
                onClick={() => {
                  onClose();
                  onActivateGeofence(area);
                }}
                className="px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-200 border border-cyan-700/80 font-bold flex items-center gap-1 transition text-[10.5px]"
              >
                <ShieldAlert size={12} />
                <span>Cerca IA</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {onDispatchWhatsApp && (
              <button
                onClick={() => onDispatchWhatsApp(area, firesInArea)}
                className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 transition shadow text-[10.5px]"
              >
                <MessageSquare size={12} />
                <span>WhatsApp</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition text-[10.5px]"
            >
              Fechar
            </button>
          </div>
        </div>
      </Rnd>

      {/* Modal do Auto de Infração Preliminar quando disparado da área */}
      {selectedInfraction && (
        <PreliminaryInfractionModal
          spot={selectedInfraction.spot}
          landRegistry={selectedInfraction.parcel}
          isOpen={!!selectedInfraction}
          onClose={() => setSelectedInfraction(null)}
          onDispatchWhatsApp={() => {
            setSelectedInfraction(null);
            if (onDispatchWhatsApp) {
              onDispatchWhatsApp(area, [selectedInfraction.spot]);
            }
          }}
        />
      )}
    </>
  );
};
