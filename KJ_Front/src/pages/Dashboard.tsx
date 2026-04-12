import { useEffect, useState, useCallback, useMemo } from 'react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2, Search, Filter, Trash2, Box } from 'lucide-react';
import { SummaryCard } from '../components/SummaryCard';
import { TransactionTable, TransactionTableHandle } from '../components/TransactionTable';
import { NewTransactionForm } from '../components/NewTransactionForm';
import { DashboardHeader } from '../components/DashboardHeader';
import { DatePicker } from '../components/DatePicker';
import { SelectDropdown } from '../components/SelectDropdown';
import { api } from '../lib/api';
import { useDialog } from '../components/DialogProvider';

export function Dashboard() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectionInfo, setSelectionInfo] = useState({ selectedCount: 0, editingCount: 0 });
  const [serverOnline, setServerOnline] = useState(true);
  const navigate = useNavigate();
  const dialog = useDialog();
  const tableRef = React.useRef<TransactionTableHandle | null>(null);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const hasActiveFilters = Boolean(
    search ||
    categoryFilter !== 'ALL' ||
    typeFilter !== 'ALL' ||
    startDate ||
    endDate,
  );

  const fetchData = useCallback(async () => {
    try {
      const [balanceRes, transactionsRes] = await Promise.all([
        api.get('/transactions/balance'),
        api.get('/transactions'),
      ]);
      setServerOnline(true);
      setBalance(balanceRes.data.balance);
      setTransactions(transactionsRes.data.transactions);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setServerOnline(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDeleteAllTransactions() {
    if (!transactions.length) {
      await dialog.alert({
        title: 'Nada para excluir',
        message: 'Não há registros para excluir.',
      });
      return;
    }

    const confirmed = await dialog.confirm({
      title: 'Excluir todos os registros',
      message: 'Deseja excluir permanentemente todos os registros do seu fluxo de caixa? Registros excluídos não podem ser recuperados.',
      confirmLabel: 'Excluir tudo',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });

    if (!confirmed) return;

    try {
      await api.delete('/transactions');
      await fetchData();
      await dialog.alert({
        title: 'Exclusão concluída',
        message: 'Todos os registros do fluxo de caixa foram excluídos com sucesso.',
      });
    } catch (err) {
      console.error('Erro ao excluir todos os registros:', err);
      await dialog.alert({
        title: 'Falha na exclusão',
        message: 'Não foi possível excluir todos os registros. Tente novamente.',
      });
    }
  }

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesSearch = transaction.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'ALL' || transaction.category === categoryFilter;
      const matchesType = typeFilter === 'ALL' || transaction.type === typeFilter;

      const transDate = new Date(transaction.date);
      const matchesStartDate = !startDate || transDate >= new Date(startDate + 'T00:00:00');
      const matchesEndDate = !endDate || transDate <= new Date(endDate + 'T23:59:59');

      return matchesSearch && matchesCategory && matchesType && matchesStartDate && matchesEndDate;
    });
  }, [transactions, search, categoryFilter, typeFilter, startDate, endDate]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col font-sans selection:bg-[#C0A060]/30">
      <DashboardHeader />

      <main className="w-full px-8 py-12">

        <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-light text-gray-100 tracking-tight">
                Dashboard <span className="font-bold text-[var(--color-accent)]">K&J</span>
              </h1>
              <p className="text-gray-500 text-sm mt-1 uppercase tracking-[0.2em]">Gestão Analítica de Capital</p>
            </div>
          </div>

          <div className="flex items-center gap-4 px-4 py-3 bg-[var(--color-surface)]/40 border border-gray-800 rounded-2xl shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Monitoramento</p>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${serverOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`}
                  />
                  <span className="text-[11px] text-gray-300 font-mono">
                    Servidor: {serverOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
              <div className="h-8 w-[1px] bg-gray-800 hidden xl:block"></div>
              <div className="hidden xl:block">
                <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Sincronização</p>
                <p className="text-[11px] text-gray-400 font-mono mt-1">Neon DB: {transactions.length} registros</p>
              </div>
            </div>
            <div className="text-right border-l border-gray-800 pl-6">
              <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Última Atualização</p>
              <p className="text-[11px] text-[var(--color-accent)] font-mono mt-1">{new Date().toLocaleTimeString('pt-BR')}</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <aside className="lg:col-span-2">
            <SummaryCard title="Patrimônio Líquido" amount={balance} type="total" />
          </aside>

          <div className="lg:col-span-10 space-y-8">
            <NewTransactionForm onTransactionCreated={fetchData} />
          </div>
        </div>

        <section className="bg-[var(--color-surface)] p-4 rounded-2xl border border-gray-800 shadow-2xl mt-8">
          <div className="sticky top-16 z-40 mb-8 border-b border-gray-800 bg-[var(--color-surface)]/95 px-6 pt-4 pb-6 backdrop-blur">
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[var(--color-accent)]/10 rounded-lg text-[var(--color-accent)]">
                      <Box size={18} />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-100 tracking-tight">Fluxo de caixa</h2>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-4 py-1 bg-[var(--color-bg)] border border-gray-800 rounded-full text-[10px] text-gray-400 font-mono uppercase">
                    {filteredTransactions.length} exibidos
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setCategoryFilter('ALL');
                      setTypeFilter('ALL');
                      setStartDate('');
                      setEndDate('');
                    }}
                    disabled={!hasActiveFilters}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-bg)] border border-gray-800 rounded-xl text-[10px] text-gray-300 font-bold uppercase tracking-[0.2em] transition-all duration-300 hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Limpar filtros
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAllTransactions}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-[10px] text-rose-400 font-bold uppercase tracking-[0.2em] transition-all duration-300 hover:bg-rose-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!transactions.length}
                    title="Excluir todos os registros"
                  >
                    <Trash2 size={14} />
                    Excluir tudo
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="lg:col-span-2 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                  <input
                    type="text"
                    placeholder="Filtrar descrição..."
                    name="transaction-search"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    className="w-full bg-[var(--color-bg)] border border-gray-800 p-2.5 pl-10 rounded-xl text-gray-200 text-xs focus:border-[var(--color-accent)]/50 outline-none transition-all"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="relative">
                  <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 z-10" size={14} />
                  <SelectDropdown
                    className="pl-9"
                    value={categoryFilter}
                    onChange={setCategoryFilter}
                    options={[
                      { value: 'ALL', label: 'Todos' },
                      { value: 'SALARY', label: 'Salário' },
                      { value: 'CREDIT_CARD', label: 'Cartão de Crédito' },
                      { value: 'HOUSING', label: 'Habitação' },
                      { value: 'TRANSPORT', label: 'Transporte' },
                      { value: 'FOOD', label: 'Alimentação' },
                      { value: 'HEALTH_WELLNESS', label: 'Saúde e Bem-estar' },
                      { value: 'LEISURE_ENTERTAINMENT', label: 'Lazer e entretenimento' },
                      { value: 'EDUCATION', label: 'Educação' },
                      { value: 'FINANCE_INVESTMENTS', label: 'Finanças e Investimentos' },
                      { value: 'OTHERS', label: 'Outros' },
                    ]}
                  />
                </div>

                <div className="relative">
                  <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 z-10" size={14} />
                  <SelectDropdown
                    className="pl-9"
                    value={typeFilter}
                    onChange={setTypeFilter}
                    options={[
                      { value: 'ALL', label: 'Crédito e Débito' },
                      { value: 'INCOME', label: 'Crédito' },
                      { value: 'EXPENSE', label: 'Débito' },
                    ]}
                  />
                </div>

                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Data inicial"
                />

                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="Data final"
                />
              </div>

              {(selectionInfo.selectedCount > 0 || selectionInfo.editingCount > 0) && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-800 bg-[var(--color-bg)] px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400">
                  <span>
                    {selectionInfo.selectedCount} selecionada(s)
                  </span>
                  <div className="flex items-center gap-2">
                    {selectionInfo.editingCount > 0 ? (
                      <>
                        <button
                          onClick={() => tableRef.current?.saveSelected()}
                          className="h-[30px] px-3 rounded-lg bg-[var(--color-accent)] text-[var(--color-bg)] font-bold"
                        >
                          Salvar edições
                        </button>
                        <button
                          onClick={() => tableRef.current?.cancelSelectedEdits()}
                          className="h-[30px] px-3 rounded-lg border border-gray-700 text-gray-300 hover:border-gray-500"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => tableRef.current?.editSelected()}
                          className="h-[30px] px-3 rounded-lg border border-[var(--color-accent)]/40 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
                        >
                          Editar selecionadas
                        </button>
                        <button
                          onClick={() => tableRef.current?.deleteSelected()}
                          className="h-[30px] px-3 rounded-lg border border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
                        >
                          Excluir selecionadas
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <TransactionTable
            ref={tableRef}
            transactions={filteredTransactions}
            onTransactionUpdated={fetchData}
            onSelectionChange={setSelectionInfo}
          />
        </section>
      </main>
    </div>
  );
}
