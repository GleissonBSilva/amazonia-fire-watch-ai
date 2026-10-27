import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import { MessageSquare, X, Send, Copy, Check, ShieldAlert, MapPin, ExternalLink, Flame, AlertTriangle, Maximize2, Square } from 'lucide-react';
import { sendWhatsAppFireAlert } from '../services/alertService';
import { FireSpot, DelimitedArea } from '../types';

interface WhatsAppConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedArea?: DelimitedArea | null;
  selectedSpot?: FireSpot | null;
}

export const WhatsAppConfirmModal: React.FC<WhatsAppConfirmModalProps> = ({
  isOpen,
  onClose,
  selectedArea,
  selectedSpot,
}) => {
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  if (!isOpen) return null;

  const targetNumber = '+55 92 99374-6740';
  const lat = selectedSpot ? selectedSpot.latitude : selectedArea ? selectedArea.center.lat : -3.11902;
  const lng = selectedSpot ? selectedSpot.longitude : selectedArea ? selectedArea.center.lng : -60.02173;
  const areaKm2 = selectedArea ? selectedArea.areaSqKm : 1.45;
  const localNome = selectedSpot ? `${selectedSpot.address} - ${selectedSpot.municipality}/${selectedSpot.state}` : 'Área Demarcada pelo Operador (Manaus/AM)';
  const municipio = selectedSpot ? selectedSpot.municipality : 'Manaus';
  const frpMw = selectedSpot ? selectedSpot.frp_mw : 35.5;
  const isRecurrent = selectedSpot ? (selectedSpot.is_recurrent || selectedSpot.is_arson_cluster) : false;
  const mapsLink = `https://www.google.com/maps?q=${lat.toFixed(5)},${lng.toFixed(5)}`;

  const formattedMessage =
    `*[ALERTA TÁTICO CBMAM / CIOPS]*\n` +
    `🚨 *ALERTA AMAZÔNIA FIRE WATCH AI* 🚨\n\n` +
    `${isRecurrent ? '🚨 *SUSPEITA DE AÇÃO REINCIDENTE/CRIME*' : '🔥 *FOCO TÉRMICO IDENTIFICADO*'}\n` +
    `📍 *Local:* ${localNome}\n` +
    `🌐 *Coordenadas:* ${lat.toFixed(5)}, ${lng.toFixed(5)}\n` +
    `⚡ *Potência Térmica:* ${frpMw} MW\n` +
    `📐 *Área Estimada:* ~${areaKm2.toFixed(2)} km² (${(areaKm2 * 100).toFixed(1)} ha)\n` +
    `🛰️ *Satélite:* NOAA-20 (VIIRS 375m) / INPE\n` +
    `🗺️ *Localização Google Maps:* ${mapsLink}\n\n` +
    `_Protocolo: CBMAM-FW-2026-928174_`;

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDispatch = async () => {
    setSending(true);
    try {
      await sendWhatsAppFireAlert({
        lat,
        lng,
        areaSqKm: areaKm2,
        criticidade: isRecurrent ? 'CRÍTICA' : 'ALTA',
        municipio,
        isRecurrent,
        targetPhone: '5592993746740',
        customMessage: formattedMessage,
      });
      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Falha no disparo do WhatsApp:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <Rnd
      default={{
        x: Math.max(30, (window.innerWidth - 560) / 2),
        y: Math.max(30, (window.innerHeight - 520) / 2),
        width: 560,
        height: 520,
      }}
      minWidth={340}
      minHeight={280}
      bounds="window"
      dragHandleClassName="confirm-window-handle"
      enableResizing={!isMaximized}
      disableDragging={isMaximized}
      className={`fixed z-50 flex flex-col bg-slate-900/95 border border-slate-700/90 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md font-mono select-none ${
        isMaximized ? '!inset-3 !w-auto !h-auto !transform-none' : ''
      }`}
    >
      {/* Titlebar móvel */}
      <div className="confirm-window-handle px-4 py-2.5 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 border-b border-emerald-900/60 flex items-center justify-between cursor-move select-none flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-emerald-600 text-white">
            <MessageSquare size={15} />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white tracking-wide">
              CONFIRMAÇÃO DE DESPACHO OPERACIONAL
            </h2>
            <span className="text-[9px] text-emerald-300">
              Destino Autorizado: {targetNumber}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 hover:text-white hover:bg-slate-800 rounded transition"
            title={isMaximized ? 'Restaurar' : 'Maximizar'}
          >
            {isMaximized ? <Square size={12} /> : <Maximize2 size={12} />}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:text-red-400 hover:bg-slate-800 rounded transition"
            title="Fechar"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs text-slate-200">
        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1 text-[10px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Local / Alvo:</span>
            <span className="text-white font-bold truncate max-w-[320px]">{localNome}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Coordenadas:</span>
            <span className="text-cyan-400 font-bold">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Potência Térmica:</span>
            <span className="text-amber-400 font-bold">{frpMw} MW</span>
          </div>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 font-bold block mb-1">
            Pré-visualização do Relatório WhatsApp:
          </label>
          <pre className="p-2 rounded bg-slate-950 border border-slate-800 text-[9.5px] text-slate-300 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto leading-relaxed">
            {formattedMessage}
          </pre>
        </div>
      </div>

      {/* Rodapé */}
      <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between flex-shrink-0">
        <button
          onClick={handleCopy}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10.5px] flex items-center gap-1 transition"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onClose}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10.5px] transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleDispatch}
            disabled={sending}
            className="px-3.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10.5px] flex items-center gap-1.5 transition shadow disabled:opacity-50"
          >
            {sentSuccess ? (
              <>
                <Check size={13} className="text-white" />
                <span>Despacho Confirmado!</span>
              </>
            ) : (
              <>
                <Send size={12} />
                <span>{sending ? 'Enviando...' : 'Confirmar e Enviar'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Rnd>
  );
};
