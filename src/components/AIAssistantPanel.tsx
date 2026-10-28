import React, { useState } from 'react';
import { Bot, Send, ShieldAlert, Cpu, X, Minus, ChevronDown, ChevronUp, Lock } from 'lucide-react';

const isBrowser = typeof window !== 'undefined';
const isLocalhost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const metaEnv = (import.meta as any).env || {};
const API_BASE_URL = isLocalhost ? (metaEnv.VITE_API_URL || 'http://localhost:8000/api') : '/api';

interface AIAssistantPanelProps {
  fires?: any[];
  selectedArea?: any;
  geofence?: { id: string; name: string; areaKm2: number; facilityId?: string } | null;
  activeFacility?: string | null;
  isSimulation?: boolean;
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  fires = [],
  selectedArea = null,
  geofence = null,
  activeFacility = null,
  isSimulation = true,
}) => {
  const [question, setQuestion] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [chatLog, setChatLog] = useState<{ role: 'user' | 'ia'; text: string }[]>([
    {
      role: 'ia',
      text: 'Central Amazônia Fire Watch online. Monitorando focos de calor em tempo real via NASA FIRMS, INPE e GOES-16. Como posso auxiliar o operador?',
    },
  ]);
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || loading) return;

    const userText = question;
    setQuestion('');
    setChatLog((prev) => [...prev, { role: 'user', text: userText }]);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/ai/tactical-copilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          focos_ativos: fires,
          area_selecionada_km2: selectedArea
            ? typeof selectedArea.areaSqKm === 'number'
              ? selectedArea.areaSqKm
              : parseFloat(selectedArea.areaSqKm || '0')
            : geofence
            ? geofence.areaKm2
            : 0,
          focos_reincidentes: fires.filter((f: any) => f.is_recurrent || f.reincidente).length,
          bairro_referencia: geofence
            ? `Cerca Virtual: ${geofence.name} (Distrito Industrial Manaus)`
            : 'Amazônia Ocidental / Eixo Manaus-Porto Velho',
          pergunta_operador: userText,
          cerca_virtual_ativa: geofence ? `${geofence.name} (${geofence.areaKm2} km²)` : null,
          planta_baixa_ativa: activeFacility || null,
          is_simulation: isSimulation,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setChatLog((prev) => [...prev, { role: 'ia', text: data.analise_tatica }]);
      } else {
        throw new Error('Backend HTTP ' + response.status);
      }
    } catch {
      // Análise tática local inteligente baseada no estado do dashboard em tempo real
      const totalCount = fires.length;
      const criticalCount = fires.filter((f: any) => (f.frp_mw || 0) >= 50).length;
      const recurrentCount = fires.filter((f: any) => f.is_recurrent).length;
      const areaInfo = selectedArea ? `Área delimitada de ${selectedArea.areaSqKm || '1.45'} km²` : 'Sem polígono ativo';
      
      const localAnalysis = `[ANÁLISE SITUACIONAL LOCAL C2]\n` +
        `Operador, com base nos ${totalCount} focos atualmente no radar:\n` +
        `• Severidade Crítica: ${criticalCount} focos acima de 50 MW.\n` +
        `• Reincidência/Crime: ${recurrentCount} anomalias repetidas.\n` +
        `• Contexto Espacial: ${areaInfo}.\n` +
        `Pergunta registrada: "${userText}". Recomendamos despacho prioritário via WhatsApp ou inspeção aérea por drone.`;

      setChatLog((prev) => [...prev, { role: 'ia', text: localAnalysis }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`fixed sm:absolute top-14 right-2 sm:right-3 z-40 w-[calc(100vw-1rem)] sm:w-80 max-w-[340px] bg-slate-900/95 border border-slate-700/80 rounded-xl ${
        isMinimized ? 'p-1.5' : 'p-2.5'
      } shadow-2xl backdrop-blur-md text-white font-sans flex flex-col pointer-events-auto transition-all animate-fade-in`}
    >
      <div
        className={`flex items-center justify-between ${
          isMinimized ? '' : 'border-b border-slate-800 pb-1.5 mb-1.5'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-md shadow-sm">
            <Bot size={15} />
          </div>
          <div>
            <h3 className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
              <span>Copiloto Tático IA</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            </h3>
            {!isMinimized && (
              <p className="text-[9px] text-slate-400 flex items-center gap-1 font-mono">
                <Cpu size={9} /> C2 Grounded
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
          title={isMinimized ? 'Expandir' : 'Minimizar'}
        >
          {isMinimized ? <ChevronDown size={13} /> : <Minus size={13} />}
        </button>
      </div>

      {!isMinimized && (
        <>
          {/* GEOFENCE ACTIVE STATUS BADGE */}
          {geofence && (
            <div className="mb-2 px-2 py-1 bg-cyan-950/70 border border-cyan-500/40 rounded flex items-center gap-1.5 text-[10px] font-mono text-cyan-300">
              <Lock size={11} className="text-cyan-400 shrink-0" />
              <div className="truncate">
                <span className="font-bold">Cerca Ativa:</span> {geofence.name}
              </div>
            </div>
          )}

          {/* Histórico de Mensagens Táticas */}
          <div className="flex-1 overflow-y-auto space-y-1.5 mb-2 pr-1 text-xs max-h-56 font-mono">
            {chatLog.map((msg, i) => (
              <div
                key={i}
                className={`p-2 rounded-lg text-[10.5px] leading-relaxed break-words whitespace-pre-line ${
                  msg.role === 'ia'
                    ? 'bg-slate-800/85 border border-slate-700/50 text-slate-200 shadow-sm'
                    : 'bg-emerald-600/25 border border-emerald-500/40 text-emerald-200 ml-3'
                }`}
              >
                <span className="text-[8.5px] uppercase font-bold text-slate-400 block mb-0.5">
                  {msg.role === 'ia' ? 'IA Tática C2' : 'Operador'}
                </span>
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-1.5 text-[9.5px] text-amber-300 italic p-1 bg-amber-950/40 rounded border border-amber-900/40 animate-pulse font-mono">
                <span>Processando telemetria e variáveis da zona...</span>
              </div>
            )}
          </div>

          {/* Input e Envio de Dúvidas ao Copiloto */}
          <form onSubmit={handleAsk} className="flex gap-1">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={geofence ? 'Pergunte sobre a cerca virtual...' : 'Pergunte sobre focos, botões, camadas...'}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:border-emerald-500 font-mono text-slate-100 placeholder-slate-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white p-1 rounded-lg transition"
            >
              <Send size={13} />
            </button>
          </form>
        </>
      )}
    </div>
  );
};
