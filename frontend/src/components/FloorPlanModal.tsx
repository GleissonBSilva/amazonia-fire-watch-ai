import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import { Maximize2, Square } from 'lucide-react';
import {
  X,
  Flame,
  Wind,
  Thermometer,
  ShieldAlert,
  Compass,
  AlertTriangle,
  Radio,
  Layers,
  MapPin,
  CheckCircle2,
  Navigation,
  Eye,
  Sliders
} from 'lucide-react';
import {
  Facility,
  FloorPlanSector,
  SafetyEquipment,
  INDUSTRIAL_FACILITIES,
} from '../data/facilityFloorPlans';

interface FloorPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFacilityId?: string;
  onActivateGeofence: (facility: Facility) => void;
  onTriggerAutoEmergency: (facility: Facility) => void;
  onFlyToFacility: (lat: number, lng: number) => void;
  isSimulation?: boolean;
}

export const FloorPlanModal: React.FC<FloorPlanModalProps> = ({
  isOpen,
  onClose,
  selectedFacilityId,
  onActivateGeofence,
  onTriggerAutoEmergency,
  onFlyToFacility,
  isSimulation = true,
}) => {
  const [activeFacilityIndex, setActiveFacilityIndex] = useState<number>(() => {
    if (!selectedFacilityId) return 0;
    const idx = INDUSTRIAL_FACILITIES.findIndex((f) => f.id === selectedFacilityId);
    return idx >= 0 ? idx : 0;
  });

  const [activeTab, setActiveTab] = useState<'thermal' | 'equipment' | 'sectors'>('thermal');
  const [showThermalLayer, setShowThermalLayer] = useState<boolean>(true);
  const [showEquipmentLayer, setShowEquipmentLayer] = useState<boolean>(true);
  const [showPropagationVector, setShowPropagationVector] = useState<boolean>(true);
  const [selectedSector, setSelectedSector] = useState<FloorPlanSector | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<SafetyEquipment | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  if (!isOpen) return null;

  const currentFacility = INDUSTRIAL_FACILITIES[activeFacilityIndex] || INDUSTRIAL_FACILITIES[0];
  const incident = isSimulation ? currentFacility.activeIncident : null;

  const getEquipmentIcon = (type: SafetyEquipment['type']) => {
    switch (type) {
      case 'extinguisher_co2':
        return '🧯 CO₂';
      case 'extinguisher_pqs':
        return '🧯 PQS';
      case 'extinguisher_water':
        return '💧 AP';
      case 'hydrant':
        return '🚒 HID';
      case 'emergency_exit':
        return '🚪 SAÍDA';
      case 'fire_door':
        return '🛡️ P-90';
      default:
        return '⚠️';
    }
  };

  const getEquipmentBadgeColor = (type: SafetyEquipment['type']) => {
    switch (type) {
      case 'extinguisher_co2':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50';
      case 'extinguisher_pqs':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      case 'extinguisher_water':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      case 'hydrant':
        return 'bg-red-500/20 text-red-300 border-red-500/50';
      case 'emergency_exit':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
      case 'fire_door':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/50';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <Rnd
      default={{
        x: Math.max(20, (window.innerWidth - 980) / 2),
        y: Math.max(20, (window.innerHeight - 680) / 2),
        width: 980,
        height: 680,
      }}
      minWidth={440}
      minHeight={340}
      bounds="window"
      dragHandleClassName="floorplan-window-handle"
      enableResizing={!isMaximized}
      disableDragging={isMaximized}
      className={`fixed z-50 flex flex-col bg-slate-950 border border-cyan-500/50 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md font-sans select-none ${
        isMaximized ? '!inset-2 !w-auto !h-auto !transform-none' : ''
      }`}
    >
      <div className="relative w-full h-full flex flex-col overflow-hidden">
        {/* TOP STATUS HEADER (Draggable Handle) */}
        <div className="floorplan-window-handle flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 cursor-move select-none flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/60 flex items-center justify-center text-cyan-400">
              <Layers size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase">
                  PLANTA BAIXA ESTRUTURAL & TERMOGRAFIA
                </span>
                {isSimulation && incident ? (
                  <>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950 text-red-300 border border-red-600/60 animate-pulse">
                      ● DETECÇÃO TÉRMICA ATIVA (SIMULAÇÃO)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/70 text-amber-300 border border-amber-600/50">
                      CENÁRIO SIMULADO
                    </span>
                  </>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/60 flex items-center gap-1">
                    <CheckCircle2 size={11} /> OPERAÇÃO NOMINAL • ZERO FOCOS TÉRMICOS
                  </span>
                )}
              </div>
              <h2 className="text-sm md:text-base font-bold text-white tracking-wide">
                {currentFacility.name}
              </h2>
            </div>
          </div>

          {/* FACILITY SELECTOR BUTTONS */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
              {INDUSTRIAL_FACILITIES.map((facility, idx) => (
                <button
                  key={facility.id}
                  onClick={() => {
                    setActiveFacilityIndex(idx);
                    setSelectedSector(null);
                    setSelectedEquipment(null);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all ${
                    activeFacilityIndex === idx
                      ? 'bg-cyan-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {facility.shortName}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* SUBHEADER: METRICS BANNER */}
        {incident && (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 px-4 py-2 bg-gradient-to-r from-red-950/40 via-amber-950/20 to-slate-900/60 border-b border-red-900/30 text-xs">
            {/* 1. Epicentro */}
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
                <Flame size={11} className="text-red-400" /> Epicentro
              </span>
              <span className="font-bold text-red-300 truncate">{incident.sectorName}</span>
            </div>

            {/* 2. Temperatura */}
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
                <Thermometer size={11} className="text-orange-400" /> Temp. Pico / Delta
              </span>
              <span className="font-bold font-mono text-orange-300">
                {incident.peakTempC.toFixed(1)}°C <span className="text-[10px] text-red-400">(+{incident.deltaTempC.toFixed(1)}°C)</span>
              </span>
            </div>

            {/* 3. Fumaça e CO */}
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
                <Wind size={11} className="text-amber-400" /> Fumaça / CO
              </span>
              <span className="font-bold font-mono text-amber-300">
                {incident.smokeConcentrationPpm} ppm <span className="text-[10px] text-slate-400">({incident.smokePM25} µg/m³)</span>
              </span>
            </div>

            {/* 4. Propagação */}
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
                <Compass size={11} className="text-cyan-400" /> Velocidade / Direção
              </span>
              <span className="font-bold font-mono text-cyan-300">
                {incident.propagation.velocityMs} m/s ({incident.propagation.angleDeg}°)
              </span>
            </div>

            {/* 5. Ação Rápida Cerca Virtual */}
            <div className="flex items-center">
              <button
                onClick={() => {
                  onActivateGeofence(currentFacility);
                  onClose();
                }}
                className="w-full h-8 px-2 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 hover:text-white font-mono text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                title="Isolar processamento da IA neste galpão"
              >
                <span>🔒 Cerca Virtual</span>
              </button>
            </div>

            {/* 6. Ação Rápida Protocolo Emergência */}
            <div className="flex items-center">
              <button
                onClick={() => {
                  onTriggerAutoEmergency(currentFacility);
                }}
                className="w-full h-8 px-2 rounded bg-red-600 hover:bg-red-500 text-white font-mono text-[11px] font-bold flex items-center justify-center gap-1 shadow-lg shadow-red-950/50 transition-all animate-pulse"
                title="Acionar protocolo automatizado com contagem regressiva"
              >
                <ShieldAlert size={13} />
                <span>🚨 Emergência (30s)</span>
              </button>
            </div>
          </div>
        )}

        {!incident && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-900/60 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-mono text-[11px]">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span> SENSORES IOT & FLIR NOMINAIS
              </span>
              <span className="text-slate-600">|</span>
              <span>{currentFacility.sensorCount} Sensores Conectados</span>
              <span className="text-slate-600">|</span>
              <span>{currentFacility.cameraCount} Câmeras Térmicas em Varredura</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">Sem sinistros ativos na instalação</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onActivateGeofence(currentFacility);
                  onClose();
                }}
                className="h-7 px-3 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 hover:text-white font-mono text-[10.5px] font-bold flex items-center gap-1 transition-all"
                title="Isolar processamento da IA neste galpão"
              >
                <span>🔒 Cerca Virtual</span>
              </button>
            </div>
          </div>
        )}

        {/* MAIN BODY: SPLIT VIEW (FLOOR PLAN SVG + TACTICAL SIDEBAR) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 min-h-[440px] max-h-[68vh] overflow-hidden">
          
          {/* FLOOR PLAN INTERACTIVE CANVAS / SVG (COL-SPAN 3) */}
          <div className="lg:col-span-3 relative bg-slate-950 flex items-center justify-center p-3 border-b lg:border-b-0 lg:border-r border-slate-800 overflow-auto">
            
            {/* FLOATING CONTROLS OVER SVG */}
            <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-1.5 bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-lg p-1 text-[11px] font-mono shadow-xl">
              <button
                onClick={() => setShowThermalLayer(!showThermalLayer)}
                className={`px-2 py-1 rounded flex items-center gap-1 transition-all ${
                  showThermalLayer ? 'bg-red-950 text-red-300 border border-red-600/70 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Flame size={12} className={showThermalLayer ? 'text-red-400' : 'text-slate-500'} />
                <span>Sobreposição Térmica</span>
              </button>

              <button
                onClick={() => setShowEquipmentLayer(!showEquipmentLayer)}
                className={`px-2 py-1 rounded flex items-center gap-1 transition-all ${
                  showEquipmentLayer ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/70 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldAlert size={12} className={showEquipmentLayer ? 'text-cyan-400' : 'text-slate-500'} />
                <span>Extintores & Hidrantes</span>
              </button>

              <button
                onClick={() => setShowPropagationVector(!showPropagationVector)}
                className={`px-2 py-1 rounded flex items-center gap-1 transition-all ${
                  showPropagationVector ? 'bg-amber-950 text-amber-300 border border-amber-600/70 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Navigation size={12} className={showPropagationVector ? 'text-amber-400' : 'text-slate-500'} />
                <span>Vetor de Propagação</span>
              </button>
            </div>

            {/* COMPASS ROSE HUD */}
            <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] font-mono text-slate-400">
              <Compass size={14} className="text-cyan-400" />
              <span>NORTE VERDADEIRO (000°)</span>
            </div>

            {/* HIGH-PRECISION STRUCTURAL SVG FLOOR PLAN */}
            <div className="w-full h-full max-h-[580px] flex items-center justify-center">
              <svg
                viewBox="0 0 1000 960"
                className="w-full h-auto max-h-[560px] select-none rounded-lg bg-slate-900/60 border border-slate-800 shadow-2xl"
              >
                <defs>
                  {/* DYNAMIC RADIAL THERMAL GRADIENT (RED -> ORANGE -> YELLOW -> TRANSPARENT) */}
                  <radialGradient id="thermalRadialGrad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.95" />    {/* Epicentro Vermelho Vivo */}
                    <stop offset="25%" stopColor="#f97316" stopOpacity="0.80" />   {/* Frente de Calor Laranja */}
                    <stop offset="55%" stopColor="#eab308" stopOpacity="0.55" />   {/* Pluma Amarela Convectiva */}
                    <stop offset="80%" stopColor="#ca8a04" stopOpacity="0.25" />   {/* Dispersão Amarelada Suave */}
                    <stop offset="100%" stopColor="#eab308" stopOpacity="0.0" />
                  </radialGradient>

                  {/* SECONDARY SMOKE PLUME ELLIPSE GRADIENT */}
                  <radialGradient id="smokeDispersionGrad" cx="30%" cy="40%" r="70%">
                    <stop offset="0%" stopColor="#f97316" stopOpacity="0.65" />
                    <stop offset="50%" stopColor="#eab308" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#713f12" stopOpacity="0.0" />
                  </radialGradient>

                  {/* STRUCTURAL ARCHITECTURAL PATTERN */}
                  <pattern id="archGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(51, 65, 85, 0.25)" strokeWidth="0.8" />
                  </pattern>

                  {/* FLAME ARROW MARKER */}
                  <marker id="flameArrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#f97316" />
                  </marker>
                </defs>

                {/* ARCHITECTURAL BACKGROUND GRID */}
                <rect x="0" y="0" width="1000" height="960" fill="url(#archGrid)" />

                {/* BUILDING OUTER PERIMETER REINFORCED WALLS */}
                <rect
                  x="30"
                  y="40"
                  width="940"
                  height="880"
                  fill="#020617"
                  stroke="#38bdf8"
                  strokeWidth="3.5"
                  strokeDasharray="none"
                  rx="6"
                />

                {/* MAIN CORRIDOR PATHWAYS */}
                <rect x="30" y="470" width="940" height="40" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
                <text x="500" y="495" fill="#64748b" fontSize="12" fontFamily="monospace" textAnchor="middle" letterSpacing="2">
                  CORREDOR CENTRAL LOGÍSTICO / VIA PRINCIPAL DE EVACUAÇÃO (LARGURA 6.0M)
                </text>

                {/* SECTORS RENDERING */}
                {currentFacility.sectors.map((sector) => {
                  const isSelected = selectedSector?.id === sector.id;
                  const isHot = Boolean(isSimulation && incident && (incident.sectorId === sector.id || sector.isHotspot));
                  const isThreatened = Boolean(isSimulation && incident && sector.evacuationStatus === 'warning');
                  const isEpicenter = isHot;
                  const secTemp = isHot ? sector.currentTempC : sector.baselineTempC;
                  const secSmoke = isHot ? sector.smokePpm : 0;

                  let strokeColor = '#334155';
                  let fillColor = '#090d16';

                  if (isEpicenter) {
                    strokeColor = '#ef4444';
                    fillColor = 'rgba(239, 68, 68, 0.08)';
                  } else if (isThreatened) {
                    strokeColor = '#f59e0b';
                    fillColor = 'rgba(245, 158, 11, 0.06)';
                  } else if (isSelected) {
                    strokeColor = '#38bdf8';
                    fillColor = 'rgba(56, 189, 248, 0.08)';
                  }

                  return (
                    <g
                      key={sector.id}
                      onClick={() => {
                        setSelectedSector(sector);
                        setSelectedEquipment(null);
                      }}
                      className="cursor-pointer transition-all hover:opacity-90"
                    >
                      {/* Sector Room Box */}
                      <rect
                        x={sector.x}
                        y={sector.y}
                        width={sector.width}
                        height={sector.height}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={isEpicenter ? 2.5 : isSelected ? 2 : 1.2}
                        rx="4"
                      />

                      {/* Sector Identification Label */}
                      <rect
                        x={sector.x + 10}
                        y={sector.y + 10}
                        width={sector.width - 20}
                        height={26}
                        fill="#0f172a"
                        stroke="#1e293b"
                        strokeWidth="1"
                        rx="3"
                      />
                      <text
                        x={sector.x + 18}
                        y={sector.y + 28}
                        fill={isEpicenter ? '#fca5a5' : isThreatened ? '#fde047' : '#94a3b8'}
                        fontSize="11"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {sector.code} • {sector.name}
                      </text>

                      {/* Sector Environmental Telemetry in Room Corner */}
                      <g transform={`translate(${sector.x + 15}, ${sector.y + 55})`}>
                        <text fill="#64748b" fontSize="10" fontFamily="monospace">
                          Temp: <tspan fill={secTemp > 50 ? '#ef4444' : '#38bdf8'} fontWeight="bold">{secTemp.toFixed(1)}°C</tspan>
                        </text>
                        <text y="16" fill="#64748b" fontSize="10" fontFamily="monospace">
                          Fumaça: <tspan fill={secSmoke > 100 ? '#f59e0b' : '#94a3b8'}>{secSmoke} ppm</tspan>
                        </text>
                        <text y="32" fill="#64748b" fontSize="9" fontFamily="monospace">
                          Status: <tspan fill={isEpicenter ? '#ef4444' : isThreatened ? '#f59e0b' : '#10b981'}>
                            {sector.evacuationStatus === 'evacuate' ? 'EVACUAÇÃO TOTAL' : sector.evacuationStatus === 'warning' ? 'ALERTA DE CONTENÇÃO' : 'OPERACIONAL'}
                          </tspan>
                        </text>
                      </g>
                    </g>
                  );
                })}

                {/* DYNAMIC THERMAL OVERLAY (HEATMAP GRADIENT ON TOP OF FLOOR PLAN) */}
                {showThermalLayer && incident && (
                  <g className="pointer-events-none">
                    {/* Pulsing Outer Smoke & Convection Field (Yellow to Orange) */}
                    <circle
                      cx={incident.focalPoint.x + 60}
                      cy={incident.focalPoint.y}
                      r="240"
                      fill="url(#smokeDispersionGrad)"
                      className="animate-pulse"
                      style={{ transformOrigin: `${incident.focalPoint.x + 60}px ${incident.focalPoint.y}px`, animationDuration: '3.5s' }}
                    />

                    {/* Concentrated Thermal Gradient (Epicenter Red to Orange) */}
                    <circle
                      cx={incident.focalPoint.x}
                      cy={incident.focalPoint.y}
                      r="160"
                      fill="url(#thermalRadialGrad)"
                      className="animate-pulse"
                      style={{ transformOrigin: `${incident.focalPoint.x}px ${incident.focalPoint.y}px`, animationDuration: '2s' }}
                    />

                    {/* Core Radiance Shockwave Rings */}
                    <circle
                      cx={incident.focalPoint.x}
                      cy={incident.focalPoint.y}
                      r="40"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="3"
                      strokeDasharray="4 4"
                      className="animate-ping"
                      style={{ transformOrigin: `${incident.focalPoint.x}px ${incident.focalPoint.y}px`, animationDuration: '1.8s' }}
                    />

                    {/* White-Hot Core Pin */}
                    <circle
                      cx={incident.focalPoint.x}
                      cy={incident.focalPoint.y}
                      r="8"
                      fill="#ffffff"
                      stroke="#ef4444"
                      strokeWidth="3"
                    />

                    {/* Telemetry Annotation Flag */}
                    <g transform={`translate(${incident.focalPoint.x + 18}, ${incident.focalPoint.y - 45})`}>
                      <rect x="0" y="0" width="170" height="42" fill="#450a0a" stroke="#ef4444" strokeWidth="1.5" rx="4" opacity="0.95" />
                      <text x="8" y="16" fill="#fecaca" fontSize="11" fontFamily="monospace" fontWeight="bold">
                        FOCO CRÍTICO: {incident.peakTempC.toFixed(1)}°C
                      </text>
                      <text x="8" y="32" fill="#fde047" fontSize="9.5" fontFamily="monospace">
                        Fumaça: {incident.smokeConcentrationPpm} ppm (CO)
                      </text>
                    </g>
                  </g>
                )}

                {/* FLAME & SMOKE PROPAGATION VECTOR */}
                {showPropagationVector && incident && (
                  <g className="pointer-events-none">
                    {/* Animated Trajectory Vector Arrow */}
                    <line
                      x1={incident.focalPoint.x}
                      y1={incident.focalPoint.y}
                      x2={incident.focalPoint.x + Math.sin((incident.propagation.angleDeg * Math.PI) / 180) * 220}
                      y2={incident.focalPoint.y - Math.cos((incident.propagation.angleDeg * Math.PI) / 180) * 220}
                      stroke="#f97316"
                      strokeWidth="3.5"
                      strokeDasharray="6 4"
                      markerEnd="url(#flameArrow)"
                    />

                    {/* Vector Annotation Badge */}
                    <g
                      transform={`translate(${
                        incident.focalPoint.x + Math.sin((incident.propagation.angleDeg * Math.PI) / 180) * 120
                      }, ${
                        incident.focalPoint.y - Math.cos((incident.propagation.angleDeg * Math.PI) / 180) * 120
                      })`}
                    >
                      <rect x="-10" y="-22" width="190" height="26" fill="#1e1b4b" stroke="#f97316" strokeWidth="1.2" rx="3" opacity="0.95" />
                      <text x="0" y="-5" fill="#fdba74" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        VETOR: {incident.propagation.velocityMs} m/s ({incident.propagation.angleDeg}°)
                      </text>
                    </g>
                  </g>
                )}

                {/* SAFETY EQUIPMENT & EXTINGUISHERS LAYER */}
                {showEquipmentLayer &&
                  currentFacility.equipment.map((eq) => {
                    const isSelected = selectedEquipment?.id === eq.id;
                    const isNearFire =
                      incident &&
                      Math.hypot(eq.x - incident.focalPoint.x, eq.y - incident.focalPoint.y) < 180;

                    let pinFill = '#0284c7';
                    if (eq.type.startsWith('extinguisher_pqs')) pinFill = '#d97706';
                    if (eq.type === 'extinguisher_co2') pinFill = '#06b6d4';
                    if (eq.type === 'hydrant') pinFill = '#dc2626';
                    if (eq.type === 'emergency_exit') pinFill = '#059669';
                    if (eq.type === 'fire_door') pinFill = '#7c3aed';

                    return (
                      <g
                        key={eq.id}
                        transform={`translate(${eq.x}, ${eq.y})`}
                        onClick={() => {
                          setSelectedEquipment(eq);
                          setSelectedSector(null);
                        }}
                        className="cursor-pointer"
                      >
                        {/* Equipment Touch Target Area */}
                        <circle r="16" fill="transparent" />

                        {/* Pulse Ring for Hydrant or Primary Extinguisher */}
                        {isNearFire && (
                          <circle r="18" fill="none" stroke="#22d3ee" strokeWidth="2" strokeDasharray="3 3" className="animate-spin" />
                        )}

                        {/* Icon Circle */}
                        <circle
                          r={isSelected ? '12' : '9.5'}
                          fill={pinFill}
                          stroke="#ffffff"
                          strokeWidth={isSelected ? '2.5' : '1.5'}
                          className="transition-all hover:scale-125"
                        />

                        {/* Text Label on hover / selected */}
                        {isSelected && (
                          <g transform="translate(14, -14)">
                            <rect x="0" y="0" width="130" height="24" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" rx="3" />
                            <text x="6" y="16" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">
                              {eq.label}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
              </svg>
            </div>
          </div>

          {/* TACTICAL SIDEBAR: SECTOR TELEMETRY & EQUIPMENT DETAILS (COL-SPAN 1) */}
          <div className="lg:col-span-1 bg-slate-900/95 flex flex-col p-3 overflow-y-auto border-t lg:border-t-0 border-slate-800 space-y-3 text-xs">
            
            {/* INSPECTOR CARD: SECTOR / EQUIPMENT DETAILS */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1 font-bold">
                <Sliders size={12} /> Painel de Diagnóstico Setorial
              </span>

              {selectedEquipment ? (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{selectedEquipment.label}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getEquipmentBadgeColor(selectedEquipment.type)}`}>
                      {selectedEquipment.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] font-mono">
                    {selectedEquipment.specification}
                  </p>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Posicionamento no Galpão: X={selectedEquipment.x} | Y={selectedEquipment.y}
                  </div>
                </div>
              ) : selectedSector ? (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{selectedSector.name}</span>
                    <span className="text-[10px] font-mono text-cyan-300">{selectedSector.code}</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    {selectedSector.description}
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 block">TEMP. ATUAL</span>
                      <span className={`font-bold ${(isSimulation && incident && selectedSector.currentTempC > 50) ? 'text-red-400' : 'text-slate-200'}`}>
                        {(isSimulation && incident ? selectedSector.currentTempC : selectedSector.baselineTempC).toFixed(1)}°C
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">FUMAÇA</span>
                      <span className="text-amber-300 font-bold">{(isSimulation && incident ? selectedSector.smokePpm : 0)} ppm</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-slate-400 text-[11px]">
                  Clique em qualquer setor ou extintor na planta para inspecionar parâmetros em tempo real.
                </div>
              )}
            </div>

            {/* PROPAGATION & FIRE DYNAMICS SUMMARY */}
            {!incident && (
              <div className="bg-slate-950 border border-emerald-900/40 rounded-lg p-3 space-y-1.5 font-mono text-[11px]">
                <span className="text-[10px] text-emerald-400 uppercase tracking-wider flex items-center gap-1 font-bold">
                  <CheckCircle2 size={12} /> Monitoramento Nominal Ativo
                </span>
                <p className="text-slate-400 text-[10px] leading-relaxed">
                  Todos os setores operam dentro dos parâmetros normativos. Nenhuma anomalia térmica detectada por sensores FLIR ou IOT.
                </p>
                <div className="text-[9.5px] text-slate-500 pt-1 border-t border-slate-900">
                  ℹ️ Simulações de estresse térmico, evacuação e despacho automático só ficam visíveis quando o modo [SIMULAÇÃO] estiver ativo.
                </div>
              </div>
            )}
            {incident && (
              <div className="bg-slate-950 border border-red-900/40 rounded-lg p-3 space-y-2">
                <span className="text-[10px] font-mono text-red-400 uppercase tracking-wider flex items-center gap-1 font-bold">
                  <Flame size={12} /> Dinâmica de Propagação do Fogo
                </span>
                
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Velocidade de Avanço:</span>
                    <span className="text-orange-300 font-bold">{incident.propagation.velocityMs} m/s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Rumo Predominante:</span>
                    <span className="text-cyan-300 font-bold">{incident.propagation.directionText}</span>
                  </div>
                  <div className="flex flex-col pt-1 border-t border-slate-800 text-[10px]">
                    <span className="text-slate-500">Caminho de Risco:</span>
                    <span className="text-amber-300">{incident.propagation.riskPathway}</span>
                  </div>
                  <div className="flex flex-col pt-1 border-t border-slate-800 text-[10px]">
                    <span className="text-slate-500">Agente Extintor Recomendado:</span>
                    <span className="text-emerald-400">{incident.recommendedExtinguisher}</span>
                  </div>
                </div>
              </div>
            )}

            {/* LIST OF AVAILABLE FIRE EXTINGUISHERS */}
            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2 overflow-y-auto">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1 font-bold">
                <ShieldAlert size={12} /> Equipamentos de Combate Prontos
              </span>

              <div className="space-y-1.5">
                {currentFacility.equipment.map((eq) => (
                  <div
                    key={eq.id}
                    onClick={() => {
                      setSelectedEquipment(eq);
                      setSelectedSector(null);
                    }}
                    className={`p-1.5 rounded cursor-pointer border text-[11px] font-mono flex items-center justify-between transition-all ${
                      selectedEquipment?.id === eq.id
                        ? 'bg-cyan-950/80 border-cyan-500 text-white'
                        : 'bg-slate-900 border-slate-800/80 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span>{getEquipmentIcon(eq.type)} {eq.label}</span>
                    <span className="text-[9px] text-emerald-400 font-bold">OK</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ACTION BUTTONS FOOTER */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  onActivateGeofence(currentFacility);
                  onClose();
                }}
                className="w-full py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <span>🔒 Ativar Cerca Virtual no Galpão</span>
              </button>

              <button
                onClick={() => {
                  onFlyToFacility(currentFacility.coordinates.lat, currentFacility.coordinates.lng);
                  onClose();
                }}
                className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-xs flex items-center justify-center gap-2 transition-all"
              >
                <MapPin size={13} />
                <span>Enquadrar no Mapa Global</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </Rnd>
  );
};
