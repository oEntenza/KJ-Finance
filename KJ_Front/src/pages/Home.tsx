import React, { useEffect, useState } from 'react';
import { ShieldCheck, Zap, Wallet, ArrowRight, BarChart3, Globe, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Home() {
  const [theme, setTheme] = useState('noir');

  useEffect(() => {
    const stored = localStorage.getItem('@KAO:theme') || 'noir';
    setTheme(stored);
  }, []);

  function handleToggleTheme() {
    const nextTheme = theme === 'claro' ? 'noir' : 'claro';
    setTheme(nextTheme);
    localStorage.setItem('@KAO:theme', nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-alt)] text-gray-100 font-sans selection:bg-[#C0A060]/30">
      <nav className="max-w-7xl mx-auto px-8 py-8 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--color-accent)] rounded-xl flex items-center justify-center text-[var(--color-bg-alt)] shadow-lg shadow-[#C0A060]/10">
            <Wallet size={24} strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-bold tracking-tighter italic text-[var(--color-text)]">
            K&J <span className="text-[var(--color-accent)] not-italic">Finance</span>
          </span>
        </div>

        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={handleToggleTheme}
            className="p-2.5 rounded-full text-gray-400 hover:text-[var(--color-accent)] transition-colors"
            aria-label="Alternar tema"
          >
            {theme === 'claro' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <Link
            to="/login"
            className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 hover:text-[var(--color-accent)] transition-colors"
          >
            Acessar Terminal
          </Link>
          <Link
            to="/signup"
            className="bg-[var(--color-accent)] text-[var(--color-bg-alt)] px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest hover:scale-105 hover:bg-[var(--color-accent-strong)] transition-all shadow-lg shadow-[#C0A060]/10"
          >
            Comece Agora!
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 pt-10 pb-32">
        <div className="text-center space-y-8 relative">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[var(--color-accent)]/10 blur-[120px] rounded-full -z-10"></div>

          <div className="inline-block px-4 py-1.5 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 rounded-full text-[var(--color-accent)] text-[10px] font-bold uppercase tracking-[0.3em] mb-4">
            Projeto para controle financeiro pessoal e análise de dados com React, Fastify, Prisma e Neon DB.
          </div>

          <h1 className="text-6xl md:text-8xl font-light leading-[1.1] tracking-tight text-[var(--color-text)] max-w-4xl mx-auto">
            Seu capital sob <span className="font-bold italic text-[var(--color-accent)]">controle total.</span>
          </h1>

          <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            A plataforma definitiva para gerenciar fluxos financeiros com precisão, velocidade e visualização analítica de alto nível.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <FeatureItem
            icon={<Zap className="text-[var(--color-accent)]" />}
            title="Performance K&J"
            desc="Interface ultra-rápida construída com Vite e Fastify para respostas em milissegundos."
          />
          <FeatureItem
            icon={<BarChart3 className="text-[var(--color-accent)]" />}
            title="Inteligência Analítica"
            desc="Gráficos avançados com tratamento de fuso horário UTC e precisão financeira nas operações."
          />
          <FeatureItem
            icon={<ShieldCheck className="text-[var(--color-accent)]" />}
            title="Segurança Máxima"
            desc="Criptografia, autenticação JWT e uma experiência protegida para os dados do usuário."
          />
        </div>
      </main>

      <footer className="border-t border-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest">
            © 2026 K&J Finance. Todos os direitos reservados.
          </p>
          <div className="flex gap-8">
            <Globe size={16} className="text-gray-700" />
            <span className="text-[10px] text-gray-700 uppercase tracking-[0.3em] font-bold">Protocolo HTTPS Ativo</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
      <div className="bg-[var(--color-surface)] p-10 rounded-[2.5rem] border border-gray-800/50 hover:border-[var(--color-accent)]/30 transition-all group">
      <div className="bg-[var(--color-bg-alt)] w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-[var(--color-text)] font-bold text-lg mb-3 tracking-tight">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}
