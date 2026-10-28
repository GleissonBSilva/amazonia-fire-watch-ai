import React, { useState, useMemo, useEffect } from 'react';
import { FireSpot, FireWeatherInfo } from '../types';
import {
  Flame,
  Satellite,
  ChevronLeft,
  ChevronRight,
  Search,
  Camera,
  AlertTriangle,
  MapPin,
  RefreshCw,
  Globe,
  Wind,
  Droplets,
  Thermometer,
  CloudRain,
  SlidersHorizontal,
  Clock,
  Layers,
  ChevronDown
} from 'lucide-react';
import { fetchRealWeather } from '../services/weatherService';
import { classifyFireAuthenticity, SmokeColorKey } from '../services/fireClassificationService';

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
  const [dataNatureFilter, setDataNatureFilter] = useState<'all' | 'real' | 'simulated'>('real');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'brasil' | 'north_america' | 'europe' | 'africa' | 'asia' | 'oceania'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'video' | 'crime' | 'recurrent'>('all');
  
  // Filtros Analíticos e Científicos Reais
  const [frpFilter, setFrpFilter] = useState<'all' | 'critical' | 'moderate' | 'low'>('all');
  const [recencyFilter, setRecencyFilter] = useState<'all' | '3h' | '6h' | '12h'>('all');
  const [biomeFilter, setBiomeFilter] = useState<'all' | 'Amazônia' | 'Cerrado' | 'Pantanal'>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [onlyRealVegetation, setOnlyRealVegetation] = useState(false);
  const [smokeColorFilter, setSmokeColorFilter] = useState<SmokeColorKey>('all');

  // Cache de telemetria climática dos cards expandidos
  const [weatherMap, setWeatherMap] = useState<Record<string, FireWeatherInfo>>({});
  const [loadingWeatherId, setLoadingWeatherId] = useState<string | null>(null);

  // Filtragem por Natureza do Dado (Real vs Simulado) e Escopo Continental
  const baseSpots = useMemo(() => {
    return fireSpots.filter(s => {
      // 1. Filtro de Natureza: Real vs Simulado
      if (dataNatureFilter === 'real' && s.is_simulated) return false;
      if (dataNatureFilter === 'simulated' && !s.is_simulated) return false;

      // 2. Filtro de Escopo Territorial
      if (scopeFilter === 'brasil') return s.is_brazil !== false;
      if (scopeFilter === 'north_america') return s.continent === 'América do Norte' || s.country_name === 'Estados Unidos' || s.country_name === 'Canadá';
      if (scopeFilter === 'europe') return s.continent === 'Europa';
      if (scopeFilter === 'africa') return s.continent === 'África';
      if (scopeFilter === 'asia') return s.continent === 'Ásia';
      if (scopeFilter === 'oceania') return s.continent === 'Oceania' || s.country_name === 'Austrália';
      return true; // 'all'
    });
  }, [fireSpots, dataNatureFilter, scopeFilter]);

  const filteredSpots = useMemo(() => {
    return baseSpots.filter(spot => {
      // Antifalso positivo: filtro de queimadas reais de vegetação
      const auth = classifyFireAuthenticity(spot);
      if (onlyRealVegetation && !auth.isRealVegetationFire) {
        return false;
      }

      // Filtro por Cor da Nuvem de Fumaça
      if (smokeColorFilter !== 'all' && auth.smokeColorKey !== smokeColorFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter === 'video' && !spot.has_video) return false;
      if (categoryFilter === 'crime' && !spot.is_arson_cluster) return false;
      if (categoryFilter === 'recurrent' && !spot.is_recurrent) return false;

      // FRP Filter (Intensidade Radiativa)
      if (frpFilter === 'critical' && spot.frp_mw < 50) return false;
      if (frpFilter === 'moderate' && (spot.frp_mw < 20 || spot.frp_mw >= 50)) return false;
      if (frpFilter === 'low' && spot.frp_mw >= 20) return false;

      // Recency Filter (Tempo decorrido da órbita do satélite)
      const mins = spot.minutes_ago ?? 999;
      if (recencyFilter === '3h' && mins > 180) return false;
      if (recencyFilter === '6h' && mins > 360) return false;
      if (recencyFilter === '12h' && mins > 720) return false;

      // Biome Filter
      if (biomeFilter !== 'all' && !spot.biome.toLowerCase().includes(biomeFilter.toLowerCase())) {
        return false;
      }

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
  }, [baseSpots, filterText, categoryFilter, frpFilter, recencyFilter, biomeFilter]);

  const counts = useMemo(() => {
    const realTotal = fireSpots.filter(s => !s.is_simulated).length;
    const simTotal = fireSpots.filter(s => s.is_simulated).length;
    return {
      all: fireSpots.length,
      real: realTotal,
      simulated: simTotal,
      brasil: fireSpots.filter(s => s.is_brazil !== false).length,
      northAmerica: fireSpots.filter(s => s.continent === 'América do Norte').length,
      europe: fireSpots.filter(s => s.continent === 'Europa').length,
      africa: fireSpots.filter(s => s.continent === 'África').length,
      asia: fireSpots.filter(s => s.continent === 'Ásia').length,
      oceania: fireSpots.filter(s => s.continent === 'Oceania').length,
      recent3h: fireSpots.filter(s => (s.minutes_ago ?? 999) <= 180).length,
      currentFiltered: baseSpots.length,
    };
  }, [fireSpots, baseSpots]);

  const handleFetchCardWeather = async (spot: FireSpot, e: React.MouseEvent) => {
    e.stopPropagation();
    if (weatherMap[spot.id]) return;
    setLoadingWeatherId(spot.id);
    const info = await fetchRealWeather(spot.latitude, spot.longitude);
    setWeatherMap(prev => ({ ...prev, [spot.id]: info }));
    setLoadingWeatherId(null);
  };

  const setCityFilter = (city: string) => {
    setFilterText(city);
  };

  return (
    <div
      className={`fixed top-16 left-0 z-30 transition-all duration-300 font-sans select-none flex ${
        isOpen ? 'translate-x-0' : '-translate-x-[calc(100%-1.5rem)]'
      }`}
    >
      {/* Corpo do Drawer Lateral */}
      <div className="w-[calc(100vw-3rem)] max-w-[380px] sm:w-[380px] h-[calc(100dvh-4.5rem)] bg-slate-900/95 backdrop-blur-md border-r border-slate-700/80 shadow-2xl flex flex-col text-white">
        {/* Header do Drawer */}
        <div className="p-3 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-600/20 text-red-400 rounded-lg border border-red-500/40">
                <Flame size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Radar Analítico de Focos
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  {counts.all} focos ativos • NASA VIIRS 375m &amp; INPE
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

          {/* SELETOR 1: NATUREZA DO DADO (REAIS vs SIMULADOS) */}
          <div className="flex items-center gap-1 mb-2 font-mono text-[9.5px]">
            <button
              onClick={() => setDataNatureFilter('real')}
              className={`flex-1 py-1 rounded font-bold text-center transition flex items-center justify-center gap-1 border ${
                dataNatureFilter === 'real'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow-sm shadow-emerald-950'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <Satellite size={10} className="text-emerald-400" />
              <span>🛰️ REAIS ({counts.real})</span>
            </button>
            <button
              onClick={() => setDataNatureFilter('simulated')}
              className={`flex-1 py-1 rounded font-bold text-center transition flex items-center justify-center gap-1 border ${
                dataNatureFilter === 'simulated'
                  ? 'bg-amber-950 text-amber-300 border-amber-500 shadow-sm shadow-amber-950'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <span>🎯 SIMULADOS ({counts.simulated})</span>
            </button>
            <button
              onClick={() => setDataNatureFilter('all')}
              className={`px-2 py-1 rounded font-bold text-center transition border ${
                dataNatureFilter === 'all'
                  ? 'bg-cyan-950 text-cyan-200 border-cyan-500'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
              title="Exibir todos com separação nítida"
            >
              TODOS ({counts.all})
            </button>
          </div>

          {/* SELETOR 2: ESCOPO CONTINENTAL / MUNDIAL */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1.5 mb-2 no-scrollbar font-mono text-[8.5px]">
            <button
              onClick={() => setScopeFilter('all')}
              className={`px-2 py-0.5 rounded border transition flex-shrink-0 ${
                scopeFilter === 'all' ? 'bg-cyan-600 text-white border-cyan-400 font-bold' : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              🌐 Global
            </button>
            <button
              onClick={() => setScopeFilter('brasil')}
              className={`px-2 py-0.5 rounded border transition flex-shrink-0 ${
                scopeFilter === 'brasil' ? 'bg-emerald-600 text-white border-emerald-400 font-bold' : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              🇧🇷 Brasil ({counts.brasil})
            </button>
            <button
              onClick={() => setScopeFilter('north_america')}
              className={`px-2 py-0.5 rounded border transition flex-shrink-0 ${
                scopeFilter === 'north_america' ? 'bg-blue-600 text-white border-blue-400 font-bold' : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              🇺🇸 EUA/Canadá
            </button>
            <button
              onClick={() => setScopeFilter('europe')}
              className={`px-2 py-0.5 rounded border transition flex-shrink-0 ${
                scopeFilter === 'europe' ? 'bg-purple-600 text-white border-purple-400 font-bold' : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              🇪🇺 Europa
            </button>
            <button
              onClick={() => setScopeFilter('africa')}
              className={`px-2 py-0.5 rounded border transition flex-shrink-0 ${
                scopeFilter === 'africa' ? 'bg-amber-600 text-white border-amber-400 font-bold' : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              🌍 África
            </button>
            <button
              onClick={() => setScopeFilter('asia')}
              className={`px-2 py-0.5 rounded border transition flex-shrink-0 ${
                scopeFilter === 'asia' ? 'bg-rose-600 text-white border-rose-400 font-bold' : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              🇮🇩 Ásia
            </button>
          </div>

          {/* Seletor de Cores da Nuvem de Fumaça */}
          <div className="mb-2 p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between font-mono text-[8.5px]">
            <span className="text-slate-400 font-bold flex items-center gap-1">
              <Wind size={10} className="text-purple-400" />
              <span>COR DA FUMAÇA:</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSmokeColorFilter('all')}
                className={`px-1 rounded text-[8px] font-bold ${smokeColorFilter === 'all' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Todas
              </button>
              <button
                onClick={() => setSmokeColorFilter(smokeColorFilter === 'green' ? 'all' : 'green')}
                className={`w-3.5 h-3.5 rounded-full bg-emerald-500 transition-transform ${smokeColorFilter === 'green' ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'}`}
                title="Fumaça Leve (Verde - AQI <= 50)"
              />
              <button
                onClick={() => setSmokeColorFilter(smokeColorFilter === 'yellow' ? 'all' : 'yellow')}
                className={`w-3.5 h-3.5 rounded-full bg-yellow-400 transition-transform ${smokeColorFilter === 'yellow' ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'}`}
                title="Fumaça Moderada (Amarelo - AQI 51-100)"
              />
              <button
                onClick={() => setSmokeColorFilter(smokeColorFilter === 'orange' ? 'all' : 'orange')}
                className={`w-3.5 h-3.5 rounded-full bg-orange-500 transition-transform ${smokeColorFilter === 'orange' ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'}`}
                title="Fumaça Densa (Laranja - AQI 101-150)"
              />
              <button
                onClick={() => setSmokeColorFilter(smokeColorFilter === 'red' ? 'all' : 'red')}
                className={`w-3.5 h-3.5 rounded-full bg-red-500 transition-transform ${smokeColorFilter === 'red' ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'}`}
                title="Fumaça Severa (Vermelho - AQI 151-200)"
              />
              <button
                onClick={() => setSmokeColorFilter(smokeColorFilter === 'purple' ? 'all' : 'purple')}
                className={`w-3.5 h-3.5 rounded-full bg-purple-500 transition-transform ${smokeColorFilter === 'purple' ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'}`}
                title="Fumaça Muito Densa (Roxo - AQI 201-300)"
              />
              <button
                onClick={() => setSmokeColorFilter(smokeColorFilter === 'dark_purple' ? 'all' : 'dark_purple')}
                className={`w-3.5 h-3.5 rounded-full bg-[#581c87] border border-purple-400 transition-transform ${smokeColorFilter === 'dark_purple' ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'}`}
                title="Fumaça Tóxica Extrema (Púrpura - AQI > 300)"
              />
            </div>
          </div>

          {/* Campo de Busca Rápida no Drawer */}
          <div className="relative mb-2">
            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Buscar por cidade (ex: Barcelos), estado, bioma..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-7 py-1 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-red-500"
            />
            {filterText && (
              <button
                onClick={() => setFilterText('')}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Atalhos Rápidos de Municípios Críticos do Amazonas / Amazônia */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1.5 mb-1.5 no-scrollbar font-mono text-[9px]">
            <span className="text-slate-500 text-[8.5px] flex-shrink-0">ATALHOS:</span>
            <button
              onClick={() => setCityFilter('Barcelos')}
              className={`px-1.5 py-0.5 rounded border transition flex-shrink-0 ${
                filterText === 'Barcelos'
                  ? 'bg-emerald-600 text-white border-emerald-400 font-bold'
                  : 'bg-slate-900 text-emerald-400 border-slate-700 hover:bg-slate-800'
              }`}
            >
              📍 Barcelos
            </button>
            <button
              onClick={() => setCityFilter('Lábrea')}
              className={`px-1.5 py-0.5 rounded border transition flex-shrink-0 ${
                filterText === 'Lábrea'
                  ? 'bg-amber-600 text-white border-amber-400 font-bold'
                  : 'bg-slate-900 text-amber-400 border-slate-700 hover:bg-slate-800'
              }`}
            >
              📍 Lábrea
            </button>
            <button
              onClick={() => setCityFilter('Manaus')}
              className={`px-1.5 py-0.5 rounded border transition flex-shrink-0 ${
                filterText === 'Manaus'
                  ? 'bg-cyan-600 text-white border-cyan-400 font-bold'
                  : 'bg-slate-900 text-cyan-400 border-slate-700 hover:bg-slate-800'
              }`}
            >
              📍 Manaus
            </button>
            <button
              onClick={() => setCityFilter('Apuí')}
              className={`px-1.5 py-0.5 rounded border transition flex-shrink-0 ${
                filterText === 'Apuí'
                  ? 'bg-red-600 text-white border-red-400 font-bold'
                  : 'bg-slate-900 text-red-400 border-slate-700 hover:bg-slate-800'
              }`}
            >
              📍 Apuí
            </button>
            <button
              onClick={() => setCityFilter('Novo Progresso')}
              className={`px-1.5 py-0.5 rounded border transition flex-shrink-0 ${
                filterText === 'Novo Progresso'
                  ? 'bg-orange-600 text-white border-orange-400 font-bold'
                  : 'bg-slate-900 text-orange-400 border-slate-700 hover:bg-slate-800'
              }`}
            >
              📍 Novo Progresso
            </button>
          </div>

          {/* Botão de Expansão de Filtros Analíticos Reais */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 font-mono text-[9.5px]">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-1 text-slate-300 hover:text-white transition font-medium"
            >
              <SlidersHorizontal size={11} className="text-amber-400" />
              <span>Filtros Analíticos Científicos</span>
              <ChevronDown
                size={11}
                className={`transition-transform ${showAdvancedFilters ? 'rotate-180 text-amber-400' : ''}`}
              />
            </button>
            {(frpFilter !== 'all' || recencyFilter !== 'all' || biomeFilter !== 'all') && (
              <button
                onClick={() => {
                  setFrpFilter('all');
                  setRecencyFilter('all');
                  setBiomeFilter('all');
                }}
                className="text-[8.5px] text-amber-400 hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {/* Painel Expansível de Filtros Analíticos */}
          {showAdvancedFilters && (
            <div className="mt-2 p-2 bg-slate-900/90 rounded-lg border border-slate-800 space-y-2 font-mono text-[9px] animate-fade-in">
              {/* Filtro por Potência Radiativa (FRP MW) */}
              <div>
                <span className="text-slate-400 font-bold block mb-1">Potência Radiativa (FRP):</span>
                <div className="grid grid-cols-4 gap-1">
                  <button
                    onClick={() => setFrpFilter('all')}
                    className={`py-0.5 rounded text-center border ${
                      frpFilter === 'all'
                        ? 'bg-slate-700 text-white border-slate-500 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFrpFilter('critical')}
                    className={`py-0.5 rounded text-center border ${
                      frpFilter === 'critical'
                        ? 'bg-red-600 text-white border-red-400 font-bold'
                        : 'bg-slate-950 text-red-400 border-slate-800'
                    }`}
                    title="Fogo de alta energia e rápida propagação (FRP ≥ 50 MW)"
                  >
                    ≥ 50 MW
                  </button>
                  <button
                    onClick={() => setFrpFilter('moderate')}
                    className={`py-0.5 rounded text-center border ${
                      frpFilter === 'moderate'
                        ? 'bg-amber-600 text-white border-amber-400 font-bold'
                        : 'bg-slate-950 text-amber-400 border-slate-800'
                    }`}
                    title="Fogo de média intensidade (20 MW ≤ FRP < 50 MW)"
                  >
                    20-50 MW
                  </button>
                  <button
                    onClick={() => setFrpFilter('low')}
                    className={`py-0.5 rounded text-center border ${
                      frpFilter === 'low'
                        ? 'bg-yellow-600 text-white border-yellow-400 font-bold'
                        : 'bg-slate-950 text-yellow-400 border-slate-800'
                    }`}
                    title="Fogo de baixa intensidade ou sub-bosque (FRP < 20 MW)"
                  >
                    &lt; 20 MW
                  </button>
                </div>
              </div>

              {/* Filtro por Recência Temporal (Horário da Órbita) */}
              <div>
                <span className="text-slate-400 font-bold block mb-1">Recência da Passagem do Satélite:</span>
                <div className="grid grid-cols-4 gap-1">
                  <button
                    onClick={() => setRecencyFilter('all')}
                    className={`py-0.5 rounded text-center border ${
                      recencyFilter === 'all'
                        ? 'bg-slate-700 text-white border-slate-500 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    24h
                  </button>
                  <button
                    onClick={() => setRecencyFilter('3h')}
                    className={`py-0.5 rounded text-center border ${
                      recencyFilter === '3h'
                        ? 'bg-cyan-600 text-white border-cyan-400 font-bold'
                        : 'bg-slate-950 text-cyan-400 border-slate-800'
                    }`}
                    title="Detectado há menos de 180 min (Emergência imediata)"
                  >
                    &lt; 3h ({counts.recent3h})
                  </button>
                  <button
                    onClick={() => setRecencyFilter('6h')}
                    className={`py-0.5 rounded text-center border ${
                      recencyFilter === '6h'
                        ? 'bg-blue-600 text-white border-blue-400 font-bold'
                        : 'bg-slate-950 text-blue-400 border-slate-800'
                    }`}
                  >
                    &lt; 6h
                  </button>
                  <button
                    onClick={() => setRecencyFilter('12h')}
                    className={`py-0.5 rounded text-center border ${
                      recencyFilter === '12h'
                        ? 'bg-slate-600 text-white border-slate-400 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    &lt; 12h
                  </button>
                </div>
              </div>

              {/* Filtro por Bioma */}
              <div>
                <span className="text-slate-400 font-bold block mb-1">Bioma:</span>
                <div className="grid grid-cols-4 gap-1">
                  <button
                    onClick={() => setBiomeFilter('all')}
                    className={`py-0.5 rounded text-center border ${
                      biomeFilter === 'all'
                        ? 'bg-slate-700 text-white border-slate-500 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setBiomeFilter('Amazônia')}
                    className={`py-0.5 rounded text-center border ${
                      biomeFilter === 'Amazônia'
                        ? 'bg-emerald-600 text-white border-emerald-400 font-bold'
                        : 'bg-slate-950 text-emerald-400 border-slate-800'
                    }`}
                  >
                    Amazônia
                  </button>
                  <button
                    onClick={() => setBiomeFilter('Cerrado')}
                    className={`py-0.5 rounded text-center border ${
                      biomeFilter === 'Cerrado'
                        ? 'bg-yellow-600 text-white border-yellow-400 font-bold'
                        : 'bg-slate-950 text-yellow-400 border-slate-800'
                    }`}
                  >
                    Cerrado
                  </button>
                  <button
                    onClick={() => setBiomeFilter('Pantanal')}
                    className={`py-0.5 rounded text-center border ${
                      biomeFilter === 'Pantanal'
                        ? 'bg-teal-600 text-white border-teal-400 font-bold'
                        : 'bg-slate-950 text-teal-400 border-slate-800'
                    }`}
                  >
                    Pantanal
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lista de Focos com Scroll */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800 p-1 font-mono">
          {filteredSpots.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs">
              Nenhum foco ativo coincide com os filtros analíticos selecionados.
            </div>
          ) : (
            filteredSpots.map((spot) => {
              const isSelected = selectedSpotId === spot.id;
              const weather = weatherMap[spot.id];
              const isLoadingWeather = loadingWeatherId === spot.id;

              return (
                <div
                  key={spot.id}
                  onClick={() => onSelectSpot(spot)}
                  className={`p-2.5 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-red-950/70 border border-red-500 shadow-lg'
                      : 'hover:bg-slate-800/80 border border-transparent'
                  }`}
                >
                  {/* Topo do Card */}
                  {(() => {
                    const auth = classifyFireAuthenticity(spot);
                    return null;
                  })()}
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-white truncate max-w-[220px] flex items-center gap-1">
                      <MapPin
                        size={11}
                        className={spot.is_brazil === false ? "text-amber-400 flex-shrink-0" : "text-red-400 flex-shrink-0"}
                      />
                      <span>{spot.municipality} - {spot.state}</span>
                    </span>

                    {/* Badge de Destaque: SEPARAÇÃO REAL vs SIMULADO */}
                    <div className="flex items-center gap-1">
                      {spot.is_simulated ? (
                        <span className="px-1.5 py-0.2 rounded text-[7.5px] font-black bg-amber-950 text-amber-300 border border-amber-500/80 animate-pulse">
                          🎯 SIMULAÇÃO
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[7.5px] font-black bg-emerald-950 text-emerald-300 border border-emerald-500/80">
                          🛰️ REAL
                        </span>
                      )}
                    {spot.is_brazil === false ? (
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {spot.country_name || 'EXT'}
                      </span>
                    ) : spot.has_video ? (
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-red-600 text-white flex items-center gap-0.5 animate-pulse">
                        <Camera size={9} /> VÍDEO
                      </span>
                    ) : spot.frp_mw >= 50 ? (
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-red-700 text-white">
                        CRÍTICO
                      </span>
                    ) : spot.is_new_outbreak ? (
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-600">
                        &lt; 3H
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-slate-800 text-slate-400">
                        ORBITAL
                      </span>
                    )}
                    </div>
                  </div>

                  {/* Informações de Localização e FRP */}
                  <div className="text-[10px] text-slate-400 truncate mb-1">
                    {spot.address}
                  </div>

                  {/* Classificação Antifalso Positivo e Nuvem de Fumaça por Cores */}
                  {(() => {
                    const auth = classifyFireAuthenticity(spot);
                    const isIndustrial = auth.fireType === 'CALOR_INDUSTRIAL';
                    const isStructural = auth.fireType === 'INCENDIO_ESTRUTURAL_FABRIL';

                    return (
                      <div className="mb-1 flex items-center justify-between text-[8.5px]">
                        <span className={`font-bold flex items-center gap-1 ${
                          auth.isRealVegetationFire
                            ? 'text-red-400'
                            : isIndustrial
                            ? 'text-amber-400'
                            : isStructural
                            ? 'text-orange-400'
                            : 'text-slate-400'
                        }`}>
                          <span>{auth.isRealVegetationFire ? '🔥' : isIndustrial ? '🏭' : isStructural ? '🚨' : '⚠️'}</span>
                          <span className="truncate max-w-[170px]">
                            {auth.isRealVegetationFire ? 'Fogo em Vegetação' : isIndustrial ? 'Calor Industrial (Fabril)' : isStructural ? 'Incêndio Estrutural' : 'Anomalia/Ruído'}
                          </span>
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: auth.smokeColor }}></span>
                          <span style={{ color: auth.smokeColor }} className="font-bold">Fumaça {auth.smokeLevel}</span>
                        </span>
                      </div>
                    );
                  })()}

                  {/* Badges de Telemetria Orbital Real */}
                  <div className="flex items-center justify-between text-[9px] text-slate-300 pt-1 border-t border-slate-800/60">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-amber-400">
                        {spot.frp_mw} MW
                      </span>
                      <span>•</span>
                      <span className="text-red-300">
                        {Math.round(spot.bright_ti4_k - 273.15)}°C
                      </span>
                      <span>•</span>
                      <span className="text-slate-400">
                        {spot.satellite}
                      </span>
                    </div>

                    <div className="text-[8.5px] text-slate-500 font-mono">
                      {spot.detected_at.includes('às') ? spot.detected_at.split('às')[1] : spot.detected_at}
                    </div>
                  </div>

                  {/* Botão de Consulta de Telemetria Climática Real */}
                  <div className="mt-1.5 pt-1 border-t border-slate-800/40 flex items-center justify-between">
                    <button
                      onClick={(e) => handleFetchCardWeather(spot, e)}
                      disabled={isLoadingWeather}
                      className="text-[8.5px] text-sky-400 hover:text-sky-300 flex items-center gap-1 bg-sky-950/40 px-1.5 py-0.5 rounded border border-sky-900/60 transition"
                    >
                      <Thermometer size={10} />
                      <span>{isLoadingWeather ? 'Consultando...' : weather ? 'Atualizar Clima' : 'Clima Real'}</span>
                    </button>
                    <span className="text-[8.5px] text-slate-500">
                      Lat: {spot.latitude.toFixed(3)}, Lng: {spot.longitude.toFixed(3)}
                    </span>
                  </div>

                  {/* Detalhe Climático Expandido do Foco */}
                  {weather && (
                    <div className="mt-1.5 p-1.5 bg-slate-950/80 rounded border border-slate-800 text-[8.5px] font-mono space-y-1 animate-fade-in">
                      <div className="grid grid-cols-4 gap-1 text-center">
                        <div className="bg-slate-900 p-0.5 rounded">
                          <span className="text-slate-500 block text-[7.5px]">TEMP</span>
                          <span className="text-orange-300 font-bold">{weather.temperature_c}°C</span>
                        </div>
                        <div className="bg-slate-900 p-0.5 rounded">
                          <span className="text-slate-500 block text-[7.5px]">UMIDADE</span>
                          <span className="text-cyan-300 font-bold">{weather.relative_humidity}%</span>
                        </div>
                        <div className="bg-slate-900 p-0.5 rounded">
                          <span className="text-slate-500 block text-[7.5px]">VENTO</span>
                          <span className="text-emerald-300 font-bold">{weather.wind_speed_kmh} km/h</span>
                        </div>
                        <div className="bg-slate-900 p-0.5 rounded">
                          <span className="text-slate-500 block text-[7.5px]">CHUVA</span>
                          <span className="text-blue-300 font-bold">{weather.precipitation_mm} mm</span>
                        </div>
                      </div>
                      <div className="text-[8px] text-slate-400">
                        <span className="text-amber-400 font-bold">Risco {weather.fire_spread_risk}:</span> {weather.risk_reason}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé do Drawer */}
        <div className="p-2 border-t border-slate-800 bg-slate-950/90 text-center text-[9px] text-slate-500 font-mono">
          <span>Dados Reais Orbitais • NASA FIRMS VIIRS &amp; INPE BDQueimadas</span>
        </div>
      </div>

      {/* Botão Flutuante de Abrir/Fechar (Puxador Lateral) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-6 bg-red-600 hover:bg-red-500 text-white rounded-r-lg shadow-2xl flex items-center justify-center self-center cursor-pointer transition border border-l-0 border-red-400"
        title={isOpen ? 'Recolher radar lateral' : 'Expandir radar de focos'}
      >
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>
    </div>
  );
};
