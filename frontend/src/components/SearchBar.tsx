import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Loader2, Navigation } from 'lucide-react';

export interface SearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    state?: string;
  };
}

interface SearchBarProps {
  onLocationSelected: (location: { lat: number; lng: number; label: string }) => void;
}

const QUICK_SUGGESTIONS = [
  { label: 'Rua Sumaúma (Mauazinho, Manaus)', q: 'Rua Sumauma, Mauazinho, Manaus' },
  { label: 'BR-174 (Manaus - Boa Vista)', q: 'BR-174, Manaus' },
  { label: 'BR-230 Transamazônica (Lábrea)', q: 'BR-230, Lábrea' },
  { label: 'Humaitá (Amazonas)', q: 'Humaitá, Amazonas' },
  { label: 'Poconé / Transpantaneira', q: 'Poconé, Mato Grosso' }
];

export const SearchBar: React.FC<SearchBarProps> = ({ onLocationSelected }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
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

  const searchNominatim = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchTerm
      )}&countrycodes=br&limit=6&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
      });

      if (response.ok) {
        const data: SearchResult[] = await response.json();
        setResults(data);
        setIsOpen(true);
      }
    } catch (err) {
      console.warn('Erro na busca de locais Nominatim:', err);
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

    if (value.trim().length >= 3) {
      debounceTimeoutRef.current = setTimeout(() => {
        searchNominatim(value);
      }, 400);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  };

  const handleSelectLocation = (res: SearchResult) => {
    const lat = parseFloat(res.lat);
    const lng = parseFloat(res.lon);
    const label = res.display_name;

    setQuery(label.split(',')[0] || label);
    setIsOpen(false);
    onLocationSelected({ lat, lng, label });
  };

  const handleQuickSuggestion = (item: { label: string; q: string }) => {
    setQuery(item.label);
    searchNominatim(item.q).then(() => {
      // Direct search execution
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (results.length > 0) {
      handleSelectLocation(results[0]);
    } else {
      searchNominatim(query);
    }
  };

  const clearQuery = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-48 lg:w-56 font-sans">
      <form
        onSubmit={handleSubmit}
        className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded-md shadow px-2 py-0.5 backdrop-blur-md focus-within:border-cyan-500 transition-all h-7"
      >
        <Search size={13} className="text-cyan-400 mr-1.5 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (results.length > 0 || query.length >= 3) setIsOpen(true);
          }}
          placeholder="Buscar rua, rodovia..."
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

      {/* Dropdown de Resultados Geocodificados */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900/95 border border-slate-700/90 rounded-lg shadow-2xl backdrop-blur-md overflow-hidden z-50 animate-fade-in font-mono text-xs">
          {results.length > 0 ? (
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-800">
              {results.map((res) => (
                <button
                  key={res.place_id}
                  onClick={() => handleSelectLocation(res)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800/80 text-slate-200 flex items-start gap-2 transition"
                >
                  <MapPin size={13} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 truncate">
                    <div className="text-[11px] font-bold text-white truncate">
                      {res.display_name.split(',')[0]}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {res.display_name}
                    </div>
                  </div>
                  <Navigation size={10} className="text-slate-500 flex-shrink-0 mt-1" />
                </button>
              ))}
            </div>
          ) : (
            <div className="p-3 text-[11px] text-slate-400">
              <div className="text-slate-300 font-semibold mb-1">Locais Estratégicos:</div>
              <div className="space-y-1">
                {QUICK_SUGGESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickSuggestion(item)}
                    className="w-full text-left px-2 py-1 rounded bg-slate-800/60 hover:bg-slate-700 text-cyan-300 text-[10px] truncate block"
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
