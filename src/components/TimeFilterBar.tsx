import React, { useState } from 'react';
import { TemporalMode } from '../types';
import { Clock, Calendar, BarChart2, Filter, ChevronDown, Flame, Sparkles } from 'lucide-react';
import { MONTH_NAMES, MONTH_SHORT_NAMES, TEMPORAL_PRESETS, TemporalStats } from '../services/temporalFilterService';

interface TimeFilterBarProps {
  temporalMode: TemporalMode;
  setTemporalMode: (mode: TemporalMode) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  startMonth: number;
  setStartMonth: (month: number) => void;
  endMonth: number;
  setEndMonth: (month: number) => void;
  stats?: TemporalStats;
  totalSpotsCount: number;
}

export const TimeFilterBar: React.FC<TimeFilterBarProps> = ({
  temporalMode,
  setTemporalMode,
  selectedYear,
  setSelectedYear,
  startMonth,
  setStartMonth,
  endMonth,
  setEndMonth,
  stats,
  totalSpotsCount,
}) => {
  const [isCustomExpanded, setIsCustomExpanded] = useState<boolean>(false);

  const currentYear = new Date().getFullYear();

  return (
    <div className="flex flex-col gap-1.5 font-mono text-xs select-none">
      {/* Barra Principal de Modos Temporais */}
      <div className="flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-800 shadow-2xl">
        {/* 1. HOJE (24H - Tempo Real) */}
        <button
          onClick={() => setTemporalMode('24h')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
            temporalMode === '24h'
              ? 'bg-red-600 text-white shadow-lg shadow-red-950 border border-red-500'
              : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
          }`}
          title="Mostra tudo que está ativo em tempo real nas últimas 24 horas"
        >
          <Clock size={12} className={temporalMode === '24h' ? 'animate-spin' : ''} />
          <span>HOJE / 24H</span>
          <span className="ml-0.5 px-1.5 py-0.2 bg-black/40 rounded text-[9.5px]">
            {temporalMode === '24h' ? totalSpotsCount : '24h'}
          </span>
        </button>

        {/* 2. MÊS (Dia de hoje + Acumulado do Mês) */}
        <button
          onClick={() => setTemporalMode('month')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
            temporalMode === 'month'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-950 border border-amber-500'
              : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
          }`}
          title="Mostra o dia de hoje e tudo referente ao mês atual acumulado"
        >
          <Calendar size={12} />
          <span>MÊS ATUAL</span>
          <span className="ml-0.5 px-1.5 py-0.2 bg-black/40 rounded text-[9.5px]">
            {temporalMode === 'month' ? totalSpotsCount : 'Mês'}
          </span>
        </button>

        {/* 3. ANO (Dia de hoje + Tudo desde 1º de Janeiro do ano corrente) */}
        <button
          onClick={() => setTemporalMode('year')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
            temporalMode === 'year'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950 border border-emerald-500'
              : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
          }`}
          title="Mostra o dia de hoje e tudo detectado desde o início do ano vigente"
        >
          <Sparkles size={12} />
          <span>ANO {currentYear}</span>
          <span className="ml-0.5 px-1.5 py-0.2 bg-black/40 rounded text-[9.5px]">
            {temporalMode === 'year' ? totalSpotsCount : `${currentYear}`}
          </span>
        </button>

        {/* 4. INTERVALO / HISTÓRICO MULTI-ANO */}
        <button
          onClick={() => {
            setTemporalMode('historical');
            setIsCustomExpanded(prev => !prev);
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
            temporalMode === 'historical'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950 border border-cyan-500'
              : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
          }`}
          title="Filtrar espaços entre os meses do ano ou anos anteriores"
        >
          <BarChart2 size={12} />
          <span>INTERVALO / HISTÓRICO</span>
          <ChevronDown
            size={12}
            className={`transition-transform duration-200 ${
              temporalMode === 'historical' && isCustomExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Painel Expansível de Intervalo de Meses e Anos Anteriores */}
      {(temporalMode === 'historical' || isCustomExpanded) && (
        <div className="bg-slate-950/95 backdrop-blur-md border border-cyan-500/40 rounded-lg p-2.5 shadow-2xl flex flex-col gap-2 max-w-lg animate-fade-in">
          <div className="flex items-center justify-between border-b border-cyan-900/50 pb-1.5">
            <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
              <Filter size={12} className="text-cyan-400" />
              FILTRO TEMPORAL AVANÇADO (ANOS E INTERVALO DE MESES)
            </span>
            {stats && (
              <span className="text-[10px] text-slate-400 font-mono">
                {stats.totalSpots} focos carregados
              </span>
            )}
          </div>

          {/* Seleção de Ano & Meses */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor de Ano */}
            <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-700">
              <span className="text-[10px] text-slate-400">Ano:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-cyan-300 font-bold text-xs outline-none cursor-pointer"
              >
                {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map((yr) => (
                  <option key={yr} value={yr} className="bg-slate-900 text-white">
                    {yr} {yr === currentYear ? '(Vigente)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Mês Inicial */}
            <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-700">
              <span className="text-[10px] text-slate-400">De:</span>
              <select
                value={startMonth}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setStartMonth(val);
                  if (val > endMonth) setEndMonth(val);
                }}
                className="bg-transparent text-amber-300 font-bold text-xs outline-none cursor-pointer"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1} className="bg-slate-900 text-white">
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Mês Final */}
            <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-700">
              <span className="text-[10px] text-slate-400">Até:</span>
              <select
                value={endMonth}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setEndMonth(val);
                  if (val < startMonth) setStartMonth(val);
                }}
                className="bg-transparent text-amber-300 font-bold text-xs outline-none cursor-pointer"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1} className="bg-slate-900 text-white">
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Presets Rápidos */}
          <div className="flex flex-wrap items-center gap-1 pt-1">
            <span className="text-[9.5px] text-slate-400 mr-1">Atalhos:</span>
            {TEMPORAL_PRESETS.map((p, idx) => {
              const isSelected = startMonth === p.startMonth && endMonth === p.endMonth;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setStartMonth(p.startMonth);
                    setEndMonth(p.endMonth);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-900/80 text-cyan-200 border border-cyan-500 font-bold'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Banner de Status do Filtro */}
          {stats && (
            <div className="flex items-center justify-between bg-cyan-950/40 border border-cyan-800/40 rounded px-2 py-1 text-[10px] text-cyan-200 mt-0.5">
              <span className="font-semibold">{stats.periodLabel}</span>
              <div className="flex items-center gap-2">
                <span>FRP Médio: <strong>{stats.avgFrp} MW</strong></span>
                <span>Focos Críticos: <strong>{stats.criticalSpotsCount}</strong></span>
                <span>Bioma: <strong>{stats.primaryBiome}</strong></span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TimeFilterBar;
