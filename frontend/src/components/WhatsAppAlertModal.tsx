import React, { useState } from 'react';
import { MessageSquare, X, Send, MapPin, AlertTriangle, ShieldCheck, Check } from 'lucide-react';
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
  const targetPhone = '+55 91 99146-3640';
  const targetNumberDigits = '5591991463640';

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

  // Update default message when lat/lng change
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
      });
      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        onClose();
      }, 1800);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono select-none">
      <div className="w-full max-w-lg bg-slate-900 border border-emerald-500/50 rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Disparo de Alerta WhatsApp</h3>
              <p className="text-[11px] text-slate-400">
                Canal Oficial de Operação: <strong className="text-emerald-400">{targetPhone}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informações da Operação */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-red-400" /> Coordenadas Alvo:
            </span>
            <span className="text-white font-bold">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Área Estimada:
            </span>
            <span className="text-amber-300 font-bold">~{areaSqKm.toFixed(2)} km² ({areaHa} ha)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Destinatário Autorizado:
            </span>
            <span className="text-emerald-400 font-bold">{targetPhone}</span>
          </div>
        </div>

        {/* Visualização e Edição do Texto Formatado */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            Mensagem Formatada Pronta para Envio:
          </label>
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            rows={8}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Ações */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={sending || sentSuccess}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all"
          >
            {sentSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" />
                Alerta Despachado!
              </>
            ) : sending ? (
              <>
                <Send className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Confirmar e Abrir no WhatsApp ({targetPhone})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
