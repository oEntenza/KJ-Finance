import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, LogOut, Moon, Sun, User, Wallet } from 'lucide-react';

const HEADER_TABS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Analytics', path: '/analytics' },
  { label: 'Cartões', path: '/cards' },
];

export function DashboardHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const userData = JSON.parse(localStorage.getItem('@KAO:user') || '{}');
  const [theme, setTheme] = useState(() => localStorage.getItem('@KAO:theme') || 'noir');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    if (isNotificationsOpen || isUserMenuOpen) {
      document.addEventListener('mousedown', handleOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [isNotificationsOpen, isUserMenuOpen]);

  function handleLogout() {
    localStorage.removeItem('@KAO:token');
    localStorage.removeItem('@KAO:user');
    navigate('/login');
  }

  function handleToggleTheme() {
    const nextTheme = theme === 'claro' ? 'noir' : 'claro';
    setTheme(nextTheme);
    localStorage.setItem('@KAO:theme', nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }

  return (
    <header className="bg-[var(--color-surface)] border-b border-[var(--color-accent)]/20 h-16 sticky top-0 z-[60] w-full shadow-2xl header-border-noir">
      <div className="w-full px-8 h-full flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 min-w-fit group"
          aria-label="Ir para o Dashboard"
        >
          <div className="text-[var(--color-accent)] group-hover:scale-110 transition-transform">
            <Wallet size={28} strokeWidth={2} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-xl font-black text-[var(--color-accent)] tracking-tighter italic">K&amp;J</span>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Finance</span>
          </div>
        </button>

        <div className="hidden md:flex items-center gap-2 bg-[var(--color-bg)] border border-gray-800 rounded-full p-1 absolute left-1/2 -translate-x-1/2">
          {HEADER_TABS.map((tab) => {
            const isActive = location.pathname.startsWith(tab.path);
            return (
              <button
                key={tab.path}
                type="button"
                onClick={() => navigate(tab.path)}
                className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                  isActive
                    ? 'bg-[var(--color-accent)] text-[var(--color-bg)] shadow-[0_0_12px_rgba(192,160,96,0.35)]'
                    : 'text-gray-400 hover:text-[var(--color-accent)]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={handleToggleTheme}
            className="p-2.5 rounded-full text-gray-400 hover:text-[var(--color-accent)] transition-colors"
            aria-label="Alternar tema"
          >
            {theme === 'claro' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              onClick={() => setIsNotificationsOpen((prev) => !prev)}
              className="p-2 text-gray-500 hover:text-[var(--color-accent)] transition-colors relative"
              aria-label="Abrir notificações"
            >
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[var(--color-accent)]" />
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-3 w-72 z-50">
                <div className="rounded-2xl border border-transparent bg-[var(--color-bg)] shadow-2xl overflow-hidden modal-gold-border gold-border-relative">
                  <div className="px-4 py-3 border-b border-gray-800">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Notificações</p>
                  </div>
                  <div className="max-h-72 custom-scroll overflow-y-auto">
                    {[
                      { title: 'Importação concluída', description: 'Carga em massa processada com sucesso.' },
                      { title: 'Meta mensal', description: 'Você bateu 78% da meta de economia.' },
                      { title: 'Novo registro', description: 'Entrada registrada em Salário.' },
                      { title: 'Cartão atualizado', description: 'Fatura de cartão consolidada automaticamente.' },
                    ].map((item) => (
                      <div key={item.title} className="px-4 py-3 border-b border-gray-800/60 last:border-none hover:bg-[var(--color-bg)] transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 text-[var(--color-accent)]">
                            <CheckCircle2 size={16} />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-gray-200">{item.title}</p>
                            <p className="text-[10px] text-gray-500 mt-1">{item.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3 border-t border-gray-800 text-[10px] text-gray-500">
                    Você tem 4 notificações novas.
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="h-10 w-px bg-gray-800" />

          <div ref={userMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              className="flex items-center gap-3"
            >
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-bold text-[var(--color-accent)] uppercase tracking-wider">Membro Premium</p>
                <p className="text-sm font-medium text-gray-200">{userData.name || 'Usuário'}</p>
              </div>

              <div className="h-10 w-10 rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-accent)] shadow-[0_0_15px_rgba(192,160,96,0.15)]">
                <User size={20} />
              </div>
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-3 w-64 z-50">
                <div className="rounded-2xl border border-transparent bg-[var(--color-bg)] shadow-2xl overflow-hidden modal-gold-border gold-border-relative">
                  <div className="px-4 py-3 border-b border-gray-800">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Conta</p>
                  </div>
                  <div className="px-4 py-3 border-b border-gray-800/60">
                    <p className="text-[11px] font-bold text-gray-200">{userData.name || 'Usuário'}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{userData.email || 'usuario@email.com'}</p>
                  </div>
                  <div className="px-2 py-2">
                    {[
                      { label: 'Meu Perfil', onClick: () => navigate('/profile') },
                      { label: 'Cartões', onClick: () => navigate('/cards') },
                      { label: 'Preferências', onClick: () => navigate('/preferences') },
                      { label: 'Plano Premium', onClick: undefined },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={item.onClick}
                        className="w-full px-3 py-2 text-left text-[11px] text-gray-300 rounded-lg hover:bg-[var(--color-bg)] hover:text-[var(--color-accent)] transition-colors"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <div className="px-4 py-3 border-t border-gray-800">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 text-left text-[11px] text-rose-400 hover:text-rose-300 transition-colors"
                    >
                      <LogOut size={14} />
                      Sair da conta
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
