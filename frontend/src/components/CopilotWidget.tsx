import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, X, ChevronDown, ChevronUp, AlertTriangle, ShieldCheck, Flame } from 'lucide-react';
import { sendCopilotPrompt, fetchCopilotStatus } from '../services/api';
import { CopilotMessage } from '../types';

export const CopilotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: 'Olá, Comandante. Sou o **FireWatch Copilot AI**. Estou monitorando os satélites do INPE e NASA em tempo real por todo o Brasil. Como posso auxiliar na triagem tática?',
      timestamp: new Date().toLocaleTimeString('pt-BR')
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchCopilotStatus().then(setSummary);
    const interval = setInterval(() => {
      fetchCopilotStatus().then(setSummary);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('pt-BR')
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInput('');
    setLoading(true);

    try {
      const data = await sendCopilotPrompt(textToSend);
      const aiMsg: CopilotMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.response,
        timestamp: new Date().toLocaleTimeString('pt-BR')
      };
      setMessages(prev => [...prev, aiMsg]);
      if (data.summary_data) setSummary(data.summary_data);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: 'Falha ao processar solicitação no backend tático.',
          timestamp: new Date().toLocaleTimeString('pt-BR')
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-16 right-4 z-40 font-mono text-xs select-none">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center space-x-2 px-3.5 py-2.5 bg-gradient-to-r from-red-600 via-amber-600 to-cyan-600 hover:from-red-500 hover:to-cyan-500 text-white font-bold rounded-full shadow-2xl transition-all transform hover:scale-105 border border-white/20"
        >
          <Sparkles size={16} className="animate-spin text-amber-200" style={{ animationDuration: '6s' }} />
          <span>FIREWATCH COPILOT AI</span>
          {summary && summary.alta_suspeita_crime > 0 && (
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping"></span>
          )}
        </button>
      )}

      {/* Expanded Assistant Card */}
      {isOpen && (
        <div className="w-96 bg-slate-900/95 backdrop-blur-xl border border-cyan-500/40 rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[520px]">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-slate-900 via-slate-850 to-cyan-950 border-b border-slate-700/80">
            <div className="flex items-center space-x-2 text-cyan-300">
              <Bot size={16} className="text-cyan-400" />
              <span className="font-bold tracking-wide">FIREWATCH COPILOT AI</span>
              <span className="px-1.5 py-0.2 bg-cyan-950 text-cyan-400 border border-cyan-800 text-[9px] rounded font-bold">
                CBMAM v6.0
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Real-Time Telemetry Ticker */}
          <div className="bg-slate-950 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-[10px] text-slate-300">
            <div>
              BRASIL: <span className="text-amber-400 font-bold">{summary?.total_focos_brasil || 80} FOCOS</span>
            </div>
            <div>
              CRIME: <span className="text-red-400 font-bold">{summary?.alta_suspeita_crime || 6} SUSPEITAS</span>
            </div>
            <div>
              VÍDEO: <span className="text-emerald-400 font-bold">{summary?.focos_com_video || 8} AO VIVO</span>
            </div>
          </div>

          {/* Quick Prompts Chips */}
          <div className="p-2 bg-slate-900/60 border-b border-slate-800/80 flex flex-wrap gap-1">
            <button
              onClick={() => handleSend('Investigar alta suspeita de ação criminosa e alinhamento geométrico')}
              className="px-2 py-0.5 bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-800 rounded text-[10px]"
            >
              🚨 Suspeita de Crime
            </button>
            <button
              onClick={() => handleSend('Qual a situação nos arredores de Manaus e Bairro Flores?')}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded text-[10px]"
            >
              🏙️ Manaus Urbana
            </button>
            <button
              onClick={() => handleSend('Situação nos biomas Pantanal e Cerrado')}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded text-[10px]"
            >
              🐾 Pantanal & Cerrado
            </button>
            <button
              onClick={() => handleSend('Gere o briefing executivo nacional')}
              className="px-2 py-0.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded text-[10px]"
            >
              📋 Briefing Geral
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-72">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] p-2 rounded-lg text-[11px] leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-cyan-900/60 text-cyan-100 border border-cyan-700/60'
                      : 'bg-slate-800/90 text-slate-200 border border-slate-700/80'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                </div>
                <span className="text-[9px] text-slate-500 mt-0.5 px-1">{msg.timestamp}</span>
              </div>
            ))}
            {loading && (
              <div className="flex items-center space-x-1.5 text-cyan-400 text-[10px] p-2 bg-slate-800/50 rounded max-w-[60%]">
                <Sparkles size={12} className="animate-spin" />
                <span>Analisando camadas GIS em tempo real...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-2 bg-slate-950 border-t border-slate-800 flex items-center space-x-1.5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Pergunte ao Copilot sobre focos, rotas..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="p-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white rounded transition-colors"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
