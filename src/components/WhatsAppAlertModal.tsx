import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import { MessageSquare, X, Send, MapPin, AlertTriangle, ShieldCheck, Check, Maximize2, Square } from 'lucide-react';
import { sendWhatsAppFireAlert } from '../services/alertService';
import { DelimitedArea, FireSpot } from '../types';

interface WhatsAppAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedArea: DelimitedArea | null;
  activeSpot: FireSpot | null;
}

export const WhatsAppAlertModal: React.FC<WhatsAppAlertModalProps> = ({
  isOpen,
  onClose,
  selectedArea,
  activeSpot,
}) => {
  const targetPhone = '+55 92 99374-6740';
  const targetNumberDigits = '5592993746740';

  const lat = selectedArea ? selectedArea.center.lat : activeSpot ? activeSpot.latitude : -3.089;
  const lng = selectedArea ? selectedArea.center.lng : activeSpot ? activeSpot.longitude : -60.021;
  const areaSqKm = selectedArea ? selectedArea.areaSqKm : 1.45;
  const areaHa = (areaSqKm * 100).toFixed(1);
  const mapsLink = `https://www.google.com/maps?q=${lat.toFixed(5)},${lng.toFixed(5)}`;
  const localNome = activeSpot ? `${activeSpot.municipality} (${activeSpot.state})` : 'Manaus e Região Metropolitana / AM';

  const defaultMessage =
    `*[ALERTA TÁTICO CBMAM / CIOPS]*\n` +
    `🚨 *ALERTA AMAZÔNIA FIRE-WATCH AI* 🚨\n\n` +
    `🔥 *Foco Crítico Detectado!*\n` +
    `📍 *Localização:* ${localNome}\n` +
    `🧭 *Coordenadas:* ${lat.toFixed(5)}, ${lng.toFixed(5)}\n` +
    `📐 *Área Estimada:* ~${areaSqKm.toFixed(2)} km² (${areaHa} ha)\n` +
    `⚠️ *Severidade:* CRÍTICA (Risco Iminente)\n` +
    `⏰ *Horário:* ${new Date().toLocaleTimeString('pt-BR')} (Hora de Manaus)\n` +
    `⚡ *Destino:* Operador CBMAM (${targetPhone})\n\n` +
    `🗺️ *Visualizar no Google Maps:* ${mapsLink}\n\n` +
    `_Protocolo Pericial: CBMAM-FW-2026-928174_`;

  const [messageText, setMessageText] = useState(defaultMessage);
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  React.useEffect(() => {
    setMessageText(defaultMessage);
  }, [lat, lng, areaSqKm, localNome]);

  if (!isOpen) return null;

  const handleSend = async () => {
    setSending(true);
    try {
      await sendWhatsAppFireAlert({
        lat,
        lng,
        areaSqKm,
        criticidade: 'CRÍTICA',
        municipio: activeSpot ? activeSpot.municipality : 'Manaus',
        isRecurrent: activeSpot?.is_recurrent,
        targetPhone: targetNumberDigits,
        customMessage: messageText,
      });
      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <Rnd
      default={{
        x: Math.max(30, (window.innerWidth - 540) / 2),
        y: Math.max(30, (window.innerHeight - 480) / 2),
        width: 540,
        height: 480,
      }}
      minWidth={Math.min(300, window.innerWidth - 10)}
      minHeight={Math.min(240, window.innerHeight - 20)}
      bounds="window"
      dragHandleClassName="whatsapp-window-handle"
      enableResizing={!isMaximized}
      disableDragging={isMaximized}
      className={`fixed z-50 flex flex-col bg-slate-900/95 border border-slate-700/90 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md font-mono select-none max-sm:!inset-1 max-sm:!w-auto max-sm:!h-auto max-sm:!transform-none ${
        isMaximized ? '!inset-2 !w-auto !h-auto !transform-none' : ''
      }`}
    >
      {/* Titlebar móvel */}
      <div className="whatsapp-window-handle px-4 py-2.5 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 border-b border-emerald-900/60 flex items-center justify-between cursor-move select-none flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-emerald-600 text-white">
            <MessageSquare size={15} />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white tracking-wide">
              DESPACHO OFICIAL WHATSAPP
            </h2>
            <span className="text-[9px] text-emerald-300">
              Canal de Emergência: {targetPhone}
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
            <span className="text-slate-400">Alvo do Acionamento:</span>
            <span className="text-white font-bold">{localNome}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Coordenadas:</span>
            <span className="text-cyan-400 font-bold">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Área Estimada:</span>
            <span className="text-amber-400 font-bold">~{areaSqKm.toFixed(2)} km² ({areaHa} ha)</span>
          </div>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 font-bold block mb-1">
            Texto da Mensagem Operacional:
          </label>
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            rows={7}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono text-[10px] leading-relaxed focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Rodapé */}
      <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between flex-shrink-0">
        <button
          onClick={onClose}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10.5px] transition"
        >
          Cancelar
        </button>
        <button
          onClick={handleSend}
          disabled={sending}
          className="px-3.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10.5px] flex items-center gap-1.5 transition shadow disabled:opacity-50"
        >
          {sentSuccess ? (
            <>
              <Check size={13} className="text-white" />
              <span>Despachado com Sucesso!</span>
            </>
          ) : (
            <>
              <Send size={12} />
              <span>{sending ? 'Disparando...' : 'Enviar Alerta WhatsApp'}</span>
            </>
          )}
        </button>
      </div>
    </Rnd>
  );
};
