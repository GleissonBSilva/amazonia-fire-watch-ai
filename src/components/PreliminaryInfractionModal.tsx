import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import { FireSpot, LandRegistryMatch, InfractionDossier } from '../types';
import { generateInfractionDossier } from '../services/landRegistryService';
import {
  X,
  FileCheck2,
  ShieldAlert,
  Printer,
  Copy,
  Check,
  Building,
  User,
  Scale,
  MapPin,
  Flame,
  Satellite,
  DollarSign,
  Send,
  AlertTriangle,
  Maximize2,
  Square
} from 'lucide-react';

interface PreliminaryInfractionModalProps {
  spot: FireSpot;
  landRegistry: LandRegistryMatch;
  isOpen: boolean;
  onClose: () => void;
  onDispatchWhatsApp?: (dossier: InfractionDossier) => void;
}

export const PreliminaryInfractionModal: React.FC<PreliminaryInfractionModalProps> = ({
  spot,
  landRegistry,
  isOpen,
  onClose,
  onDispatchWhatsApp
}) => {
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  if (!isOpen) return null;

  const dossier: InfractionDossier = generateInfractionDossier(spot, landRegistry);

  const handleCopyReceipt = () => {
    navigator.clipboard.writeText(landRegistry.car_receipt);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  const handleCopyMemo = () => {
    const memoText = `NOTÍCIA DE INFRAÇÃO AMBIENTAL PRELIMINAR - AUTO ${dossier.protocolNumber}
ALVO CIVIL/PENAL IDENTIFICADO:
Responsável Legal: ${landRegistry.owner_name}
Documento (CPF/CNPJ): ${landRegistry.owner_document}
Imóvel Rural: ${landRegistry.property_name}
Recibo CAR: ${landRegistry.car_receipt} (Situação: ${landRegistry.car_status})
Localização: ${spot.municipality} - ${spot.state} (Lat: ${spot.latitude.toFixed(5)}, Lng: ${spot.longitude.toFixed(5)})

MATERIALIDADE TÉCNICA:
Satélite: ${spot.satellite}
Potência Radiativa (FRP): ${spot.frp_mw} MW
Temperatura de Brilho: ${spot.bright_ti4_k} K (${Math.round(spot.bright_ti4_k - 273.15)}°C)
Área Estimada Atingida: ${dossier.burntAreaHaEstimate} ha
Estimativa Preliminar de Multa: R$ ${dossier.estimatedFineBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

TIPIFICAÇÃO PENAL:
Art. 41 da Lei Federal nº 9.605/1998 (Crimes Ambientais - Reclusão de 2 a 4 anos)
Art. 43 do Decreto Federal nº 6.514/2008 (Multa de R$ 5.000/ha)

Protocolo Digital C2: ${dossier.officerSignatureProtocol}
Sistema Amazônia Fire-Watch AI`;

    navigator.clipboard.writeText(memoText);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Rnd
      default={{
        x: Math.max(20, (window.innerWidth - 720) / 2),
        y: Math.max(20, (window.innerHeight - 680) / 2),
        width: 720,
        height: 680,
      }}
      minWidth={420}
      minHeight={380}
      bounds="window"
      dragHandleClassName="infraction-modal-handle"
      enableResizing={!isMaximized}
      disableDragging={isMaximized}
      className={`fixed z-50 flex flex-col bg-slate-950 border border-red-700/80 rounded-xl shadow-2xl overflow-hidden font-mono select-none backdrop-blur-md ${
        isMaximized ? '!inset-2 !w-auto !h-auto !transform-none' : ''
      }`}
    >
      {/* Barra de Título Superior (Draggable Handle) */}
      <div className="infraction-modal-handle px-4 py-2.5 bg-gradient-to-r from-red-950 via-slate-900 to-red-950 border-b border-red-800/80 flex items-center justify-between cursor-move flex-shrink-0 text-white">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-900/80 text-red-300 border border-red-600">
            <Scale size={16} />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white tracking-wider flex items-center gap-2">
              <span>AUTO DE INFRAÇÃO AMBIENTAL PRELIMINAR</span>
              <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black bg-red-900 text-red-200 border border-red-500 animate-pulse">
                ALVO IDENTIFICADO
              </span>
            </h2>
            <p className="text-[9.5px] text-slate-300">
              Protocolo: <strong className="text-amber-300 font-mono">{dossier.protocolNumber}</strong> • Embasamento Lei 9.605/98
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-slate-300">
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 hover:text-white hover:bg-slate-800 rounded transition"
            title={isMaximized ? 'Restaurar' : 'Maximizar'}
          >
            {isMaximized ? <Square size={13} /> : <Maximize2 size={13} />}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:text-red-400 hover:bg-slate-800 rounded transition"
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Corpo do Auto de Infração */}
      <div className="p-4 space-y-3.5 overflow-y-auto flex-1 text-xs text-slate-200">
        {/* Timbre Institucional */}
        <div className="p-3 rounded-lg bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 text-center">
          <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
            REPÚBLICA FEDERATIVA DO BRASIL • SISTEMA DE GESTÃO E FISCALIZAÇÃO AMBIENTAL
          </div>
          <div className="text-sm font-bold text-white mt-0.5">
            DOSSIÊ PRELIMINAR DE AUTUAÇÃO EM FLAGRANTE ORBITAL
          </div>
          <div className="text-[9px] text-emerald-400 font-medium mt-1">
            Integração SICAR • SIGEF / INCRA • Satélites NASA FIRMS & NOAA GOES-16 ABI
          </div>
        </div>

        {/* 1. Alvo Civil / Penal Identificado */}
        <div className="p-3 rounded-lg bg-slate-900/90 border border-amber-800/60 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-amber-300 flex items-center gap-1.5 text-[11px]">
              <User size={13} className="text-amber-400" />
              1. ALVO CIVIL / PENAL IDENTIFICADO (SICAR)
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[8.5px] font-black border ${
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

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-slate-400 block text-[9px]">TITULAR / RESPONSÁVEL LEGAL:</span>
              <strong className="text-white text-[11px] block">{landRegistry.owner_name}</strong>
              <span className="text-slate-400 block mt-0.5">
                CPF/CNPJ: <strong className="text-amber-300">{landRegistry.owner_document}</strong>
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px]">DENOMINAÇÃO DO IMÓVEL:</span>
              <strong className="text-cyan-300 text-[11px] block">{landRegistry.property_name}</strong>
              <span className="text-slate-400 block mt-0.5">
                Município/UF: <strong className="text-white">{spot.municipality} - {spot.state}</strong>
              </span>
            </div>
          </div>

          {/* Recibo CAR com botão de cópia */}
          <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
            <div className="truncate">
              <span className="text-[8.5px] text-slate-500 block">NÚMERO DO RECIBO CAR (SICAR):</span>
              <span className="font-mono text-[10.5px] text-amber-400 font-bold truncate block">
                {landRegistry.car_receipt}
              </span>
            </div>
            <button
              onClick={handleCopyReceipt}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 text-[9px] flex-shrink-0 transition"
              title="Copiar número do recibo CAR"
            >
              {copiedReceipt ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
              <span>{copiedReceipt ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>

          <div className="text-[9px] text-slate-400 bg-slate-950/80 p-2 rounded border border-slate-800/80 leading-relaxed">
            <strong className="text-slate-300">Diagnóstico Cadastral:</strong> {landRegistry.status_reason}
            <div className="mt-1 flex items-center gap-3 text-slate-500">
              <span>Área Total: {landRegistry.total_area_ha.toLocaleString('pt-BR')} ha</span>
              <span>Reserva Legal (80%): {landRegistry.legal_reserve_ha.toLocaleString('pt-BR')} ha</span>
              <span>APP: {landRegistry.app_area_ha} ha</span>
            </div>
          </div>
        </div>

        {/* 2. Materialidade e Evidência Técnica */}
        <div className="p-3 rounded-lg bg-slate-900/90 border border-red-900/60 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-red-300 flex items-center gap-1.5 text-[11px]">
              <Flame size={13} className="text-red-400" />
              2. MATERIALIDADE DA INFRAÇÃO (PROVA ORBITAL)
            </span>
            <span className="text-[8.5px] text-red-400 font-mono">
              FRP: {spot.frp_mw} MW
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
            <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-[8.5px] text-slate-500 block">SATÉLITE / SENSOR</span>
              <span className="font-bold text-white text-[9.5px] block truncate">{spot.satellite}</span>
            </div>
            <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-[8.5px] text-slate-500 block">TEMP. BRILHO</span>
              <span className="font-bold text-red-400">{Math.round(spot.bright_ti4_k - 273.15)}°C</span>
            </div>
            <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-[8.5px] text-slate-500 block">CONFIANÇA</span>
              <span className="font-bold text-emerald-400">
                {Math.round(spot.confidence <= 1 ? spot.confidence * 100 : spot.confidence)}%
              </span>
            </div>
            <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-[8.5px] text-slate-500 block">ÁREA AFETADA (EST.)</span>
              <span className="font-bold text-amber-400">{dossier.burntAreaHaEstimate} ha</span>
            </div>
          </div>

          <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[9.5px] flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-400">
              <MapPin size={12} className="text-red-400" />
              <span>Coordenadas Geográficas:</span>
              <strong className="text-white font-mono">{spot.latitude.toFixed(5)}°, {spot.longitude.toFixed(5)}°</strong>
            </div>
            <span className="text-[8.5px] text-slate-500">
              Detecção: {spot.detected_at}
            </span>
          </div>
        </div>

        {/* 3. Enquadramento Legal e Cálculo Preliminar de Multa */}
        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-slate-200 flex items-center gap-1.5 text-[11px]">
              <Scale size={13} className="text-purple-400" />
              3. TIPIFICAÇÃO LEGAL & SANÇÃO PREVISTA
            </span>
            <div className="text-right">
              <span className="text-[8.5px] text-slate-400 block">VALOR ESTIMADO DA MULTA:</span>
              <span className="text-sm font-black text-emerald-400">
                R$ {dossier.estimatedFineBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <ul className="space-y-1 text-[9.5px] text-slate-300">
            {dossier.infractionArticles.map((art, idx) => (
              <li key={idx} className="flex items-start gap-1.5 p-1 rounded bg-slate-950/60 border border-slate-800/60">
                <ShieldAlert size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
                <span>{art}</span>
              </li>
            ))}
          </ul>

          <div className="p-2 rounded bg-red-950/40 border border-red-800/50 text-[9px] text-red-300 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
            <span>
              <strong>Base de Cálculo:</strong> Art. 43 do Decreto nº 6.514/2008 fixa sanção de <strong>R$ 5.000,00 por hectare ou fração</strong> para uso não autorizado de fogo em vegetação nativa da Amazônia Legal.
            </span>
          </div>
        </div>

        {/* Protocolo de Autenticação Digital */}
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[9px] text-slate-500 flex items-center justify-between">
          <div>
            <span className="block font-mono">Assinatura Digital C2: {dossier.officerSignatureProtocol}</span>
            <span className="block text-[8px] mt-0.5">Órgão Emissor: {dossier.responsibleAuthority}</span>
          </div>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <FileCheck2 size={12} />
            AUDITADO
          </span>
        </div>
      </div>

      {/* Rodapé de Ações do Auto */}
      <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-1.5 transition text-[10.5px]"
            title="Imprimir ou Salvar em PDF"
          >
            <Printer size={13} />
            <span>Imprimir / PDF</span>
          </button>

          <button
            onClick={handleCopyMemo}
            className="px-3 py-1.5 rounded bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-700 font-bold flex items-center gap-1.5 transition text-[10.5px]"
            title="Copiar Notícia de Fato para MPF e Polícia Federal"
          >
            {copiedMemo ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copiedMemo ? 'Notificação Copiada!' : 'Copiar Ofício MPF'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onDispatchWhatsApp && (
            <button
              onClick={() => onDispatchWhatsApp(dossier)}
              className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition shadow text-[10.5px]"
              title="Despachar Notificação Imediata para Fiscalização"
            >
              <Send size={13} />
              <span>Despachar WhatsApp</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition text-[10.5px]"
          >
            Fechar
          </button>
        </div>
      </div>
    </Rnd>
  );
};
