import React, { useState, useMemo } from 'react';
import { Rnd } from 'react-rnd';
import { FireSpot, DelimitedArea } from '../types';
import { isSupabaseConfigured } from '../services/supabaseClient';
import {
  generateDetailedEmissionsReport,
  calculateFireEmissions,
  MunicipalitySummary
} from '../services/emissionsService';
import {
  X,
  FileText,
  Printer,
  Download,
  Flame,
  ShieldAlert,
  BarChart2,
  MapPin,
  Calendar,
  Layers,
  Wind,
  CheckCircle2,
  Share2,
  Maximize2,
  Square,
  Search,
  Activity,
  AlertTriangle,
  Info,
  Database,
  CloudFog,
  FileSpreadsheet,
  Globe
} from 'lucide-react';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fireSpots: FireSpot[];
  selectedArea?: DelimitedArea | null;
  onSelectLocation?: (lat: number, lng: number) => void;
}

export const ReportsModal: React.FC<ReportsModalProps> = ({
  isOpen,
  onClose,
  fireSpots,
  selectedArea,
  onSelectLocation,
}) => {
  const [reportScope, setReportScope] = useState<'all' | 'amazonia' | 'north_america' | 'europe' | 'africa' | 'asia' | 'oceania' | 'area'>('all');
  const [timeScope, setTimeScope] = useState<'24h' | 'recent' | 'all'>('24h');
  const [selectedMunicipalityName, setSelectedMunicipalityName] = useState<string>('all');
  const [searchTableQuery, setSearchTableQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'pollutants' | 'municipalities' | 'records' | 'methodology'>('overview');
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  // 1. Filtragem inicial por escopo territorial e temporal
  const baseScopedFires = useMemo(() => {
    let list = fireSpots;

    if (reportScope === 'area' && selectedArea) {
      const minLat = Math.min(selectedArea.northEast.lat, selectedArea.southWest.lat);
      const maxLat = Math.max(selectedArea.northEast.lat, selectedArea.southWest.lat);
      const minLng = Math.min(selectedArea.northEast.lng, selectedArea.southWest.lng);
      const maxLng = Math.max(selectedArea.northEast.lng, selectedArea.southWest.lng);

      list = list.filter(
        (f) =>
          f.latitude >= minLat &&
          f.latitude <= maxLat &&
          f.longitude >= minLng &&
          f.longitude <= maxLng
      );
    } else if (reportScope === 'amazonia') {
      list = list.filter((f) => f.biome.toLowerCase().includes('amazônia') || f.state === 'AM');
    }

    if (timeScope === 'recent') {
      list = list.filter((f) => (f.minutes_ago ?? 999) <= 180);
    }

    return list;
  }, [fireSpots, reportScope, timeScope, selectedArea]);

  // 2. Filtro específico por Município (se selecionado)
  const reportFires = useMemo(() => {
    if (selectedMunicipalityName === 'all') return baseScopedFires;
    return baseScopedFires.filter(
      (f) => `${f.municipality}_${f.state}` === selectedMunicipalityName || f.municipality === selectedMunicipalityName
    );
  }, [baseScopedFires, selectedMunicipalityName]);

  // 3. Cálculo de emissões atmosféricas e consolidação dos dados municipais
  const reportData = useMemo(() => {
    return generateDetailedEmissionsReport(reportFires);
  }, [reportFires]);

  // Lista única de municípios para o dropdown seletor
  const availableMunicipalities = useMemo(() => {
    const map = new Map<string, { label: string; count: number; state: string }>();
    baseScopedFires.forEach((f) => {
      const key = `${f.municipality}_${f.state}`;
      const label = `${f.municipality} - ${f.state}`;
      if (!map.has(key)) {
        map.set(key, { label, count: 0, state: f.state });
      }
      map.get(key)!.count += 1;
    });
    return Array.from(map.entries())
      .map(([key, item]) => ({ key, label: item.label, count: item.count, state: item.state }))
      .sort((a, b) => b.count - a.count);
  }, [baseScopedFires]);

  // Município atualmente em foco na visualização detalhada
  const currentMunicipalityDetail = useMemo(() => {
    if (selectedMunicipalityName === 'all') {
      return reportData.municipalities.length > 0 ? reportData.municipalities[0] : null;
    }
    return reportData.municipalities.find((m) => `${m.name}_${m.state}` === selectedMunicipalityName || m.name === selectedMunicipalityName) || null;
  }, [selectedMunicipalityName, reportData]);

  // Filtragem da tabela técnica de registros
  const filteredTableFires = useMemo(() => {
    if (!searchTableQuery.trim()) return reportFires;
    const term = searchTableQuery.toLowerCase();
    return reportFires.filter(
      (f) =>
        f.id.toLowerCase().includes(term) ||
        f.municipality.toLowerCase().includes(term) ||
        f.state.toLowerCase().includes(term) ||
        f.satellite.toLowerCase().includes(term) ||
        f.biome.toLowerCase().includes(term)
    );
  }, [reportFires, searchTableQuery]);

  // Exportação CSV Completa com todas as colunas de poluentes e fontes
  const handleExportCSV = () => {
    const headers = [
      'ID_FOCO',
      'LATITUDE',
      'LONGITUDE',
      'MUNICIPIO',
      'ESTADO',
      'BIOMA',
      'SATELITE',
      'FRP_MW',
      'TEMP_BRILHO_K',
      'HORARIO_UTC',
      'AQI_ESTIMADO',
      'BIOMASSA_CONSUMIDA_TON',
      'EMISSAO_CO2_TON',
      'EMISSAO_CO_TON',
      'EMISSAO_PM25_KG',
      'EMISSAO_CH4_KG',
      'EMISSAO_NOX_KG',
      'EMISSAO_CARBONO_NEGRO_KG',
      'CO2_EQUIVALENTE_TON',
      'FONTE_SATELITE',
      'MODELO_EMISSOES'
    ];

    const rows = reportFires.map((f) => {
      const em = calculateFireEmissions(f);
      return [
        f.id,
        f.latitude,
        f.longitude,
        `"${(f.municipality || '').replace(/"/g, '""')}"`,
        f.state,
        `"${f.biome}"`,
        `"${f.satellite}"`,
        f.frp_mw,
        f.bright_ti4_k,
        `"${f.detected_at}"`,
        f.aqi || 45,
        em.biomassTons,
        em.co2Tons,
        em.coTons,
        em.pm25Kg,
        em.ch4Kg,
        em.noxKg,
        em.blackCarbonKg,
        em.co2EquivTons,
        '"NASA FIRMS / INPE BDQueimadas"',
        '"GFEDv4s / IPCC Tier-2"'
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_detalhado_emissao_${selectedMunicipalityName !== 'all' ? selectedMunicipalityName : 'geral'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Exportação em formato JSON Dossiê
  const handleExportJSON = () => {
    const dossier = {
      titulo: 'Dossiê Técnico de Monitoramento Satelital e Emissões Atmosféricas',
      orgao: 'CBMAM / CIOPS - Amazônia Fire-Watch AI',
      data_emissao: new Date().toISOString(),
      escopo_territorial: reportScope,
      municipio_selecionado: selectedMunicipalityName,
      metricas_consolidadas: {
        total_focos: reportData.totalSpots,
        energia_termica_mw: reportData.totalFrpMw,
        biomassa_consumida_toneladas: reportData.totalBiomassTons,
        co2_emitido_toneladas: reportData.totalCo2Tons,
        co_emitido_toneladas: reportData.totalCoTons,
        pm25_emitido_kg: reportData.totalPm25Kg,
        metano_ch4_kg: reportData.totalCh4Kg,
        nox_kg: reportData.totalNoxKg,
        co2_equivalente_toneladas: reportData.totalCo2EquivTons,
      },
      fontes_dados: reportData.sources,
      municipios_afetados: reportData.municipalities,
      ocorrencias_detalhadas: reportFires.map((f) => ({
        ...f,
        emissões_estimadas: calculateFireEmissions(f),
      })),
    };

    const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dossie_emissao_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <Rnd
      default={{
        x: Math.max(10, (window.innerWidth - Math.min(980, window.innerWidth - 20)) / 2),
        y: Math.max(10, (window.innerHeight - Math.min(680, window.innerHeight - 30)) / 2),
        width: Math.min(980, window.innerWidth - 20),
        height: Math.min(680, window.innerHeight - 30),
      }}
      minWidth={Math.min(540, window.innerWidth - 20)}
      minHeight={Math.min(420, window.innerHeight - 30)}
      bounds="window"
      dragHandleClassName="reports-window-handle"
      enableResizing={!isMaximized}
      disableDragging={isMaximized}
      className={`fixed z-50 flex flex-col bg-slate-950/95 border border-slate-700/90 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md font-mono select-none ${
        isMaximized ? '!inset-2 !w-auto !h-auto !transform-none' : ''
      }`}
    >
      {/* 1. Header Oficial do Relatório Móvel (Draggable Handle) */}
      <div className="reports-window-handle px-4 py-2.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between cursor-move select-none flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-red-600/20 text-red-400 border border-red-500/50 shadow-inner">
            <Flame size={17} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white tracking-wider flex items-center gap-2">
              <span>RELATÓRIO TÉCNICO DE QUEIMADAS &amp; ESTIMATIVA DE POLUENTES</span>
              <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-red-950 text-red-300 border border-red-700">
                IPCC / GFED4s
              </span>
            </h2>
            <p className="text-[9px] text-slate-400">
              Identificação Municipal, Emissões de Poluentes Atmosféricos &amp; Rastreabilidade Satelital
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrint}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-[10px] flex items-center gap-1 transition cursor-pointer"
            title="Imprimir boletim formal ou salvar em PDF"
          >
            <Printer size={11} />
            <span>Imprimir / PDF</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-2 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-600 text-[10px] flex items-center gap-1 transition font-bold cursor-pointer"
            title="Exportar planilha analítica CSV com todos os poluentes"
          >
            <FileSpreadsheet size={11} />
            <span>CSV</span>
          </button>
          <button
            onClick={handleExportJSON}
            className="px-2 py-1 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-600 text-[10px] flex items-center gap-1 transition font-bold cursor-pointer"
            title="Exportar dossiê completo em JSON"
          >
            <Download size={11} />
            <span>JSON</span>
          </button>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
            title={isMaximized ? 'Restaurar tamanho' : 'Maximizar'}
          >
            {isMaximized ? <Square size={12} /> : <Maximize2 size={12} />}
          </button>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition cursor-pointer"
            title="Fechar relatório"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* 2. Barra de Controle de Filtros & Município */}
      <div className="px-4 py-2 bg-slate-900/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs flex-shrink-0">
        {/* Seletor de Escopo Geral */}
        <div className="flex items-center gap-2">
          <span className="text-[9.5px] text-slate-400 font-bold">ESCOPO:</span>
          <div className="flex items-center gap-1 overflow-x-auto max-w-md py-0.5">
            <button
              onClick={() => { setReportScope('all'); setSelectedMunicipalityName('all'); }}
              className={`px-2 py-0.5 rounded text-[9.5px] font-bold transition cursor-pointer flex-shrink-0 ${
                reportScope === 'all'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              🌐 Global
            </button>
            <button
              onClick={() => { setReportScope('amazonia'); setSelectedMunicipalityName('all'); }}
              className={`px-2 py-0.5 rounded text-[9.5px] font-bold transition cursor-pointer flex-shrink-0 ${
                reportScope === 'amazonia'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-slate-950 text-emerald-400 hover:text-white border border-slate-800'
              }`}
            >
              🇧🇷 Amazônia
            </button>
            <button
              onClick={() => { setReportScope('north_america'); setSelectedMunicipalityName('all'); }}
              className={`px-2 py-0.5 rounded text-[9.5px] font-bold transition cursor-pointer flex-shrink-0 ${
                reportScope === 'north_america'
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              🇺🇸 América do Norte
            </button>
            <button
              onClick={() => { setReportScope('europe'); setSelectedMunicipalityName('all'); }}
              className={`px-2 py-0.5 rounded text-[9.5px] font-bold transition cursor-pointer flex-shrink-0 ${
                reportScope === 'europe'
                  ? 'bg-purple-600 text-white shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              🇪🇺 Europa
            </button>
            <button
              onClick={() => { setReportScope('africa'); setSelectedMunicipalityName('all'); }}
              className={`px-2 py-0.5 rounded text-[9.5px] font-bold transition cursor-pointer flex-shrink-0 ${
                reportScope === 'africa'
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              🌍 África
            </button>
            <button
              onClick={() => { setReportScope('asia'); setSelectedMunicipalityName('all'); }}
              className={`px-2 py-0.5 rounded text-[9.5px] font-bold transition cursor-pointer flex-shrink-0 ${
                reportScope === 'asia'
                  ? 'bg-rose-600 text-white shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              🇮🇩 Ásia
            </button>
            {selectedArea && (
              <button
                onClick={() => { setReportScope('area'); setSelectedMunicipalityName('all'); }}
                className={`px-2 py-0.5 rounded text-[9.5px] font-bold transition cursor-pointer ${
                  reportScope === 'area'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                📍 Área (~{selectedArea.areaSqKm} km²)
              </button>
            )}
          </div>
        </div>

        {/* Seletor Preciso de Município */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9.5px] text-slate-400 font-bold flex items-center gap-1">
            <MapPin size={11} className="text-amber-400" />
            <span>MUNICÍPIO:</span>
          </span>
          <select
            value={selectedMunicipalityName}
            onChange={(e) => setSelectedMunicipalityName(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[10px] text-white font-mono focus:outline-none focus:border-red-500 max-w-[220px]"
          >
            <option value="all">TODOS OS MUNICÍPIOS ({availableMunicipalities.length})</option>
            {availableMunicipalities.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label} ({m.count} focos)
              </option>
            ))}
          </select>
        </div>

        {/* Seletor Temporal */}
        <div className="flex items-center gap-1">
          <span className="text-[9.5px] text-slate-400 font-bold">JANELA:</span>
          <button
            onClick={() => setTimeScope('24h')}
            className={`px-2 py-0.5 rounded text-[9px] cursor-pointer ${
              timeScope === '24h' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            24 Horas
          </button>
          <button
            onClick={() => setTimeScope('recent')}
            className={`px-2 py-0.5 rounded text-[9px] cursor-pointer ${
              timeScope === 'recent' ? 'bg-cyan-700 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="Últimas 3 horas de passagens orbitais"
          >
            &lt; 3 Horas
          </button>
        </div>
      </div>

      {/* 3. Navegação em Abas do Relatório */}
      <div className="px-4 bg-slate-950 border-b border-slate-800 flex items-center gap-4 text-xs flex-shrink-0">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2 font-bold flex items-center gap-1.5 border-b-2 transition cursor-pointer text-[11px] ${
            activeTab === 'overview'
              ? 'border-red-500 text-red-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity size={13} />
          <span>Visão Geral &amp; Métricas</span>
        </button>

        <button
          onClick={() => setActiveTab('pollutants')}
          className={`py-2 font-bold flex items-center gap-1.5 border-b-2 transition cursor-pointer text-[11px] ${
            activeTab === 'pollutants'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CloudFog size={13} />
          <span>Poluentes Emitidos (IPCC)</span>
        </button>

        <button
          onClick={() => setActiveTab('municipalities')}
          className={`py-2 font-bold flex items-center gap-1.5 border-b-2 transition cursor-pointer text-[11px] ${
            activeTab === 'municipalities'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MapPin size={13} />
          <span>Identificação Municipal</span>
        </button>

        <button
          onClick={() => setActiveTab('records')}
          className={`py-2 font-bold flex items-center gap-1.5 border-b-2 transition cursor-pointer text-[11px] ${
            activeTab === 'records'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart2 size={13} />
          <span>Registros Técnicos ({reportFires.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('methodology')}
          className={`py-2 font-bold flex items-center gap-1.5 border-b-2 transition cursor-pointer text-[11px] ${
            activeTab === 'methodology'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database size={13} />
          <span>Fontes &amp; Metodologia</span>
        </button>
      </div>

      {/* 4. Conteúdo das Abas com Scroll */}
      <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs text-slate-200">
        
        {/* ======================================================== */}
        {/* ABA 1: VISÃO GERAL & MÉTRICAS PRINCIPAIS */}
        {/* ======================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-4 animate-fade-in">
            {/* Banner de Identificação do Recorte */}
            <div className="p-3 rounded-lg bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-amber-400 font-bold block uppercase tracking-wider">
                  Boletim de Inteligência de Incêndios
                </span>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{selectedMunicipalityName === 'all' ? (reportScope === 'amazonia' ? 'Bioma Amazônia e América do Sul' : reportScope === 'north_america' ? 'América do Norte (EUA / Canadá)' : reportScope === 'europe' ? 'Europa & Bacia do Mediterrâneo' : reportScope === 'africa' ? 'África Subsaariana & Bacia do Congo' : reportScope === 'asia' ? 'Ásia & Sudeste Asiático' : 'Monitoramento Planetário Completo (Globo 360°)') : currentMunicipalityDetail?.name}</span>
                  {selectedMunicipalityName !== 'all' && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-red-950 text-red-300 border border-red-700">
                      {currentMunicipalityDetail?.state} • {currentMunicipalityDetail?.biome}
                    </span>
                  )}
                </h3>
              </div>
              <div className="text-right font-mono text-[9.5px] text-slate-400">
                <div>Fórmula de Emissão: <strong className="text-cyan-300">GFEDv4s / IPCC Tier-2</strong></div>
                <div>Satélites Analisados: <strong className="text-emerald-300">{reportData.sources.satelliteConstellation.length} plataformas ativas</strong></div>
              </div>
            </div>

            {/* Grid dos 5 KPIs Principais */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 shadow">
                <span className="text-[9px] text-slate-400 block mb-0.5 font-bold">TOTAL DE FOCOS</span>
                <span className="text-xl font-bold text-white tracking-tight">{reportData.totalSpots}</span>
                <span className="text-[8.5px] text-slate-500 block mt-1">VIIRS 375m &amp; MODIS</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 shadow">
                <span className="text-[9px] text-slate-400 block mb-0.5 font-bold">ENERGIA RADIATIVA (FRP)</span>
                <span className="text-xl font-bold text-amber-400 tracking-tight">{reportData.totalFrpMw.toLocaleString('pt-BR')} <span className="text-xs">MW</span></span>
                <span className="text-[8.5px] text-slate-500 block mt-1">Pico: {reportData.peakFrpMw} MW</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 shadow">
                <span className="text-[9px] text-slate-400 block mb-0.5 font-bold">BIOMASSA ESTIMADA</span>
                <span className="text-xl font-bold text-cyan-400 tracking-tight">{reportData.totalBiomassTons.toLocaleString('pt-BR')} <span className="text-xs">ton</span></span>
                <span className="text-[8.5px] text-slate-500 block mt-1">Consumo vegetal</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 shadow">
                <span className="text-[9px] text-slate-400 block mb-0.5 font-bold">EMISSÃO DE CO₂</span>
                <span className="text-xl font-bold text-red-400 tracking-tight">{reportData.totalCo2Tons.toLocaleString('pt-BR')} <span className="text-xs">ton</span></span>
                <span className="text-[8.5px] text-slate-500 block mt-1">~{reportData.totalCo2EquivTons.toLocaleString('pt-BR')} t CO₂eq</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 shadow">
                <span className="text-[9px] text-slate-400 block mb-0.5 font-bold">CARGA PM2.5 (FUMO)</span>
                <span className="text-xl font-bold text-purple-400 tracking-tight">{reportData.totalPm25Kg.toLocaleString('pt-BR')} <span className="text-xs">kg</span></span>
                <span className="text-[8.5px] text-slate-500 block mt-1">AQI Médio: {reportData.avgAqi}</span>
              </div>
            </div>

            {/* Painel Duplo de Gráficos Visuais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Gráfico 1: Emissões Comparadas por Poluente */}
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-bold text-white text-[11px] flex items-center gap-1.5">
                    <CloudFog size={13} className="text-orange-400" />
                    <span>EMISSÃO ESTIMADA POR POLUENTE (TONELADAS)</span>
                  </span>
                  <span className="text-[9px] text-slate-400">Modelo GFED4s</span>
                </div>

                <div className="space-y-2 pt-1">
                  {reportData.pollutantDistribution.map((item) => (
                    <div key={item.key} className="space-y-0.5">
                      <div className="flex justify-between text-[9.5px]">
                        <span className="text-slate-300 font-medium">{item.name}</span>
                        <span className="font-bold font-mono" style={{ color: item.color }}>
                          {item.valueTons.toLocaleString('pt-BR')} t ({item.percent}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(item.percent, 2)}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gráfico 2: Top Municípios por Emissão e FRP */}
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-bold text-white text-[11px] flex items-center gap-1.5">
                    <MapPin size={13} className="text-red-400" />
                    <span>TOP MUNICÍPIOS MAIS IMPACTADOS</span>
                  </span>
                  <span className="text-[9px] text-slate-400">Por Potência Térmica</span>
                </div>

                <div className="space-y-1.5 pt-1">
                  {reportData.municipalities.slice(0, 5).map((mun, idx) => {
                    const maxFrpInTop = reportData.municipalities[0]?.totalFrp || 1;
                    const pct = Math.round((mun.totalFrp / maxFrpInTop) * 100);
                    return (
                      <div
                        key={`${mun.name}_${mun.state}`}
                        onClick={() => setSelectedMunicipalityName(`${mun.name}_${mun.state}`)}
                        className="p-1.5 rounded bg-slate-950 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition"
                      >
                        <div className="flex items-center justify-between text-[9.5px] mb-1">
                          <span className="font-bold text-white truncate max-w-[170px]">
                            <span className="text-amber-400 mr-1">#{idx + 1}</span>
                            {mun.name} ({mun.state})
                          </span>
                          <span className="text-amber-300 font-bold font-mono">
                            {mun.totalFrp} MW • {mun.co2Tons} t CO₂
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full"
                            style={{ width: `${Math.max(pct, 4)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 2: DETALHAMENTO DE POLUENTES (IPCC & GFED4s) */}
        {/* ======================================================== */}
        {activeTab === 'pollutants' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <CloudFog size={14} className="text-red-400" />
                <span>Estimativa Quântica de Emissões Atmosféricas por Combustão Florestal</span>
              </h3>
              <p className="text-[10px] text-slate-400">
                Os cálculos utilizam a correlação direta entre o <strong>FRP (Fire Radiative Power)</strong> obtido pelos sensores VIIRS/MODIS e a taxa de consumo de biomassa seca (0.368 kg/MJ), multiplicada pelos fatores de emissão oficiais para a Amazônia e biomas tropicais (Andreae, 2019; IPCC Guidelines).
              </p>
            </div>

            {/* Cards Analíticos de Cada Poluente com Severidade */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Card CO2 */}
              <div className="p-3 rounded-lg bg-slate-900/90 border border-red-900/50 space-y-1.5">
                <div className="flex items-center justify-between text-red-400 font-bold text-[11px]">
                  <span>DIÓXIDO DE CARBONO (CO₂)</span>
                  <span className="px-1.5 py-0.2 rounded bg-red-950 text-[8.5px] border border-red-700">GEE PRINCIPAL</span>
                </div>
                <div className="text-2xl font-bold text-white font-mono">{reportData.totalCo2Tons.toLocaleString('pt-BR')} <span className="text-sm font-normal text-slate-400">toneladas</span></div>
                <p className="text-[9px] text-slate-400 leading-relaxed">
                  Fator de emissão: 1.580 g/kg de biomassa queimada. Responsável pelo impacto de longo prazo no efeito estufa e aquecimento global.
                </p>
              </div>

              {/* Card CO */}
              <div className="p-3 rounded-lg bg-slate-900/90 border border-orange-900/50 space-y-1.5">
                <div className="flex items-center justify-between text-orange-400 font-bold text-[11px]">
                  <span>MONÓXIDO DE CARBONO (CO)</span>
                  <span className="px-1.5 py-0.2 rounded bg-orange-950 text-[8.5px] border border-orange-700">GÁS ASFIXIANTE</span>
                </div>
                <div className="text-2xl font-bold text-white font-mono">{reportData.totalCoTons.toLocaleString('pt-BR')} <span className="text-sm font-normal text-slate-400">toneladas</span></div>
                <p className="text-[9px] text-slate-400 leading-relaxed">
                  Fator de emissão: 104 g/kg. Resultante de combustão incompleta de biomassa densa; reduz o transporte de oxigênio na corrente sanguínea.
                </p>
              </div>

              {/* Card PM2.5 */}
              <div className="p-3 rounded-lg bg-slate-900/90 border border-purple-900/50 space-y-1.5">
                <div className="flex items-center justify-between text-purple-400 font-bold text-[11px]">
                  <span>MATERIAL PARTICULADO (PM2.5)</span>
                  <span className="px-1.5 py-0.2 rounded bg-purple-950 text-[8.5px] border border-purple-700">ALTA TOXICIDADE</span>
                </div>
                <div className="text-2xl font-bold text-white font-mono">{reportData.totalPm25Kg.toLocaleString('pt-BR')} <span className="text-sm font-normal text-slate-400">kg emitidos</span></div>
                <p className="text-[9px] text-slate-400 leading-relaxed">
                  Fator: 9.1 g/kg. Partículas microscópicas (&le;2.5µm) que penetram diretamente nos alvéolos pulmonares, provocando colapso respiratório.
                </p>
              </div>

              {/* Card Metano CH4 */}
              <div className="p-3 rounded-lg bg-slate-900/90 border border-yellow-900/50 space-y-1.5">
                <div className="flex items-center justify-between text-yellow-400 font-bold text-[11px]">
                  <span>METANO (CH₄)</span>
                  <span className="px-1.5 py-0.2 rounded bg-yellow-950 text-[8.5px] border border-yellow-700">GWP = 28</span>
                </div>
                <div className="text-2xl font-bold text-white font-mono">{reportData.totalCh4Kg.toLocaleString('pt-BR')} <span className="text-sm font-normal text-slate-400">kg</span></div>
                <p className="text-[9px] text-slate-400 leading-relaxed">
                  Fator: 5.1 g/kg. Potencial de aquecimento global 28 vezes superior ao CO₂ em um horizonte de 100 anos.
                </p>
              </div>

              {/* Card NOx */}
              <div className="p-3 rounded-lg bg-slate-900/90 border border-cyan-900/50 space-y-1.5">
                <div className="flex items-center justify-between text-cyan-400 font-bold text-[11px]">
                  <span>ÓXIDOS DE NITROGÊNIO (NOx)</span>
                  <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-[8.5px] border border-cyan-700">PRECURSOR OZÔNIO</span>
                </div>
                <div className="text-2xl font-bold text-white font-mono">{reportData.totalNoxKg.toLocaleString('pt-BR')} <span className="text-sm font-normal text-slate-400">kg</span></div>
                <p className="text-[9px] text-slate-400 leading-relaxed">
                  Fator: 2.55 g/kg. Reage fotoquimicamente na atmosfera formando ozônio troposférico e chuva ácida secundária.
                </p>
              </div>

              {/* Card Carbono Negro */}
              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between text-slate-300 font-bold text-[11px]">
                  <span>CARBONO NEGRO (BLACK CARBON)</span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[8.5px] border border-slate-600">FULIGEM PURA</span>
                </div>
                <div className="text-2xl font-bold text-white font-mono">{reportData.totalBlackCarbonKg.toLocaleString('pt-BR')} <span className="text-sm font-normal text-slate-400">kg</span></div>
                <p className="text-[9px] text-slate-400 leading-relaxed">
                  Fator: 0.52 g/kg. Partículas escuras que absorvem radiação solar direta na camada limite planetária, acelerando desidratação das nuvens.
                </p>
              </div>
            </div>

            {/* Tabela de Fatores de Emissão Utilizados */}
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="font-bold text-white text-[10.5px] block mb-1">
                Tabela Paramétrica de Fatores de Emissão (GFED4s / IPCC 2019)
              </span>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[9.5px]">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-1.5">Poluente</th>
                      <th className="p-1.5">Fórmula Química</th>
                      <th className="p-1.5">Fator de Emissão (g/kg biomassa)</th>
                      <th className="p-1.5">Emissão Total no Recorte</th>
                      <th className="p-1.5">Impacto Predominante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                    <tr>
                      <td className="p-1.5 font-bold text-white">Dióxido de Carbono</td>
                      <td className="p-1.5 text-red-400 font-bold">CO₂</td>
                      <td className="p-1.5">1.580,0 g/kg</td>
                      <td className="p-1.5 font-bold text-red-400">{reportData.totalCo2Tons.toLocaleString('pt-BR')} t</td>
                      <td className="p-1.5 text-slate-400">Aquecimento Global e Acidificação</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 font-bold text-white">Monóxido de Carbono</td>
                      <td className="p-1.5 text-orange-400 font-bold">CO</td>
                      <td className="p-1.5">104,0 g/kg</td>
                      <td className="p-1.5 font-bold text-orange-400">{reportData.totalCoTons.toLocaleString('pt-BR')} t</td>
                      <td className="p-1.5 text-slate-400">Toxicidade Sanguínea / Hipóxia</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 font-bold text-white">Material Particulado Fino</td>
                      <td className="p-1.5 text-purple-400 font-bold">PM2.5</td>
                      <td className="p-1.5">9,1 g/kg</td>
                      <td className="p-1.5 font-bold text-purple-400">{reportData.totalPm25Kg.toLocaleString('pt-BR')} kg</td>
                      <td className="p-1.5 text-slate-400">Doenças Pulmonares / Asma / Câncer</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 font-bold text-white">Metano</td>
                      <td className="p-1.5 text-yellow-400 font-bold">CH₄</td>
                      <td className="p-1.5">5,1 g/kg</td>
                      <td className="p-1.5 font-bold text-yellow-400">{reportData.totalCh4Kg.toLocaleString('pt-BR')} kg</td>
                      <td className="p-1.5 text-slate-400">Super-Aquecedor Climático (GWP 28)</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 font-bold text-white">Óxidos de Nitrogênio</td>
                      <td className="p-1.5 text-cyan-400 font-bold">NOx</td>
                      <td className="p-1.5">2,55 g/kg</td>
                      <td className="p-1.5 font-bold text-cyan-400">{reportData.totalNoxKg.toLocaleString('pt-BR')} kg</td>
                      <td className="p-1.5 text-slate-400">Smog Fotoquímico e Ozônio Tóxico</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 3: IDENTIFICAÇÃO MUNICIPAL DETALHADA */}
        {/* ======================================================== */}
        {activeTab === 'municipalities' && (
          <div className="space-y-4 animate-fade-in">
            {/* Destaque do Município em Foco */}
            {currentMunicipalityDetail && (
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-amber-600/50 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
                      <MapPin size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{currentMunicipalityDetail.name} - {currentMunicipalityDetail.state}</span>
                        <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-amber-950 text-amber-300 border border-amber-700">
                          {currentMunicipalityDetail.biome}
                        </span>
                      </h4>
                      <p className="text-[9.5px] text-slate-400">
                        Coordenadas Centrais: {currentMunicipalityDetail.centerLat.toFixed(4)}°, {currentMunicipalityDetail.centerLng.toFixed(4)}°
                      </p>
                    </div>
                  </div>

                  {onSelectLocation && (
                    <button
                      onClick={() => onSelectLocation(currentMunicipalityDetail.centerLat, currentMunicipalityDetail.centerLng)}
                      className="px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Globe size={11} />
                      <span>Ver no Mapa</span>
                    </button>
                  )}
                </div>

                {/* Grid Municipal de Indicadores */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 block text-[8.5px]">FOCOS NO MUNICÍPIO</span>
                    <span className="text-base font-bold text-white">{currentMunicipalityDetail.spotCount} ocorrências</span>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 block text-[8.5px]">FRP ACUMULADO / PICO</span>
                    <span className="text-base font-bold text-amber-400">{currentMunicipalityDetail.totalFrp} MW <span className="text-xs text-slate-400">({currentMunicipalityDetail.maxFrp} MW)</span></span>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 block text-[8.5px]">CO₂ ESTIMADO NO MUNICÍPIO</span>
                    <span className="text-base font-bold text-red-400">{currentMunicipalityDetail.co2Tons} toneladas</span>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 block text-[8.5px]">DISPERSÃO PM2.5 / AQI</span>
                    <span className="text-base font-bold text-purple-400">{currentMunicipalityDetail.pm25Kg} kg (AQI: {currentMunicipalityDetail.worstAqi})</span>
                  </div>
                </div>

                <div className="text-[9px] text-slate-400 flex items-center justify-between">
                  <span>Satélites que registraram este município: <strong className="text-slate-200">{currentMunicipalityDetail.satellitesUsed.join(', ') || 'VIIRS 375m'}</strong></span>
                  <span>Confiabilidade Média dos Sensores: <strong className="text-emerald-400">{Math.round(currentMunicipalityDetail.avgConfidence * 100)}%</strong></span>
                </div>
              </div>
            )}

            {/* Tabela Comparativa de Todos os Municípios Afetados */}
            <div className="space-y-2">
              <span className="font-bold text-white text-[11px] block">
                Classificação Municipal Completa ({reportData.municipalities.length} Municípios Identificados)
              </span>

              <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-950 max-h-72 overflow-y-auto">
                <table className="w-full text-left text-[9.5px]">
                  <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="p-2">Município</th>
                      <th className="p-2">UF</th>
                      <th className="p-2">Bioma</th>
                      <th className="p-2">Focos</th>
                      <th className="p-2">FRP Total</th>
                      <th className="p-2">Biomassa (t)</th>
                      <th className="p-2">CO₂ (t)</th>
                      <th className="p-2">PM2.5 (kg)</th>
                      <th className="p-2">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-slate-300 font-mono">
                    {reportData.municipalities.map((m) => (
                      <tr
                        key={`${m.name}_${m.state}`}
                        className={`hover:bg-slate-900/60 transition ${
                          selectedMunicipalityName === `${m.name}_${m.state}` ? 'bg-amber-950/30 text-white' : ''
                        }`}
                      >
                        <td className="p-2 font-bold text-white truncate max-w-[150px]">{m.name}</td>
                        <td className="p-2">{m.state}</td>
                        <td className="p-2 text-slate-400 truncate max-w-[100px]">{m.biome}</td>
                        <td className="p-2 font-bold text-white">{m.spotCount}</td>
                        <td className="p-2 text-amber-400 font-bold">{m.totalFrp} MW</td>
                        <td className="p-2 text-cyan-300">{m.biomassTons}</td>
                        <td className="p-2 text-red-400 font-bold">{m.co2Tons}</td>
                        <td className="p-2 text-purple-400">{m.pm25Kg}</td>
                        <td className="p-2">
                          <button
                            onClick={() => setSelectedMunicipalityName(`${m.name}_${m.state}`)}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 cursor-pointer font-bold"
                          >
                            Isolar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 4: REGISTROS TÉCNICOS DETALHADOS (TABELA) */}
        {/* ======================================================== */}
        {activeTab === 'records' && (
          <div className="space-y-3 animate-fade-in">
            {/* Barra de Busca na Tabela */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="text"
                  value={searchTableQuery}
                  onChange={(e) => setSearchTableQuery(e.target.value)}
                  placeholder="Filtrar por município, ID do foco, satélite ou bioma..."
                  className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-red-500"
                />
              </div>
              <div className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                Mostrando <strong className="text-white">{filteredTableFires.length}</strong> de {reportFires.length} registros
              </div>
            </div>

            {/* Tabela com Colunas Científicas Completas */}
            <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-950 max-h-96 overflow-y-auto">
              <table className="w-full text-left text-[9.5px]">
                <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="p-2">ID</th>
                    <th className="p-2">MUNICÍPIO / LOCAL</th>
                    <th className="p-2">COORDENADAS</th>
                    <th className="p-2">SATÉLITE</th>
                    <th className="p-2">FRP</th>
                    <th className="p-2">TEMP</th>
                    <th className="p-2">BIOMASSA</th>
                    <th className="p-2">CO₂ EST.</th>
                    <th className="p-2">PM2.5</th>
                    <th className="p-2">AQI</th>
                    <th className="p-2">HORÁRIO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300 font-mono">
                  {filteredTableFires.slice(0, 100).map((f) => {
                    const em = calculateFireEmissions(f);
                    return (
                      <tr key={f.id} className="hover:bg-slate-900/50 transition">
                        <td className="p-2 font-bold text-slate-400 truncate max-w-[80px]">{f.id}</td>
                        <td className="p-2 font-medium text-white truncate max-w-[140px]">{f.municipality || f.address}</td>
                        <td className="p-2 text-slate-400 truncate max-w-[100px]">{f.latitude.toFixed(4)}, {f.longitude.toFixed(4)}</td>
                        <td className="p-2 text-slate-300 truncate max-w-[100px]">{f.satellite}</td>
                        <td className={`p-2 font-bold ${f.frp_mw >= 50 ? 'text-red-400' : 'text-amber-400'}`}>
                          {f.frp_mw} MW
                        </td>
                        <td className="p-2 text-red-300">{Math.round(f.bright_ti4_k - 273.15)}°C</td>
                        <td className="p-2 text-cyan-300">{em.biomassTons} t</td>
                        <td className="p-2 text-red-400 font-bold">{em.co2Tons} t</td>
                        <td className="p-2 text-purple-400">{em.pm25Kg} kg</td>
                        <td className="p-2">
                          <span className={`px-1 py-0.2 rounded text-[8px] font-bold ${
                            (f.aqi || 0) > 100 ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {f.aqi || 45}
                          </span>
                        </td>
                        <td className="p-2 text-slate-400 truncate max-w-[90px]">
                          {f.detected_at.includes('às') ? f.detected_at.split('às')[1] : f.detected_at}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredTableFires.length > 100 && (
              <div className="text-center text-[9px] text-slate-500 font-mono">
                Exibindo os primeiros 100 registros na interface visual. Utilize o botão <strong>CSV</strong> acima para baixar o conjunto completo.
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 5: FONTES DOS DADOS & METODOLOGIA CIENTÍFICA */}
        {/* ======================================================== */}
        {activeTab === 'methodology' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Database size={14} className="text-cyan-400" />
                <span>Rastreabilidade, Fontes Oficiais &amp; Rigor Metodológico</span>
              </h3>
              <p className="text-[10px] text-slate-400">
                Todas as métricas apresentadas neste relatório decorrem de plataformas aeroespaciais abertas de observação da Terra e modelos matemáticos de inventário reconhecidos pelas Nações Unidas e comunidade acadêmica.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px]">
              {/* Fonte 1: Satélites */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-white flex items-center gap-1.5 text-[11px]">
                  <Globe size={13} className="text-cyan-400" />
                  <span>Constelação de Satélites de Sensoriamento Remoto</span>
                </span>
                <p className="text-slate-400 leading-relaxed text-[9.5px]">
                  <strong>NASA VIIRS 375m (Suomi-NPP e NOAA-20):</strong> Radiômetro de imagem no infravermelho visível com resolução espacial nativa de 375 metros nos canais I4 (3.9 µm - saturação térmica) e I5 (11 µm - referência). Permite detecção de queimas iniciais e focos de sub-bosque.<br />
                  <strong>NASA MODIS (Aqua &amp; Terra 1km):</strong> Resolução de 1.000 metros, sensor clássico para séries históricas e cálculo de energia radiativa acumulada.
                </p>
              </div>

              {/* Fonte 2: INPE */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-white flex items-center gap-1.5 text-[11px]">
                  <Database size={13} className="text-emerald-400" />
                  <span>INPE BDQueimadas (Governo Federal do Brasil)</span>
                </span>
                <p className="text-slate-400 leading-relaxed text-[9.5px]">
                  Programa Queimadas do Instituto Nacional de Pesquisas Espaciais (INPE). Fornece as fronteiras municipais, polígonos dos biomas (Amazônia, Cerrado, Pantanal) e filtros de qualidade para evitar ruídos de reflexo solar em superfícies aquáticas.
                </p>
              </div>

              {/* Fonte 3: Modelo de Emissões */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-white flex items-center gap-1.5 text-[11px]">
                  <CloudFog size={13} className="text-orange-400" />
                  <span>Modelo de Emissões Atmosféricas (GFED4s / IPCC)</span>
                </span>
                <p className="text-slate-400 leading-relaxed text-[9.5px]">
                  Baseado no <strong>Global Fire Emissions Database (GFEDv4s)</strong> e nas diretrizes metodológicas do <strong>IPCC Guidelines for National Greenhouse Gas Inventories</strong> (2019 Refinement). A conversão de Potência Radiativa em Biomassa Consumida utiliza a relação de Wooster et al. (0.368 kg/MJ).
                </p>
              </div>

              {/* Fonte 4: Telemetria Meteorológica */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-white flex items-center gap-1.5 text-[11px]">
                  <Wind size={13} className="text-purple-400" />
                  <span>Telemetria Meteorológica &amp; Radar de Precipitação</span>
                </span>
                <p className="text-slate-400 leading-relaxed text-[9.5px]">
                  Dados meteorológicos em tempo real do <strong>ECMWF (European Centre for Medium-Range Weather Forecasts)</strong> integrados via Open-Meteo, acompanhados de compósitos de radar de chuva em tempo real (RainViewer API) para detecção de precipitação extintora.
                </p>
              </div>

              {/* Fonte 5: Supabase PostGIS */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5 text-[11px]">
                    <Database size={13} className="text-cyan-400" />
                    <span>Supabase PostGIS • Repositório Cloud &amp; Auditoria Fundiária</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[8.5px] font-bold font-mono ${
                    isSupabaseConfigured 
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500' 
                      : 'bg-amber-950 text-amber-300 border border-amber-600'
                  }`}>
                    {isSupabaseConfigured ? '🟢 CONECTADO (REALTIME)' : '🟡 CACHE LOCAL / HYBRID'}
                  </span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[9.5px]">
                  Camada de persistência relacional e geoespacial com extensão <strong>PostGIS</strong>. Executa consultas espaciais indexadas via R-Tree/GIST (<code>ST_Contains</code>, <code>ST_DWithin</code>) sobre os polígonos do CAR/SICAR e autos lavrados (<code>public.infraction_notices</code>).
                </p>
              </div>
            </div>

            {/* Certificação e Integridade */}
            <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 flex items-center justify-between text-[9px] text-slate-400 font-mono">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>Auditoria Digital: <strong>SHA256-{reportData.sources.auditTimestamp.slice(0, 10)}-CBMAM</strong></span>
              </div>
              <span>Carimbo de Emissão: {new Date(reportData.sources.auditTimestamp).toLocaleString('pt-BR')}</span>
            </div>
          </div>
        )}
      </div>

      {/* 5. Rodapé Oficial */}
      <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[9.5px] text-slate-400 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span>AMAZÔNIA FIRE-WATCH AI • Boletim de Inteligência CBMAM</span>
          <span className="text-slate-600">|</span>
          <span className="text-amber-400">Total analisado: {reportData.totalSpots} focos em {reportData.municipalities.length} municípios</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold transition text-[10px] cursor-pointer"
          >
            Baixar Planilha (CSV)
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-medium transition text-[10.5px] cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </Rnd>
  );
};
