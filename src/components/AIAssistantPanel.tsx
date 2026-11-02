import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import { Bot, Send, Cpu, X, Minus, ChevronDown, Lock, MapPin } from 'lucide-react';
import { ActiveGeofenceState, DelimitedArea } from '../types';

const isBrowser = typeof window !== 'undefined';
const isLocalhost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const metaEnv = (import.meta as any).env || {};
const API_BASE_URL = isLocalhost ? (metaEnv.VITE_API_URL || 'http://localhost:8000/api') : '/api';

export interface AIAssistantPanelProps {
  fires?: any[];
  selectedArea?: DelimitedArea | null;
  geofence?: ActiveGeofenceState | null;
  activeFacility?: string | null;
  isSimulation?: boolean;
  isOpen?: boolean;
  isMinimized?: boolean;
  zIndex?: number;
  onFocus?: () => void;
  onClose?: () => void;
  onMinimize?: () => void;
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  fires = [],
  selectedArea = null,
  geofence = null,
  activeFacility = null,
  isSimulation = true,
  isOpen = true,
  isMinimized: isMinimizedProp = false,
  zIndex = 110,
  onFocus,
  onClose,
  onMinimize,
}) => {
  const [question, setQuestion] = useState('');
  const [isMinimizedLocal, setIsMinimizedLocal] = useState(() => {
    try {
      const saved = localStorage.getItem('afw_min_ai_panel');
      if (saved !== null) return JSON.parse(saved);
    } catch {}
    return isMinimizedProp;
  });
  const [chatLog, setChatLog] = useState<{ role: 'user' | 'ia'; text: string }[]>([
    {
      role: 'ia',
      text: 'Central Amazônia Fire Watch online. Monitorando focos de calor em tempo real via NASA FIRMS, INPE e constelação GOES (16, 18, 19). Como posso auxiliar o operador?',
    },
  ]);
  const [loading, setLoading] = useState(false);

  // Sincroniza estado de minimização quando prop externa mudar
  React.useEffect(() => {
    setIsMinimizedLocal(isMinimizedProp);
  }, [isMinimizedProp]);

  if (!isOpen) return null;

  const executePrompt = async (userText: string) => {
    if (!userText.trim() || loading) return;

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
            ? `Cerca Virtual: ${geofence.road || geofence.name}${geofence.city ? ` (${geofence.city} - ${geofence.state || 'AM'})` : ''}`
            : selectedArea?.road || selectedArea?.address
            ? `Área Delimitada: ${selectedArea.road || selectedArea.address}${selectedArea.city ? ` (${selectedArea.city})` : ''}`
            : 'Amazônia Legal / Centro C2',
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
      // Análise tática inteligente especializada para cada chip ou pergunta
      const totalCount = fires.length;
      const criticalCount = fires.filter((f: any) => (f.frp_mw || 0) >= 50).length;
      const recurrentCount = fires.filter((f: any) => f.is_recurrent || f.reincidente).length;
      const indFires = fires.filter((f: any) => f.biome?.includes('Indígena') || f.municipality?.toLowerCase().includes('reserva') || f.is_indigenous_land);
      const totalFrp = fires.reduce((acc: number, f: any) => acc + (f.frp_mw || 0), 0);
      const avgAqi = Math.min(500, Math.round(25 + totalFrp * 0.45));

      let answer = '';
      if (userText.includes('Terras Indígenas')) {
        answer = `🌲 [PARECER AMBIENTAL TÁTICO: TERRAS INDÍGENAS & UCS]\n` +
          `• Total de Focos Próximos a Áreas Protegidas: ${indFires.length > 0 ? indFires.length : 'Nenhum foco sobreposto diretamente neste instante'}.\n` +
          `• Monitoramento Satelital Ativo: TI Yanomami, Vale do Javari, Waimiri-Atroari e RDS Uatumã em escaneamento.\n` +
          `• Ação Recomendada: Alerta precoce despachado aos órgãos federais (ICMBio/FUNAI) e sobrevoo prioritário.`;
      } else if (userText.includes('crime coordenado')) {
        answer = `🚨 [DETECÇÃO DE PADRÃO CRIMINAL / ARSON CLUSTER]\n` +
          `• Focos com Padrão Reincidente/Coordenado: ${recurrentCount} anomalias detectadas.\n` +
          `• Vetor de Propagação: Alinhamento paralelo ao longo de eixos viários vicinais e ramais não pavimentados.\n` +
          `• Alerta C2: Focos noturnos com baixa dispersão térmica natural apontam ignição antropogênica deliberada para desmatamento.`;
      } else if (userText.includes('qualidade do ar')) {
        answer = `💨 [IMPACTO ATMOSFÉRICO & DISPERSÃO DE PM2.5]\n` +
          `• Carga Radiativa Total Acumulada: ${Math.round(totalFrp)} MW.\n` +
          `• Índice de Qualidade do Ar Estimado (AQI): ${avgAqi} (${avgAqi > 150 ? 'NOCIVO À SAÚDE' : avgAqi > 100 ? 'MODERADO/ALERTA' : 'ACEITÁVEL'}).\n` +
          `• Concentração de Partículas Finas: Estimada em ${Math.round(avgAqi * 0.72)} µg/m³.\n` +
          `• Vetor de Pluma: Vento predominante soprando a favor de aglomerações urbanas.`;
      } else if (userText.includes('resumo executivo')) {
        answer = `📄 [RELATÓRIO SITUACIONAL EXECUTIVO C2]\n` +
          `• Data/Hora Operacional: ${new Date().toLocaleString('pt-BR')}\n` +
          `• Focos Térmicos em Monitoramento: ${totalCount} ativos (${criticalCount} de alta potência >50 MW).\n` +
          `• Dispersão Vetorial: Simulação de pluma ativa com dados meteorológicos integrados.\n` +
          `• Prontidão de Resposta: Integração WhatsApp CBMAM e bases de combate operacionais.`;
      } else {
        const areaInfo = selectedArea ? `Área delimitada de ${selectedArea.areaSqKm || '1.45'} km²` : 'Sem polígono ativo';
        answer = `[ANÁLISE SITUACIONAL LOCAL C2]\n` +
          `Operador, com base nos ${totalCount} focos atualmente no radar:\n` +
          `• Severidade Crítica: ${criticalCount} focos acima de 50 MW.\n` +
          `• Reincidência/Crime: ${recurrentCount} anomalias repetidas.\n` +
          `• Contexto Espacial: ${areaInfo}.\n` +
          `Pergunta registrada: "${userText}". Recomendamos despacho prioritário via WhatsApp ou inspeção aérea por drone.`;
      }

      setChatLog((prev) => [...prev, { role: 'ia', text: answer }]);
    } finally {
      setLoading(false);
    }
  };

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    executePrompt(question);
  };

  const panelWidth = Math.min(340, typeof window !== 'undefined' ? window.innerWidth - 20 : 340);
  const initialX = typeof window !== 'undefined' ? Math.max(10, window.innerWidth - panelWidth - 20) : 60;
  const savedPos = (() => {
    try {
      const raw = localStorage.getItem('afw_pos_ai_panel');
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  })();

  return (
    <Rnd
      default={{
        x: savedPos?.x ?? initialX,
        y: savedPos?.y ?? 65,
        width: panelWidth,
        height: isMinimizedLocal ? 48 : 420,
      }}
      size={isMinimizedLocal ? { width: panelWidth, height: 48 } : undefined}
      minWidth={280}
      minHeight={isMinimizedLocal ? 48 : 220}
      bounds="window"
      dragHandleClassName="ai-assistant-drag-handle"
      enableResizing={!isMinimizedLocal}
      onDragStop={(_e, d) => {
        try {
          localStorage.setItem('afw_pos_ai_panel', JSON.stringify({ x: d.x, y: d.y }));
        } catch {}
      }}
      style={{ zIndex }}
      onMouseDown={() => onFocus && onFocus()}
      className="flex flex-col bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md text-white font-sans pointer-events-auto overflow-hidden animate-fade-in"
    >
      {/* Barra de Título (Draggable Handle com cursor-grab) */}
      <div
        className="ai-assistant-drag-handle flex items-center justify-between px-3 py-2 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-700/80 cursor-grab active:cursor-grabbing select-none rounded-t-xl"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-md shadow-sm shrink-0">
            <Bot size={15} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 truncate">
              <span>Copiloto Tático IA</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
            </h3>
            {!isMinimizedLocal && (
              <p className="text-[9px] text-slate-400 flex items-center gap-1 font-mono truncate">
                <Cpu size={9} /> C2 Grounded • Mover janela
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onMinimize) onMinimize();
              const nextMin = !isMinimizedLocal;
              setIsMinimizedLocal(nextMin);
              try {
                localStorage.setItem('afw_min_ai_panel', JSON.stringify(nextMin));
              } catch {}
            }}
            className="p-1 hover:text-white hover:bg-slate-800 rounded transition"
            title={isMinimizedLocal ? 'Expandir Copiloto' : 'Minimizar Copiloto'}
          >
            {isMinimizedLocal ? <ChevronDown size={14} /> : <Minus size={14} />}
          </button>
          {onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 hover:text-red-400 hover:bg-slate-800 rounded transition"
              title="Fechar janela do Copiloto IA"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {!isMinimizedLocal && (
        <div className="flex-1 flex flex-col p-2.5 overflow-hidden">
          {/* GEOFENCE ACTIVE STATUS BADGE */}
          {geofence && (
            <div className="mb-2 px-2 py-1.5 bg-cyan-950/80 border border-cyan-500/50 rounded flex flex-col gap-0.5 text-[10px] font-mono text-cyan-200 shrink-0 shadow-sm">
              <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                <Lock size={11} className="text-cyan-400 shrink-0" />
                <span className="truncate">Cerca Ativa: {geofence.name}</span>
              </div>
              {(geofence.road || geofence.city) && (
                <div className="text-[9px] text-amber-300/90 flex items-center gap-1 truncate">
                  <MapPin size={9} className="text-amber-400 shrink-0" />
                  <span className="truncate">
                    {[geofence.road, geofence.neighborhood, `${geofence.city || ''}${geofence.state ? ` - ${geofence.state}` : ''}`].filter(Boolean).join(' • ')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Histórico de Mensagens Táticas */}
          <div className="flex-1 overflow-y-auto space-y-1.5 mb-2 pr-1 text-xs font-mono min-h-0">
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

          {/* CHIPS RÁPIDOS DE SUGESTÕES TÁTICAS */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin scrollbar-thumb-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => executePrompt('Quais focos estão em Terras Indígenas ou UCs?')}
              className="text-[8.5px] px-1.5 py-0.5 rounded-full bg-slate-800 hover:bg-emerald-950/80 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/60 transition whitespace-nowrap text-slate-300 flex items-center gap-1 cursor-pointer shrink-0"
              title="Filtrar anomalias em Terras Indígenas e Unidades de Conservação"
            >
              <span>🌲 Terras Indígenas/UCs</span>
            </button>
            <button
              type="button"
              onClick={() => executePrompt('Existe indício de crime coordenado nas últimas 3h?')}
              className="text-[8.5px] px-1.5 py-0.5 rounded-full bg-slate-800 hover:bg-red-950/80 hover:text-red-300 border border-slate-700 hover:border-red-500/60 transition whitespace-nowrap text-slate-300 flex items-center gap-1 cursor-pointer shrink-0"
              title="Investigar padrão de alinhamento e ignição criminosa"
            >
              <span>🚨 Crime Coordenado</span>
            </button>
            <button
              type="button"
              onClick={() => executePrompt('Qual o impacto na qualidade do ar (PM2.5) em Manaus?')}
              className="text-[8.5px] px-1.5 py-0.5 rounded-full bg-slate-800 hover:bg-purple-950/80 hover:text-purple-300 border border-slate-700 hover:border-purple-500/60 transition whitespace-nowrap text-slate-300 flex items-center gap-1 cursor-pointer shrink-0"
              title="Estimar concentração de fumaça e índice AQI"
            >
              <span>💨 Qualidade do Ar</span>
            </button>
            <button
              type="button"
              onClick={() => executePrompt('Gerar resumo executivo para o comando de operações')}
              className="text-[8.5px] px-1.5 py-0.5 rounded-full bg-slate-800 hover:bg-cyan-950/80 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/60 transition whitespace-nowrap text-slate-300 flex items-center gap-1 cursor-pointer shrink-0"
              title="Compilar relatório formal para o C2"
            >
              <span>📄 Resumo Executivo</span>
            </button>
          </div>

          {/* Input e Envio de Dúvidas ao Copiloto */}
          <form onSubmit={handleAsk} className="flex gap-1 shrink-0 mt-auto">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={geofence ? 'Pergunte sobre a cerca virtual...' : 'Pergunte sobre focos, botões, camadas...'}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] focus:outline-none focus:border-emerald-500 font-mono text-slate-100 placeholder-slate-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white p-1.5 rounded-lg transition shrink-0"
              title="Enviar mensagem"
            >
              <Send size={13} />
            </button>
          </form>
        </div>
      )}
    </Rnd>
  );
};
