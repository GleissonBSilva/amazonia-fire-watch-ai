import assert from 'node:assert';
import { calculateFireEmissions, EMISSION_FACTORS } from '../src/services/emissionsService.ts';
import { calculatePlumeVector } from '../src/services/plumeDispersionService.ts';
import {
  calculateDistanceKm,
  determineFireTrend,
  determineReadingPeriod,
  upsertFireSpots
} from '../src/services/spotUpsertService.ts';
import { FireSpot } from '../src/types/index.ts';

console.log('======================================================================');
console.log(' AMAZÔNIA FIRE-WATCH AI • SUÍTE DE TESTES UNITÁRIOS DE CÁLCULO E MOTOR');
console.log('======================================================================\n');

let passedTests = 0;
let totalTests = 0;

function test(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`  [OK] ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  [FALHA] ${name}`);
    console.error(`         Erro: ${err.message}`);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// 1. CÁLCULO DE DISTÂNCIA HAVERSINE E CLUSTERIZAÇÃO ESPACIAL
// -----------------------------------------------------------------------------
test('Haversine: Distância entre o mesmo ponto deve ser zero', () => {
  const d = calculateDistanceKm(-3.119027, -60.021731, -3.119027, -60.021731);
  assert.strictEqual(Math.round(d), 0);
});

test('Haversine: Distância entre Manaus e Careiro da Várzea (~25 km)', () => {
  const d = calculateDistanceKm(-3.119027, -60.021731, -3.316667, -59.833333);
  assert.ok(d > 20 && d < 35, `Distância calculada ${d} fora da faixa esperada`);
});

// -----------------------------------------------------------------------------
// 2. CÁLCULO DE EMISSÕES DE POLUENTES (IPCC / GFED4s / Andreae 2019)
// -----------------------------------------------------------------------------
test('Emissões: Cálculo proporcional com FRP positivo', () => {
  const dummySpot: FireSpot = {
    id: 'spot-test-1',
    latitude: -3.119,
    longitude: -60.021,
    frp_mw: 100.0,
    confidence: 'high',
    satellite: 'NOAA-20',
    detected_at: '2026-11-15T12:00:00Z',
    status: 'CONFIRMADO'
  };

  const metrics = calculateFireEmissions(dummySpot);

  // 100 MW * 1.5h * (1324.8 / 2) = 99360 kg biomassa = 99.36 toneladas
  assert.strictEqual(Math.round(metrics.biomassTons), 99);
  // CO2: (99360 kg * 1580 g/kg) / 10^6 = ~156.98 toneladas
  assert.ok(metrics.co2Tons > 150 && metrics.co2Tons < 165);
  // CO: (99360 kg * 104 g/kg) / 10^6 = ~10.33 toneladas
  assert.ok(metrics.coTons > 9 && metrics.coTons < 12);
  // Metano e CO2e
  assert.ok(metrics.ch4Kg > 400 && metrics.ch4Kg < 600);
  assert.ok(metrics.co2EquivTons > metrics.co2Tons);
});

// -----------------------------------------------------------------------------
// 3. PREVISÃO E DISPERSÃO AERODINÂMICA DA PLUMA DE FUMAÇA
// -----------------------------------------------------------------------------
test('Pluma: Vetorização a favor do vento (Downwind) e polígonos fechados', () => {
  const plume = calculatePlumeVector(-3.119, -60.021, 500, 20, 90); // Vento vindo do Leste (90°)

  // O vento vindo de Leste (90°) sopra em direção a Oeste (270°)
  assert.strictEqual(plume.downwindAngleDeg, 270);
  assert.ok(plume.outerPolygon.length > 10, 'Polígono externo deve conter múltiplos vértices');
  assert.ok(plume.innerPolygon.length > 10, 'Polígono interno deve conter múltiplos vértices');

  // Vértice do topo da pluma deve estar a Oeste (longitude mais negativa que -60.021)
  const westPoints = plume.outerPolygon.filter(([lat, lng]) => lng < -60.021);
  assert.ok(westPoints.length > 0, 'Pluma deve se estender a oeste do foco');
});

// -----------------------------------------------------------------------------
// 4. CLASSIFICAÇÃO SOLAR LOCAL (DIURNO / NOTURNO)
// -----------------------------------------------------------------------------
test('Período Solar: Foco às 16:00 UTC em Manaus (-60° lng = UTC-4 -> 12:00 local) é DIURNO', () => {
  const period = determineReadingPeriod('2026-11-15T16:00:00Z', -3.119, -60.021);
  assert.strictEqual(period, 'DIURNO');
});

test('Período Solar: Foco às 02:00 UTC em Manaus (-60° lng = UTC-4 -> 22:00 local) é NOTURNO', () => {
  const period = determineReadingPeriod('2026-11-15T02:00:00Z', -3.119, -60.021);
  assert.strictEqual(period, 'NOTURNO');
});

// -----------------------------------------------------------------------------
// 5. TENDÊNCIA TÉRMICA DO INCÊNDIO
// -----------------------------------------------------------------------------
test('Tendência: Aumento de FRP > 15% deve ser ALASTRAMENTO', () => {
  const trend = determineFireTrend(120, 100);
  assert.strictEqual(trend, 'ALASTRAMENTO');
});

test('Tendência: Queda de FRP > 20% deve ser DIMINUINDO', () => {
  const trend = determineFireTrend(75, 100);
  assert.strictEqual(trend, 'DIMINUINDO');
});

test('Tendência: Variação moderada deve ser ESTAVEL', () => {
  const trend = determineFireTrend(105, 100);
  assert.strictEqual(trend, 'ESTAVEL');
});

// -----------------------------------------------------------------------------
// 6. MOTOR DE UPSERT, DEDUPLICAÇÃO E PREVENÇÃO DE PONTOS FANTASMAS
// -----------------------------------------------------------------------------
test('Deduplicação: Nova leitura no mesmo raio (<= 2.5km) não duplica o foco e congela o início', () => {
  const existing: FireSpot[] = [
    {
      id: 'foco-ativo-1',
      latitude: -3.119027,
      longitude: -60.021731,
      frp_mw: 50.0,
      confidence: 'nominal',
      satellite: 'NOAA-20',
      detected_at: '2026-11-15T10:00:00Z',
      detected_iso: '2026-11-15T10:00:00Z',
      first_detected_at: '2026-11-15T10:00:00Z',
      readings_count: 1
    }
  ];

  // Leitura a 800m de distância (frente de fogo se deslocando)
  const incoming: FireSpot[] = [
    {
      id: 'nova-leitura-satelite',
      latitude: -3.123000,
      longitude: -60.025000,
      frp_mw: 75.0,
      confidence: 'high',
      satellite: 'VIIRS-S-NPP',
      detected_at: '2026-11-15T12:00:00Z',
      detected_iso: '2026-11-15T12:00:00Z',
      minutes_ago: 10
    }
  ];

  const result = upsertFireSpots(existing, incoming);

  assert.strictEqual(result.length, 1, 'Não deve duplicar o registro no array');
  const merged = result[0];
  assert.strictEqual(merged.id, 'foco-ativo-1', 'Deve manter o ID original');
  assert.strictEqual(merged.first_detected_at, '2026-11-15T10:00:00Z', 'Deve congelar a data inicial');
  assert.strictEqual(merged.last_detected_at, '2026-11-15T12:00:00Z', 'Deve atualizar o último timestamp');
  assert.strictEqual(merged.frp_mw, 75.0, 'Deve atualizar o FRP para o valor mais recente');
  assert.strictEqual(merged.prev_frp_mw, 50.0, 'Deve registrar o FRP anterior');
  assert.strictEqual(merged.fire_trend, 'ALASTRAMENTO', 'Deve identificar a tendência');
  assert.strictEqual(merged.readings_count, 2, 'Deve incrementar o contador de passagens do satélite');
});

test('Anti-Fantasma: Focos inativos há mais de 24 horas devem ser removidos', () => {
  const existing: FireSpot[] = [
    {
      id: 'foco-fantasma',
      latitude: -3.119027,
      longitude: -60.021731,
      frp_mw: 10.0,
      confidence: 'low',
      satellite: 'AQUA',
      detected_at: '2026-11-14T08:00:00Z',
      minutes_ago: 1500 // > 1440 min (24h)
    },
    {
      id: 'foco-ativo',
      latitude: -4.000000,
      longitude: -61.000000,
      frp_mw: 80.0,
      confidence: 'high',
      satellite: 'NOAA-20',
      detected_at: '2026-11-15T11:00:00Z',
      minutes_ago: 60 // 1 hora
    }
  ];

  const result = upsertFireSpots(existing, []);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].id, 'foco-ativo');
});

console.log(`\n======================================================================`);
console.log(` RESULTADO: ${passedTests}/${totalTests} TESTES EXECUTADOS COM SUCESSO!`);
console.log(`======================================================================\n`);
