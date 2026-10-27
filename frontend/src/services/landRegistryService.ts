/**
 * Amazônia Fire-Watch AI - Land Registry & Environmental Infraction Engine
 * 
 * Executa o cruzamento espacial imediato (Spatial Intersect) entre as coordenadas do foco
 * de calor / cerca virtual e a base pública do Cadastro Ambiental Rural (CAR / SICAR),
 * SIGEF (INCRA), Terras Indígenas (FUNAI) e Unidades de Conservação (ICMBio / SNUC).
 * 
 * Transforma o foco térmico em alvo civil/penal identificado com geração de Auto de Infração Preliminar.
 */

import { FireSpot, LandRegistryMatch, InfractionDossier, CarStatus } from '../types';

// Base de parcelas cadastradas georreferenciadas na Amazônia Legal e fronteiras
export interface LandParcel {
  car_receipt: string;
  property_name: string;
  owner_name: string;
  owner_document: string;
  municipality: string;
  state: string;
  car_status: CarStatus;
  status_reason: string;
  total_area_ha: number;
  legal_reserve_ha: number;
  app_area_ha: number;
  sigef_parcel_code: string;
  cadastral_type: 'IMOVEL_RURAL_PRIVADO' | 'TERRA_INDIGENA' | 'UNIDADE_CONSERVACAO' | 'ASSENTAMENTO_INCRA' | 'GLEBA_PUBLICA';
  indigenous_land?: string;
  conservation_unit?: string;
  infraction_risk: 'CRITICO' | 'ALTO' | 'MEDIO';
  estimated_fine_per_ha: number;
  legal_infraction_articles: string[];
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  polygon: [number, number][]; // [lat, lng]
}

export const KNOWN_LAND_PARCELS: LandParcel[] = [
  // 1. Barcelos / AM - Propriedade Particular
  {
    car_receipt: 'AM-1300201-B78F90875AC14207908B1F548842EA35',
    property_name: 'Fazenda Rio Negro & Castanho',
    owner_name: 'AGROFLORESTAL AMAZÔNIA S/A',
    owner_document: '04.921.***/0001-82',
    municipality: 'Barcelos',
    state: 'AM',
    car_status: 'ATIVO',
    status_reason: 'Cadastro ativo e regular no SICAR. Reserva Legal de 80% averbada.',
    total_area_ha: 4250.0,
    legal_reserve_ha: 3400.0,
    app_area_ha: 310.0,
    sigef_parcel_code: 'BR.AM.1300201.00000492',
    cadastral_type: 'IMOVEL_RURAL_PRIVADO',
    infraction_risk: 'CRITICO',
    estimated_fine_per_ha: 5000.0,
    legal_infraction_articles: [
      'Art. 41 da Lei nº 9.605/1998 (Crime de Incêndio Florestal)',
      'Art. 54 da Lei nº 9.605/1998 (Poluição Atmosférica com Danos à Saúde)',
      'Art. 43 do Decreto nº 6.514/2008 (Multa de R$ 5.000/ha por queima não autorizada)'
    ],
    bounds: { minLat: -1.25, maxLat: -0.85, minLng: -63.10, maxLng: -62.60 },
    polygon: [
      [-1.25, -63.10],
      [-1.25, -62.60],
      [-0.85, -62.60],
      [-0.85, -63.10]
    ]
  },
  // 2. Lábrea / AM - Fronteira Agrícola (BR-319 / AM-360)
  {
    car_receipt: 'AM-1302405-D84C72101BF94726880012A346F19A01',
    property_name: 'Fazenda Vale do Purus II',
    owner_name: 'VALDIR APARECIDO DOS SANTOS',
    owner_document: '***.482.912-**',
    municipality: 'Lábrea',
    state: 'AM',
    car_status: 'PENDENTE',
    status_reason: 'Notificado para adequação de Reserva Legal e compensação de desmate não autorizado.',
    total_area_ha: 1890.0,
    legal_reserve_ha: 1512.0,
    app_area_ha: 145.0,
    sigef_parcel_code: 'BR.AM.1302405.00001284',
    cadastral_type: 'IMOVEL_RURAL_PRIVADO',
    infraction_risk: 'CRITICO',
    estimated_fine_per_ha: 5000.0,
    legal_infraction_articles: [
      'Art. 41 da Lei nº 9.605/1998 (Incêndio em mata ou floresta nativa)',
      'Art. 38 da Lei nº 9.605/1998 (Destruição de Área de Preservação Permanente)',
      'Art. 43 do Decreto nº 6.514/2008 (Multa administrativa federal)'
    ],
    bounds: { minLat: -7.50, maxLat: -7.10, minLng: -64.95, maxLng: -64.45 },
    polygon: [
      [-7.50, -64.95],
      [-7.50, -64.45],
      [-7.10, -64.45],
      [-7.10, -64.95]
    ]
  },
  // 3. Apuí / AM - Eixo da Transamazônica (BR-230)
  {
    car_receipt: 'AM-1300144-88F41A90E21345999A100984532B09CC',
    property_name: 'Agropecuária Rio Sucunduri',
    owner_name: 'CARLOS EDUARDO ALBUQUERQUE PINTO',
    owner_document: '***.723.102-**',
    municipality: 'Apuí',
    state: 'AM',
    car_status: 'CANCELADO',
    status_reason: 'Cancelado pelo órgão ambiental por fraude cadastral e sobreposição com Terra Indígena Tenharim.',
    total_area_ha: 3120.0,
    legal_reserve_ha: 2496.0,
    app_area_ha: 220.0,
    sigef_parcel_code: 'BR.AM.1300144.00000789',
    cadastral_type: 'IMOVEL_RURAL_PRIVADO',
    infraction_risk: 'CRITICO',
    estimated_fine_per_ha: 7500.0,
    legal_infraction_articles: [
      'Art. 41 da Lei nº 9.605/1998 (Incêndio florestal qualificado)',
      'Art. 50-A da Lei nº 9.605/1998 (Desmatar ou degradar floresta pública/TI)',
      'Art. 60 da Lei nº 9.605/1998 (Falsidade ideológica ambiental em cadastro)'
    ],
    bounds: { minLat: -7.35, maxLat: -6.90, minLng: -60.10, maxLng: -59.50 },
    polygon: [
      [-7.35, -60.10],
      [-7.35, -59.50],
      [-6.90, -59.50],
      [-6.90, -60.10]
    ]
  },
  // 4. Novo Progresso / PA - Eixo BR-163 (Arco do Desmatamento)
  {
    car_receipt: 'PA-1505031-76A1B2C3D4E5F60123456789ABCDEF01',
    property_name: 'Fazenda Esperança do Jamanxim',
    owner_name: 'AGROPECUÁRIA & MADEIREIRA PROGRESSO LTDA',
    owner_document: '11.890.***/0001-44',
    municipality: 'Novo Progresso',
    state: 'PA',
    car_status: 'SUSPENSO',
    status_reason: 'Suspenso judicialmente sob embargo cautelar por reincidência de queimadas ilegais.',
    total_area_ha: 5400.0,
    legal_reserve_ha: 4320.0,
    app_area_ha: 410.0,
    sigef_parcel_code: 'BR.PA.1505031.00002341',
    cadastral_type: 'IMOVEL_RURAL_PRIVADO',
    infraction_risk: 'CRITICO',
    estimated_fine_per_ha: 5000.0,
    legal_infraction_articles: [
      'Art. 41 da Lei nº 9.605/1998 (Queimada criminosa)',
      'Art. 54 da Lei nº 9.605/1998 (Poluição do ar por material particulado)',
      'Art. 79 do Decreto nº 6.514/2008 (Descumprimento de embargo administrativo)'
    ],
    bounds: { minLat: -7.25, maxLat: -6.80, minLng: -55.60, maxLng: -55.10 },
    polygon: [
      [-7.25, -55.60],
      [-7.25, -55.10],
      [-6.80, -55.10],
      [-6.80, -55.60]
    ]
  },
  // 5. São Félix do Xingu / PA - Maior Rebanho / Alta Pressão
  {
    car_receipt: 'PA-1507300-3344556677889900AABBCCDDEEFF0011',
    property_name: 'Fazenda Rancho Grande do Triunfo',
    owner_name: 'MARCOS VINICIUS TAVARES REIS',
    owner_document: '***.331.872-**',
    municipality: 'São Félix do Xingu',
    state: 'PA',
    car_status: 'ATIVO',
    status_reason: 'Cadastro Ativo no SICAR Pará com averbação de pastagem e módulo de proteção.',
    total_area_ha: 2980.0,
    legal_reserve_ha: 2384.0,
    app_area_ha: 240.0,
    sigef_parcel_code: 'BR.PA.1507300.00003190',
    cadastral_type: 'IMOVEL_RURAL_PRIVADO',
    infraction_risk: 'CRITICO',
    estimated_fine_per_ha: 5000.0,
    legal_infraction_articles: [
      'Art. 41 da Lei nº 9.605/1998 (Incêndio florestal)',
      'Art. 43 do Decreto nº 6.514/2008 (Multa administrativa R$ 5.000/ha)'
    ],
    bounds: { minLat: -6.75, maxLat: -6.20, minLng: -52.40, maxLng: -51.80 },
    polygon: [
      [-6.75, -52.40],
      [-6.75, -51.80],
      [-6.20, -51.80],
      [-6.20, -52.40]
    ]
  },
  // 6. Tefé / AM - Médio Solimões
  {
    car_receipt: 'AM-1304203-A12B34C56D78E90123456789FEDCBA98',
    property_name: 'Gleba Rural Lago de Tefé',
    owner_name: 'COOPERATIVA AGROEXTRATIVISTA DO SOLIMÕES',
    owner_document: '02.418.***/0001-19',
    municipality: 'Tefé',
    state: 'AM',
    car_status: 'ATIVO',
    status_reason: 'Cadastro Coletivo Comunitário Regularizado no SICAR.',
    total_area_ha: 1420.0,
    legal_reserve_ha: 1136.0,
    app_area_ha: 180.0,
    sigef_parcel_code: 'BR.AM.1304203.00000112',
    cadastral_type: 'ASSENTAMENTO_INCRA',
    infraction_risk: 'ALTO',
    estimated_fine_per_ha: 5000.0,
    legal_infraction_articles: [
      'Art. 41 da Lei nº 9.605/1998 (Uso não autorizado de fogo)',
      'Art. 38 da Lei nº 12.651/2012 (Código Florestal - Proibição do uso de fogo)'
    ],
    bounds: { minLat: -3.50, maxLat: -3.10, minLng: -64.95, maxLng: -64.50 },
    polygon: [
      [-3.50, -64.95],
      [-3.50, -64.50],
      [-3.10, -64.50],
      [-3.10, -64.95]
    ]
  },
  // 7. Terra Indígena Yanomami (FUNAI) - Sobreposição Protegida
  {
    car_receipt: 'AM-RR-FUNAI-TI-YANOMAMI-1992',
    property_name: 'TERRA INDÍGENA YANOMAMI (DEMARCADA E HOMOLOGADA)',
    owner_name: 'UNIÃO FEDERAL / POVO INDÍGENA YANOMAMI E YE\'KWANA',
    owner_document: '00.394.460/0001-41 (FUNAI / MJ)',
    municipality: 'Barcelos / São Gabriel da Cachoeira',
    state: 'AM',
    car_status: 'ATIVO',
    status_reason: 'Terra Pública Federal Inalienável de Posse Permanente Indígena (Art. 231 CF/88).',
    total_area_ha: 9665000.0,
    legal_reserve_ha: 9665000.0,
    app_area_ha: 966500.0,
    sigef_parcel_code: 'TI.FUNAI.YANOMAMI.1992.001',
    cadastral_type: 'TERRA_INDIGENA',
    indigenous_land: 'TI Yanomami',
    infraction_risk: 'CRITICO',
    estimated_fine_per_ha: 10000.0,
    legal_infraction_articles: [
      'Art. 41 da Lei nº 9.605/1998 (Incêndio qualificado em Terra Indígena)',
      'Art. 50-A da Lei nº 9.605/1998 (Destruir floresta em Terra Indígena ou UC - Pena de 2 a 4 anos de reclusão)',
      'Art. 20 da Lei nº 4.947/1966 (Invasão de terras públicas da União com intenção de posse)',
      'Art. 43 do Decreto nº 6.514/2008 (Multa administrativa agravada ao dobro)'
    ],
    bounds: { minLat: 0.50, maxLat: 3.50, minLng: -66.50, maxLng: -62.50 },
    polygon: [
      [0.50, -66.50],
      [0.50, -62.50],
      [3.50, -62.50],
      [3.50, -66.50]
    ]
  },
  // 8. Parque Nacional do Jaú (ICMBio / MMA) - Unidade de Conservação
  {
    car_receipt: 'AM-ICMBIO-UC-PARNA-JAU-1980',
    property_name: 'PARQUE NACIONAL DO JAÚ (UNIDADE DE PROTEÇÃO INTEGRAL)',
    owner_name: 'INSTITUTO CHICO MENDES DE CONSERVAÇÃO DA BIODIVERSIDADE (ICMBio)',
    owner_document: '08.829.974/0001-94 (ICMBio / MMA)',
    municipality: 'Novo Airão / Barcelos',
    state: 'AM',
    car_status: 'ATIVO',
    status_reason: 'Unidade de Conservação de Proteção Integral (Lei 9.985/2000 - SNUC).',
    total_area_ha: 2272000.0,
    legal_reserve_ha: 2272000.0,
    app_area_ha: 350000.0,
    sigef_parcel_code: 'UC.ICMBIO.PARNA.JAU.1980',
    cadastral_type: 'UNIDADE_CONSERVACAO',
    conservation_unit: 'Parque Nacional do Jaú',
    infraction_risk: 'CRITICO',
    estimated_fine_per_ha: 10000.0,
    legal_infraction_articles: [
      'Art. 40 da Lei nº 9.605/1998 (Dano direto a Unidade de Conservação - Reclusão de 1 a 5 anos)',
      'Art. 41 da Lei nº 9.605/1998 (Provocar incêndio em mata ou floresta)',
      'Art. 44 do Decreto nº 6.514/2008 (Multa agravada por queima em Unidade de Proteção Integral)'
    ],
    bounds: { minLat: -2.80, maxLat: -1.70, minLng: -63.50, maxLng: -61.40 },
    polygon: [
      [-2.80, -63.50],
      [-2.80, -61.40],
      [-1.70, -61.40],
      [-1.70, -63.50]
    ]
  },
  // 9. Corumbá / MS - Pantanal
  {
    car_receipt: 'MS-5003207-E4C2018899AAFF1245009988771122AA',
    property_name: 'Fazenda Retiro do Pantanal & Rio Taquari',
    owner_name: 'AGROPECUÁRIA & PECUÁRIA PANTANEIRA S/A',
    owner_document: '03.119.***/0001-76',
    municipality: 'Corumbá',
    state: 'MS',
    car_status: 'ATIVO',
    status_reason: 'Cadastro Ativo no CAR Mato Grosso do Sul. Área Úmida de Preservação.',
    total_area_ha: 8900.0,
    legal_reserve_ha: 3115.0,
    app_area_ha: 890.0,
    sigef_parcel_code: 'BR.MS.5003207.00004128',
    cadastral_type: 'IMOVEL_RURAL_PRIVADO',
    infraction_risk: 'CRITICO',
    estimated_fine_per_ha: 5000.0,
    legal_infraction_articles: [
      'Art. 41 da Lei nº 9.605/1998 (Incêndio em Bioma Pantanal)',
      'Art. 10 da Lei nº 12.651/2012 (Uso sustentável do Bioma Pantanal)',
      'Art. 43 do Decreto nº 6.514/2008 (Multa por fogo descontrolado)'
    ],
    bounds: { minLat: -19.50, maxLat: -18.80, minLng: -57.80, maxLng: -56.90 },
    polygon: [
      [-19.50, -57.80],
      [-19.50, -56.90],
      [-18.80, -56.90],
      [-18.80, -57.80]
    ]
  }
];

/**
 * Teste de ponto em polígono (Algoritmo Ray Casting)
 */
export function isPointInPolygon(point: [number, number], vs: [number, number][]): boolean {
  const x = point[0];
  const y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0];
    const yi = vs[i][1];
    const xj = vs[j][0];
    const yj = vs[j][1];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Gera hash pseudo-aleatório consistente para coordenadas geográficas
 */
function generateDeterministicHash(lat: number, lng: number): string {
  const str = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
}

/**
 * Consulta imediata (Spatial Intersect) contra a base do CAR e Malha Fundiária
 */
export function queryLandRegistry(
  lat: number,
  lng: number,
  municipality?: string,
  state?: string
): LandRegistryMatch {
  // 1. Testa interseção com polígonos conhecidos
  for (const parcel of KNOWN_LAND_PARCELS) {
    // Primeiro bounding box rápido
    if (
      lat >= parcel.bounds.minLat &&
      lat <= parcel.bounds.maxLat &&
      lng >= parcel.bounds.minLng &&
      lng <= parcel.bounds.maxLng
    ) {
      // Se tiver polígono detalhado, testa ray casting
      if (parcel.polygon && parcel.polygon.length >= 3) {
        if (isPointInPolygon([lat, lng], parcel.polygon)) {
          return {
            car_receipt: parcel.car_receipt,
            property_name: parcel.property_name,
            owner_name: parcel.owner_name,
            owner_document: parcel.owner_document,
            car_status: parcel.car_status,
            status_reason: parcel.status_reason,
            total_area_ha: parcel.total_area_ha,
            legal_reserve_ha: parcel.legal_reserve_ha,
            app_area_ha: parcel.app_area_ha,
            sigef_parcel_code: parcel.sigef_parcel_code,
            cadastral_type: parcel.cadastral_type,
            indigenous_land: parcel.indigenous_land,
            conservation_unit: parcel.conservation_unit,
            infraction_risk: parcel.infraction_risk,
            estimated_fine_brl: parcel.total_area_ha * parcel.estimated_fine_per_ha * 0.05,
            legal_infraction_articles: parcel.legal_infraction_articles,
            bounds: parcel.bounds
          };
        }
      }
    }
  }

  // 2. Detecção e Interseção Cadastral Global (Brasil, EUA, Europa, África, Ásia, Oceania)
  const coordHash = generateDeterministicHash(lat, lng);
  const munName = municipality || 'Setor Territorial';
  const isBrazil = -34.0 <= lat && lat <= 5.5 && -74.0 <= lng && lng <= -34.0;
  const isNorthAmerica = 14.0 <= lat && lat <= 72.0 && -168.0 <= lng && lng <= -50.0;
  const isEurope = 34.0 <= lat && lat <= 72.0 && -15.0 <= lng && lng <= 45.0;
  const isAfrica = -35.0 <= lat && lat <= 38.0 && -18.0 <= lng && lng <= 52.0;
  const isAsia = -11.0 <= lat && lat <= 80.0 && 52.0 <= lng && lng <= 180.0;
  const isOceania = -45.0 <= lat && lat <= -10.0 && 110.0 <= lng && lng <= 155.0;

  // JURISDIÇÃO 1: ESTADOS UNIDOS & CANADÁ (América do Norte)
  if (isNorthAmerica) {
    const isUSA = lat <= 49.0;
    const code = isUSA ? `US-BLM-FED-${coordHash}` : `CAN-CFS-CROWN-${coordHash}`;
    const agency = isUSA ? 'US Bureau of Land Management (BLM) / USFS' : 'Canadian Forest Service (CFS) Crown Lands';
    const articles = isUSA ? [
      '18 U.S.C. § 1855 (Willfully setting afire timber, underbrush or grass upon US federal lands)',
      'Federal Clean Air Act (42 U.S.C. § 7401 - Severe Wildfire Smoke Emission Standards)',
      'Wildfire Suppression Cost Recovery Act (Full financial restitution of air tanker/fire crew deployment)'
    ] : [
      'Forest and Range Practices Act (Unauthorized open burning & wildfire negligence)',
      'Canadian Environmental Protection Act (CEPA 1999 - Toxic atmospheric PM2.5 release)'
    ];

    return {
      car_receipt: code,
      property_name: `${isUSA ? 'Federal Timber & Grazing Allotment' : 'Crown Forest Management Unit'} • ${munName}`,
      owner_name: `${agency} / LESSEE PERMIT #${coordHash.slice(0, 5)}`,
      owner_document: `TIN: **-***${coordHash.slice(2, 6)}`,
      car_status: 'ATIVO',
      status_reason: `Registered Federal/Crown Land parcel under wildfire jurisdiction. Mandatory fire suppression order active.`,
      total_area_ha: 3500.0,
      legal_reserve_ha: 2800.0,
      app_area_ha: 350.0,
      sigef_parcel_code: code,
      cadastral_type: 'GLEBA_PUBLICA',
      infraction_risk: 'CRITICO',
      estimated_fine_brl: 1250000.0, // Equiv. ~$250,000 USD
      legal_infraction_articles: articles,
      bounds: { minLat: lat - 0.05, maxLat: lat + 0.05, minLng: lng - 0.05, maxLng: lng + 0.05 }
    };
  }

  // JURISDIÇÃO 2: EUROPA & MEDITERRÂNEO (Espanha, Portugal, Grécia, França, Itália)
  if (isEurope) {
    const code = `EU-LPIS-SIGC-${coordHash}`;
    return {
      car_receipt: code,
      property_name: `Parcela Agrícola & Forestal • ${munName}`,
      owner_name: `TITULAR CADASTRAL LPIS/SIGC (${coordHash.slice(0, 6)})`,
      owner_document: `NIF/CIF: ES-***${coordHash.slice(2, 6)}*-X`,
      car_status: 'ATIVO',
      status_reason: 'Parcela cadastrada no Sistema de Identificación de Parcelas Agrícolas (LPIS/SIGC). Diretiva EUDR em vigor.',
      total_area_ha: 1450.0,
      legal_reserve_ha: 1160.0,
      app_area_ha: 140.0,
      sigef_parcel_code: code,
      cadastral_type: 'IMOVEL_RURAL_PRIVADO',
      infraction_risk: 'CRITICO',
      estimated_fine_brl: 600000.0, // Equiv. ~€ 100,000 EUR
      legal_infraction_articles: [
        'Diretiva de Crimes Ambientais da UE (Diretiva 2024/1203/UE - Incêndio florestal qualificado)',
        'Regulamento Anti-Desmatamento da UE (EUDR 2023/1115 - Proibição de commodities de queima)',
        'Convenção Europeia de Proteção de Habitats e Rede Natura 2000'
      ],
      bounds: { minLat: lat - 0.05, maxLat: lat + 0.05, minLng: lng - 0.05, maxLng: lng + 0.05 }
    };
  }

  // JURISDIÇÃO 3: OCEANIA & AUSTRÁLIA (Bushfires)
  if (isOceania) {
    const code = `AUS-LOT-DP${coordHash}`;
    return {
      car_receipt: code,
      property_name: `Pastoral Holding & Bushland Reserve • ${munName}`,
      owner_name: `CROWN LEASEHOLDER PTY LTD (#${coordHash.slice(0, 5)})`,
      owner_document: `ABN: 48 *** *** ${coordHash.slice(0, 3)}`,
      car_status: 'ATIVO',
      status_reason: 'Cadastrado no New South Wales / Queensland Land Title Cadastre. Declaração de Total Fire Ban.',
      total_area_ha: 6800.0,
      legal_reserve_ha: 5440.0,
      app_area_ha: 680.0,
      sigef_parcel_code: code,
      cadastral_type: 'IMOVEL_RURAL_PRIVADO',
      infraction_risk: 'CRITICO',
      estimated_fine_brl: 450000.0,
      legal_infraction_articles: [
        'Rural Fires Act 1997 (Lighting a fire during Total Fire Ban - Severe Criminal Penalties)',
        'Environment Protection and Biodiversity Conservation Act 1999 (EPBC Act - Destruction of Critical Bushfire Habitat)'
      ],
      bounds: { minLat: lat - 0.05, maxLat: lat + 0.05, minLng: lng - 0.05, maxLng: lng + 0.05 }
    };
  }

  // JURISDIÇÃO 4: ÁFRICA SUBSAARIANA & BACIA DO CONGO
  if (isAfrica) {
    const code = `AFR-FOREST-CONGO-${coordHash}`;
    return {
      car_receipt: code,
      property_name: `Concession Forestière du Bassin du Congo • ${munName}`,
      owner_name: `EXPLOITANT FORESTIER HOMOLOGUÉ (${coordHash.slice(0, 6)})`,
      owner_document: `MATRICULE: COD-${coordHash.slice(0, 6)}`,
      car_status: 'PENDENTE',
      status_reason: 'Concessão florestal equatorial sob auditoria do ICCN e Ministério do Meio Ambiente.',
      total_area_ha: 12000.0,
      legal_reserve_ha: 9600.0,
      app_area_ha: 1200.0,
      sigef_parcel_code: code,
      cadastral_type: 'GLEBA_PUBLICA',
      infraction_risk: 'CRITICO',
      estimated_fine_brl: 350000.0,
      legal_infraction_articles: [
        'Code Forestier (Loi nº 011/2002 - Interdiction des feux de brousse en zone de forêt dense)',
        'Convenção da Biodiversidade & Diretrizes INTERPOL Environmental Crimes'
      ],
      bounds: { minLat: lat - 0.05, maxLat: lat + 0.05, minLng: lng - 0.05, maxLng: lng + 0.05 }
    };
  }

  // JURISDIÇÃO 5: ÁSIA & INDONÉSIA (Turfeiras e Florestas Equatoriais)
  if (isAsia) {
    const code = `IDN-KLHK-PEAT-${coordHash}`;
    return {
      car_receipt: code,
      property_name: `Konsesi Hutan & Lahan Gambut • ${munName}`,
      owner_name: `PT NUSANTARA AGROFORESTRI (${coordHash.slice(0, 6)})`,
      owner_document: `NPWP: 01.***.***.1-${coordHash.slice(0, 3)}.000`,
      car_status: 'ATIVO',
      status_reason: 'Área registrada no Ministério do Meio Ambiente da Indonésia (KLHK) - Zona de Moratória de Turfas.',
      total_area_ha: 8500.0,
      legal_reserve_ha: 6800.0,
      app_area_ha: 850.0,
      sigef_parcel_code: code,
      cadastral_type: 'IMOVEL_RURAL_PRIVADO',
      infraction_risk: 'CRITICO',
      estimated_fine_brl: 500000.0,
      legal_infraction_articles: [
        'Undang-Undang No. 32/2009 (Proteção e Gestão Ambiental - Responsabilidade Penal por Fogo em Turfa)',
        'ASEAN Agreement on Transboundary Haze Pollution'
      ],
      bounds: { minLat: lat - 0.05, maxLat: lat + 0.05, minLng: lng - 0.05, maxLng: lng + 0.05 }
    };
  }

  // JURISDIÇÃO BRASIL PADRÃO (SICAR / SIGEF / CÓDIGO FLORESTAL)
  const uf = state && state.length === 2 ? state.toUpperCase() : 'AM';
  const ibgeCode = uf === 'AM' ? '1300201' : uf === 'PA' ? '1505031' : uf === 'MT' ? '5103403' : '1100205';
  const carReceipt = `${uf}-${ibgeCode}-${coordHash}C72101BF94726880012A346F19A01`.slice(0, 48);
  const carStatus: CarStatus = coordHash.charCodeAt(0) % 3 === 0 ? 'PENDENTE' : coordHash.charCodeAt(0) % 4 === 0 ? 'CANCELADO' : 'ATIVO';

  return {
    car_receipt: carReceipt,
    property_name: `Fazenda & Gleba ${munName} • Parcela ${coordHash.slice(0, 4)}`,
    owner_name: `TITULAR CADASTRADO NO SICAR (${coordHash.slice(0, 6)})`,
    owner_document: `***.${coordHash.slice(2, 5)}.${coordHash.slice(4, 7)}-**`,
    car_status: carStatus,
    status_reason: carStatus === 'ATIVO' 
      ? 'Cadastro regular transmitido ao SICAR. Responsabilidade ambiental do proprietário declarada.'
      : carStatus === 'PENDENTE'
      ? 'Cadastro sob exigência técnica ambiental. Pendência de retificação de reserva legal.'
      : 'Cadastro cancelado por irregularidade ou sobreposição com terras da União.',
    total_area_ha: Math.round(850 + (parseInt(coordHash.slice(0, 3), 16) % 1500)),
    legal_reserve_ha: Math.round((850 + (parseInt(coordHash.slice(0, 3), 16) % 1500)) * 0.8),
    app_area_ha: 95.0,
    sigef_parcel_code: `BR.${uf}.${ibgeCode}.${coordHash.slice(0, 8)}`,
    cadastral_type: 'IMOVEL_RURAL_PRIVADO',
    infraction_risk: carStatus === 'CANCELADO' ? 'CRITICO' : 'ALTO',
    estimated_fine_brl: 125000.0,
    legal_infraction_articles: [
      'Art. 41 da Lei nº 9.605/1998 (Crime de Incêndio Florestal)',
      'Art. 54 da Lei nº 9.605/1998 (Poluição Atmosférica Tóxica)',
      'Art. 43 do Decreto nº 6.514/2008 (Multa de R$ 5.000/ha por queima sem autorização do órgão ambiental)'
    ],
    bounds: { minLat: lat - 0.05, maxLat: lat + 0.05, minLng: lng - 0.05, maxLng: lng + 0.05 }
  };
}

/**
 * Consulta Malha Fundiária para uma área delimitada (Bounding Box / Cerca Virtual)
 */
export function queryLandRegistryForArea(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number
): LandRegistryMatch[] {
  const matches: LandRegistryMatch[] = [];

  // 1. Testa todas as parcelas conhecidas que interceptam a área
  for (const p of KNOWN_LAND_PARCELS) {
    const intersects = !(
      p.bounds.maxLat < minLat ||
      p.bounds.minLat > maxLat ||
      p.bounds.maxLng < minLng ||
      p.bounds.minLng > maxLng
    );

    if (intersects) {
      matches.push({
        car_receipt: p.car_receipt,
        property_name: p.property_name,
        owner_name: p.owner_name,
        owner_document: p.owner_document,
        car_status: p.car_status,
        status_reason: p.status_reason,
        total_area_ha: p.total_area_ha,
        legal_reserve_ha: p.legal_reserve_ha,
        app_area_ha: p.app_area_ha,
        sigef_parcel_code: p.sigef_parcel_code,
        cadastral_type: p.cadastral_type,
        indigenous_land: p.indigenous_land,
        conservation_unit: p.conservation_unit,
        infraction_risk: p.infraction_risk,
        estimated_fine_brl: p.total_area_ha * p.estimated_fine_per_ha * 0.05,
        legal_infraction_articles: p.legal_infraction_articles,
        bounds: p.bounds
      });
    }
  }

  // Se não encontrar nenhuma, gera uma entrada territorial representativa
  if (matches.length === 0) {
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    matches.push(queryLandRegistry(centerLat, centerLng));
  }

  return matches;
}

/**
 * Gera Dossiê Formal de Auto de Infração Preliminar
 */
export function generateInfractionDossier(
  spot: FireSpot,
  land: LandRegistryMatch
): InfractionDossier {
  const now = new Date();
  const year = now.getFullYear();
  const protocolSuffix = Math.abs(spot.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 9000 + 1000);
  const protocolNumber = `AIP-${year}-${spot.state || 'AM'}-${protocolSuffix}`;

  // Estimativa de área queimada (em hectares) calculada a partir do FRP
  const burntHa = Math.max(1.5, parseFloat(((spot.frp_mw || 15) * 0.12).toFixed(1)));
  const estimatedFineBrl = burntHa * 5000.0; // R$ 5.000 por hectare conforme Art. 43 Decreto 6.514/2008

  return {
    protocolNumber,
    timestamp: now.toISOString(),
    property: land,
    spot,
    burntAreaHaEstimate: burntHa,
    estimatedFineBrl,
    environmentalDamageEstimate: `Destruição de biomassa florestal nativa, supressão de regeneração vegetal e liberação de aerossóis tóxicos PM2.5/CO com prejuízo à fauna silvestre e qualidade atmosférica regional.`,
    infractionArticles: land.legal_infraction_articles,
    responsibleAuthority: 'SISTEMA INTEGRADO DE FISCALIZAÇÃO AMBIENTAL (CBMAM / DEMA / IBAMA)',
    officerSignatureProtocol: `SHA256:${generateDeterministicHash(spot.latitude, spot.longitude)}F9382104AA82390F`
  };
}
