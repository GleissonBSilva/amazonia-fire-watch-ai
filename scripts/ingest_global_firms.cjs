const https = require('https');
const fs = require('fs');

console.log('Downloading NASA FIRMS Global 24h CSV...');
const url = 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Global_24h.csv';

https.get(url, (res) => {
  let raw = '';
  res.on('data', chunk => raw += chunk);
  res.on('end', () => {
    console.log('CSV downloaded, size:', (raw.length / 1024 / 1024).toFixed(2), 'MB');
    const lines = raw.trim().split('\n');
    console.log('Total CSV lines:', lines.length);

    // Parse header
    const header = lines[0].split(',').map(h => h.trim());
    const latIdx = header.indexOf('latitude');
    const lngIdx = header.indexOf('longitude');
    const brightTi4Idx = header.indexOf('bright_ti4');
    const frpIdx = header.indexOf('frp');
    const confIdx = header.indexOf('confidence');
    const dateIdx = header.indexOf('acq_date');
    const timeIdx = header.indexOf('acq_time');
    const dayNightIdx = header.indexOf('daynight');

    // Load existing Brazil/South America spots to preserve high-res detail
    let existingBrazilSpots = [];
    try {
      const prev = JSON.parse(fs.readFileSync('public/real_firms_cache.json', 'utf8'));
      existingBrazilSpots = prev.filter(s => s.is_brazil || ['AM','PA','MT','RO','AC','RR','AP','TO','MA','PI','BA','CE','PE','GO','MS'].includes(s.state));
      console.log('Preserving', existingBrazilSpots.length, 'rich Brazilian spots');
    } catch (e) {
      console.log('Could not load prev cache:', e.message);
    }

    function getContinentInfo(lat, lng) {
      // South America
      if (lat >= -56 && lat <= 13 && lng >= -82 && lng <= -34) {
        return { continent: 'América do Sul', country: (lat >= -34 && lat <= 5.5 && lng >= -74 && lng <= -34) ? 'Brasil' : 'América do Sul' };
      }
      // Africa
      if (lat >= -35 && lat <= 37 && lng >= -18 && lng <= 52) {
        let country = 'África';
        if (lat >= -18 && lat <= -5 && lng >= 11 && lng <= 24) country = 'Angola';
        else if (lat >= -14 && lat <= 5 && lng >= 12 && lng <= 31) country = 'República Democrática do Congo';
        else if (lat >= -27 && lat <= -10 && lng >= 30 && lng <= 41) country = 'Moçambique';
        else if (lat >= -18 && lat <= -8 && lng >= 22 && lng <= 34) country = 'Zâmbia';
        else if (lat >= -26 && lat <= -12 && lng >= 43 && lng <= 51) country = 'Madagascar';
        else if (lat >= 4 && lat <= 14 && lng >= 3 && lng <= 15) country = 'Nigéria';
        return { continent: 'África', country };
      }
      // North America
      if (lat >= 14 && lat <= 72 && lng >= -170 && lng <= -50) {
        let country = 'América do Norte';
        if (lat >= 24 && lat <= 49 && lng >= -125 && lng <= -66) country = 'Estados Unidos';
        else if (lat >= 49 && lat <= 70) country = 'Canadá';
        else if (lat >= 14 && lat <= 33 && lng >= -118 && lng <= -86) country = 'México';
        return { continent: 'América do Norte', country };
      }
      // Europe
      if (lat >= 35 && lat <= 71 && lng >= -11 && lng <= 45) {
        let country = 'Europa';
        if (lat >= 36 && lat <= 44 && lng >= -10 && lng <= 4) country = 'Espanha / Portugal';
        else if (lat >= 36 && lat <= 47 && lng >= 6 && lng <= 19) country = 'Itália';
        else if (lat >= 34 && lat <= 42 && lng >= 19 && lng <= 29) country = 'Grécia';
        return { continent: 'Europa', country };
      }
      // Oceania (Australia)
      if (lat >= -50 && lat <= -10 && lng >= 110 && lng <= 180) {
        return { continent: 'Oceania', country: 'Austrália' };
      }
      // Asia
      if (lat >= -11 && lat <= 75 && lng >= 40 && lng <= 180) {
        let country = 'Ásia';
        if (lat >= 8 && lat <= 37 && lng >= 68 && lng <= 97) country = 'Índia';
        else if (lat >= 18 && lat <= 54 && lng >= 73 && lng <= 135) country = 'China';
        else if (lat >= -11 && lat <= 6 && lng >= 95 && lng <= 141) country = 'Indonésia';
        else if (lat >= 50 && lng >= 40) country = 'Rússia (Sibéria)';
        return { continent: 'Ásia', country };
      }
      return { continent: 'Global', country: 'Internacional' };
    }

    const continentBuckets = {
      'África': [],
      'Ásia': [],
      'Oceania': [],
      'América do Norte': [],
      'Europa': [],
      'América do Sul': [],
    };

    let uid = 30000;
    const now = new Date();
    const nowMs = now.getTime();

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length <= frpIdx) continue;

      const lat = parseFloat(parts[latIdx]);
      const lng = parseFloat(parts[lngIdx]);
      const frp = parseFloat(parts[frpIdx]) || 15.0;
      const bright = parseFloat(parts[brightTi4Idx]) || 325.0;
      const confStr = (parts[confIdx] || 'nominal').toLowerCase();
      const acqDate = parts[dateIdx] || '2026-11-02';
      const acqTime = (parts[timeIdx] || '1200').padStart(4, '0');
      const isNight = parts[dayNightIdx] === 'N';

      if (isNaN(lat) || isNaN(lng)) continue;

      const info = getContinentInfo(lat, lng);
      if (!continentBuckets[info.continent]) continue;
      if (info.continent === 'América do Sul') continue;

      continentBuckets[info.continent].push({
        lat, lng, frp, bright, confStr, acqDate, acqTime, isNight, country: info.country, continent: info.continent
      });
    }

    console.log('Global CSV parsed by continent:');
    for (const [cont, arr] of Object.entries(continentBuckets)) {
      console.log(' ', cont, ':', arr.length, 'spots');
    }

    const limits = {
      'África': 1100,
      'Ásia': 550,
      'Oceania': 350,
      'América do Norte': 150,
      'Europa': 80,
    };

    const globalSampledSpots = [];

    for (const [cont, targetCount] of Object.entries(limits)) {
      const list = continentBuckets[cont] || [];
      list.sort((a, b) => b.frp - a.frp);
      const chosen = list.slice(0, targetCount);

      chosen.forEach(item => {
        uid++;
        const hh = item.acqTime.slice(0, 2);
        const mm = item.acqTime.slice(2, 4);
        const iso = item.acqDate + 'T' + hh + ':' + mm + ':00.000Z';
        const diffMin = Math.max(10, Math.round((nowMs - new Date(iso).getTime()) / (1000 * 60)));

        const aqi = Math.min(500, Math.round(item.frp * 2.2 + 30));
        const pm25 = Number((item.frp * 1.1 + 12).toFixed(1));

        globalSampledSpots.push({
          id: 'NASA-GLOBAL-' + cont.toUpperCase().slice(0, 3) + '-' + uid,
          latitude: Number(item.lat.toFixed(5)),
          longitude: Number(item.lng.toFixed(5)),
          is_brazil: false,
          country_code: item.country.slice(0, 2).toUpperCase(),
          country_name: item.country,
          continent: item.continent,
          biome: item.continent === 'África' ? 'Savana Africana' : item.continent === 'Oceania' ? 'Bush australiano' : 'Floresta / Vegetação',
          state: item.country,
          municipality: 'Região de ' + item.country,
          address: 'Detecção Orbital NOAA-20 VIIRS 375m • ' + item.country + ' (' + item.continent + ')',
          satellite: 'NOAA-20 (VIIRS 375m)',
          frp_mw: Number(item.frp.toFixed(1)),
          bright_ti4_k: Number(item.bright.toFixed(1)),
          confidence: item.confStr.includes('high') ? 0.98 : 0.88,
          detected_at: item.acqDate + ' às ' + hh + ':' + mm + ':00 UTC',
          detected_iso: iso,
          has_video: false,
          is_arson_cluster: item.frp > 120,
          is_recurrent: false,
          is_simulated: false,
          is_new_outbreak: diffMin <= 180,
          minutes_ago: diffMin,
          status: 'PENDENTE',
          aqi: aqi,
          pm25: pm25,
          air_quality_level: aqi > 200 ? 'MUITO INADEQUADA' : aqi > 100 ? 'INADEQUADA' : 'MODERADA',
        });
      });
    }

    console.log('Sampled international spots:', globalSampledSpots.length);

    // Combine preserved Brazil/South America + International global spots
    const combinedTotal = [...existingBrazilSpots, ...globalSampledSpots];
    console.log('Final combined planetary dataset:', combinedTotal.length, 'spots');

    fs.writeFileSync('public/real_firms_cache.json', JSON.stringify(combinedTotal, null, 2), 'utf8');
    fs.writeFileSync('backend/real_firms_cache.json', JSON.stringify(combinedTotal, null, 2), 'utf8');
    console.log('Successfully written to public/real_firms_cache.json and backend/real_firms_cache.json!');
  });
}).on('error', e => console.log('HTTP error:', e.message));
