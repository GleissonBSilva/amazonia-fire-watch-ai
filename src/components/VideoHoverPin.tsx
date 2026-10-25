import React, { useState } from 'react';
import { FireSpot } from '../types';
import { Camera, AlertTriangle, ShieldAlert, ExternalLink, Zap } from 'lucide-react';

interface VideoHoverPinProps {
  spot: FireSpot;
  onOpenDetails?: (spot: FireSpot) => void;
  onDispatchWhatsApp?: (spot: FireSpot) => void;
}

export const VideoHoverPin: React.FC<VideoHoverPinProps> = ({
  spot,
  onOpenDetails,
  onDispatchWhatsApp,
}) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);

  return (
    <div
      className="relative inline-block select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Marcador Pulsante */}
      <div className="cursor-pointer relative flex items-center justify-center w-8 h-8 group">
        {spot.has_video && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
        )}
        <span
          className={`relative inline-flex rounded-full h-6 w-6 items-center justify-center border-2 shadow-2xl transition-transform group-hover:scale-125 ${
            spot.has_video
              ? 'bg-red-600 border-amber-300 text-white'
              : spot.is_arson_cluster
              ? 'bg-purple-600 border-purple-300 text-white'
              : spot.is_recurrent
              ? 'bg-amber-600 border-amber-300 text-white'
              : 'bg-red-500 border-white text-white'
          }`}
        >
          {spot.has_video ? '🎥' : spot.is_arson_cluster ? '⚠️' : '🔥'}
        </span>
      </div>

      {/* Tooltip Hover Flutuante com Preview em Memória */}
      {isHovered && (
        <div className="absolute left-10 -top-12 z-[9999] w-72 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-2xl p-3 font-mono text-xs text-white animate-fade-in pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
            <div className="flex items-center space-x-1.5 truncate">
              <Camera size={13} className="text-red-400 animate-pulse flex-shrink-0" />
              <span className="font-bold text-slate-100 text-[11px] truncate">
                {spot.municipality} ({spot.state})
              </span>
            </div>
            <span
              className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${
                spot.is_arson_cluster
                  ? 'bg-purple-950 text-purple-300 border border-purple-700 animate-pulse'
                  : 'bg-red-950 text-red-300 border border-red-700'
              }`}
            >
              {spot.is_arson_cluster ? 'CRIME SUSPEITO' : 'FOCO ATIVO'}
            </span>
          </div>

          {/* Frame de Vídeo em Streaming na RAM */}
          <div className="relative w-full h-32 bg-black rounded overflow-hidden border border-slate-800 mb-2 flex items-center justify-center">
            {spot.video_url ? (
              <img
                src={spot.video_url}
                alt="Feed em Streaming na Memória RAM"
                className="w-full h-full object-cover block"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : spot.hover_thumbnail ? (
              <img
                src={spot.hover_thumbnail}
                alt="Thumbnail em Memória"
                className="w-full h-full object-cover block"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 text-[10px]">
                <Camera size={22} className="mb-1 text-slate-600" />
                <span>SEM STREAMING DISPONÍVEL</span>
              </div>
            )}

            {/* Badges do Stream */}
            <div className="absolute top-1.5 left-1.5 bg-red-600/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
              STREAMING (RAM)
            </div>

            <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-amber-300 text-[9px] px-1.5 py-0.5 rounded border border-amber-900/60">
              FRP: {spot.frp_mw} MW
            </div>
          </div>

          {/* Endereço e Metadados Geográficos */}
          <div className="space-y-1 text-[10px] text-slate-300 mb-2.5">
            <div className="truncate text-slate-200 font-semibold">{spot.address}</div>
            <div className="flex justify-between text-slate-400">
              <span>Satélite: {spot.satellite}</span>
              <span>Confiança: {(spot.confidence * 100).toFixed(0)}%</span>
            </div>
            <div className="text-slate-400">Detecção: {spot.detected_at}</div>
          </div>

          {/* Ações Rápidas */}
          <div className="flex gap-1.5">
            {onOpenDetails && (
              <button
                onClick={() => onOpenDetails(spot)}
                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded font-bold text-[10px] flex items-center justify-center gap-1 transition-all"
              >
                <ExternalLink size={11} />
                <span>Janela Flutuante</span>
              </button>
            )}
            {onDispatchWhatsApp && (
              <button
                onClick={() => onDispatchWhatsApp(spot)}
                className="py-1.5 px-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold text-[10px] flex items-center justify-center gap-1 transition-all"
                title="Despachar Alerta via WhatsApp"
              >
                <span>WhatsApp</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
