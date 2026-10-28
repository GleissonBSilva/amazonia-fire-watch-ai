import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Shield, Flame, Mail, Lock, Phone, User, Building2, ArrowRight, Eye, EyeOff, AlertTriangle } from 'lucide-react';

interface AuthPageProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess, onCancel }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Estados dos campos
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');

  // Formatação automática do telefone padrão BR (+55 92 99999-9999)
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
    setErrorMessage('');
    setSuccessMessage('');

    if (!supabase) {
      setErrorMessage('Cliente Supabase não configurado. Verifique as credenciais no arquivo .env.');
      setLoading(false);
      return;
    }

    try {
      if (isRegister) {
        // Validação básica
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
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          if (onSuccess) onSuccess();
        } else {
          setSuccessMessage('Conta operacional criada com sucesso! Você já pode efetuar login com seu e-mail e senha.');
          setIsRegister(false);
        }
      } else {
        // Login
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

        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto font-mono select-none">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-[0_0_50px_rgba(249,115,22,0.15)] p-6 sm:p-8 text-zinc-100">
        
        {/* Topo / Logo C2 */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 via-orange-600 to-red-600 shadow-lg shadow-orange-950/60 mb-3 border border-orange-400/30">
            <Flame className="w-8 h-8 text-white animate-pulse" />
            <div className="absolute -bottom-1 -right-1 bg-zinc-900 border border-zinc-700 p-1 rounded-full">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            AMAZÔNIA FIRE-WATCH AI <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-950/80 border border-orange-600/40 text-orange-400">C2 SAAS</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xs">
            {isRegister
              ? 'Crie seu acesso tático para monitoramento de queimadas, cercas e alertas WhatsApp.'
              : 'Entre com suas credenciais autorizadas para acesso à plataforma operacional.'}
          </p>
        </div>

        {/* Mensagens de Feedback */}
        {errorMessage && (
          <div className="mb-4 flex items-start gap-2.5 p-3 rounded-lg bg-red-950/70 border border-red-700/60 text-red-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/70 border border-emerald-700/60 text-emerald-200 text-xs text-center">
            {successMessage}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <>
              {/* Nome Completo */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                  Nome Completo *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Gleisson Silva"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                  />
                </div>
              </div>

              {/* Telefone / WhatsApp */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
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
                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                  />
                </div>
              </div>

              {/* Empresa / Propriedade / Instituição */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                  Organização / Propriedade Rural
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Ex: Fazenda Santa Maria / Defesa Civil"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                  />
                </div>
              </div>
            </>
          )}

          {/* E-mail */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
              E-mail Operacional *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                required
                placeholder="operador@agro-sat.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
              />
            </div>
          </div>

          {/* Senha */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
              Senha de Segurança *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-9 pr-10 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
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

          {/* Botão de Envio */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 active:scale-[0.99] text-white font-medium text-xs tracking-wider uppercase rounded-xl shadow-lg shadow-orange-950/50 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{isRegister ? 'Criar Conta Operacional' : 'Autenticar no Sistema'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Alternância Login / Cadastro */}
        <div className="mt-5 pt-4 border-t border-zinc-900 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className="text-xs text-zinc-400 hover:text-orange-400 transition"
          >
            {isRegister ? (
              <span>Já tem credenciais de acesso? <strong className="text-orange-400 underline ml-1">Fazer Login</strong></span>
            ) : (
              <span>Não possui conta? <strong className="text-orange-400 underline ml-1">Cadastrar Novo Usuário</strong></span>
            )}
          </button>
        </div>

        {/* Botão de Cancelar / Fechar */}
        {onCancel && (
          <div className="mt-2 text-center">
            <button
              type="button"
              onClick={onCancel}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 transition"
            >
              Continuar como Convidado (Somente Leitura)
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
