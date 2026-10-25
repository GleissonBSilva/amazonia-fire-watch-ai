import React, { useState, useMemo } from 'react';
import { FireSpot } from '../types';
import { Flame, Video, AlertTriangle, Search, ChevronLeft, ChevronRight, Navigation, Thermometer, ShieldAlert } from 'lucide-react';

interface FireSpotsDrawerProps {
  fireSpots: FireSpot[];
  isOpen: boolean;
  onToggle: () => void;
  onSelectSpot: (spot: FireSpot) => void;
}

export const FireSpotsDrawer: React.FC<FireSpotsDrawerProps> = ({
  fireSpots,
  isOpen,
  onToggle,
  onSelectSpot,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'video' | 'arson' | 'critical'>('all');

  const filteredSpots = useMemo(() => {
    return fireSpots.filter((spot) => {
      // 1. Text filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesMuni = spot.municipality?.toLowerCase().includes(q);
        const matchesState = spot.state?.toLowerCase().includes(q);
        const matchesAddress = spot.address?.toLowerCase().includes(q);
        const matchesBiome = spot.biome?.toLowerCase().includes(q);
        if (!matchesMuni && !matchesState && !matchesAddress && !matchesBiome) return false;
      }

      // 2. Type filter
      if (filterType === 'video' && !spot.has_video) return false;
      if (filterType === 'arson' && !spot.is_arson_cluster) return false;
      if (filterType === 'critical' && spot.frp_mw < 30) return false;

      return true;
    });
  }, [fireSpots, searchTerm, filterType]);

  return (
    <>
      {/* Botão de Toggle na Borda Esquerda */}
      <button
        type="button"
        onClick={onToggle}
        className={`absolute top-16 left-0 z-30 flex items-center gap-1.5 px-3 py-2 bg-slate-900/95 hover:bg-slate-800 text-white border-y border-r border-slate-700/80 rounded-r-xl shadow-2xl font-mono text-xs transition-all pointer-events-auto ${
          isOpen ? 'translate-x-[340px] sm:translate-x-[380px]' : 'translate-x-0'
        }`}
        title={isOpen ? 'Recolher Lista de Focos' : 'Expandir Lista de Focos'}
      >
        <Flame className="w-4 h-4 text-red-500 animate-pulse" />
        <span className="font-bold tracking-wider hidden sm:inline">FOCOS ATIVOS</span>
        <span className="px-1.5 py-0.2 bg-red-950 text-red-400 border border-red-800 rounded-full text-[10px] font-bold">
          {fireSpots.length}
        </span>
        {isOpen ? <ChevronLeft className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>

      {/* Painel Drawer Lateral */}
      <div
        className={`absolute top-12 bottom-16 left-0 z-30 w-[340px] sm:w-[380px] bg-slate-950/98 backdrop-blur-xl border-r border-slate-800 shadow-2xl flex flex-col font-mono transition-transform duration-300 ease-in-out pointer-events-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Cabeçalho do Drawer */}
        <div className="p-3.5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
                <Flame className="w-3.5 h-3.5 text-red-500" />
              </div>
              <h2 className="text-white text-xs font-bold tracking-wider">
                CENTRAL DE FOCOS DETECTADOS
              </h2>
            </div>
            <span className="text-[10px] text-slate-400">
              {filteredSpots.length} exibidos
            </span>
          </div>

          {/* Campo de Busca Rápida na Lista */}
          <div className="relative mt-2.5">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar por cidade, bioma ou local..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-white placeholder-slate-500 text-xs focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Chips de Filtro */}
          <div className="flex flex-wrap gap-1 mt-2.5 text-[10px]">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                filterType === 'all'
                  ? 'bg-red-600 text-white font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Todos ({fireSpots.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('video')}
              className={`px-2 py-0.5 rounded font-medium transition-all flex items-center gap-1 ${
                filterType === 'video'
                  ? 'bg-red-700 text-white font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Video className="w-3 h-3 text-red-400" />
              Câmera ({fireSpots.filter((s) => s.has_video).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('arson')}
              className={`px-2 py-0.5 rounded font-medium transition-all flex items-center gap-1 ${
                filterType === 'arson'
                  ? 'bg-purple-700 text-white font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-purple-400" />
              Crime ({fireSpots.filter((s) => s.is_arson_cluster).length})
            </button>
          </div>
        </div>

        {/* Lista Rolável de Focos */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2 divide-y divide-slate-800/40">
          {filteredSpots.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              Nenhum foco encontrado com os filtros atuais.
            </div>
          ) : (
            filteredSpots.map((spot) => (
              <div
                key={spot.id}
                onClick={() => onSelectSpot(spot)}
                className="pt-2 p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/90 border border-slate-800/90 hover:border-red-500/50 transition-all cursor-pointer group space-y-1.5"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-xs font-bold truncate group-hover:text-red-300 transition-colors">
                      {spot.address || spot.municipality}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {spot.municipality} ({spot.state}) • Bioma {spot.biome}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {spot.has_video && (
                      <span className="px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-700 text-[9px] font-bold flex items-center gap-0.5">
                        <Video className="w-2.5 h-2.5" /> 🎥
                      </span>
                    )}
                    {spot.is_arson_cluster && (
                      <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-700 text-[9px] font-bold">
                        ⚠️ CRIME
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-[10px] bg-slate-950/80 p-1.5 rounded border border-slate-800">
                  <div>
                    <span className="text-slate-500 block">FRP (Potência)</span>
                    <span className="text-amber-400 font-bold">{spot.frp_mw} MW</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Temp. Brilho</span>
                    <span className="text-red-400 font-bold">{spot.bright_ti4_k} K</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Confiança</span>
                    <span className="text-emerald-400 font-bold">
                      {(spot.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                  <span className="truncate">
                    Coord: {spot.latitude.toFixed(4)}, {spot.longitude.toFixed(4)}
                  </span>
                  <span className="text-cyan-400 font-semibold group-hover:underline flex items-center gap-1">
                    <Navigation className="w-2.5 h-2.5" />
                    Localizar
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};
