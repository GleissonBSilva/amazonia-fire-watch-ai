import React, { useState } from 'react';
import { MessageSquare, X, Send, Copy, Check, ShieldAlert, MapPin, ExternalLink, Flame, AlertTriangle } from 'lucide-react';
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

  if (!isOpen) return null;

  const targetNumber = '+55 91 99146-3640';
  const lat = selectedSpot ? selectedSpot.latitude : selectedArea ? selectedArea.center.lat : -3.11902;
  const lng = selectedSpot ? selectedSpot.longitude : selectedArea ? selectedArea.center.lng : -60.02173;
  const areaKm2 = selectedArea ? selectedArea.areaSqKm : 1.45;
  const localNome = selectedSpot ? `${selectedSpot.address} - ${selectedSpot.municipality}/${selectedSpot.state}` : 'Área Demarcada pelo Operador (Manaus/AM)';
  const municipio = selectedSpot ? selectedSpot.municipality : 'Manaus';
  const frpMw = selectedSpot ? selectedSpot.frp_mw : 35.5;
  const isRecurrent = selectedSpot ? (selectedSpot.is_recurrent || selectedSpot.is_arson_cluster) : false;
  const mapsLink = `https://www.google.com/maps?q=${lat.toFixed(5)},${lng.toFixed(5)}`;

  const formattedMessage =
    `*[MODO SIMULAÇÃO - AMAPÁ/AMAZONAS]*\n` +
    `🚨 *ALERTA AMAZÔNIA FIRE WATCH AI* 🚨\n\n` +
    `${isRecurrent ? '🚨 *SUSPEITA DE AÇÃO REINCIDENTE/CRIME*' : '🔥 *FOCO TÉRMICO IDENTIFICADO*'}\n` +
    `📍 *Local:* ${localNome}\n` +
    `🌐 *Coordenadas:* ${lat.toFixed(5)}, ${lng.toFixed(5)}\n` +
    `⚡ *Potência Térmica:* ${frpMw} MW\n` +
    `📐 *Área Estimada:* ~${areaKm2.toFixed(2)} km² (${(areaKm2 * 100).toFixed(1)} ha)\n` +
    `🛰️ *Satélite:* NOAA-20 (VIIRS 375m) / INPE\n` +
    `🗺️ *Localização Google Maps:* ${mapsLink}\n\n` +
    `⚠️ _Mensagem de teste interna direcionada exclusivamente ao operador de homologação._`;

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
        criticidade: isRecurrent ? 'CRÍTICA' : 'ALTA'
      });
      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        onClose();
      }, 1600);
    } catch (err) {
      console.error('Falha no envio seguro:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in font-mono select-none">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden text-white flex flex-col text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800/90 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <MessageSquare size={16} />
            </div>
            <div>
              <h3 className="font-bold text-white text-xs">Despacho Tático WhatsApp</h3>
              <p className="text-[10px] text-emerald-400 font-bold">Modo Simulação Segura Ativo</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700">
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Card Resumo do Foco Selecionado */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Resumo do Foco Selecionado
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                  isRecurrent
                    ? 'bg-purple-950 text-purple-300 border-purple-700'
                    : 'bg-red-950 text-red-300 border-red-700'
                }`}
              >
                {isRecurrent ? 'REINCIDENTE / CRIME' : 'ANOMALIA TÉRMICA'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-800/80">
              <div>
                <span className="text-slate-400 text-[10px] block">MUNICÍPIO / LOCAL:</span>
                <span className="text-white font-bold truncate block">{municipio}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">COORDENADAS:</span>
                <span className="text-cyan-400 font-bold">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">POTÊNCIA (FRP):</span>
                <span className="text-amber-400 font-bold">{frpMw} MW</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">STATUS REINCIDÊNCIA:</span>
                <span className={isRecurrent ? 'text-purple-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {isRecurrent ? 'Detectado no Histórico' : 'Primeira Ocorrência'}
                </span>
              </div>
            </div>
          </div>

          {/* Destinatário com Trava de Segurança */}
          <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-emerald-500/40">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[11px] text-slate-300">Destino de Teste Restrito:</span>
            </div>
            <span className="text-xs font-bold text-emerald-400 tracking-wide">{targetNumber}</span>
          </div>

          {/* Preview da Mensagem Formatada */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
              Preview da Mensagem Tática:
            </label>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[10px] text-slate-300 whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
              {formattedMessage}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950/90 border-t border-slate-800 gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-1.5 transition text-xs font-bold"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              onClick={handleDispatch}
              disabled={sending || sentSuccess}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5 transition shadow-lg font-bold text-xs cursor-pointer"
            >
              {sending ? (
                <span>Despachando...</span>
              ) : sentSuccess ? (
                <>
                  <Check size={14} className="text-white" />
                  <span>Alerta Confirmado!</span>
                </>
              ) : (
                <>
                  <Send size={13} />
                  <span>Confirmar Disparo de Teste</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppConfirmModal;
