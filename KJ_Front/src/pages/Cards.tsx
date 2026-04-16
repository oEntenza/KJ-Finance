import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, CreditCard, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { DashboardHeader } from '../components/DashboardHeader';
import { api } from '../lib/api';
import { useDialog } from '../components/DialogProvider';

interface CreditCardItem {
  id: string;
  name: string;
  closingDay: number;
  outstandingAmount?: number;
  transactionsCount?: number;
}

interface FutureStatementItem {
  id: string;
  description: string;
  amount: number;
  date: string;
  statementMonth?: number | null;
  statementYear?: number | null;
  creditCard?: {
    id: string;
    name: string;
    closingDay: number;
  } | null;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(date));
}

export function Cards() {
  const dialog = useDialog();
  const [cards, setCards] = useState<CreditCardItem[]>([]);
  const [futureStatements, setFutureStatements] = useState<FutureStatementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [newCard, setNewCard] = useState({ name: '', closingDay: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Record<string, CreditCardItem>>({});

  const fetchCards = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError('');
      const response = await api.get('/credit-cards');
      setCards(Array.isArray(response.data.cards) ? response.data.cards : []);
      setFutureStatements(Array.isArray(response.data.futureStatements) ? response.data.futureStatements : []);
    } catch (error: any) {
      console.error(error);
      setCards([]);
      setFutureStatements([]);
      setLoadError(error.response?.data?.message || 'Não foi possível carregar os cartões agora.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  async function handleCreateCard() {
    if (!newCard.name || !newCard.closingDay) {
      await dialog.alert({
        title: 'Campos obrigatórios',
        message: 'Informe o nome do cartão e o dia de fechamento da fatura.',
      });
      return;
    }

    try {
      await api.post('/credit-cards', {
        name: newCard.name,
        closingDay: Number(newCard.closingDay),
      });

      setNewCard({ name: '', closingDay: '' });
      await fetchCards();
    } catch (error: any) {
      await dialog.alert({
        title: 'Falha ao criar cartão',
        message: error.response?.data?.message || 'Não foi possível cadastrar o cartão agora.',
      });
    }
  }

  function handleStartEdit(card: CreditCardItem) {
    setEditingId(card.id);
    setEditingData((prev) => ({ ...prev, [card.id]: { ...card } }));
  }

  function handleCancelEdit() {
    setEditingId(null);
  }

  function updateNewCardClosingDay(delta: number) {
    const current = Number(newCard.closingDay || 1);
    setNewCard((prev) => ({ ...prev, closingDay: String(Math.min(31, Math.max(1, current + delta))) }));
  }

  async function handleSaveEdit(id: string) {
    const payload = editingData[id];
    if (!payload) return;

    try {
      await api.put(`/credit-cards/${id}`, {
        name: payload.name,
        closingDay: Number(payload.closingDay),
      });

      setEditingId(null);
      setEditingData((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await fetchCards();
    } catch (error: any) {
      await dialog.alert({
        title: 'Falha ao salvar',
        message: error.response?.data?.message || 'Não foi possível atualizar o cartão agora.',
      });
    }
  }

  async function handleDelete(id: string) {
    const card = cards.find((item) => item.id === id);
    const confirmed = await dialog.confirm({
      title: 'Excluir cartão',
      message: 'Deseja remover este cartão?',
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });

    if (!confirmed) return;

    if ((card?.transactionsCount || 0) > 0) {
      const confirmCascade = await dialog.confirm({
        title: 'Excluir cartão com faturas',
        message: `Este cartão possui ${card?.transactionsCount} lançamento(s) vinculado(s). As faturas e compras associadas também serão excluídas. Deseja continuar?`,
        confirmLabel: 'Excluir tudo',
        cancelLabel: 'Cancelar',
        tone: 'danger',
      });

      if (!confirmCascade) return;
    }

    try {
      await api.delete(`/credit-cards/${id}`);
      await fetchCards();
    } catch (error: any) {
      await dialog.alert({
        title: 'Não foi possível excluir',
        message: error.response?.data?.message || 'Falha ao excluir o cartão.',
      });
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-gray-100 font-sans">
      <DashboardHeader />
      <main className="w-full px-8 py-12 space-y-8">
        <header>
          <h1 className="text-4xl font-light tracking-tight italic">
            Cartões <span className="font-bold text-[var(--color-accent)]">K&J</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1 uppercase tracking-[0.2em]">Gerenciamento de cartões de crédito</p>
        </header>

        <section className="bg-[var(--color-surface)] p-6 rounded-2xl border border-gray-800 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-[var(--color-accent)]/10 rounded-lg text-[var(--color-accent)]">
              <CreditCard size={18} />
            </div>
            <h2 className="text-sm font-semibold tracking-widest text-[var(--color-text)] uppercase">Novo cartão</h2>
          </div>
          <label className="text-[12px] font-bold text-[var(--color-accent)] uppercase ml-1 mb-1 block">Insira as seguintes informações:</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <input
              value={newCard.name}
              onChange={(event) => setNewCard((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Nome do cartão"
              className="w-full bg-[var(--color-bg)] border border-gray-800 p-3 rounded-xl text-sm text-gray-200 outline-none focus:border-[var(--color-accent)]/50"
            />
            <div className="relative">
              <input
                value={newCard.closingDay}
                onChange={(event) => setNewCard((prev) => ({ ...prev, closingDay: event.target.value }))}
                type="number"
                min="1"
                max="31"
                placeholder="Fechamento da fatura"
                className="no-spinner w-full bg-[var(--color-bg)] border border-gray-800 p-3 pr-10 rounded-xl text-sm text-gray-200 outline-none focus:border-[var(--color-accent)]/50"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col">
                <button type="button" onClick={() => updateNewCardClosingDay(1)} className="h-4 w-5 flex items-center justify-center text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]">
                  <ChevronUp size={14} />
                </button>
                <button type="button" onClick={() => updateNewCardClosingDay(-1)} className="h-4 w-5 flex items-center justify-center text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]">
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCreateCard}
              className="h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] text-[var(--color-bg)] font-bold uppercase text-[10px] tracking-widest"
            >
              <Plus size={14} />
              Adicionar cartão
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
          <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-gray-800 shadow-2xl">
            <div className="flex items-center justify-between gap-4 mb-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-accent)]">Cartões cadastrados</h2>
              {loading && <span className="text-[10px] uppercase tracking-widest text-gray-500">Carregando...</span>}
            </div>

            {loadError ? (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
                <p className="text-sm text-rose-300">{loadError}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {!loading && cards.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhum cartão cadastrado ainda.</p>
                ) : (
                  cards.map((card) => {
                    const isEditing = editingId === card.id;
                    const current = editingData[card.id] || card;

                    return (
                      <div key={card.id} className="rounded-2xl border border-gray-800 bg-[var(--color-bg)] p-5">
                        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr_auto] gap-4 items-center">
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Cartão</p>
                            {isEditing ? (
                              <input
                                value={current.name}
                                onChange={(event) => setEditingData((prev) => ({ ...prev, [card.id]: { ...current, name: event.target.value } }))}
                                className="w-full bg-[var(--color-surface)] border border-gray-700 p-3 rounded-xl text-sm text-gray-200 outline-none focus:border-[var(--color-accent)]/50"
                              />
                            ) : (
                              <>
                                <p className="text-base font-semibold text-gray-100">{card.name}</p>
                                <p className="text-xs text-gray-500 mt-1">Fechamento no dia {card.closingDay}</p>
                              </>
                            )}
                          </div>

                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">{isEditing ? 'Fechamento da fatura' : 'Total em faturas'}</p>
                            {isEditing ? (
                              <div className="relative">
                                <input
                                  type="number"
                                  min="1"
                                  max="31"
                                  value={current.closingDay}
                                  onChange={(event) => setEditingData((prev) => ({ ...prev, [card.id]: { ...current, closingDay: Number(event.target.value) } }))}
                                  className="no-spinner w-full bg-[var(--color-surface)] border border-gray-700 p-3 pr-10 rounded-xl text-sm text-gray-200 outline-none focus:border-[var(--color-accent)]/50"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col">
                                  <button type="button" onClick={() => setEditingData((prev) => ({ ...prev, [card.id]: { ...current, closingDay: Math.min(31, Math.max(1, Number(current.closingDay || 1) + 1)) } }))} className="h-4 w-5 flex items-center justify-center text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]">
                                    <ChevronUp size={14} />
                                  </button>
                                  <button type="button" onClick={() => setEditingData((prev) => ({ ...prev, [card.id]: { ...current, closingDay: Math.min(31, Math.max(1, Number(current.closingDay || 1) - 1)) } }))} className="h-4 w-5 flex items-center justify-center text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]">
                                    <ChevronDown size={14} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm font-semibold text-rose-300">{formatCurrency(card.outstandingAmount || 0)}</p>
                            )}
                          </div>

                          <div className="flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button type="button" onClick={() => handleSaveEdit(card.id)} className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-400/10"><Save size={18} /></button>
                                <button type="button" onClick={handleCancelEdit} className="p-2 rounded-lg text-gray-500 hover:bg-gray-500/10"><X size={18} /></button>
                              </>
                            ) : (
                              <>
                                <button type="button" onClick={() => handleStartEdit(card)} className="p-2 rounded-lg text-gray-400 hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"><Pencil size={18} /></button>
                                <button type="button" onClick={() => handleDelete(card.id)} className="p-2 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 size={18} /></button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-gray-800 shadow-2xl">
            <div className="flex items-center justify-between gap-4 mb-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-accent)]">Faturas futuras</h2>
              {!loading && <span className="text-[10px] uppercase tracking-widest text-gray-500">{futureStatements.length} prevista(s)</span>}
            </div>

            {loadError ? (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
                <p className="text-sm text-rose-300">{loadError}</p>
              </div>
            ) : futureStatements.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma fatura futura no momento.</p>
            ) : (
              <div className="space-y-4">
                {futureStatements.map((statement) => (
                  <div key={statement.id} className="rounded-2xl border border-gray-800 bg-[var(--color-bg)] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-base font-semibold text-gray-100">{statement.description}</p>
                        <p className="mt-1 text-xs text-gray-500">{statement.creditCard?.name || 'Cartão'} · entra no fluxo em {formatDate(statement.date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-rose-300">{formatCurrency(statement.amount)}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-widest text-gray-500">
                          {statement.statementMonth && statement.statementYear ? `${String(statement.statementMonth).padStart(2, '0')}/${statement.statementYear}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
