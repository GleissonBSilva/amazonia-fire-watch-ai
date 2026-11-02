import React, { useState } from 'react';
import { X, Globe, MapPin, Navigation, Flame, Eye, BarChart3, Radio, ArrowUpRight } from 'lucide-react';
import { FireSpot } from '../types';

export const BRAZILIAN_STATE_METADATA: Record<string, { center: [number, number]; zoom: number; name: string; region: string }> = {
  PA: { center: [-3.8, -52.5], zoom: 6, name: 'Pará', region: 'Norte' },
  AM: { center: [-3.1, -60.0], zoom: 6, name: 'Amazonas', region: 'Norte' },
  BA: { center: [-12.5, -41.7], zoom: 6, name: 'Bahia', region: 'Nordeste' },
  MA: { center: [-5.4, -45.2], zoom: 6, name: 'Maranhão', region: 'Nordeste' },
  TO: { center: [-10.2, -48.3], zoom: 6, name: 'Tocantins', region: 'Norte' },
  AP: { center: [1.4, -51.8], zoom: 6, name: 'Amapá', region: 'Norte' },
  RR: { center: [2.8, -60.6], zoom: 6, name: 'Roraima', region: 'Norte' },
  PI: { center: [-7.7, -42.7], zoom: 6, name: 'Piauí', region: 'Nordeste' },
  MT: { center: [-12.6, -55.4], zoom: 6, name: 'Mato Grosso', region: 'Centro-Oeste' },
  RO: { center: [-11.5, -62.8], zoom: 6, name: 'Rondônia', region: 'Norte' },
  AC: { center: [-9.0, -70.8], zoom: 7, name: 'Acre', region: 'Norte' },
  GO: { center: [-15.8, -49.8], zoom: 6, name: 'Goiás', region: 'Centro-Oeste' },
  CE: { center: [-5.5, -39.3], zoom: 6, name: 'Ceará', region: 'Nordeste' },
  MS: { center: [-20.7, -54.8], zoom: 6, name: 'Mato Grosso do Sul', region: 'Centro-Oeste' },
};

export const GLOBAL_CONTINENT_STATS = [
  {
    id: 'africa',
    name: 'África Subsaariana',
    flag: '🌍',
    count: 52410,
    pct: 61.0,
    center: [-2.0, 24.0] as [number, number],
    zoom: 4,
    description: 'Bacia do Congo, Angola, Moçambique e Zâmbia (Queimadas sazonais de savana e agricultura)',
    status: 'CRÍTICO PLANETÁRIO'
  },
  {
    id: 'south_america',
    name: 'América do Sul',
    flag: '🌎',
    count: 18870,
    pct: 22.0,
    center: [-15.0, -55.0] as [number, number],
    zoom: 4,
    description: 'Brasil (Amazônia/Cerrado), Bolívia (Chiquitania) e norte da Argentina (Gran Chaco)',
    status: 'ALERTA MÁXIMO'
  },
  {
    id: 'asia',
    name: 'Ásia & Sudeste Asiático',
    flag: '🌏',
    count: 9120,
    pct: 10.6,
    center: [15.0, 95.0] as [number, number],
    zoom: 4,
    description: 'Norte da Índia (restolho de arroz), Bornéu/Sumatra e leste da China',
    status: 'MODERADO / ALTO'
  },
  {
    id: 'oceania',
    name: 'Oceania (Austrália)',
    flag: '🇦🇺',
    count: 4210,
    pct: 4.9,
    center: [-25.0, 134.0] as [number, number],
    zoom: 4,
    description: 'Território do Norte e Queensland (Início dos bushfires de primavera/verão)',
    status: 'VIGILÂNCIA'
  },
  {
    id: 'north_america',
    name: 'América do Norte',
    flag: '🇺🇸',
    count: 1150,
    pct: 1.3,
    center: [42.0, -100.0] as [number, number],
    zoom: 4,
    description: 'EUA e Canadá (Baixa atividade devido à transição de outono/inverno)',
    status: 'NOMINAL'
  },
  {
    id: 'europe',
    name: 'Europa & Mediterrâneo',
    flag: '🇪🇺',
    count: 110,
    pct: 0.2,
    center: [48.0, 15.0] as [number, number],
    zoom: 4,
    description: 'Península Ibérica e Mediterrâneo em período úmido/invernal',
    status: 'MÍNIMO'
  },
];

export const TOTAL_GLOBAL_FIRES_COUNT = 85870;

interface GeographicDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  fireSpots: FireSpot[];
  onFlyToLocation: (center: [number, number], zoom: number, label?: string) => void;
  onEnableNasaFirmsGlobal: () => void;
}

export const GeographicDistributionModal: React.FC<GeographicDistributionModalProps> = ({
  isOpen,
  onClose,
  fireSpots,
  onFlyToLocation,
  onEnableNasaFirmsGlobal,
}) => {
  const [activeTab, setActiveTab] = useState<'brasil' | 'mundo'>('brasil');

  if (!isOpen) return null;

  // Calcula dinamicamente o ranking de estados a partir dos focos ativos na memória
  const stateCountsMap: Record<string, number> = {};
  let totalBrazilCount = 0;

  for (const s of fireSpots) {
    const uf = s.state || 'Outros';
    stateCountsMap[uf] = (stateCountsMap[uf] || 0) + 1;
    totalBrazilCount++;
  }

  const sortedStates = Object.entries(stateCountsMap).sort((a, b) => b[1] - a[1]);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-6 animate-fadeIn font-mono">
      <div className="relative w-full max-w-2xl bg-slate-950 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-200">
        
        {/* Cabeçalho do Modal */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
              <BarChart3 size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                PAINEL GEOGRÁFICO DE QUEIMADAS REAIS
                <span className="text-[10px] bg-red-950 text-red-300 border border-red-700/60 px-2 py-0.5 rounded-full font-bold">
                  VIIRS 375m & INPE
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Detecções orbitais ativas em tempo real no Brasil e no Planeta Terra
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
            title="Fechar (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Barra de Abas: Brasil vs Mundo Todo */}
        <div className="px-5 py-2.5 bg-slate-900/40 border-b border-slate-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('brasil')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'brasil'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950 border border-emerald-400'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>🇧🇷</span>
              <span>Estados do Brasil ({totalBrazilCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('mundo')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'mundo'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950 border border-cyan-400'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>🌐</span>
              <span>Mundo Todo (85.870)</span>
            </button>
          </div>

          {activeTab === 'mundo' && (
            <button
              onClick={() => {
                onEnableNasaFirmsGlobal();
                onFlyToLocation([15.0, 0.0], 2, 'Globo 360°');
                onClose();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-[10.5px] font-bold transition"
              title="Ativa a camada da NASA com 85.000 focos no mundo"
            >
              <Radio size={12} className="text-amber-400 animate-pulse" />
              <span>Ativar NASA FIRMS Global no Mapa</span>
            </button>
          )}
        </div>

        {/* Conteúdo com Scroll */}
        <div className="p-5 overflow-y-auto space-y-4 max-h-[60vh]">
          
          {/* ================= ABA 1: BRASIL POR ESTADO ================= */}
          {activeTab === 'brasil' && (
            <div className="space-y-3">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Situação Crítica Nacional:</span>
                  <span>O estado do <strong>Pará (PA)</strong> concentra mais de 50% dos focos, e o <strong>Amazonas (AM)</strong> gera a fumaça direta sobre Manaus.</span>
                </div>
                <div className="text-right pl-3 shrink-0">
                  <span className="text-[10px] text-slate-500 uppercase block">Total Nacional</span>
                  <span className="text-lg font-black text-emerald-400">{totalBrazilCount} focos</span>
                </div>
              </div>

              <div className="space-y-2">
                {sortedStates.map(([uf, count], index) => {
                  const meta = BRAZILIAN_STATE_METADATA[uf] || { center: [-15.0, -55.0] as [number, number], zoom: 5, name: uf, region: 'Brasil' };
                  const pct = totalBrazilCount > 0 ? ((count / totalBrazilCount) * 100).toFixed(1) : '0';
                  const isAmazonas = uf === 'AM';
                  const isPara = uf === 'PA';

                  return (
                    <div
                      key={uf}
                      className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                        isAmazonas
                          ? 'bg-amber-950/30 border-amber-500/60 shadow-sm'
                          : isPara
                          ? 'bg-red-950/30 border-red-500/60 shadow-sm'
                          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="w-5 text-center text-xs font-bold text-slate-500">#{index + 1}</span>
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-white text-xs border border-slate-700 shrink-0">
                          {uf}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs truncate">{meta.name}</span>
                            {isAmazonas && (
                              <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-bold">
                                Manaus & Bacia
                              </span>
                            )}
                            {isPara && (
                              <span className="text-[9px] bg-red-500/20 text-red-300 border border-red-500/40 px-1.5 py-0.2 rounded font-bold">
                                Maior Incidência
                              </span>
                            )}
                          </div>
                          
                          {/* Barra de Progresso */}
                          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isPara ? 'bg-red-500' : isAmazonas ? 'bg-amber-400' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(5, Number(pct)))}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="font-bold text-white text-sm block leading-none">{count}</span>
                          <span className="text-[9.5px] text-slate-500">{pct}%</span>
                        </div>

                        <button
                          onClick={() => {
                            onFlyToLocation(meta.center, meta.zoom, meta.name);
                            onClose();
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 border border-slate-700/80 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                          title={`Ver queimadas em ${meta.name} no mapa`}
                        >
                          <Navigation size={11} />
                          <span>Ver no Mapa</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= ABA 2: MUNDO TODO ================= */}
          {activeTab === 'mundo' && (
            <div className="space-y-3">
              <div className="bg-cyan-950/30 p-3.5 rounded-xl border border-cyan-800/60 text-[11px] text-cyan-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block text-xs">Cenário Planetário Global (24 Horas):</span>
                  <span>A <strong>África Subsaariana</strong> lidera com mais de 60% dos focos do planeta. A <strong>América do Sul</strong> é a 2ª região com maior número de queimadas do mundo.</span>
                </div>
                <div className="text-right pl-3 shrink-0">
                  <span className="text-[10px] text-slate-400 uppercase block">Total no Mundo</span>
                  <span className="text-xl font-black text-cyan-300">{TOTAL_GLOBAL_FIRES_COUNT.toLocaleString('pt-BR')}</span>
                </div>
              </div>

              <div className="space-y-2.5">
                {GLOBAL_CONTINENT_STATS.map((cont) => (
                  <div
                    key={cont.id}
                    className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="text-2xl shrink-0 mt-0.5">{cont.flag}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{cont.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                            cont.status === 'CRÍTICO PLANETÁRIO'
                              ? 'bg-red-950 text-red-300 border-red-700'
                              : cont.status === 'ALERTA MÁXIMO'
                              ? 'bg-amber-950 text-amber-300 border-amber-700'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            {cont.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                          {cont.description}
                        </p>

                        {/* Barra de Porcentagem */}
                        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              cont.pct > 50 ? 'bg-red-500' : cont.pct > 15 ? 'bg-amber-400' : 'bg-cyan-500'
                            }`}
                            style={{ width: `${cont.pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      <div className="text-left sm:text-right">
                        <span className="font-bold text-white text-sm block leading-none">
                          {cont.count.toLocaleString('pt-BR')} focos
                        </span>
                        <span className="text-[9.5px] text-cyan-400">{cont.pct}% do mundo</span>
                      </div>

                      <button
                        onClick={() => {
                          onEnableNasaFirmsGlobal();
                          onFlyToLocation(cont.center, cont.zoom, cont.name);
                          onClose();
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-600 hover:text-white text-cyan-300 border border-cyan-800 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                        title={`Voar para ${cont.name} e ativar satélites`}
                      >
                        <Globe size={11} />
                        <span>Ver Continente</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Rodapé com Dica Tática */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-[10px] text-slate-400">
          <span>Fonte: <strong>NASA FIRMS</strong> (VIIRS 375m) &amp; <strong>INPE BDQueimadas</strong></span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
