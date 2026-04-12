import React, { useState } from 'react';
import { Bell, Eye, Shield, Palette } from 'lucide-react';
import { DashboardHeader } from '../components/DashboardHeader';

export function Preferences() {
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);
  const [showValues, setShowValues] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('@KAO:theme') || 'noir');

  const themeLabel = theme === 'claro' ? 'Claro' : 'Noir';

  function handleThemeChange(nextTheme: string) {
    setTheme(nextTheme);
    localStorage.setItem('@KAO:theme', nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-gray-100 font-sans">
      <DashboardHeader />

      <main className="px-8 py-12 max-w-[1200px] mx-auto space-y-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-light tracking-tight italic">
              Preferências <span className="font-bold text-[var(--color-accent)] not-italic">KÃO</span>
            </h1>
            <p className="text-gray-500 text-sm mt-1 uppercase tracking-[0.2em]">Personalize sua experiência</p>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-[var(--color-surface)] rounded-2xl border border-gray-800 shadow-2xl p-8 space-y-6">
            <div className="flex items-center gap-3">
              <Bell size={18} className="text-[var(--color-accent)]" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-accent)]">Notificações</h2>
            </div>

            {[
              {
                label: 'Alertas por e-mail',
                value: notifyEmail,
                onChange: () => setNotifyEmail((prev) => !prev),
              },
              {
                label: 'Notificações no app',
                value: notifyPush,
                onChange: () => setNotifyPush((prev) => !prev),
              },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.onChange}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-800 bg-[var(--color-surface-2)] hover:border-[var(--color-accent)]/40 transition-colors"
              >
                <span className="text-sm text-gray-200">{item.label}</span>
                <span className={`h-6 w-11 rounded-full p-1 flex items-center ${item.value ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-surface)]'}`}>
                  <span
                    className={`h-4 w-4 rounded-full bg-[var(--color-bg)] shadow transition-transform ${
                      item.value ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </span>
              </button>
            ))}
          </div>

          <div className="bg-[var(--color-surface)] rounded-2xl border border-gray-800 shadow-2xl p-8 space-y-6">
            <div className="flex items-center gap-3">
              <Eye size={18} className="text-[var(--color-accent)]" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-accent)]">Visual</h2>
            </div>

            <button
              type="button"
              onClick={() => setShowValues((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-800 bg-[var(--color-surface-2)] hover:border-[var(--color-accent)]/40 transition-colors"
            >
              <span className="text-sm text-gray-200">Mostrar valores sensíveis</span>
              <span className={`h-6 w-11 rounded-full p-1 flex items-center ${showValues ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-surface)]'}`}>
                <span
                  className={`h-4 w-4 rounded-full bg-[var(--color-bg)] shadow transition-transform ${
                    showValues ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </span>
            </button>

            <div className="flex items-center gap-3 text-gray-400 text-xs uppercase tracking-widest">
              <Palette size={14} />
              Tema atual: {themeLabel}
            </div>

            <div className="flex items-center gap-2">
              {[
                { label: 'Noir', value: 'noir' },
                { label: 'Claro', value: 'claro' },
              ].map((option) => {
                const isActive = theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleThemeChange(option.value)}
                    className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                      isActive
                        ? 'bg-[var(--color-accent)] text-[var(--color-bg)]'
                        : 'border border-gray-800 text-gray-300 hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/40'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-[var(--color-surface)] rounded-2xl border border-gray-800 shadow-2xl p-8 space-y-6">
          <div className="flex items-center gap-3">
            <Shield size={18} className="text-[var(--color-accent)]" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-accent)]">Segurança</h2>
          </div>

          <button
            type="button"
            onClick={() => setTwoFactor((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-800 bg-[var(--color-surface-2)] hover:border-[var(--color-accent)]/40 transition-colors"
          >
            <span className="text-sm text-gray-200">Autenticação em duas etapas</span>
            <span className={`h-6 w-11 rounded-full p-1 flex items-center ${twoFactor ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-surface)]'}`}>
              <span
                className={`h-4 w-4 rounded-full bg-[var(--color-bg)] shadow transition-transform ${
                  twoFactor ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </span>
          </button>
          
        </section>
      </main>
    </div>
  );
}
