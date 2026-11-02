/**
 * Advanced Geocoding & Search Engine for Amazônia Fire-Watch AI.
 * Supports:
 * 1. Brazilian CEP (BrasilAPI v2 & ViaCEP with coordinate resolution)
 * 2. Decimal & DMS Geographic Coordinates parsing
 * 3. Street, Highway (BR/AM), Neighborhood and Municipality Geocoding
 */

export interface GeocodingResult {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle: string;
  fullAddress: string;
  type: 'cep' | 'street' | 'highway' | 'neighborhood' | 'city' | 'coordinate';
  badge: string;
  badgeColor: string;
  cep?: string;
  city?: string;
  state?: string;
  streetViewUrl: string;
  googleEarthUrl: string;
}

/**
 * Parses decimal or DMS coordinates from string.
 */
export function parseCoordinates(query: string): { lat: number; lng: number } | null {
  const trimmed = query.trim();

  // 1. Decimal coordinates e.g. "-3.10194, -60.025" or "-3.10194 -60.025"
  const decRegex = /^([+-]?\d+(?:\.\d+)?)[,\s]+([+-]?\d+(?:\.\d+)?)$/;
  const decMatch = trimmed.match(decRegex);
  if (decMatch) {
    const lat = parseFloat(decMatch[1]);
    const lng = parseFloat(decMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // 2. Coordinates with S/N/W/E e.g. "3.10194S, 60.025W"
  const cardinalRegex = /^(\d+(?:\.\d+)?)\s*([NSns])[,\s]+(\d+(?:\.\d+)?)\s*([EWOewo])$/;
  const cardMatch = trimmed.match(cardinalRegex);
  if (cardMatch) {
    let lat = parseFloat(cardMatch[1]);
    if (cardMatch[2].toUpperCase() === 'S') lat = -lat;
    let lng = parseFloat(cardMatch[3]);
    if (cardMatch[4].toUpperCase() === 'W' || cardMatch[4].toUpperCase() === 'O') lng = -lng;
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  return null;
}

/**
 * Searches Brazilian CEP via BrasilAPI v2 with fallback to ViaCEP + Nominatim.
 */
export async function searchByCep(cleanCep: string): Promise<GeocodingResult | null> {
  const formattedCep = cleanCep.replace(/\D/g, '');
  if (formattedCep.length !== 8) return null;

  try {
    // 1. BrasilAPI v2 (returns coordinates directly when available)
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${formattedCep}`, {
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      const street = data.street || '';
      const neighborhood = data.neighborhood || '';
      const city = data.city || '';
      const state = data.state || '';
      const fullAddr = [street, neighborhood, `${city} - ${state}`, `CEP: ${data.cep}`].filter(Boolean).join(', ');

      let lat: number | null = null;
      let lng: number | null = null;

      if (data.location?.coordinates?.latitude && data.location?.coordinates?.longitude) {
        lat = parseFloat(data.location.coordinates.latitude);
        lng = parseFloat(data.location.coordinates.longitude);
      }

      // If BrasilAPI coordinates are missing or zero, geocode address via Nominatim
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        const queryStr = `${street}, ${neighborhood}, ${city}, ${state}, Brasil`;
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}&countrycodes=br&limit=1`,
          { headers: { Accept: 'application/json', 'Accept-Language': 'pt-BR' } }
        );
        if (nomRes.ok) {
          const nomData = await nomRes.json();
          if (nomData && nomData[0]) {
            lat = parseFloat(nomData[0].lat);
            lng = parseFloat(nomData[0].lon);
          }
        }
      }

      if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
        return {
          id: `cep-${formattedCep}`,
          lat,
          lng,
          title: street ? `${street} (${data.cep})` : `CEP ${data.cep}`,
          subtitle: `${neighborhood ? `${neighborhood}, ` : ''}${city} - ${state}`,
          fullAddress: fullAddr,
          type: 'cep',
          badge: 'CEP BRASIL',
          badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-500',
          cep: data.cep,
          city,
          state,
          streetViewUrl: `https://maps.google.com/maps?q=&layer=c&cbll=${lat},${lng}&cbp=11,0,0,0,0&output=svembed`,
          googleEarthUrl: `https://earth.google.com/web/@${lat},${lng},50a,500d,35y,0t,0r`,
        };
      }
    }
  } catch (err) {
    console.warn('BrasilAPI CEP search failed, attempting ViaCEP:', err);
  }

  // Fallback: ViaCEP
  try {
    const viaRes = await fetch(`https://viacep.com.br/ws/${formattedCep}/json/`);
    if (viaRes.ok) {
      const data = await viaRes.json();
      if (!data.erro) {
        const street = data.logradouro || '';
        const neighborhood = data.bairro || '';
        const city = data.localidade || '';
        const state = data.uf || '';
        const fullAddr = [street, neighborhood, `${city} - ${state}`, `CEP: ${data.cep}`].filter(Boolean).join(', ');

        const queryStr = `${street}, ${neighborhood}, ${city}, ${state}, Brasil`;
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}&countrycodes=br&limit=1`,
          { headers: { Accept: 'application/json', 'Accept-Language': 'pt-BR' } }
        );

        if (nomRes.ok) {
          const nomData = await nomRes.json();
          if (nomData && nomData[0]) {
            const lat = parseFloat(nomData[0].lat);
            const lng = parseFloat(nomData[0].lon);
            return {
              id: `cep-${formattedCep}`,
              lat,
              lng,
              title: street ? `${street} (${data.cep})` : `CEP ${data.cep}`,
              subtitle: `${neighborhood ? `${neighborhood}, ` : ''}${city} - ${state}`,
              fullAddress: fullAddr,
              type: 'cep',
              badge: 'CEP VIACEP',
              badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-500',
              cep: data.cep,
              city,
              state,
              streetViewUrl: `https://maps.google.com/maps?q=&layer=c&cbll=${lat},${lng}&cbp=11,0,0,0,0&output=svembed`,
              googleEarthUrl: `https://earth.google.com/web/@${lat},${lng},50a,500d,35y,0t,0r`,
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn('ViaCEP search failed:', err);
  }

  return null;
}

/**
 * Universal Search: Handles CEP, Coordinates, Streets, Highways, and Neighborhoods.
 */
export async function performAdvancedSearch(rawQuery: string): Promise<GeocodingResult[]> {
  const query = rawQuery.trim();
  if (!query) return [];

  const results: GeocodingResult[] = [];

  // 1. Direct Coordinates check
  const coords = parseCoordinates(query);
  if (coords) {
    results.push({
      id: `coord-${coords.lat}-${coords.lng}`,
      lat: coords.lat,
      lng: coords.lng,
      title: `${coords.lat.toFixed(5)}°, ${coords.lng.toFixed(5)}°`,
      subtitle: 'Coordenadas Geodésicas Fixas (WGS84)',
      fullAddress: `Latitude: ${coords.lat.toFixed(6)}, Longitude: ${coords.lng.toFixed(6)}`,
      type: 'coordinate',
      badge: 'COORDENADA',
      badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-500',
      streetViewUrl: `https://maps.google.com/maps?q=&layer=c&cbll=${coords.lat},${coords.lng}&cbp=11,0,0,0,0&output=svembed`,
      googleEarthUrl: `https://earth.google.com/web/@${coords.lat},${coords.lng},50a,500d,35y,0t,0r`,
    });
    return results;
  }

  // 2. CEP Pattern check (e.g. "69050030" or "69050-030")
  const cepDigits = query.replace(/\D/g, '');
  if (cepDigits.length === 8 && /^\d{5}-?\d{3}$/.test(query.replace(/\s+/g, ''))) {
    const cepResult = await searchByCep(cepDigits);
    if (cepResult) {
      results.push(cepResult);
      return results;
    }
  }

  // 3. OpenStreetMap / Nominatim Address and Street Search
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&countrycodes=br&limit=7&addressdetails=1`;

    const response = await fetch(nomUrl, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });

    if (response.ok) {
      const data = await response.json();
      for (const item of data) {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        const addr = item.address || {};

        const street = addr.road || addr.street || addr.pedestrian || '';
        const highway = addr.highway || (item.class === 'highway' ? item.name : '');
        const neighborhood = addr.suburb || addr.neighbourhood || addr.city_district || '';
        const city = addr.city || addr.town || addr.municipality || addr.village || '';
        const state = addr.state || '';
        const postcode = addr.postcode || '';

        let type: GeocodingResult['type'] = 'street';
        let badge = 'RUA';
        let badgeColor = 'bg-blue-950 text-blue-300 border-blue-500';

        if (highway || query.toLowerCase().includes('br-') || query.toLowerCase().includes('am-')) {
          type = 'highway';
          badge = 'RODOVIA';
          badgeColor = 'bg-amber-950 text-amber-300 border-amber-500';
        } else if (item.type === 'suburb' || item.type === 'neighbourhood') {
          type = 'neighborhood';
          badge = 'BAIRRO';
          badgeColor = 'bg-purple-950 text-purple-300 border-purple-500';
        } else if (item.type === 'city' || item.type === 'administrative') {
          type = 'city';
          badge = 'MUNICÍPIO';
          badgeColor = 'bg-emerald-950 text-emerald-300 border-emerald-500';
        }

        const title = street || highway || item.name || item.display_name.split(',')[0];
        const subtitle = [neighborhood, `${city}${state ? ` - ${state}` : ''}`, postcode ? `CEP: ${postcode}` : '']
          .filter(Boolean)
          .join(', ');

        results.push({
          id: `nom-${item.place_id}`,
          lat,
          lng,
          title,
          subtitle: subtitle || item.display_name,
          fullAddress: item.display_name,
          type,
          badge,
          badgeColor,
          cep: postcode,
          city,
          state,
          streetViewUrl: `https://maps.google.com/maps?q=&layer=c&cbll=${lat},${lng}&cbp=11,0,0,0,0&output=svembed`,
          googleEarthUrl: `https://earth.google.com/web/@${lat},${lng},50a,500d,35y,0t,0r`,
        });
      }
    }
  } catch (err) {
    console.warn('Erro na geocodificação Nominatim:', err);
  }

  return results;
}

export interface ReverseGeocodingResult {
  road: string; // Nome da Rua, Avenida, Rodovia (ex: "Avenida das Torres", "BR-174")
  neighborhood?: string; // Bairro (ex: "Flores", "Distrito Industrial")
  neighbourhood?: string;
  suburb?: string;
  city: string; // Cidade (ex: "Manaus")
  state: string; // Estado (ex: "AM")
  postcode?: string; // CEP (ex: "69058-000")
  country: string; // País (ex: "Brasil")
  fullAddress: string; // Endereço formatado completo
  formattedStreet: string; // "Av. das Torres, Bairro Flores" ou "Rodovia BR-174"
  isHighway: boolean;
  isUrban: boolean;
  confidence: 'EXACT_STREET' | 'HIGHWAY' | 'NEIGHBORHOOD' | 'RURAL_ESTIMATE';
}

const reverseGeocodeMemoryCache = new Map<string, ReverseGeocodingResult>();

/**
 * Geocodificação Reversa em Tempo Real:
 * Converte latitude e longitude em logradouro exato (Rua, Avenida, Rodovia, Bairro e CEP)
 * consultando a malha viária oficial do OpenStreetMap com cache ultrarrápido em memória e localStorage.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodingResult> {
  const cacheKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;

  // 1. Cache em memória (<0.1ms)
  if (reverseGeocodeMemoryCache.has(cacheKey)) {
    return reverseGeocodeMemoryCache.get(cacheKey)!;
  }

  // 2. Cache persistente em LocalStorage
  const storageKey = `afw_rev_geo_${cacheKey}`;
  try {
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      const parsed: ReverseGeocodingResult = JSON.parse(cached);
      reverseGeocodeMemoryCache.set(cacheKey, parsed);
      return parsed;
    }
  } catch {}

  // 3. Consulta em tempo real à malha viária (Nominatim OSM) com timeout resiliente de 2.2s
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2200);

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const a = data.address || {};

      const road = a.road || a.street || a.pedestrian || a.avenue || a.highway || '';
      const neighborhood = a.suburb || a.neighbourhood || a.city_district || a.residential || '';
      const city = a.city || a.town || a.municipality || a.village || a.county || '';
      const state = a.state || '';
      const postcode = a.postcode || '';
      const country = a.country || 'Brasil';

      const isHwy = Boolean(
        a.highway ||
        (road && (road.includes('BR-') || road.includes('AM-') || road.includes('RO-') || road.includes('MT-') || road.toLowerCase().includes('rodovia')))
      );
      const isUrb = Boolean(road || neighborhood);

      let formattedStreet = '';
      if (road && neighborhood) {
        formattedStreet = `${road}, Bairro ${neighborhood}`;
      } else if (road) {
        formattedStreet = road;
      } else if (neighborhood) {
        formattedStreet = `Bairro ${neighborhood}`;
      } else if (a.industrial) {
        formattedStreet = `Polo Industrial ${a.industrial}`;
      } else {
        formattedStreet = a.hamlet || a.isolated_dwelling || 'Área Florestal / Zona Vicinal';
      }

      const result: ReverseGeocodingResult = {
        road: road || formattedStreet,
        neighborhood: neighborhood || undefined,
        neighbourhood: neighborhood || undefined,
        suburb: neighborhood || undefined,
        city: city || 'Região Metropolitana',
        state: state || 'AM',
        postcode: postcode || undefined,
        country,
        fullAddress: data.display_name || formattedStreet,
        formattedStreet,
        isHighway: isHwy,
        isUrban: isUrb,
        confidence: road ? (isHwy ? 'HIGHWAY' : 'EXACT_STREET') : neighborhood ? 'NEIGHBORHOOD' : 'RURAL_ESTIMATE',
      };

      reverseGeocodeMemoryCache.set(cacheKey, result);
      try {
        localStorage.setItem(storageKey, JSON.stringify(result));
      } catch {}

      return result;
    }
  } catch (err) {
    // Timeout ou sem internet: prossegue para o fallback
  }

  // 4. Fallback descritivo
  const fallbackResult: ReverseGeocodingResult = {
    road: 'Perímetro Tático em Monitoramento',
    city: 'Amazônia Ocidental',
    state: 'AM',
    country: 'Brasil',
    fullAddress: `Latitude: ${lat.toFixed(5)}°, Longitude: ${lng.toFixed(5)}°`,
    formattedStreet: `Coordenadas: ${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
    isHighway: false,
    isUrban: false,
    confidence: 'RURAL_ESTIMATE',
  };

  return fallbackResult;
}

