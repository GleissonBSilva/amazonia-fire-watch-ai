import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Globe, ChevronRight, ChevronDown, Flame, Navigation, Radio, MapPin, Sparkles } from 'lucide-react';
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
    // Garante que Brasil fique no topo
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
  const handleSelectWorld = () => {
    onFlyToLocation([15.0, 0.0], 2.5, 'Globo 360°');
    onEnableNasaFirmsGlobal?.();
    setOpenDropdown(null);
  };

  const handleSelectCountry = (country: string) => {
    setSelectedCountry(country);
    setOpenDropdown(null);

    const meta = COUNTRY_METADATA[country] || { center: [0, 0] as [number, number], zoom: 4 };
    onFlyToLocation(meta.center, meta.zoom, country);

    // Ajusta o bioma e estado padrão conforme o país
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

  const handleSelectBiome = (biome: string) => {
    setSelectedBiome(biome);
    setOpenDropdown(null);

    if (selectedCountry === 'Brasil' && BRAZIL_BIOMES[biome]) {
      const bMeta = BRAZIL_BIOMES[biome];
      onFlyToLocation(bMeta.center, bMeta.zoom, `Bioma ${bMeta.label}`);
    }
  };

  const handleSelectState = (st: string) => {
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
      className="flex items-center gap-1 sm:gap-1.5 bg-slate-950/90 backdrop-blur-md px-2 sm:px-3 py-1 rounded-xl border border-slate-700/80 shadow-2xl font-mono text-[11px] select-none text-slate-300 pointer-events-auto max-w-[calc(100vw-1.5rem)] overflow-x-auto no-scrollbar"
    >
      
      {/* ================= NÍVEL 1: 🌐 MUNDO ================= */}
      <button
        onClick={handleSelectWorld}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/60 transition group shrink-0 cursor-pointer shadow-sm"
        title="Nível 1: Visão Planetária 360° (NASA FIRMS 24h)"
      >
        <Globe size={13} className="text-cyan-400 group-hover:rotate-45 transition-transform" />
        <span className="font-bold text-white tracking-wide">Mundo</span>
        <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/80 text-[10px] font-black">
          {TOTAL_GLOBAL_FIRES_COUNT.toLocaleString('pt-BR')}
        </span>
      </button>

      <ChevronRight size={13} className="text-slate-600 shrink-0" />

      {/* ================= NÍVEL 2: 🌎 PAÍS (ALTERNÂNCIA) ================= */}
      <div className="relative shrink-0">
        <button
          onClick={() => setOpenDropdown(prev => (prev === 'country' ? null : 'country'))}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition cursor-pointer shadow-sm ${
            openDropdown === 'country'
              ? 'bg-emerald-950 border-emerald-500 text-white'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 text-slate-200'
          }`}
          title="Nível 2: Alternar País monitorado"
        >
          <span>{COUNTRY_METADATA[selectedCountry]?.flag || '🏳️'}</span>
          <span className="font-bold text-white">{selectedCountry}</span>
          <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/80 text-[10px] font-black">
            {countryCount}
          </span>
          <ChevronDown size={11} className={`text-slate-400 transition-transform ${openDropdown === 'country' ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown de Países */}
        {openDropdown === 'country' && (
          <div className="absolute top-full left-0 mt-1.5 w-52 max-h-60 overflow-y-auto bg-slate-950/95 border border-slate-700 rounded-xl shadow-2xl p-1 z-[1500] backdrop-blur-md">
            <div className="px-2 py-1 text-[9px] text-slate-500 uppercase tracking-wider font-bold border-b border-slate-800 mb-1">
              Selecione o País
            </div>
            {availableCountries.map(c => (
              <button
                key={c}
                onClick={() => handleSelectCountry(c)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[10.5px] transition cursor-pointer ${
                  selectedCountry === c ? 'bg-emerald-900/60 text-emerald-200 font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span>{COUNTRY_METADATA[c]?.flag || '🏳️'}</span>
                  <span className="truncate">{c}</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 shrink-0 ml-1">
                  {countryCounts[c]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <ChevronRight size={13} className="text-slate-600 shrink-0" />

      {/* ================= NÍVEL 3: 🌲 BIOMA / REGIÃO (ALTERNÂNCIA) ================= */}
      <div className="relative shrink-0">
        <button
          onClick={() => setOpenDropdown(prev => (prev === 'biome' ? null : 'biome'))}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition cursor-pointer shadow-sm ${
            openDropdown === 'biome'
              ? 'bg-amber-950 border-amber-500 text-white'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 text-slate-200'
          }`}
          title="Nível 3: Alternar Bioma / Região Ecológica"
        >
          <span>{BRAZIL_BIOMES[selectedBiome]?.icon || '🌲'}</span>
          <span className="font-bold text-white">{selectedBiome}</span>
          <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800/80 text-[10px] font-black">
            {biomeCount}
          </span>
          <ChevronDown size={11} className={`text-slate-400 transition-transform ${openDropdown === 'biome' ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown de Biomas */}
        {openDropdown === 'biome' && (
          <div className="absolute top-full left-0 mt-1.5 w-48 max-h-56 overflow-y-auto bg-slate-950/95 border border-slate-700 rounded-xl shadow-2xl p-1 z-[1500] backdrop-blur-md">
            <div className="px-2 py-1 text-[9px] text-slate-500 uppercase tracking-wider font-bold border-b border-slate-800 mb-1">
              Biomas &amp; Regiões
            </div>
            {availableBiomes.map(b => (
              <button
                key={b}
                onClick={() => handleSelectBiome(b)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[10.5px] transition cursor-pointer ${
                  selectedBiome === b ? 'bg-amber-900/60 text-amber-200 font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span>{BRAZIL_BIOMES[b]?.icon || '🌲'}</span>
                  <span className="truncate">{b}</span>
                </div>
                <span className="text-[10px] font-mono text-amber-400 shrink-0 ml-1">
                  {biomeCounts[b] || 0}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <ChevronRight size={13} className="text-slate-600 shrink-0" />

      {/* ================= NÍVEL 4: 📍 ESTADO / PROVÍNCIA (ALTERNÂNCIA) ================= */}
      <div className="relative shrink-0">
        <button
          onClick={() => setOpenDropdown(prev => (prev === 'state' ? null : 'state'))}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition cursor-pointer shadow-sm ${
            openDropdown === 'state'
              ? 'bg-red-950 border-red-500 text-white'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 text-slate-200'
          }`}
          title="Nível 4: Alternar Estado da Federação (AM, PA, etc.)"
        >
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span className="font-bold text-white">{selectedState}</span>
          <span className="px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-800/80 text-[10px] font-black">
            {stateCount}
          </span>
          <ChevronDown size={11} className={`text-slate-400 transition-transform ${openDropdown === 'state' ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown de Estados */}
        {openDropdown === 'state' && (
          <div className="absolute top-full right-0 mt-1.5 w-60 max-h-64 overflow-y-auto bg-slate-950/95 border border-slate-700 rounded-xl shadow-2xl p-1 z-[1500] backdrop-blur-md">
            <div className="px-2 py-1 text-[9px] text-slate-500 uppercase tracking-wider font-bold border-b border-slate-800 mb-1 flex items-center justify-between">
              <span>Estados (UFs)</span>
              <span>Focos</span>
            </div>
            {availableStates.map(st => {
              const meta = BRAZIL_STATES[st] || { name: st, uf: st };
              return (
                <button
                  key={st}
                  onClick={() => handleSelectState(st)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[10.5px] transition cursor-pointer ${
                    selectedState === st ? 'bg-red-900/60 text-red-200 font-bold' : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-6 font-bold text-white shrink-0">{meta.uf}</span>
                    <span className="truncate text-slate-400">{meta.name.split(' (')[0]}</span>
                  </div>
                  <span className={`text-[10.5px] font-mono font-bold shrink-0 ml-1 ${
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
