import React, { useMemo, useState } from 'react';
import { Shield, Mail, User, Crown, Calendar, Pencil } from 'lucide-react';
import { DashboardHeader } from '../components/DashboardHeader';
import { api } from '../lib/api';

export function Profile() {
  const [userData, setUserData] = useState(() => JSON.parse(localStorage.getItem('@KAO:user') || '{}'));
  const [name, setName] = useState(userData.name || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const displayName = useMemo(() => name || userData.name || 'Usuário', [name, userData.name]);

  async function handleSave() {
    const nextName = name.trim();
    if (nextName.length < 3) {
      setMessage('O nome precisa ter pelo menos 3 caracteres.');
      return;
    }

    try {
      setIsSaving(true);
      setMessage('');
      const response = await api.put('/users/me', { name: nextName });
      const updated = response.data ?? { ...userData, name: nextName };
      setUserData(updated);
      localStorage.setItem('@KAO:user', JSON.stringify(updated));
      setIsEditing(false);
      setMessage('Nome atualizado com sucesso.');
    } catch (error) {
      setMessage('Não foi possível atualizar o nome.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-gray-100 font-sans">
      <DashboardHeader />

      <main className="px-8 py-12 max-w-[1200px] mx-auto space-y-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-light tracking-tight italic">
              Meu <span className="font-bold text-[var(--color-accent)] not-italic">Perfil</span>
            </h1>
            <p className="text-gray-500 text-sm mt-1 uppercase tracking-[0.2em]">Configurações pessoais</p>
          </div>
          <div className="flex items-center gap-3 bg-[var(--color-surface)] border border-gray-800 rounded-full px-4 py-2">
            <Crown size={16} className="text-[var(--color-accent)]" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-accent)]">Membro Premium</span>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8">
          <div className="bg-[var(--color-surface)] rounded-2xl border border-gray-800 shadow-2xl p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-accent)]">
                <User size={28} />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Nome</p>
                <div className="mt-2 flex items-center gap-2">
                  {isEditing ? (
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="w-full bg-[var(--color-bg)] border border-gray-800 rounded-xl px-3 py-2 text-sm text-gray-100 focus:border-[var(--color-accent)]/60 outline-none"
                      placeholder="Digite seu nome"
                      autoFocus
                    />
                  ) : (
                    <>
                      <p className="text-2xl font-semibold text-gray-100">{displayName}</p>
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="ml-1 p-2 rounded-full border border-gray-800 text-gray-400 hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/40 transition-colors"
                        aria-label="Editar nome"
                      >
                        <Pencil size={14} />
                      </button>
                    </>
                  )}
                </div>
                {isEditing && (
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[var(--color-accent)] text-[var(--color-bg)] hover:opacity-90 disabled:opacity-60"
                    >
                      {isSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setName(userData.name || '');
                        setIsEditing(false);
                        setMessage('');
                      }}
                      className="px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border border-gray-800 text-gray-300 hover:text-[var(--color-accent)]"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
                {message ? (
                  <p className="text-[11px] text-gray-400 mt-2">{message}</p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[var(--color-surface-2)] border border-gray-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-gray-400 text-[10px] uppercase tracking-widest">
                  <Mail size={14} />
                  Email
                </div>
                <p className="text-sm text-gray-200 mt-2">{userData.email || 'usuario@email.com'}</p>
              </div>
              <div className="bg-[var(--color-surface-2)] border border-gray-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-gray-400 text-[10px] uppercase tracking-widest">
                  <Shield size={14} />
                  Segurança
                </div>
                <p className="text-sm text-gray-200 mt-2">Conta protegida</p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-surface)] rounded-2xl border border-gray-800 shadow-2xl p-8 space-y-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-accent)]">Detalhes da Conta</h2>
            <div className="space-y-4">
              {[
                { label: 'Plano atual', value: 'Premium', icon: Crown },
                { label: 'Desde', value: 'Jan/2024', icon: Calendar },
                { label: 'Status', value: 'Ativo', icon: Shield },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between bg-[var(--color-surface-2)] border border-gray-800 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <item.icon size={16} className="text-[var(--color-accent)]" />
                    <span className="text-xs text-gray-400 uppercase tracking-widest">{item.label}</span>
                  </div>
                  <span className="text-sm text-gray-200">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
