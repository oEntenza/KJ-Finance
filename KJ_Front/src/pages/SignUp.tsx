import React from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet, Mail, Lock, User, CheckCircle2, ArrowRight } from 'lucide-react';
import { useDialog } from '../components/DialogProvider';

const apiBaseUrl = import.meta.env.VITE_API_URL?.trim() || 'http://localhost:3333';

export function SignUp() {
  const { register, handleSubmit } = useForm();
  const navigate = useNavigate();
  const dialog = useDialog();

  async function handleSignUp(data: any) {
    try {
      await axios.post(`${apiBaseUrl}/users`, {
        name: data.name,
        email: data.email,
        password: data.password,
      });

      await dialog.alert({
        title: 'Cadastro concluído',
        message: 'Conta criada com sucesso! Faça login para continuar.',
      });
      navigate('/login');
    } catch (err: any) {
      console.error('Detalhes do erro que o backend enviou:', err.response?.data);
      await dialog.alert({
        title: 'Falha no cadastro',
        message: err.response?.data?.message || 'Erro ao cadastrar.',
      });
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-alt)] flex items-center justify-center p-6 font-sans selection:bg-[#C0A060]/30">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-3 group">
            <div className="w-12 h-12 bg-[var(--color-accent)] rounded-2xl flex items-center justify-center text-[var(--color-bg-alt)] shadow-lg shadow-[#C0A060]/10 group-hover:rotate-6 transition-transform">
              <Wallet size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[var(--color-text)] tracking-tight">Novo Registro</h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">K&J Finance System</p>
            </div>
          </div>
          <Link
            to="/login"
            className="text-[10px] text-gray-500 hover:text-[var(--color-accent)] uppercase tracking-[0.2em] font-bold transition-colors"
          >
            Já sou membro
          </Link>
        </div>

        <div className="bg-[var(--color-surface)] border border-gray-800 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden modal-gold-border">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--color-accent)]/30 to-transparent"></div>

          <form onSubmit={handleSubmit(handleSignUp)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">Nome Completo</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-[var(--color-accent)] transition-colors" size={18} />
                <input
                  type="text"
                  {...register('name')}
                  required
                  className="w-full bg-[var(--color-bg-alt)] border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-gray-200 focus:border-[var(--color-accent)]/50 outline-none transition-all placeholder:text-gray-700 text-sm"
                  placeholder="Ex: Ana Souza"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">E-mail Corporativo</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-[var(--color-accent)] transition-colors" size={18} />
                <input
                  type="email"
                  {...register('email')}
                  required
                  className="w-full bg-[var(--color-bg-alt)] border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-gray-200 focus:border-[var(--color-accent)]/50 outline-none transition-all placeholder:text-gray-700 text-sm"
                  placeholder="user@kjfinance.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">Senha de Acesso</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-[var(--color-accent)] transition-colors" size={18} />
                <input
                  type="password"
                  {...register('password')}
                  required
                  className="w-full bg-[var(--color-bg-alt)] border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-gray-200 focus:border-[var(--color-accent)]/50 outline-none transition-all placeholder:text-gray-700 text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="py-2">
              <div className="bg-[var(--color-bg-alt)] p-4 rounded-2xl border border-gray-800 flex gap-3">
                <CheckCircle2 size={18} className="text-[var(--color-accent)] shrink-0 mt-0.5" />
                <p className="text-[10px] text-gray-500 leading-relaxed uppercase tracking-wider">
                  Ao registrar-se, você aceita os protocolos de <span className="text-gray-300">segurança e criptografia</span> do sistema K&J Finance.
                </p>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-strong)] text-[var(--color-bg-alt)] font-bold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 group shadow-[0_15px_30px_rgba(192,160,96,0.15)] active:scale-95"
            >
              Criar Perfil Analítico
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="text-[10px] text-gray-600 hover:text-gray-400 uppercase tracking-[0.3em] font-bold transition-colors">
            ← Voltar ao Início
          </Link>
        </div>
      </div>
    </div>
  );
}
