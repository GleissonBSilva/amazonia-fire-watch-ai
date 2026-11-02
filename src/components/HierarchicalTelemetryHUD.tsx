import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Radio, Flame, Sparkles, Navigation } from 'lucide-react';
import { FireSpot } from '../types';

export const TOTAL_GLOBAL_FIRES_COUNT = 85870;

export interface HierarchicalTelemetryHUDProps {
  fireSpots: FireSpot[];
  onFlyToLocation: (center: [number, number], zoom: number, label?: string) => void;
  onEnableNasaFirmsGlobal?: () => void;
}

const COUNTRY_METADATA: Record<string, { center: [number, number]; zoom: number; flag: string; label: string }> = {
  'Brasil': { center: [-12.0, -53.0], zoom: 4.5, flag: '🇧🇷', label: 'Brasil' },
  'Austrália': { center: [-25.0, 134.0], zoom: 4, flag: '🇦🇺', label: 'Austrália' },
  'Indonésia': { center: [-0.5, 117.0], zoom: 5, flag: '🇮🇩', label: 'Indonésia' },
  'Moçambique': { center: [-18.5, 35.5], zoom: 5, flag: '🇲🇿', label: 'Moçambique' },
  'Angola': { center: [-12.5, 17.5], zoom: 5, flag: '🇦🇴', label: 'Angola' },
  'China': { center: [35.0, 105.0], zoom: 4, flag: '🇨🇳', label: 'China' },
  'Madagascar': { center: [-18.8, 47.0], zoom: 5, flag: '🇲🇬', label: 'Madagascar' },
  'Nigéria': { center: [9.0, 8.0], zoom: 6, flag: '🇳🇬', label: 'Nigéria' },
  'Canadá': { center: [56.0, -106.0], zoom: 4, flag: '🇨🇦', label: 'Canadá' },
  'Estados Unidos': { center: [38.0, -97.0], zoom: 4, flag: '🇺🇸', label: 'Estados Unidos' },
  'Rússia (Sibéria)': { center: [60.0, 100.0], zoom: 3, flag: '🇷🇺', label: 'Rússia (Sibéria)' },
  'Espanha / Portugal': { center: [40.0, -4.0], zoom: 5, flag: '🇪🇸', label: 'Espanha / Portugal' },
  'Zâmbia': { center: [-13.1, 27.8], zoom: 5, flag: '🇿🇲', label: 'Zâmbia' },
  'África': { center: [-2.0, 24.0], zoom: 4, flag: '🌍', label: 'África Subsaariana' },
  'Ásia': { center: [15.0, 95.0], zoom: 4, flag: '🌏', label: 'Ásia' },
};

const BRAZIL_BIOMES: Record<string, { center: [number, number]; zoom: number; icon: string; label: string }> = {
  'Amazônia': { center: [-4.0, -62.0], zoom: 5.5, icon: '🌲', label: 'Amazônia' },
  'Cerrado': { center: [-13.5, -48.0], zoom: 5.5, icon: '🌾', label: 'Cerrado' },
  'Caatinga': { center: [-8.5, -39.0], zoom: 6, icon: '🌵', label: 'Caatinga' },
  'Pantanal': { center: [-17.5, -57.0], zoom: 6.5, icon: '🐊', label: 'Pantanal' },
};

const BRAZIL_STATES: Record<string, { center: [number, number]; zoom: number; name: string; uf: string }> = {
  'AM': { center: [-3.1, -60.0], zoom: 6.5, name: 'Amazonas (Manaus)', uf: 'AM' },
  'PA': { center: [-3.8, -52.5], zoom: 6, name: 'Pará (Arco do Fogo)', uf: 'PA' },
  'BA': { center: [-12.5, -41.7], zoom: 6, name: 'Bahia', uf: 'BA' },
  'MA': { center: [-5.4, -45.2], zoom: 6, name: 'Maranhão', uf: 'MA' },
  'TO': { center: [-10.2, -48.3], zoom: 6, name: 'Tocantins', uf: 'TO' },
  'MT': { center: [-12.6, -55.4], zoom: 6, name: 'Mato Grosso', uf: 'MT' },
  'RR': { center: [2.8, -60.6], zoom: 6, name: 'Roraima', uf: 'RR' },
  'AP': { center: [1.4, -51.8], zoom: 6, name: 'Amapá', uf: 'AP' },
  'RO': { center: [-11.5, -62.8], zoom: 6, name: 'Rondônia', uf: 'RO' },
  'AC': { center: [-9.0, -70.8], zoom: 7, name: 'Acre', uf: 'AC' },
  'PI': { center: [-7.7, -42.7], zoom: 6, name: 'Piauí', uf: 'PI' },
  'CE': { center: [-5.5, -39.3], zoom: 6, name: 'Ceará', uf: 'CE' },
  'GO': { center: [-15.8, -49.8], zoom: 6, name: 'Goiás', uf: 'GO' },
  'MS': { center: [-20.7, -54.8], zoom: 6, name: 'Mato Grosso do Sul', uf: 'MS' },
};

export const HierarchicalTelemetryHUD: React.FC<HierarchicalTelemetryHUDProps> = ({
  fireSpots,
  onFlyToLocation,
  onEnableNasaFirmsGlobal,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<string>('Brasil');
  const [selectedBiome, setSelectedBiome] = useState<string>('Amazônia');
  const [selectedState, setSelectedState] = useState<string>('AM');

  const [openDropdown, setOpenDropdown] = useState<'country' | 'biome' | 'state' | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha dropdowns se clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Contagens dinâmicas por País
  const countryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of fireSpots) {
      const name = s.country_name || (s.is_brazil ? 'Brasil' : 'Outro');
      counts[name] = (counts[name] || 0) + 1;
    }
    return counts;
  }, [fireSpots]);

  const countryCount = countryCounts[selectedCountry] || 0;

  // 2. Contagens dinâmicas por Bioma (para o país selecionado)
  const biomeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const filtered = fireSpots.filter(s => {
      if (selectedCountry === 'Brasil') return s.is_brazil || s.country_name === 'Brasil';
      return s.country_name === selectedCountry;
    });

    for (const s of filtered) {
      const b = s.biome || 'Outro';
      counts[b] = (counts[b] || 0) + 1;
    }
    return counts;
  }, [fireSpots, selectedCountry]);

  const biomeCount = biomeCounts[selectedBiome] || 0;

  // 3. Contagens dinâmicas por Estado / UF
  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const filtered = fireSpots.filter(s => {
      if (selectedCountry === 'Brasil') return s.is_brazil || s.country_name === 'Brasil';
      return s.country_name === selectedCountry;
    });

    for (const s of filtered) {
      const st = s.state || 'Outros';
      counts[st] = (counts[st] || 0) + 1;
    }
    return counts;
  }, [fireSpots, selectedCountry]);

  const stateCount = stateCounts[selectedState] || 0;

  // Lista ordenada de Países presentes
  const availableCountries = useMemo(() => {
    const list = Object.keys(countryCounts).filter(c => countryCounts[c] > 0);
    list.sort((a, b) => {
      if (a === 'Brasil') return -1;
      if (b === 'Brasil') return 1;
      return (countryCounts[b] || 0) - (countryCounts[a] || 0);
    });
    return list;
  }, [countryCounts]);

  // Lista ordenada de Biomas
  const availableBiomes = useMemo(() => {
    if (selectedCountry === 'Brasil') {
      return Object.keys(BRAZIL_BIOMES);
    }
    return Object.keys(biomeCounts).filter(b => biomeCounts[b] > 0);
  }, [selectedCountry, biomeCounts]);

  // Lista ordenada de Estados
  const availableStates = useMemo(() => {
    if (selectedCountry === 'Brasil') {
      const ufs = Object.keys(BRAZIL_STATES);
      ufs.sort((a, b) => (stateCounts[b] || 0) - (stateCounts[a] || 0));
      return ufs;
    }
    return Object.keys(stateCounts).filter(st => stateCounts[st] > 0);
  }, [selectedCountry, stateCounts]);

  // Ações de navegação em cascata
  const handleSelectWorld = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFlyToLocation([15.0, 0.0], 2.5, 'Globo 360°');
    onEnableNasaFirmsGlobal?.();
    setOpenDropdown(null);
  };

  const handleSelectCountry = (country: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedCountry(country);
    setOpenDropdown(null);

    const meta = COUNTRY_METADATA[country] || { center: [0, 0] as [number, number], zoom: 4 };
    onFlyToLocation(meta.center, meta.zoom, country);

    if (country === 'Brasil') {
      setSelectedBiome('Amazônia');
      setSelectedState('AM');
    } else {
      const firstBiome = Object.keys(biomeCounts)[0] || 'Vegetação';
      setSelectedBiome(firstBiome);
      const firstState = Object.keys(stateCounts)[0] || country;
      setSelectedState(firstState);
    }
  };

  const handleSelectBiome = (biome: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedBiome(biome);
    setOpenDropdown(null);

    if (selectedCountry === 'Brasil' && BRAZIL_BIOMES[biome]) {
      const bMeta = BRAZIL_BIOMES[biome];
      onFlyToLocation(bMeta.center, bMeta.zoom, `Bioma ${bMeta.label}`);
    }
  };

  const handleSelectState = (st: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedState(st);
    setOpenDropdown(null);

    if (selectedCountry === 'Brasil' && BRAZIL_STATES[st]) {
      const stMeta = BRAZIL_STATES[st];
      onFlyToLocation(stMeta.center, stMeta.zoom, stMeta.name);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className="flex items-center justify-center gap-2 sm:gap-3.5 font-mono select-none pointer-events-auto max-w-[calc(100vw-1rem)] overflow-x-auto no-scrollbar py-1.5 px-2"
    >
      
      {/* ================= CARD 1: 🌐 MUNDO (RELÓGIO DIGITAL CIANO) ================= */}
      <div
        onClick={handleSelectWorld}
        className="relative flex flex-col justify-between min-w-[160px] sm:min-w-[195px] h-auto min-h-[96px] bg-slate-950/95 backdrop-blur-2xl border-2 border-cyan-500/70 hover:border-cyan-400 rounded-2xl p-3 shadow-[0_12px_40px_rgba(6,182,212,0.4)] cursor-pointer transition-all hover:scale-105 group shrink-0"
        title="Nível 1: Visão Global Planetária (NASA FIRMS 24h)"
      >
        <div className="flex items-center justify-between border-b border-cyan-900/80 pb-1.5">
          <span className="text-[10px] font-black tracking-widest uppercase text-cyan-300 flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            1. MUNDO
          </span>
          <Globe size={14} className="text-cyan-400 group-hover:rotate-45 transition-transform shrink-0" />
        </div>

        {/* Mostrador Digital LED */}
        <div className="bg-slate-900/80 rounded-lg px-2.5 py-1 my-1.5 border border-cyan-950 flex items-baseline justify-between">
          <span className="text-2xl sm:text-3xl font-black font-mono text-cyan-300 tracking-wider drop-shadow-[0_0_15px_rgba(6,182,212,0.8)] whitespace-nowrap">
            {TOTAL_GLOBAL_FIRES_COUNT.toLocaleString('pt-BR')}
          </span>
          <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider ml-1">focos</span>
        </div>

        <div className="flex items-center justify-between text-[10px] text-cyan-300 font-bold bg-cyan-950/80 px-2 py-1 rounded-lg border border-cyan-800/80 whitespace-nowrap">
          <span>NASA 360°</span>
          <span className="text-[9px] text-cyan-400/80 uppercase">PLANETA</span>
        </div>
      </div>

      {/* ================= CARD 2: 🇧🇷 PAÍS (RELÓGIO DIGITAL VERDE ESMERALDA) ================= */}
      <div className="relative shrink-0">
        <div
          onClick={() => setOpenDropdown(prev => (prev === 'country' ? null : 'country'))}
          className={`relative flex flex-col justify-between min-w-[160px] sm:min-w-[195px] h-auto min-h-[96px] bg-slate-950/95 backdrop-blur-2xl border-2 rounded-2xl p-3 cursor-pointer transition-all hover:scale-105 group ${
            openDropdown === 'country'
              ? 'border-emerald-400 shadow-[0_12px_40px_rgba(16,185,129,0.55)]'
              : 'border-emerald-500/70 hover:border-emerald-400 shadow-[0_12px_40px_rgba(16,185,129,0.4)]'
          }`}
          title="Nível 2: Alternar País monitorado"
        >
          <div className="flex items-center justify-between border-b border-emerald-900/80 pb-1.5">
            <span className="text-[10px] font-black tracking-widest uppercase text-emerald-300 flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              2. PAÍS
            </span>
            <span className="text-sm shrink-0">{COUNTRY_METADATA[selectedCountry]?.flag || '🇧🇷'}</span>
          </div>

          {/* Mostrador Digital LED */}
          <div className="bg-slate-900/80 rounded-lg px-2.5 py-1 my-1.5 border border-emerald-950 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-300 tracking-wider drop-shadow-[0_0_15px_rgba(16,185,129,0.8)] whitespace-nowrap">
              {countryCount.toLocaleString('pt-BR')}
            </span>
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider ml-1">focos</span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-emerald-200 font-bold bg-emerald-950/80 px-2 py-1 rounded-lg border border-emerald-800/80 whitespace-nowrap gap-1">
            <span className="truncate max-w-[130px]">{selectedCountry}</span>
            <ChevronDown size={12} className={`text-emerald-400 transition-transform shrink-0 ${openDropdown === 'country' ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Dropdown de Países Flutuante com z-index Máximo */}
        {openDropdown === 'country' && (
          <div className="absolute top-full left-0 mt-2.5 w-60 max-h-72 overflow-y-auto bg-slate-950 border-2 border-emerald-500 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.98)] p-2 z-[3000] backdrop-blur-2xl">
            <div className="px-2.5 py-1 text-[9.5px] text-emerald-400 uppercase tracking-wider font-black border-b border-slate-800 mb-1 flex items-center justify-between">
              <span>Selecione o País</span>
              <span>Focos</span>
            </div>
            {availableCountries.map(c => (
              <button
                key={c}
                onClick={(e) => handleSelectCountry(c, e)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition cursor-pointer my-0.5 ${
                  selectedCountry === c ? 'bg-emerald-600 text-white font-bold shadow' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-base shrink-0">{COUNTRY_METADATA[c]?.flag || '🏳️'}</span>
                  <span className="truncate font-medium">{c}</span>
                </div>
                <span className="text-xs font-mono font-black text-emerald-400 shrink-0 ml-2">
                  {countryCounts[c]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ================= CARD 3: 🌲 BIOMA (RELÓGIO DIGITAL ÂMBAR / DOURADO) ================= */}
      <div className="relative shrink-0">
        <div
          onClick={() => setOpenDropdown(prev => (prev === 'biome' ? null : 'biome'))}
          className={`relative flex flex-col justify-between min-w-[160px] sm:min-w-[195px] h-auto min-h-[96px] bg-slate-950/95 backdrop-blur-2xl border-2 rounded-2xl p-3 cursor-pointer transition-all hover:scale-105 group ${
            openDropdown === 'biome'
              ? 'border-amber-400 shadow-[0_12px_40px_rgba(245,158,11,0.55)]'
              : 'border-amber-500/70 hover:border-amber-400 shadow-[0_12px_40px_rgba(245,158,11,0.4)]'
          }`}
          title="Nível 3: Alternar Bioma / Região Ecológica"
        >
          <div className="flex items-center justify-between border-b border-amber-900/80 pb-1.5">
            <span className="text-[10px] font-black tracking-widest uppercase text-amber-300 flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              3. BIOMA
            </span>
            <span className="text-sm shrink-0">{BRAZIL_BIOMES[selectedBiome]?.icon || '🌲'}</span>
          </div>

          {/* Mostrador Digital LED */}
          <div className="bg-slate-900/80 rounded-lg px-2.5 py-1 my-1.5 border border-amber-950 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono text-amber-300 tracking-wider drop-shadow-[0_0_15px_rgba(245,158,11,0.8)] whitespace-nowrap">
              {biomeCount.toLocaleString('pt-BR')}
            </span>
            <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider ml-1">focos</span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-amber-200 font-bold bg-amber-950/80 px-2 py-1 rounded-lg border border-amber-800/80 whitespace-nowrap gap-1">
            <span className="truncate max-w-[130px]">{selectedBiome}</span>
            <ChevronDown size={12} className={`text-amber-400 transition-transform shrink-0 ${openDropdown === 'biome' ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Dropdown de Biomas Flutuante com z-index Máximo */}
        {openDropdown === 'biome' && (
          <div className="absolute top-full left-0 mt-2.5 w-56 max-h-68 overflow-y-auto bg-slate-950 border-2 border-amber-500 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.98)] p-2 z-[3000] backdrop-blur-2xl">
            <div className="px-2.5 py-1 text-[9.5px] text-amber-400 uppercase tracking-wider font-black border-b border-slate-800 mb-1 flex items-center justify-between">
              <span>Biomas &amp; Regiões</span>
              <span>Focos</span>
            </div>
            {availableBiomes.map(b => (
              <button
                key={b}
                onClick={(e) => handleSelectBiome(b, e)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition cursor-pointer my-0.5 ${
                  selectedBiome === b ? 'bg-amber-600 text-white font-bold shadow' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-base shrink-0">{BRAZIL_BIOMES[b]?.icon || '🌲'}</span>
                  <span className="truncate font-medium">{b}</span>
                </div>
                <span className="text-xs font-mono font-black text-amber-400 shrink-0 ml-2">
                  {biomeCounts[b] || 0}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ================= CARD 4: 📍 ESTADO (RELÓGIO DIGITAL VERMELHO NEON) ================= */}
      <div className="relative shrink-0">
        <div
          onClick={() => setOpenDropdown(prev => (prev === 'state' ? null : 'state'))}
          className={`relative flex flex-col justify-between min-w-[160px] sm:min-w-[195px] h-auto min-h-[96px] bg-slate-950/95 backdrop-blur-2xl border-2 rounded-2xl p-3 cursor-pointer transition-all hover:scale-105 group ${
            openDropdown === 'state'
              ? 'border-red-400 shadow-[0_12px_40px_rgba(239,68,68,0.55)]'
              : 'border-red-500/70 hover:border-red-400 shadow-[0_12px_40px_rgba(239,68,68,0.4)]'
          }`}
          title="Nível 4: Alternar Estado da Federação (AM, PA, etc.)"
        >
          <div className="flex items-center justify-between border-b border-red-900/80 pb-1.5">
            <span className="text-[10px] font-black tracking-widest uppercase text-red-300 flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
              4. ESTADO
            </span>
            <span className="text-[11px] font-black text-red-400 bg-red-950/60 px-1.5 py-0.2 rounded border border-red-800/60 shrink-0">
              {selectedState}
            </span>
          </div>

          {/* Mostrador Digital LED */}
          <div className="bg-slate-900/80 rounded-lg px-2.5 py-1 my-1.5 border border-red-950 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono text-red-300 tracking-wider drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] whitespace-nowrap">
              {stateCount.toLocaleString('pt-BR')}
            </span>
            <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider ml-1">focos</span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-red-200 font-bold bg-red-950/80 px-2 py-1 rounded-lg border border-red-800/80 whitespace-nowrap gap-1">
            <span className="truncate max-w-[130px]">
              {BRAZIL_STATES[selectedState]?.name.split(' (')[0] || selectedState}
            </span>
            <ChevronDown size={12} className={`text-red-400 transition-transform shrink-0 ${openDropdown === 'state' ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Dropdown de Estados Flutuante com z-index Máximo */}
        {openDropdown === 'state' && (
          <div className="absolute top-full right-0 mt-2.5 w-68 max-h-72 overflow-y-auto bg-slate-950 border-2 border-red-500 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.98)] p-2 z-[3000] backdrop-blur-2xl">
            <div className="px-2.5 py-1 text-[9.5px] text-red-400 uppercase tracking-wider font-black border-b border-slate-800 mb-1 flex items-center justify-between">
              <span>Estados (UFs)</span>
              <span>Focos</span>
            </div>
            {availableStates.map(st => {
              const meta = BRAZIL_STATES[st] || { name: st, uf: st };
              return (
                <button
                  key={st}
                  onClick={(e) => handleSelectState(st, e)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition cursor-pointer my-0.5 ${
                    selectedState === st ? 'bg-red-600 text-white font-bold shadow' : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="w-8 font-black text-white shrink-0 text-xs bg-slate-900 px-1 py-0.5 rounded text-center border border-slate-700">
                      {meta.uf}
                    </span>
                    <span className="truncate text-slate-200 font-medium">
                      {meta.name.split(' (')[0]}
                    </span>
                  </div>
                  <span className={`text-xs font-mono font-black shrink-0 ml-2 ${
                    (stateCounts[st] || 0) > 50 ? 'text-red-400' : 'text-amber-400'
                  }`}>
                    {stateCounts[st] || 0}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
