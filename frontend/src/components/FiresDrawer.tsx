import React, { useState, useMemo } from 'react';
import { FireSpot } from '../types';
import { Flame, ChevronLeft, ChevronRight, Search, Camera, AlertTriangle, ShieldAlert, MapPin, Zap, RefreshCw } from 'lucide-react';

interface FiresDrawerProps {
  fireSpots: FireSpot[];
  onSelectSpot: (spot: FireSpot) => void;
  selectedSpotId?: string | null;
}

export const FiresDrawer: React.FC<FiresDrawerProps> = ({
  fireSpots,
  onSelectSpot,
  selectedSpotId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'video' | 'crime' | 'recurrent'>('all');

  const filteredSpots = useMemo(() => {
    return fireSpots.filter(spot => {
      // Category filter
      if (categoryFilter === 'video' && !spot.has_video) return false;
      if (categoryFilter === 'crime' && !spot.is_arson_cluster) return false;
      if (categoryFilter === 'recurrent' && !spot.is_recurrent) return false;

      // Text filter
      if (!filterText.trim()) return true;
      const term = filterText.toLowerCase();
      return (
        spot.address.toLowerCase().includes(term) ||
        spot.municipality.toLowerCase().includes(term) ||
        spot.state.toLowerCase().includes(term) ||
        spot.biome.toLowerCase().includes(term) ||
        spot.satellite.toLowerCase().includes(term)
      );
    });
  }, [fireSpots, filterText, categoryFilter]);

  const counts = useMemo(() => {
    return {
      all: fireSpots.length,
      video: fireSpots.filter(s => s.has_video).length,
      crime: fireSpots.filter(s => s.is_arson_cluster).length,
      recurrent: fireSpots.filter(s => s.is_recurrent).length,
    };
  }, [fireSpots]);

  return (
    <div
      className={`fixed top-16 left-0 z-30 transition-all duration-300 font-sans select-none flex ${
        isOpen ? 'translate-x-0' : '-translate-x-[360px]'
      }`}
    >
      {/* Corpo do Drawer Lateral */}
      <div className="w-[360px] h-[calc(100vh-80px)] bg-slate-900/95 backdrop-blur-md border-r border-slate-700/80 shadow-2xl flex flex-col text-white">
        {/* Header do Drawer */}
        <div className="p-3 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-600/20 text-red-400 rounded-lg border border-red-500/40">
                <Flame size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Radar de Focos do Brasil
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  {counts.all} focos ativos catalogados
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
            >
              <ChevronLeft size={16} />
            </button>
          </div>

          {/* Campo de Busca Rápida no Drawer */}
          <div className="relative mb-2">
            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filtrar por cidade, rua, estado..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Filtros por Categoria */}
          <div className="grid grid-cols-4 gap-1 font-mono text-[9px]">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`py-1 rounded text-center font-bold transition ${
                categoryFilter === 'all'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              Todos ({counts.all})
            </button>
            <button
              onClick={() => setCategoryFilter('video')}
              className={`py-1 rounded text-center font-bold transition flex items-center justify-center gap-0.5 ${
                categoryFilter === 'video'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-950 text-red-400 hover:bg-slate-800'
              }`}
            >
              <Camera size={10} />
              <span>Vídeo ({counts.video})</span>
            </button>
            <button
              onClick={() => setCategoryFilter('crime')}
              className={`py-1 rounded text-center font-bold transition flex items-center justify-center gap-0.5 ${
                categoryFilter === 'crime'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-950 text-purple-400 hover:bg-slate-800'
              }`}
            >
              <AlertTriangle size={10} />
              <span>Crime ({counts.crime})</span>
            </button>
            <button
              onClick={() => setCategoryFilter('recurrent')}
              className={`py-1 rounded text-center font-bold transition flex items-center justify-center gap-0.5 ${
                categoryFilter === 'recurrent'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-950 text-amber-400 hover:bg-slate-800'
              }`}
            >
              <RefreshCw size={10} />
              <span>Reinc. ({counts.recurrent})</span>
            </button>
          </div>
        </div>

        {/* Lista de Focos com Scroll */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800 p-1 font-mono">
          {filteredSpots.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs">
              Nenhum foco encontrado para os critérios selecionados.
            </div>
          ) : (
            filteredSpots.map((spot) => {
              const isSelected = selectedSpotId === spot.id;

              return (
                <div
                  key={spot.id}
                  onClick={() => onSelectSpot(spot)}
                  className={`p-2.5 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-red-950/70 border border-red-500 shadow'
                      : 'hover:bg-slate-800/80 border border-transparent'
                  }`}
                >
                  {/* Topo do Card */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-white truncate max-w-[210px] flex items-center gap-1">
                      <MapPin size={11} className="text-red-400 flex-shrink-0" />
                      <span>{spot.municipality} - {spot.state}</span>
                    </span>

                    {/* Badge de Destaque */}
                    {spot.has_video ? (
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-red-600 text-white flex items-center gap-0.5 animate-pulse">
                        <Camera size={9} /> VÍDEO
                      </span>
                    ) : spot.is_arson_cluster ? (
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-purple-700 text-purple-200">
                        CRIME
                      </span>
                    ) : spot.is_recurrent ? (
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-amber-700 text-amber-200">
                        REINCIDENTE
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-slate-800 text-slate-300">
                        {spot.biome}
                      </span>
                    )}
                  </div>

                  {/* Endereço / Localização Detalhada */}
                  <div className="text-[10px] text-slate-300 truncate mb-1.5">
                    {spot.address}
                  </div>

                  {/* Telemetria do Foco */}
                  <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <span className="text-amber-400 font-semibold">
                      FRP: {spot.frp_mw} MW
                    </span>
                    <span>
                      Temp: {spot.bright_ti4_k} K
                    </span>
                    <span className="text-emerald-400">
                      Conf: {(spot.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Aba de Acionamento do Drawer (Toggle Button visível na borda) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-28 w-6 bg-slate-900/95 border-r border-y border-slate-700 rounded-r-lg my-auto flex flex-col items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 shadow-xl backdrop-blur-md transition cursor-pointer"
        title={isOpen ? 'Recolher Lista de Focos' : 'Expandir Lista de Focos'}
      >
        <Flame size={12} className="text-red-400 mb-1 animate-pulse" />
        <span className="text-[9px] font-mono font-bold [writing-mode:vertical-lr] tracking-wider text-slate-300">
          {isOpen ? 'FECHAR' : `FOCOS (${counts.all})`}
        </span>
        {isOpen ? <ChevronLeft size={12} className="mt-1" /> : <ChevronRight size={12} className="mt-1" />}
      </button>
    </div>
  );
};

export default FiresDrawer;
