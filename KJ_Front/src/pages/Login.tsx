import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useDialog } from '../components/DialogProvider';

const apiBaseUrl = import.meta.env.VITE_API_URL?.trim() || 'http://localhost:3333';

export function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit } = useForm();
  const navigate = useNavigate();
  const dialog = useDialog();

  async function handleLogin(data: any) {
    try {
      const response = await axios.post(`${apiBaseUrl}/sessions`, {
        email: data.email,
        password: data.password,
      });

      const { token, user } = response.data;

      localStorage.setItem('@KAO:token', token);
      localStorage.setItem('@KAO:user', JSON.stringify(user));

      navigate('/dashboard');
    } catch (err: any) {
      await dialog.alert({
        title: 'Falha no login',
        message: err.response?.data?.message || 'Erro ao realizar login.',
      });
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-alt)] flex items-center justify-center p-6 font-sans selection:bg-[#C0A060]/30">
      <div className="w-full max-w-md">
        <div className="text-center mb-10 group cursor-default">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 mb-6 group-hover:border-[var(--color-accent)]/50 transition-all duration-500 shadow-inner">
            <Wallet className="text-[var(--color-accent)]" size={36} />
          </div>
          <h1 className="text-4xl font-light text-[var(--color-text)] tracking-tighter">
            K&J <span className="font-bold text-[var(--color-accent)]">Finance</span>
          </h1>
          <p className="text-gray-500 text-[10px] uppercase tracking-[0.4em] mt-3 font-medium">Terminal de Acesso Analítico</p>
        </div>

        <div className="bg-[var(--color-surface)] border border-gray-800/50 p-10 rounded-[2.5rem] shadow-2xl backdrop-blur-sm relative overflow-hidden modal-gold-border">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--color-accent)]/40 to-transparent"></div>
 
          <form onSubmit={handleSubmit(handleLogin)} className="space-y-7">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">Credencial de Acesso</label>
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
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Chave de Segurança</label>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-[var(--color-accent)] transition-colors" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  required
                  className="w-full bg-[var(--color-bg-alt)] border border-gray-800 rounded-2xl py-4 pl-12 pr-12 text-gray-200 focus:border-[var(--color-accent)]/50 outline-none transition-all placeholder:text-gray-700 text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-strong)] text-[var(--color-bg-alt)] font-bold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 group shadow-[0_15px_30px_rgba(192,160,96,0.2)] active:scale-95"
            >
              Autenticar No Sistema
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-10 text-center border-t border-gray-800/50 pt-8 space-y-4">
            <p className="text-gray-500 text-xs">
              Não possui registro? <Link to="/signup" className="text-[var(--color-accent)] hover:text-[var(--color-accent-strong)] font-bold transition-colors">Solicitar Acesso</Link>
            </p>
            <Link to="/" className="text-[10px] text-gray-600 hover:text-gray-400 uppercase tracking-widest font-bold block transition-colors">
              ← Voltar para a Home
            </Link>
          </div>
        </div>

        <p className="text-center mt-8 text-[9px] text-gray-700 uppercase tracking-[0.5em] font-medium">
          K&J Secure Protocol v3.0
        </p>
      </div>
    </div>
  );
}
