import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Loader2, Navigation } from 'lucide-react';

export interface SearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    state?: string;
  };
}

interface MapSearchBarProps {
  onSelectLocation: (lat: number, lon: number, displayName: string) => void;
  onClearLocation?: () => void;
}

export const MapSearchBar: React.FC<MapSearchBarProps> = ({
  onSelectLocation,
  onClearLocation,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 3) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query.trim()
          )}&countrycodes=br&addressdetails=1&limit=6`,
          {
            headers: {
              'Accept-Language': 'pt-BR,pt;q=0.9',
            },
          }
        );

        if (response.ok) {
          const data: SearchResult[] = await response.json();
          setResults(data);
          setIsOpen(data.length > 0);
        }
      } catch (err) {
        console.warn('Erro ao consultar Nominatim Geocoding:', err);
      } finally {
        setIsLoading(false);
      }
    }, 380);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: SearchResult) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    setSelectedName(item.display_name);
    setQuery(item.display_name);
    setIsOpen(false);
    onSelectLocation(lat, lon, item.display_name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0) {
        handleSelect(results[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setSelectedName(null);
    if (onClearLocation) onClearLocation();
  };

  return (
    <div ref={containerRef} className="relative w-72 sm:w-96 text-xs font-mono pointer-events-auto">
      <div className="relative flex items-center bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/50 transition-all">
        <div className="pl-3 pr-1 text-cyan-400 flex items-center justify-center">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen && results.length > 0) setIsOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Buscar rua, bairro ou cidade (ex: Humaitá, Manaus)..."
          className="w-full py-2 px-2 bg-transparent text-white placeholder-slate-400 text-xs focus:outline-none"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 mr-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Limpar busca"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown de Auto-Complete */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900/98 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 max-h-72 overflow-y-auto divide-y divide-slate-800">
          <div className="p-1.5 px-3 bg-slate-950/70 text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Resultados Nominatim (Brasil)</span>
            <span className="text-slate-500 text-[9px]">Pressione Enter para o 1º</span>
          </div>

          {results.map((item) => (
            <button
              key={item.place_id}
              onClick={() => handleSelect(item)}
              type="button"
              className="w-full text-left p-2.5 px-3 hover:bg-slate-800/90 transition-colors flex items-start gap-2.5 group"
            >
              <div className="p-1 rounded bg-slate-800 text-cyan-400 group-hover:bg-cyan-950 group-hover:text-cyan-300 transition-colors shrink-0 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-semibold truncate group-hover:text-cyan-300">
                  {item.display_name.split(',')[0]}
                </p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  {item.display_name}
                </p>
              </div>
              <Navigation className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
