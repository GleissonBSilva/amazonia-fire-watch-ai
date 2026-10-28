import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  Shield,
  Satellite,
  Radio,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  User,
  Building2,
  Eye,
  EyeOff,
  ArrowRight,
  Globe2,
  Activity,
  Layers,
  Crosshair,
  Compass,
  Cpu,
  Share2,
  Terminal,
  Zap,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Sliders,
  Bell,
  Scale,
  MapPin,
  Map as MapIcon
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

interface LandingPageProps {
  onEnterDashboard: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterDashboard }) => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [activeTab, setActiveTab] = useState<'satellite' | 'car' | 'infraction'>('satellite');
  
  // Interactive Simulator State
  const [simFrp, setSimFrp] = useState(64); // MW
  const [simBiome, setSimBiome] = useState<'amazonia' | 'cerrado' | 'pantanal'>('amazonia');

  // Live telemetry counter simulation
  const [telemetryCount, setTelemetryCount] = useState(2007);
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetryCount(prev => prev + (Math.random() > 0.6 ? 1 : 0));
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // Scientific calculation engine (IPCC Tier-2 / GFED4s)
  const emissions = useMemo(() => {
    const biomassFactor = simBiome === 'amazonia' ? 1.325 : simBiome === 'cerrado' ? 0.98 : 0.85;
    const biomassTons = simFrp * biomassFactor;
    const co2Tons = biomassTons * 1.58;
    const coTons = biomassTons * 0.104;
    const pm25Kg = biomassTons * 9.1;
    const ch4Kg = biomassTons * 5.1;
    const aqi = Math.min(500, Math.round(50 + simFrp * 3.4));
    const estimatedHectares = Math.max(1, Number((simFrp * 0.45).toFixed(1)));
    const estimatedFine = (estimatedHectares * 5000).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return {
      biomassTons: biomassTons.toFixed(1),
      co2Tons: co2Tons.toFixed(1),
      coTons: coTons.toFixed(2),
      pm25Kg: pm25Kg.toFixed(1),
      ch4Kg: ch4Kg.toFixed(1),
      aqi,
      estimatedHectares,
      estimatedFine
    };
  }, [simFrp, simBiome]);

  const openAuth = (mode: 'login' | 'register' = 'login', plan?: string) => {
    setAuthMode(mode);
    if (plan) setSelectedPlan(plan);
    setAuthModalOpen(true);
  };

  return (
    <div className="w-full h-[100dvh] overflow-y-auto overflow-x-hidden bg-[#07090e] text-zinc-100 font-sans selection:bg-orange-500 selection:text-white relative">
      {/* Background Gradients & Tactical Grid */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(#1f293d_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-orange-600/10 via-amber-600/5 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-0 w-[600px] h-[400px] bg-red-600/5 blur-[120px] pointer-events-none" />
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/75 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={onEnterDashboard}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-orange-600 to-red-600 shadow-md shadow-orange-950/60 border border-orange-400/40">
              <Flame className="w-5 h-5 text-white animate-pulse" />
              <div className="absolute -bottom-1 -right-1 bg-zinc-950 border border-zinc-700 p-0.5 rounded-full">
                <Shield className="w-2.5 h-2.5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-wider text-sm sm:text-base text-white">AMAZÔNIA FIRE-WATCH</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-orange-950/90 border border-orange-500/40 text-orange-400 font-bold">
                  AI C2
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono hidden sm:block">ORBITAL DEFENSE & CAR INTELLIGENCE</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-zinc-300">
            <a href="#tecnologia" className="hover:text-orange-400 transition flex items-center gap-1.5">
              <Satellite className="w-3.5 h-3.5 text-amber-400" /> Constelação
            </a>
            <a href="#simulador" className="hover:text-orange-400 transition flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-orange-400" /> Simulador Tático
            </a>
            <a href="#conformidade" className="hover:text-orange-400 transition flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-emerald-400" /> Lei 9.605/98
            </a>
            <a href="#planos" className="hover:text-orange-400 transition flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-yellow-400" /> Planos SaaS
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => openAuth('login')}
              className="text-xs font-semibold px-3 py-2 text-zinc-300 hover:text-white transition"
            >
              Entrar
            </button>
            <button
              onClick={onEnterDashboard}
              className="group relative px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white font-semibold text-xs tracking-wider uppercase shadow-lg shadow-orange-950/40 border border-orange-400/30 transition flex items-center gap-1.5 active:scale-95"
            >
              <MapIcon className="w-3.5 h-3.5 text-amber-200" />
              <span>Acessar Painel Tático C2</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-12 pb-20 sm:pt-20 sm:pb-28 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-orange-500/30 text-[11px] font-mono text-zinc-300 mb-6 shadow-inner backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
            </span>
            <span className="text-orange-400 font-bold">ALERTA EM TEMPO QUASE-REAL</span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400">ANEL GEOESTACIONÁRIO NOAA GOES-16 & METEOSAT ATIVO</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-tight">
            Monitoramento Orbital e <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-red-500 bg-clip-text text-transparent">
              Perícia de Crimes Ambientais
            </span>
          </h1>

          <p className="mt-6 text-sm sm:text-lg text-zinc-300 max-w-2xl font-normal leading-relaxed">
            Plataforma SaaS multiusuário de comando e controle aeroespacial. Identifique focos em <strong className="text-white">10 minutos</strong>, intercepte a malha do <strong className="text-amber-400">CAR/SICAR</strong> e gere Autos de Infração Preliminares automáticos com fé pública da Lei nº 9.605/1998.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <button
              onClick={onEnterDashboard}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white font-bold text-sm tracking-wider uppercase shadow-xl shadow-orange-950/60 border border-orange-400/40 transition flex items-center justify-center gap-2 group active:scale-95"
            >
              <Crosshair className="w-4 h-4 text-amber-200 group-hover:rotate-45 transition duration-300" />
              <span>Acessar Painel Tático C2</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </button>
            <a
              href="#simulador"
              className="w-full sm:w-auto px-7 py-4 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/90 text-zinc-200 hover:text-white font-semibold text-sm border border-zinc-700/80 backdrop-blur-md transition flex items-center justify-center gap-2"
            >
              <Activity className="w-4 h-4 text-orange-400" />
              <span>Simular Foco e Despacho</span>
            </a>
          </div>

          {/* Live Telemetry Ticker Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-14 w-full text-left font-mono">
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-sm relative overflow-hidden group hover:border-orange-500/40 transition">
              <div className="text-[10px] text-zinc-400 uppercase tracking-widest flex items-center justify-between">
                <span>Focos Ativos</span>
                <Flame className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white mt-1 flex items-baseline gap-1">
                <span>{telemetryCount}</span>
                <span className="text-[11px] text-emerald-400 font-sans font-normal">● Tempo Real</span>
              </div>
              <div className="text-[10px] text-zinc-400 mt-1">NASA VIIRS 375m + INPE</div>
              <div className="absolute top-0 right-0 w-12 h-12 bg-orange-500/5 rounded-full blur-xl group-hover:bg-orange-500/10 transition" />
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-sm relative overflow-hidden group hover:border-amber-500/40 transition">
              <div className="text-[10px] text-zinc-400 uppercase tracking-widest flex items-center justify-between">
                <span>Latência Média</span>
                <Clock className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white mt-1 flex items-baseline gap-1">
                <span>~10-15</span>
                <span className="text-xs text-amber-400">min</span>
              </div>
              <div className="text-[10px] text-zinc-400 mt-1">Anel Geoestacionário GOES</div>
              <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition" />
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-sm relative overflow-hidden group hover:border-emerald-500/40 transition">
              <div className="text-[10px] text-zinc-400 uppercase tracking-widest flex items-center justify-between">
                <span>Conformidade</span>
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white mt-1">
                IPCC Tier-2
              </div>
              <div className="text-[10px] text-zinc-400 mt-1">Modelo GFED4s & Andreae</div>
              <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition" />
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-sm relative overflow-hidden group hover:border-cyan-500/40 transition">
              <div className="text-[10px] text-zinc-400 uppercase tracking-widest flex items-center justify-between">
                <span>Cobertura</span>
                <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white mt-1">
                360° Global
              </div>
              <div className="text-[10px] text-zinc-400 mt-1">6 Continentes Operacionais</div>
              <div className="absolute top-0 right-0 w-12 h-12 bg-cyan-500/5 rounded-full blur-xl group-hover:bg-cyan-500/10 transition" />
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Simulator Section */}
      <section id="simulador" className="relative z-10 py-16 border-t border-zinc-800/80 bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-mono text-orange-400 tracking-widest uppercase bg-orange-950/60 px-3 py-1 rounded-full border border-orange-500/30">
              Ambiente de Demonstração C2
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-3">
              Simulador Tático de Queimada e Perícia Forense
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2">
              Ajuste a intensidade radiométrica (FRP) captada pelo satélite e veja a estimativa físico-química de gases e a geração instantânea do auto de infração fundiário.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Control Sidebar (4 cols) */}
            <div className="lg:col-span-4 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                <span className="text-xs font-mono uppercase text-zinc-300 font-bold flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-orange-400" /> Calibração Radiométrica
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
                  SENSOR ATIVO
                </span>
              </div>

              {/* Slider FRP */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-400">Potência Térmica (FRP):</span>
                  <span className="text-orange-400 font-bold text-sm">{simFrp} MW</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="220"
                  value={simFrp}
                  onChange={(e) => setSimFrp(Number(e.target.value))}
                  className="w-full accent-orange-500 bg-zinc-800 rounded-lg cursor-pointer h-2"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>5 MW (Inicial)</span>
                  <span>100 MW</span>
                  <span>220 MW (Crítico)</span>
                </div>
              </div>

              {/* Bioma */}
              <div className="space-y-2 mb-6">
                <label className="text-xs font-mono uppercase text-zinc-400 block">Bioma de Ocorrência:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'amazonia', label: 'Amazônia' },
                    { id: 'cerrado', label: 'Cerrado' },
                    { id: 'pantanal', label: 'Pantanal' }
                  ].map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSimBiome(b.id as any)}
                      className={`text-xs py-2 px-1 rounded-xl font-medium border transition ${
                        simBiome === b.id
                          ? 'bg-orange-600/20 border-orange-500 text-orange-300'
                          : 'bg-zinc-800/40 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase text-zinc-400 block">Cenários Reais Catalogados:</span>
                <div className="space-y-1.5">
                  <button
                    onClick={() => { setSimFrp(162); setSimBiome('amazonia'); }}
                    className="w-full text-left p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 text-xs flex items-center justify-between transition"
                  >
                    <div>
                      <span className="text-zinc-200 font-semibold block">Pará • Novo Progresso</span>
                      <span className="text-[10px] text-zinc-500">162.5 MW • Desmatamento Recente</span>
                    </div>
                    <span className="text-[10px] font-mono text-red-400 bg-red-950/50 px-1.5 py-0.5 rounded border border-red-800/40">Severo</span>
                  </button>

                  <button
                    onClick={() => { setSimFrp(88); setSimBiome('amazonia'); }}
                    className="w-full text-left p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 text-xs flex items-center justify-between transition"
                  >
                    <div>
                      <span className="text-zinc-200 font-semibold block">Amazonas • Lábrea</span>
                      <span className="text-[10px] text-zinc-500">88.0 MW • GOES-16 (~12 min)</span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-800/40">Alerta Quente</span>
                  </button>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800">
                <button
                  onClick={() => openAuth('register')}
                  className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs tracking-wider uppercase transition flex items-center justify-center gap-2"
                >
                  <Bell className="w-3.5 h-3.5" /> Disparar Alerta WhatsApp
                </button>
              </div>
            </div>

            {/* Tactical Screen Simulation (8 cols) */}
            <div className="lg:col-span-8 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
              {/* Screen Top Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4 mb-5">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-white font-bold">PROTOCOLO C2: AFW-2026-X892</span>
                  <span className="text-zinc-500">|</span>
                  <span className="text-zinc-400">ORBITAL INTERSECT: SICAR/CAR OK</span>
                </div>

                {/* Sub-tabs */}
                <div className="flex items-center gap-1 bg-zinc-950/80 p-1 rounded-xl border border-zinc-800 text-xs">
                  <button
                    onClick={() => setActiveTab('satellite')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition ${
                      activeTab === 'satellite' ? 'bg-orange-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Telemetria
                  </button>
                  <button
                    onClick={() => setActiveTab('car')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition ${
                      activeTab === 'car' ? 'bg-orange-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Alvo CAR / SICAR
                  </button>
                  <button
                    onClick={() => setActiveTab('infraction')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition ${
                      activeTab === 'infraction' ? 'bg-orange-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Auto de Infração (PDF)
                  </button>
                </div>
              </div>

              {/* Tab 1: Satellite & Emissions */}
              {activeTab === 'satellite' && (
                <div className="space-y-6">
                  {/* Atmospheric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                    <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800">
                      <div className="text-[10px] text-zinc-400">BIOMASSA QUEIMADA</div>
                      <div className="text-lg font-bold text-white mt-0.5">{emissions.biomassTons} <span className="text-xs text-orange-400">toneladas</span></div>
                      <div className="text-[10px] text-zinc-500 mt-1">Consumo de Copa e Solo</div>
                    </div>

                    <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800">
                      <div className="text-[10px] text-zinc-400">EMISSÃO CO₂</div>
                      <div className="text-lg font-bold text-white mt-0.5">{emissions.co2Tons} <span className="text-xs text-emerald-400">toneladas</span></div>
                      <div className="text-[10px] text-zinc-500 mt-1">Fator 1.580 g/kg</div>
                    </div>

                    <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800">
                      <div className="text-[10px] text-zinc-400">PARTÍCULAS PM2.5</div>
                      <div className="text-lg font-bold text-white mt-0.5">{emissions.pm25Kg} <span className="text-xs text-purple-400">kg</span></div>
                      <div className="text-[10px] text-zinc-500 mt-1">Nuvem de Fumaça Tóxica</div>
                    </div>

                    <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800">
                      <div className="text-[10px] text-zinc-400">ÍNDICE DO AR (AQI)</div>
                      <div className={`text-lg font-bold mt-0.5 ${emissions.aqi > 300 ? 'text-red-400' : emissions.aqi > 150 ? 'text-orange-400' : 'text-amber-400'}`}>
                        {emissions.aqi} <span className="text-[10px] uppercase font-sans">({emissions.aqi > 300 ? 'Tóxico' : 'Alerta'})</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-1">Padrão CONAMA 491</div>
                    </div>
                  </div>

                  {/* Satellite Visual Radar Representation */}
                  <div className="p-4 bg-zinc-950/90 rounded-xl border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-orange-950/70 border border-orange-500/40 flex items-center justify-center shrink-0">
                        <Satellite className="w-6 h-6 text-orange-400 animate-pulse" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>SENSOR SUOMI-NPP (VIIRS 375m) + NOAA GOES-16 ABI</span>
                          <span className="text-[9px] bg-blue-950/90 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded font-mono">BANDA 7 3.9µm</span>
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                          Coord: -4.8337°, -60.3387° • Temp. Brilho: 368.5 K (95.3°C) • Órbita Polar Confirmada
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab('infraction')}
                      className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 hover:text-white border border-zinc-700 transition shrink-0"
                    >
                      Ver Auto Preliminar
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: CAR / Land Registry Intersect */}
              {activeTab === 'car' && (
                <div className="space-y-4 text-xs font-mono">
                  <div className="p-4 bg-zinc-950/80 rounded-xl border border-amber-500/30">
                    <div className="flex items-center justify-between text-amber-400 font-bold mb-3">
                      <span className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> IMÓVEL RURAL IDENTIFICADO VIA POSTGIS
                      </span>
                      <span className="bg-amber-950/90 border border-amber-600/40 px-2 py-0.5 rounded text-[10px] text-amber-300">
                        CADASTRO ATIVO
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-zinc-300">
                      <div>
                        <span className="text-zinc-500 block text-[10px]">RECIBO DO CAR (SICAR):</span>
                        <span className="text-white font-bold select-all">AM-1300201-B78F90875AC14207908B1F548842EA35</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[10px]">DENOMINAÇÃO DO IMÓVEL:</span>
                        <span className="text-white font-bold">FAZENDA VALE DO PURUS II</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[10px]">TITULAR / ALVO CIVIL E PENAL:</span>
                        <span className="text-white font-bold">AGROPECUÁRIA & FLORESTAL RIO BRANCO LTDA</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[10px]">CPF / CNPJ DO RESPONSÁVEL:</span>
                        <span className="text-white font-bold">04.892.114/0001-92</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-400 font-sans flex items-center justify-between">
                      <span>Interseção espacial: <strong className="text-emerald-400">100% de sobreposição com a poligonal do imóvel</strong> (sem invasão de Terra Indígena).</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Official Environmental Notice Preview */}
              {activeTab === 'infraction' && (
                <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 text-xs font-mono space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <div className="flex items-center gap-2 text-zinc-200 font-bold">
                      <FileText className="w-4 h-4 text-orange-400" />
                      <span>AUTO DE INFRAÇÃO AMBIENTAL PRELIMINAR #AIP-2026-AM-0842</span>
                    </div>
                    <span className="text-[10px] bg-red-950/80 text-red-300 border border-red-700/40 px-2 py-0.5 rounded">
                      VALOR ESTIMADO: {emissions.estimatedFine}
                    </span>
                  </div>

                  <div className="text-zinc-300 space-y-1.5 text-[11px] leading-relaxed">
                    <p><strong className="text-zinc-400">ENQUADRAMENTO LEGAL:</strong> Art. 41 da Lei Federal nº 9.605/1998 (Crimes Ambientais - pena de reclusão de 2 a 4 anos) c/c Art. 43 do Decreto Federal nº 6.514/2008 (Multa de R$ 5.000,00 por hectare afetado).</p>
                    <p><strong className="text-zinc-400">MATERIALIDADE ORBITAL:</strong> Foco de calor com intensidade de <span className="text-orange-400 font-bold">{simFrp} MW</span> detectado pelo sensor VIIRS 375m e confirmado por satélite geoestacionário. Área impactada estimada em <span className="text-white font-bold">{emissions.estimatedHectares} hectares</span>.</p>
                    <p><strong className="text-zinc-400">AUTORIDADE NOTIFICADA:</strong> Ministério Público Federal (MPF) e Batalhão de Policiamento Ambiental (BPAmb).</p>
                  </div>

                  <div className="pt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => openAuth('register')}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold flex items-center gap-1.5 text-xs transition"
                    >
                      <Share2 className="w-3.5 h-3.5" /> Despachar Notícia-Crime p/ WhatsApp
                    </button>
                    <button
                      onClick={() => openAuth('register')}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-semibold flex items-center gap-1.5 text-xs transition"
                    >
                      <FileText className="w-3.5 h-3.5" /> Baixar Dossiê em PDF Oficial
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Technology & Constellation Highlights */}
      <section id="tecnologia" className="relative z-10 py-20 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono text-cyan-400 tracking-widest uppercase bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-500/30">
            Arquitetura de Alta Disponibilidade
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white mt-3">
            Fusão Multi-Sensor de Satélites e IA na Borda
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-2">
            A plataforma combina a velocidade dos sensores geoestacionários com a precisão métrica de satélites de órbita polar para não perder nenhuma frente de fogo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-orange-500/50 transition relative group">
            <div className="w-12 h-12 rounded-xl bg-orange-950/80 border border-orange-500/30 flex items-center justify-center text-orange-400 mb-4 group-hover:scale-110 transition duration-300">
              <Radio className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Anel Geoestacionário WMO</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Polling automático a cada 10 minutos nos satélites NOAA GOES-16/18, Meteosat MSG (Europa/África) e Himawari-9 (Ásia/Oceania). Identificação de anomalias com banda térmica de 3.9 µm.
            </p>
            <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center gap-2 text-[10px] font-mono text-zinc-500">
              <span className="text-orange-400">● Latência:</span> 10 a 15 minutos
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-amber-500/50 transition relative group">
            <div className="w-12 h-12 rounded-xl bg-amber-950/80 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition duration-300">
              <Satellite className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Órbita Polar VIIRS (375m)</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Confirmação de alta resolução espacial com sensores VIIRS a bordo dos satélites Suomi-NPP e NOAA-20 da NASA FIRMS e INPE, permitindo medição exata do FRP e da temperatura de brilho.
            </p>
            <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center gap-2 text-[10px] font-mono text-zinc-500">
              <span className="text-amber-400">● Resolução:</span> 375 metros por pixel
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/50 transition relative group">
            <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition duration-300">
              <Scale className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">PostGIS & CAR/SICAR</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Cruzamento vetorial instantâneo (Spatial Intersect) contra mais de 6 milhões de propriedades rurais, Terras Indígenas (FUNAI) e Unidades de Conservação (ICMBio) para identificação jurídica do infrator.
            </p>
            <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center gap-2 text-[10px] font-mono text-zinc-500">
              <span className="text-emerald-400">● Tipificação:</span> Lei 9.605/98 (Arts. 41 e 54)
            </div>
          </div>
        </div>
      </section>

      {/* SaaS Pricing Plans Section */}
      <section id="planos" className="relative z-10 py-20 border-t border-zinc-800/80 bg-zinc-950/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono text-orange-400 tracking-widest uppercase bg-orange-950/60 px-3 py-1 rounded-full border border-orange-500/30">
              Planos & Subscrições SaaS
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-3">
              Planos Desenhados para Produtores e Fiscalização
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2">
              Proteja o seu patrimônio florestal ou conduza auditorias ambientais com tecnologia de comando militar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Plano 1: Produtor */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between hover:border-zinc-700 transition">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Produtor Rural</h3>
                  <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">Starter</span>
                </div>
                <p className="text-xs text-zinc-400 mt-2">Ideal para fazendeiros individuais que precisam proteger 1 propriedade específica contra focos vizinhos.</p>

                <div className="mt-6 mb-6">
                  <span className="text-3xl font-extrabold text-white">R$ 99</span>
                  <span className="text-xs text-zinc-400 font-mono"> / mês</span>
                </div>

                <ul className="space-y-3 text-xs text-zinc-300 border-t border-zinc-800/80 pt-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                    <span><strong>1 Cerca Virtual</strong> georreferenciada</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                    <span>Alertas automáticos via <strong>WhatsApp (1 número)</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                    <span>Satélites GOES-16 + NASA VIIRS 375m</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                    <span>Estimativa de Fumaça e Qualidade do Ar (AQI)</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => openAuth('register', 'starter')}
                className="w-full mt-8 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs tracking-wider uppercase border border-zinc-700 transition"
              >
                Contratar Starter
              </button>
            </div>

            {/* Plano 2: Pro (Featured) */}
            <div className="bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 border-2 border-orange-500 rounded-2xl p-6 flex flex-col justify-between shadow-[0_0_40px_rgba(249,115,22,0.15)] relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                Mais Popular • Cooperativas
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Fazendas Pro</h3>
                  <span className="text-[10px] font-mono bg-orange-950/80 text-orange-300 border border-orange-600/40 px-2 py-0.5 rounded font-bold">Pro C2</span>
                </div>
                <p className="text-xs text-zinc-400 mt-2">Para cooperativas agrícolas, brigadas florestais privadas e produtores de médio/grande porte.</p>

                <div className="mt-6 mb-6">
                  <span className="text-3xl font-extrabold text-white">R$ 349</span>
                  <span className="text-xs text-zinc-400 font-mono"> / mês</span>
                </div>

                <ul className="space-y-3 text-xs text-zinc-300 border-t border-zinc-800/80 pt-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                    <span>Até <strong>10 Cercas Virtuais / Propriedades</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                    <span><strong>Autos de Infração Preliminares</strong> ilimitados</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                    <span>Cruzamento detalhado com base <strong>CAR / SICAR</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                    <span>Despacho WhatsApp para <strong>até 5 telefones</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                    <span>Exportação de relatórios em <strong>PDF Oficial & CSV</strong></span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => openAuth('register', 'pro')}
                className="w-full mt-8 py-3.5 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white font-bold text-xs tracking-wider uppercase shadow-lg shadow-orange-950/50 transition active:scale-95"
              >
                Ativar Plano Pro
              </button>
            </div>

            {/* Plano 3: Enterprise */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between hover:border-zinc-700 transition">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Defesa Civil & Órgãos</h3>
                  <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">Enterprise</span>
                </div>
                <p className="text-xs text-zinc-400 mt-2">Para secretarias de meio ambiente, comandos de bombeiros militares, seguradoras e corporações globais.</p>

                <div className="mt-6 mb-6">
                  <span className="text-3xl font-extrabold text-white">R$ 990+</span>
                  <span className="text-xs text-zinc-400 font-mono"> / mês</span>
                </div>

                <ul className="space-y-3 text-xs text-zinc-300 border-t border-zinc-800/80 pt-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                    <span>Cercas virtuais e polígonos <strong>ilimitados</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                    <span>Módulo de <strong>Câmeras com IA (YOLOv8 Edge)</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                    <span>Integração de Webhooks para sistemas legados / SIG</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                    <span>Histórico pericial perpétuo no PostGIS</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                    <span>Suporte operacional tático 24/7 com SLA</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => openAuth('register', 'enterprise')}
                className="w-full mt-8 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs tracking-wider uppercase border border-zinc-700 transition"
              >
                Falar com Especialista C2
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-600 text-white">
              <Flame className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm tracking-wider text-white">AMAZÔNIA FIRE-WATCH AI</span>
          </div>

          <div className="text-center sm:text-right">
            <p className="text-xs text-zinc-500 font-mono">
              Sensoriamento Remoto • NASA FIRMS • NOAA GOES • EUMETSAT • INPE BDQueimadas • PostGIS
            </p>
            <p className="text-[11px] text-zinc-600 mt-1">
              Desenvolvido sob padrões da Lei nº 9.605/1998 e IPCC Guidelines for National Greenhouse Gas Inventories.
            </p>
          </div>
        </div>
      </footer>

      {/* Auth Modal Component */}
      {authModalOpen && (
        <AuthModal
          mode={authMode}
          selectedPlan={selectedPlan}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={() => {
            setAuthModalOpen(false);
            onEnterDashboard();
          }}
        />
      )}
    </div>
  );
};

// Tactical Glassmorphic Auth Modal (Login / Cadastro) integrado ao Supabase Auth
interface AuthModalProps {
  mode: 'login' | 'register';
  selectedPlan: string;
  onClose: () => void;
  onSuccess: () => void;
}

function AuthModal({ mode, selectedPlan, onClose, onSuccess }: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(mode === 'register');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    setIsRegister(mode === 'register');
  }, [mode]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    }
    setPhone(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (!supabase) {
      // Modo local simulado
      setTimeout(() => {
        setLoading(false);
        setSuccessMsg(isRegister ? 'Cadastro realizado com sucesso!' : 'Login autorizado!');
        setTimeout(() => onSuccess(), 1000);
      }, 1000);
      return;
    }

    try {
      if (isRegister) {
        if (!fullName.trim()) throw new Error('Informe seu nome completo.');
        if (password.length < 6) throw new Error('A senha deve ter no mínimo 6 caracteres.');

        const cleanPhone = phone.replace(/\D/g, '');
        const fullInternationalPhone = cleanPhone ? `+55${cleanPhone}` : '';

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone_whatsapp: fullInternationalPhone,
              company_name: company.trim(),
              selected_plan: selectedPlan,
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          onSuccess();
        } else {
          setSuccessMsg('Cadastro C2 concluído com sucesso! Suas credenciais foram registradas no sistema.');
          setTimeout(() => onSuccess(), 1500);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('E-mail ou senha incorretos.');
          }
          throw error;
        }

        setSuccessMsg('Autenticação concedida. Carregando mapa de comando...');
        setTimeout(() => onSuccess(), 1000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao processar solicitação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-[0_0_60px_rgba(249,115,22,0.2)] p-6 sm:p-8 text-zinc-100 font-mono select-none">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 p-1 rounded-lg hover:bg-zinc-900 transition"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 via-orange-600 to-red-600 shadow-lg shadow-orange-950/60 mb-2 border border-orange-400/40">
            <Flame className="w-6 h-6 text-white" />
            <div className="absolute -bottom-1 -right-1 bg-zinc-950 border border-zinc-700 p-0.5 rounded-full">
              <Shield className="w-2.5 h-2.5 text-amber-400" />
            </div>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5 font-sans">
            AMAZÔNIA FIRE-WATCH <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-950/90 border border-orange-500/40 text-orange-400">SAAS</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1 font-sans">
            {isRegister
              ? `Cadastre-se para monitorar suas áreas com o plano ${selectedPlan.toUpperCase()}.`
              : 'Informe suas credenciais para acessar o painel operacional C2.'}
          </p>
        </div>

        {/* Error / Success Feedback */}
        {errorMsg && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-950/80 border border-red-700/60 text-red-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-200 text-xs text-center font-medium">
            {successMsg}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {isRegister && (
            <>
              {/* Full Name */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                  Nome Completo *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Gleisson Barroso"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                  />
                </div>
              </div>

              {/* Phone / WhatsApp */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                  WhatsApp para Alertas (com DDD) *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    placeholder="(92) 99146-3640"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                  />
                </div>
              </div>

              {/* Company / Farm */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                  Propriedade Rural ou Instituição
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Ex: Fazenda Rio Negro / Defesa Civil"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
              E-mail *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                required
                placeholder="operador@amazonia-firewatch.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
              Senha *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-10 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-2.5 px-4 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white font-bold text-xs tracking-wider uppercase rounded-xl shadow-lg shadow-orange-950/50 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{isRegister ? 'Criar Conta e Acessar C2' : 'Entrar no Painel C2'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Switch Mode */}
        <div className="mt-5 pt-4 border-t border-zinc-900 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className="text-xs text-zinc-400 hover:text-orange-400 transition font-sans"
          >
            {isRegister ? (
              <span>Já possui credenciais? <strong className="text-orange-400 underline ml-1">Fazer Login</strong></span>
            ) : (
              <span>Ainda não possui conta? <strong className="text-orange-400 underline ml-1">Criar Conta</strong></span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
