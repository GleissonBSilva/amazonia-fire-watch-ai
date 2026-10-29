import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Loader2, Navigation, Compass, Globe } from 'lucide-react';
import { performAdvancedSearch, GeocodingResult } from '../services/geocodingService';

export interface SearchBarProps {
  onLocationSelected: (location: { lat: number; lng: number; label: string; address?: string }) => void;
  onOpenStreetView?: (location: { lat: number; lng: number; label: string; address?: string }) => void;
  onOpenEarth3D?: (lat: number, lng: number) => void;
  className?: string;
}

const QUICK_SUGGESTIONS = [
  { label: 'Samsung (Distrito Industrial, Manaus)', q: '-3.09918, -59.94411' },
  { label: 'CEP 69050-030 (Pq. 10, Manaus)', q: '69050-030' },
  { label: 'Av. Djalma Batista (Manaus)', q: 'Avenida Djalma Batista, Manaus' },
  { label: 'BR-230 Transamazônica (Lábrea)', q: 'BR-230, Lábrea' },
  { label: 'BR-174 (Manaus - Boa Vista)', q: 'BR-174, Manaus' },
  { label: '-3.0892, -60.0217 (Flores/Tarumã)', q: '-3.0892, -60.0217' },
  { label: 'Poconé (Transpantaneira/MT)', q: 'Poconé, Mato Grosso' }
];

export const SearchBar: React.FC<SearchBarProps> = ({
  onLocationSelected,
  onOpenStreetView,
  onOpenEarth3D,
  className,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const debounceTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const executeSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await performAdvancedSearch(searchTerm);
      setResults(data);
      setIsOpen(true);
    } catch (err) {
      console.warn('Erro na busca avançada:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Trigger fast for CEP (numbers only) or coordinates or strings >= 3 chars
    const isCepOrCoord = /^\d{5}/.test(value.trim()) || /^[+-]?\d+\.?\d*/.test(value.trim());

    if (value.trim().length >= (isCepOrCoord ? 4 : 3)) {
      debounceTimeoutRef.current = setTimeout(() => {
        executeSearch(value);
      }, 350);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  };

  const handleSelectLocation = (res: GeocodingResult) => {
    setQuery(res.title);
    setIsOpen(false);
    onLocationSelected({
      lat: res.lat,
      lng: res.lng,
      label: res.title,
      address: res.fullAddress,
    });
  };

  const handleQuickSuggestion = (item: { label: string; q: string }) => {
    setQuery(item.q);
    executeSearch(item.q);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (results.length > 0) {
      handleSelectLocation(results[0]);
    } else {
      executeSearch(query);
    }
  };

  const clearQuery = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={className || "relative w-48 lg:w-60 font-sans"}>
      <form
        onSubmit={handleSubmit}
        className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded-md shadow px-2 py-0.5 backdrop-blur-md focus-within:border-cyan-400 transition-all h-7"
      >
        <Search size={13} className="text-cyan-400 mr-1.5 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (results.length > 0 || query.length >= 3) setIsOpen(true);
          }}
          placeholder="Buscar CEP, rua, rodovia, coord..."
          className="w-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none font-mono"
        />

        {loading ? (
          <Loader2 size={13} className="text-cyan-400 animate-spin flex-shrink-0 ml-1.5" />
        ) : query ? (
          <button
            type="button"
            onClick={clearQuery}
            className="text-slate-400 hover:text-white p-0.5 ml-1"
          >
            <X size={13} />
          </button>
        ) : null}
      </form>

      {/* Dropdown de Resultados Geocodificados Avançados */}
      {isOpen && (
        <div className="absolute top-full left-0 w-80 lg:w-96 mt-1.5 bg-slate-950/98 border border-slate-700/90 rounded-lg shadow-2xl backdrop-blur-xl overflow-hidden z-[1200] animate-fade-in font-mono text-xs">
          <div className="px-2.5 py-1 text-[9.5px] uppercase font-bold text-slate-400 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <span>Resultados de Localização</span>
            <span className="text-cyan-400 text-[8.5px]">Google Maps / CEP / OpenStreetMap</span>
          </div>

          {results.length > 0 ? (
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/80">
              {results.map((res) => (
                <div
                  key={res.id}
                  className="w-full text-left p-2 hover:bg-slate-900/80 text-slate-200 transition group flex flex-col gap-1 cursor-pointer"
                  onClick={() => handleSelectLocation(res)}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin size={12} className="text-cyan-400 flex-shrink-0" />
                      <span className="text-[11.5px] font-bold text-white truncate">
                        {res.title}
                      </span>
                    </div>
                    <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase border ${res.badgeColor} flex-shrink-0`}>
                      {res.badge}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-400 truncate pl-4">
                    {res.subtitle}
                  </div>

                  {/* Ações Táticas Rápidas: Visão da Rua (Street View) & 3D */}
                  <div className="flex items-center justify-between pl-4 pt-1 mt-0.5 border-t border-slate-800/60 text-[9.5px]">
                    <span className="text-slate-500 font-mono text-[8.5px]">
                      {res.lat.toFixed(4)}°, {res.lng.toFixed(4)}°
                    </span>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {onOpenStreetView && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            onLocationSelected({ lat: res.lat, lng: res.lng, label: res.title, address: res.fullAddress });
                            onOpenStreetView({ lat: res.lat, lng: res.lng, label: res.title, address: res.fullAddress });
                          }}
                          className="px-2 py-0.5 rounded bg-sky-950/80 hover:bg-sky-800 text-sky-300 border border-sky-700/80 flex items-center gap-1 transition"
                          title="Abrir Visão da Rua (Street View 360°)"
                        >
                          <Compass size={10} className="text-sky-400" />
                          <span>Visão da Rua</span>
                        </button>
                      )}

                      {onOpenEarth3D && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            onLocationSelected({ lat: res.lat, lng: res.lng, label: res.title, address: res.fullAddress });
                            onOpenEarth3D(res.lat, res.lng);
                          }}
                          className="px-2 py-0.5 rounded bg-indigo-950/80 hover:bg-indigo-800 text-indigo-300 border border-indigo-700/80 flex items-center gap-1 transition"
                          title="Abrir Perspectiva 3D no Google Earth"
                        >
                          <Globe size={10} className="text-indigo-400" />
                          <span>3D</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleSelectLocation(res)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-cyan-700 text-slate-200 hover:text-white flex items-center gap-1 transition"
                      >
                        <Navigation size={10} />
                        <span>Focar</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 text-[11px] text-slate-400">
              <div className="text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
                <span>Sugestões Rápidas:</span>
                <span className="text-[9px] text-slate-500 font-mono">Brasil / AM</span>
              </div>
              <div className="space-y-1">
                {QUICK_SUGGESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickSuggestion(item)}
                    className="w-full text-left px-2 py-1 rounded bg-slate-900/80 hover:bg-slate-800 text-cyan-300 text-[10.5px] truncate block border border-slate-800 transition"
                  >
                    📍 {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
