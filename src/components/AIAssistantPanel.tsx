import React, { useState, useEffect, useRef } from 'react';
import { Rnd } from 'react-rnd';
import {
  Bot,
  Send,
  Cpu,
  X,
  Minus,
  ChevronDown,
  ChevronUp,
  Lock,
  MapPin,
  Volume2,
  VolumeX,
  Sparkles,
  Brain,
  Database,
  Square,
} from 'lucide-react';
import { ActiveGeofenceState, DelimitedArea } from '../types';
import { ttsService, VoiceGender } from '../services/ttsService';

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

interface ReasoningStep {
  tool: string;
  input: any;
  output: any;
  timestamp: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'ia';
  text: string;
  reasoning_steps?: ReasoningStep[];
  timestamp: string;
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

  const [chatLog, setChatLog] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'ia',
      text: '🛰️ Agente Autônomo Firewatch (Vercel AI SDK) online.\nEquipado com raciocínio multi-passo, ferramentas de busca web e telemetria orbital. Como posso auxiliar o comando operacional?',
      timestamp: new Date().toLocaleTimeString('pt-BR'),
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [isTTSMuted, setIsTTSMuted] = useState(ttsService.isMuted());
  const [voiceGender, setVoiceGender] = useState<VoiceGender>(ttsService.getGender());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSpeakingMsgId, setActiveSpeakingMsgId] = useState<string | null>(null);
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);
  const [contextMemories, setContextMemories] = useState<Array<{ id: string; chave: string; valor: string; timestamp: string }>>([]);
  const [showMemoryDrawer, setShowMemoryDrawer] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Monitora estado de fala do TTS
  useEffect(() => {
    const unsub = ttsService.subscribe((speaking) => {
      setIsSpeaking(speaking);
      if (!speaking) setActiveSpeakingMsgId(null);
    });
    return unsub;
  }, []);

  // Sincroniza estado de minimização quando prop externa mudar
  useEffect(() => {
    setIsMinimizedLocal(isMinimizedProp);
  }, [isMinimizedProp]);

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog, loading]);

  if (!isOpen) return null;

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMute = ttsService.toggleMute();
    setIsTTSMuted(newMute);
  };

  const handleSpeakMessage = (msgId: string, text: string) => {
    if (activeSpeakingMsgId === msgId && isSpeaking) {
      ttsService.stop();
      setActiveSpeakingMsgId(null);
      return;
    }

    setActiveSpeakingMsgId(msgId);
    ttsService.speak(text, {
      gender: voiceGender,
      onEnd: () => setActiveSpeakingMsgId(null),
      onError: () => setActiveSpeakingMsgId(null),
    });
  };

  const executePrompt = async (userText: string) => {
    if (!userText.trim() || loading) return;

    const userMsgId = `usr-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
    };

    setQuestion('');
    setChatLog((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // 1. Conexão principal com a Serverless Function Vercel AI SDK (/api/agent)
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userText,
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
          cerca_virtual_ativa: geofence ? `${geofence.name} (${geofence.areaKm2} km²)` : null,
          planta_baixa_ativa: activeFacility || null,
          is_simulation: isSimulation,
          memoria_previa: contextMemories,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const iaMsgId = `ia-${Date.now()}`;
        const iaText = data.answer || data.analise_tatica || 'Análise concluída pelo agente autônomo.';

        if (Array.isArray(data.context_memory)) {
          setContextMemories(data.context_memory);
        }

        setChatLog((prev) => [
          ...prev,
          {
            id: iaMsgId,
            role: 'ia',
            text: iaText,
            reasoning_steps: data.reasoning_steps || [],
            timestamp: new Date().toLocaleTimeString('pt-BR'),
          },
        ]);

        // Reprodução por voz automática se não estiver mutado
        if (!isTTSMuted) {
          handleSpeakMessage(iaMsgId, iaText);
        }
      } else {
        throw new Error('Falha HTTP ' + response.status);
      }
    } catch {
      // Motor determinístico local de contingência caso offline
      const totalCount = fires.length;
      const criticalCount = fires.filter((f: any) => (f.frp_mw || 0) >= 50).length;
      const recurrentCount = fires.filter((f: any) => f.is_recurrent || f.reincidente).length;
      const totalFrp = fires.reduce((acc: number, f: any) => acc + (f.frp_mw || 0), 0);
      const avgAqi = Math.min(500, Math.round(25 + totalFrp * 0.45));

      const fallbackText = `🛰️ [ANÁLISE AUTÔNOMA C2 • CONTINGÊNCIA]\n` +
        `• Diagnóstico de Focos: ${totalCount} ativos no radar (${criticalCount} críticos >50 MW).\n` +
        `• Anomalias Criminosas: ${recurrentCount} focos reincidentes detectados.\n` +
        `• Dispersão Atmosférica: AQI estimado em ${avgAqi} com carga térmica de ${Math.round(totalFrp)} MW.\n` +
        `• Contexto Local: ${geofence ? `Cerca ${geofence.name} ativa.` : 'Amazônia Legal'}`;

      const fallbackId = `ia-${Date.now()}`;
      setChatLog((prev) => [
        ...prev,
        {
          id: fallbackId,
          role: 'ia',
          text: fallbackText,
          timestamp: new Date().toLocaleTimeString('pt-BR'),
        },
      ]);

      if (!isTTSMuted) {
        handleSpeakMessage(fallbackId, fallbackText);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    executePrompt(question);
  };

  const panelWidth = Math.min(360, typeof window !== 'undefined' ? window.innerWidth - 20 : 360);
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
        height: isMinimizedLocal ? 48 : 460,
      }}
      size={isMinimizedLocal ? { width: panelWidth, height: 48 } : undefined}
      minWidth={300}
      minHeight={isMinimizedLocal ? 48 : 280}
      bounds="window"
      dragHandleClassName="ai-assistant-drag-handle"
      cancel="button, select, input, .no-drag"
      enableResizing={!isMinimizedLocal}
      onDragStop={(_e, d) => {
        try {
          localStorage.setItem('afw_pos_ai_panel', JSON.stringify({ x: d.x, y: d.y }));
        } catch {}
      }}
      style={{ zIndex }}
      onMouseDown={() => onFocus && onFocus()}
      className="flex flex-col bg-slate-900/95 border-2 border-slate-700/80 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl text-white font-sans pointer-events-auto overflow-hidden animate-fade-in select-none"
    >
      {/* Barra de Título (Draggable Handle com cursor-grab) */}
      <div className="ai-assistant-drag-handle flex items-center justify-between px-3 py-2 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-700/80 cursor-grab active:cursor-grabbing rounded-t-xl">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-md shadow-sm shrink-0">
            <Bot size={15} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[11px] font-black text-emerald-400 flex items-center gap-1 truncate tracking-wider font-mono">
              <span>AGENTE AUTÔNOMO C2</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            </h3>
            {!isMinimizedLocal && (
              <p className="text-[9px] text-slate-400 flex items-center gap-1 font-mono truncate">
                <Sparkles size={9} className="text-cyan-400" /> Vercel AI SDK • Multi-Step
              </p>
            )}
          </div>
        </div>

        {/* Controles de Voz, Memória e Janela */}
        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {/* Seletor de Perfil de Voz Natural */}
          {!isMinimizedLocal && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const next = voiceGender === 'feminina' ? 'masculina' : 'feminina';
                setVoiceGender(next);
                ttsService.setGender(next);
              }}
              className="px-1.5 py-0.5 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-[8.5px] font-bold transition cursor-pointer shrink-0"
              title={`Alternar perfil vocal (Ativa: ${voiceGender === 'feminina' ? 'Voz Feminina Natural (Francisca/Nova)' : 'Voz Masculina Tática (Antonio/Onyx)'})`}
            >
              {voiceGender === 'feminina' ? '👩 Francisca' : '👨 Antonio'}
            </button>
          )}

          {/* Botão Text-to-Speech Mute/Unmute */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`p-1 rounded transition cursor-pointer ${
              isTTSMuted ? 'text-slate-500 hover:text-slate-300' : 'text-emerald-400 bg-emerald-950/60 border border-emerald-600/40'
            }`}
            title={isTTSMuted ? 'Voz desativada (Clique para ligar Text-to-Speech)' : 'Voz ativada (Clique para silenciar)'}
          >
            {isTTSMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>

          {/* Botão de Memória de Contexto */}
          {!isMinimizedLocal && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMemoryDrawer((prev) => !prev);
              }}
              className={`p-1 rounded transition cursor-pointer text-[10px] flex items-center gap-0.5 ${
                showMemoryDrawer ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/60' : 'hover:text-cyan-300 hover:bg-slate-800'
              }`}
              title="Exibir Memória de Contexto Operacional"
            >
              <Database size={12} />
              <span className="font-mono text-[8.5px] font-bold">{contextMemories.length}</span>
            </button>
          )}

          {/* Minimizar */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onMinimize) onMinimize();
              const nextMin = !isMinimizedLocal;
              setIsMinimizedLocal(nextMin);
              try {
                localStorage.setItem('afw_min_ai_panel', JSON.stringify(nextMin));
              } catch {}
            }}
            className="p-1 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
            title={isMinimizedLocal ? 'Expandir Copiloto' : 'Minimizar Copiloto'}
          >
            {isMinimizedLocal ? <ChevronDown size={14} /> : <Minus size={14} />}
          </button>

          {/* Fechar */}
          {onClose && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 hover:text-red-400 hover:bg-slate-800 rounded transition cursor-pointer"
              title="Fechar janela"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {!isMinimizedLocal && (
        <div className="flex-1 flex flex-col p-2.5 overflow-hidden font-mono">
          {/* BARRA DE STATUS DE REPRODUÇÃO DA VOZ NEURAL */}
          {isSpeaking && (
            <div className="mb-2 px-2.5 py-1 bg-emerald-950/90 border border-emerald-500/70 rounded-lg flex items-center justify-between text-[9.5px] text-emerald-300 shadow-md shrink-0 animate-fade-in">
              <div className="flex items-center gap-1.5">
                <Volume2 size={12} className="text-emerald-400 animate-pulse" />
                <span className="font-bold">Narrando com voz neural natural ({voiceGender === 'feminina' ? 'Francisca' : 'Antonio'})...</span>
              </div>
              <button
                type="button"
                onClick={() => ttsService.stop()}
                className="px-2 py-0.5 rounded bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-[8.5px] transition cursor-pointer"
              >
                Parar
              </button>
            </div>
          )}

          {/* GEOFENCE ACTIVE STATUS BADGE */}
          {geofence && (
            <div className="mb-2 px-2 py-1 bg-cyan-950/80 border border-cyan-500/50 rounded flex flex-col gap-0.5 text-[10px] text-cyan-200 shrink-0 shadow-sm">
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

          {/* PAINEL DA GAVETA DE MEMÓRIA DE CONTEXTO */}
          {showMemoryDrawer && (
            <div className="mb-2 p-2 bg-slate-950/95 border border-cyan-600/50 rounded-lg text-[9.5px] max-h-32 overflow-y-auto animate-fade-in">
              <div className="flex items-center justify-between text-cyan-300 font-bold border-b border-slate-800 pb-1 mb-1">
                <span className="flex items-center gap-1">
                  <Brain size={11} />
                  MEMÓRIA DE CONTEXTO DA SESSÃO
                </span>
                <span className="text-[8.5px] text-slate-400">{contextMemories.length} registros</span>
              </div>
              {contextMemories.length === 0 ? (
                <div className="text-slate-400 italic py-1 text-center">Nenhuma memória persistida ainda nesta sessão.</div>
              ) : (
                <div className="space-y-1">
                  {contextMemories.map((m) => (
                    <div key={m.id} className="p-1 rounded bg-slate-900 border border-slate-800">
                      <span className="font-bold text-cyan-400">[{m.chave}]:</span> <span className="text-slate-300">{m.valor}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* HISTÓRICO DE MENSAGENS TÁTICAS */}
          <div className="flex-1 overflow-y-auto space-y-2 mb-2 pr-1 text-xs min-h-0 select-text">
            {chatLog.map((msg) => (
              <div
                key={msg.id}
                className={`p-2 rounded-lg text-[10.5px] leading-relaxed break-words whitespace-pre-line relative group ${
                  msg.role === 'ia'
                    ? 'bg-slate-850 border border-slate-700/60 text-slate-200 shadow-sm'
                    : 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 ml-4'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-700/30 pb-1 mb-1">
                  <span className="text-[8.5px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    {msg.role === 'ia' ? (
                      <>
                        <Bot size={11} className="text-emerald-400" />
                        <span>AGENTE AUTÔNOMO FIREWATCH</span>
                      </>
                    ) : (
                      <span>OPERADOR C2</span>
                    )}
                  </span>

                  <div className="flex items-center gap-1 text-[9px] text-slate-400">
                    <span>{msg.timestamp}</span>

                    {/* Botão de Text-to-Speech para a mensagem específica */}
                    {msg.role === 'ia' && (
                      <button
                        type="button"
                        onClick={() => handleSpeakMessage(msg.id, msg.text)}
                        className={`p-0.5 rounded hover:bg-slate-700 transition cursor-pointer ${
                          activeSpeakingMsgId === msg.id && isSpeaking ? 'text-emerald-400 animate-pulse' : 'text-slate-400'
                        }`}
                        title={activeSpeakingMsgId === msg.id && isSpeaking ? 'Parar leitura por voz' : 'Ouvir mensagem por voz (TTS)'}
                      >
                        {activeSpeakingMsgId === msg.id && isSpeaking ? <Square size={10} className="fill-emerald-400" /> : <Volume2 size={11} />}
                      </button>
                    )}
                  </div>
                </div>

                <div>{msg.text}</div>

                {/* Exibição de Raciocínio Multi-Passo (Ferramentas Autônomas) */}
                {msg.reasoning_steps && msg.reasoning_steps.length > 0 && (
                  <div className="mt-2 pt-1 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setExpandedTraceId(prev => (prev === msg.id ? null : msg.id))}
                      className="w-full flex items-center justify-between text-[9px] text-cyan-300 font-bold bg-slate-900/80 hover:bg-slate-900 px-1.5 py-0.5 rounded border border-cyan-800/60 transition cursor-pointer"
                    >
                      <span className="flex items-center gap-1">
                        <Brain size={10} className="text-cyan-400" />
                        Raciocínio Multi-Passo ({msg.reasoning_steps.length} ferramentas acionadas)
                      </span>
                      {expandedTraceId === msg.id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>

                    {expandedTraceId === msg.id && (
                      <div className="mt-1.5 space-y-1 text-[8.5px] bg-slate-950 p-1.5 rounded border border-slate-800 font-mono">
                        {msg.reasoning_steps.map((step, sIdx) => (
                          <div key={sIdx} className="border-b border-slate-850 pb-1 last:border-0 last:pb-0">
                            <span className="text-emerald-400 font-bold">Passo {sIdx + 1} • {step.tool}:</span>
                            <div className="text-slate-400 truncate">Parâmetros: {JSON.stringify(step.input)}</div>
                            <div className="text-cyan-200/90 truncate">Retorno: {typeof step.output === 'string' ? step.output : JSON.stringify(step.output)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-[10px] text-amber-300 p-2 bg-amber-950/40 rounded-lg border border-amber-900/60 animate-pulse font-mono">
                <Brain size={14} className="text-amber-400 animate-spin" />
                <span>Agente executando raciocínio multi-passo e consulta de sensores...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* CHIPS RÁPIDOS DE SUGESTÕES TÁTICAS */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin scrollbar-thumb-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => executePrompt('Diagnóstico situacional multi-passo com clima e dispersão')}
              className="text-[8.5px] px-2 py-0.5 rounded-full bg-slate-800 hover:bg-emerald-950 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/60 transition whitespace-nowrap text-slate-300 flex items-center gap-1 cursor-pointer shrink-0 font-bold"
              title="Executar raciocínio multi-passo geral"
            >
              <Sparkles size={9} className="text-emerald-400" />
              <span>🛰️ Diagnóstico Geral</span>
            </button>
            <button
              type="button"
              onClick={() => executePrompt('Rastrear padrão de crime coordenado e reincidência nas últimas 24h')}
              className="text-[8.5px] px-2 py-0.5 rounded-full bg-slate-800 hover:bg-red-950 hover:text-red-300 border border-slate-700 hover:border-red-500/60 transition whitespace-nowrap text-slate-300 flex items-center gap-1 cursor-pointer shrink-0"
              title="Investigar padrão de ignição e reincidência"
            >
              <span>🚨 Crime Coordenado</span>
            </button>
            <button
              type="button"
              onClick={() => executePrompt('Estimar pluma de fumaça, dispersão de vento e emissão de PM2.5')}
              className="text-[8.5px] px-2 py-0.5 rounded-full bg-slate-800 hover:bg-purple-950 hover:text-purple-300 border border-slate-700 hover:border-purple-500/60 transition whitespace-nowrap text-slate-300 flex items-center gap-1 cursor-pointer shrink-0"
              title="Calcular qualidade do ar e impacto em comunidades ribeirinhas"
            >
              <span>💨 Dispersão PM2.5</span>
            </button>
            <button
              type="button"
              onClick={() => executePrompt('Avaliar sobreposição de focos com Terras Indígenas e Reservas Extrativistas')}
              className="text-[8.5px] px-2 py-0.5 rounded-full bg-slate-800 hover:bg-cyan-950 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/60 transition whitespace-nowrap text-slate-300 flex items-center gap-1 cursor-pointer shrink-0"
              title="Análise de áreas protegidas e povos originários"
            >
              <span>🌲 Terras Indígenas</span>
            </button>
          </div>

          {/* INPUT E ENVIO DE COMANDOS AO AGENTE */}
          <form onSubmit={handleAsk} className="flex gap-1.5 shrink-0 mt-auto">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={geofence ? 'Instrua o agente sobre a cerca virtual...' : 'Digite comando para o Agente Autônomo C2...'}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none focus:border-emerald-500 font-mono text-slate-100 placeholder-slate-500"
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-2.5 py-1.5 rounded-lg transition shrink-0 flex items-center justify-center cursor-pointer shadow"
              title="Enviar comando"
            >
              <Send size={13} />
            </button>
          </form>
        </div>
      )}
    </Rnd>
  );
};
