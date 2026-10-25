import React from 'react';
import { TemporalMode } from '../types';
import { Clock, Calendar, BarChart2 } from 'lucide-react';

interface TimeFilterBarProps {
  temporalMode: TemporalMode;
  setTemporalMode: (mode: TemporalMode) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  totalSpotsCount: number;
}

export const TimeFilterBar: React.FC<TimeFilterBarProps> = ({
  temporalMode,
  setTemporalMode,
  selectedYear,
  setSelectedYear,
  totalSpotsCount,
}) => {
  return (
    <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 shadow-xl font-mono text-xs">
      {/* 24 Horas */}
      <button
        onClick={() => setTemporalMode('24h')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
          temporalMode === '24h'
            ? 'bg-red-600 text-white shadow-lg shadow-red-950'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
      >
        <Clock size={12} />
        <span>HOJE / 24H ({totalSpotsCount})</span>
      </button>

      {/* Mensal */}
      <button
        onClick={() => setTemporalMode('month')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
          temporalMode === 'month'
            ? 'bg-amber-600 text-white shadow-lg shadow-amber-950'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
      >
        <Calendar size={12} />
        <span>MÊS ATUAL (DENSIDADE)</span>
      </button>

      {/* Histórico Multi-Ano */}
      <button
        onClick={() => setTemporalMode('historical')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
          temporalMode === 'historical'
            ? 'bg-purple-600 text-white shadow-lg shadow-purple-950'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
      >
        <BarChart2 size={12} />
        <span>HISTÓRICO</span>
      </button>

      {/* Seletor de Ano quando em Histórico */}
      {temporalMode === 'historical' && (
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="bg-slate-950 border border-purple-500/50 text-purple-300 rounded px-2 py-0.5 text-[11px] font-bold outline-none cursor-pointer"
        >
          {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map((yr) => (
            <option key={yr} value={yr}>
              Ano {yr}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

export default TimeFilterBar;
