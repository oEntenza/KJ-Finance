import { ArrowUpCircle, ArrowDownCircle, Calendar, Tag, Edit3, Check, X, Trash2, Square, CheckSquare, ChevronUp, ChevronDown } from 'lucide-react';
import React, { useEffect, useMemo, useState, useImperativeHandle, forwardRef } from 'react';
import { api } from '../lib/api';
import { useDialog } from './DialogProvider';
import { DatePicker } from './DatePicker';
import { SelectDropdown } from './SelectDropdown';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  date: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  SALARY: 'Salário',
  CREDIT_CARD: 'Cartão de Crédito',
  HOUSING: 'Habitação',
  TRANSPORT: 'Transporte',
  FOOD: 'Alimentação',
  HEALTH_WELLNESS: 'Saúde e Bem-estar',
  LEISURE_ENTERTAINMENT: 'Lazer e entretenimento',
  EDUCATION: 'Educação',
  FINANCE_INVESTMENTS: 'Finanças e Investimentos',
  OTHERS: 'Outros',
};

interface TransactionTableProps {
  transactions: Transaction[];
  onTransactionUpdated: () => void;
  onSelectionChange?: (info: { selectedCount: number; editingCount: number }) => void;
}

export type TransactionTableHandle = {
  editSelected: () => void;
  deleteSelected: () => void;
  saveSelected: () => void;
  cancelSelectedEdits: () => void;
};

export const TransactionTable = forwardRef<TransactionTableHandle, TransactionTableProps>(function TransactionTable(
  { transactions, onTransactionUpdated, onSelectionChange }: TransactionTableProps,
  ref,
) {
  const [editingIds, setEditingIds] = useState<Set<string>>(new Set());
  const [editData, setEditData] = useState<Record<string, Partial<Transaction>>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const dialog = useDialog();

  const transactionMap = useMemo(() => {
    const map = new Map<string, Transaction>();
    transactions.forEach((transaction) => map.set(transaction.id, transaction));
    return map;
  }, [transactions]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => {
        if (transactionMap.has(id)) next.add(id);
      });
      return next;
    });

    setEditingIds((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => {
        if (transactionMap.has(id)) next.add(id);
      });
      return next;
    });
  }, [transactionMap]);

  useEffect(() => {
    onSelectionChange?.({ selectedCount: selectedIds.size, editingCount: editingIds.size });
  }, [selectedIds, editingIds, onSelectionChange]);

  useImperativeHandle(ref, () => ({
    editSelected: handleEditSelected,
    deleteSelected: handleDeleteSelected,
    saveSelected: handleSaveSelected,
    cancelSelectedEdits: handleCancelSelectedEdits,
  }));


  function handleStartEdit(transaction: Transaction) {
    setEditingIds((prev) => new Set(prev).add(transaction.id));
    setEditData((prev) => ({ ...prev, [transaction.id]: { ...transaction } }));
  }

  function handleCancelEdit(id: string) {
    setEditingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setEditData((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function handleSaveEdit(id: string) {
    const payload = editData[id];
    if (!payload) return;

    try {
      await api.put(`/transactions/${id}`, {
        ...payload,
        date: new Date(payload.date!).toISOString(),
      });

      setEditingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setEditData((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      onTransactionUpdated();
    } catch (err) {
      console.error(err);
      await dialog.alert({
        title: 'Falha na atualização',
        message: 'Erro ao atualizar no servidor K&J.',
      });
    }
  }

  async function handleSaveSelected() {
    if (editingIds.size === 0) return;

    try {
      await Promise.all(
        Array.from(editingIds).map((id) => {
          const payload = editData[id];
          if (!payload) return Promise.resolve();
          return api.put(`/transactions/${id}`, {
            ...payload,
            date: new Date(payload.date!).toISOString(),
          });
        }),
      );

      setEditingIds(new Set());
      setEditData({});
      onTransactionUpdated();
    } catch (err) {
      console.error(err);
      await dialog.alert({
        title: 'Falha na atualização',
        message: 'Erro ao atualizar registros no servidor K&J.',
      });
    }
  }

  function handleCancelSelectedEdits() {
    setEditingIds(new Set());
    setEditData({});
  }

  function adjustEditAmount(id: string, delta: number) {
    setEditData((prev) => {
      const fallback = transactionMap.get(id);
      const base = prev[id] ?? (fallback ? { ...fallback } : { amount: 0 });
      const current = Number(base.amount ?? 0);
      const nextAmount = Math.max(0, Number((current + delta).toFixed(2)));
      return { ...prev, [id]: { ...base, amount: nextAmount } };
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (prev.size === transactions.length) {
        return new Set();
      }
      return new Set(transactions.map((transaction) => transaction.id));
    });
  }

  async function handleDeleteSelected() {
    if (selectedIds.size === 0) return;

    const confirmed = await dialog.confirm({
      title: 'Excluir selecionadas',
      message: `Tem certeza que deseja excluir ${selectedIds.size} registro(s) do K&J Finance?`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });

    if (!confirmed) return;

    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => api.delete(`/transactions/${id}`)),
      );
      setSelectedIds(new Set());
      onTransactionUpdated();
    } catch (err) {
      console.error(err);
      await dialog.alert({
        title: 'Falha na exclusão',
        message: 'Erro ao excluir registros no servidor.',
      });
    }
  }

  function handleEditSelected() {
    if (selectedIds.size === 0) return;

    setEditingIds((prev) => {
      const next = new Set(prev);
      selectedIds.forEach((id) => next.add(id));
      return next;
    });

    setEditData((prev) => {
      const next = { ...prev };
      selectedIds.forEach((id) => {
        if (!next[id]) {
          const transaction = transactionMap.get(id);
          if (transaction) {
            next[id] = { ...transaction };
          }
        }
      });
      return next;
    });
  }

  async function handleDelete(id: string) {
    const confirmed = await dialog.confirm({
      title: 'Excluir registro',
      message: 'Deseja excluir permanentemente este registro do K&J Finance?',
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });

    if (!confirmed) return;

    try {
      await api.delete(`/transactions/${id}`);
      onTransactionUpdated();
    } catch (err) {
      console.error(err);
      await dialog.alert({
        title: 'Falha na exclusão',
        message: 'Erro ao excluir registro no servidor.',
      });
    }
  }

  return (
    <div className="custom-scroll mt-4 overflow-x-auto">
      <table className="w-full border-separate border-spacing-y-3 text-left">
        <thead>
          <tr className="text-[var(--color-accent)] uppercase text-[10px] tracking-[0.2em] font-bold">
            <th className="px-4 py-3">
              <button
                type="button"
                onClick={toggleSelectAll}
                role="checkbox"
                aria-checked={selectedIds.size > 0 && selectedIds.size === transactions.length}
                aria-label="Selecionar todas"
                className="text-[var(--color-accent)] hover:text-[var(--color-accent-strong)] transition-colors"
              >
                {selectedIds.size > 0 && selectedIds.size === transactions.length ? (
                  <CheckSquare size={18} />
                ) : (
                  <Square size={18} />
                )}
              </button>
            </th>
            <th className="px-6 py-3">Descrição</th>
            <th className="px-6 py-3">Valor</th>
            <th className="px-6 py-3">Categoria</th>
            <th className="px-6 py-3">Data</th>
            <th className="px-6 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => {
            const isEditing = editingIds.has(transaction.id);
            const currentEdit = editData[transaction.id] || transaction;
            const isSelected = selectedIds.has(transaction.id);

            return (
              <tr
                key={transaction.id}
                className={`bg-[var(--color-bg)] transition-all duration-300 border border-transparent 
                  ${isEditing ? 'ring-1 ring-[var(--color-accent)]/50 shadow-[0_0_15px_rgba(192,160,96,0.15)]' : 'hover:bg-[var(--color-surface)] hover:border-[var(--color-accent)]/20'}`}
              >
                <td className="px-4 py-4 rounded-l-xl border-y border-l border-gray-800/50">
                  <button
                    type="button"
                    onClick={() => toggleSelect(transaction.id)}
                    role="checkbox"
                    aria-checked={isSelected}
                    aria-label={`Selecionar ${transaction.description}`}
                    className="text-[var(--color-accent)] hover:text-[var(--color-accent-strong)] transition-colors"
                  >
                    {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                </td>
                <td className="px-6 py-4 border-y border-gray-800/50">
                  {isEditing ? (
                    <input
                      className="bg-[var(--color-surface)] border border-gray-700 rounded px-2 py-1 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] w-full"
                      value={currentEdit.description}
                      onChange={(e) => setEditData((prev) => ({
                        ...prev,
                        [transaction.id]: { ...currentEdit, description: e.target.value },
                      }))}
                    />
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className={transaction.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}>
                        {transaction.type === 'INCOME' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                      </div>
                      <span className="font-medium text-gray-200">{transaction.description}</span>
                    </div>
                  )}
                </td>

                <td className={`px-6 py-4 border-y border-gray-800/50 font-bold ${transaction.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isEditing ? (
                    <div className="relative w-28">
                      <input
                        type="number"
                        className="no-spinner bg-[var(--color-surface)] border border-gray-700 rounded px-2 py-1 pr-7 text-sm text-[var(--color-text)] w-full outline-none focus:border-[var(--color-accent)]"
                        value={currentEdit.amount}
                        onChange={(e) => setEditData((prev) => ({
                          ...prev,
                          [transaction.id]: { ...currentEdit, amount: Number(e.target.value) },
                        }))}
                      />
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col">
                        <button
                          type="button"
                          onClick={() => adjustEditAmount(transaction.id, 1)}
                          className="h-4 w-5 flex items-center justify-center text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]"
                          aria-label="Aumentar valor"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustEditAmount(transaction.id, -1)}
                          className="h-4 w-5 flex items-center justify-center text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]"
                          aria-label="Diminuir valor"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount)
                  )}
                </td>

                <td className="px-6 py-4 border-y border-gray-800/50">
                  {isEditing ? (
                    <SelectDropdown
                      value={String(currentEdit.category ?? '')}
                      onChange={(value) => setEditData((prev) => ({
                        ...prev,
                        [transaction.id]: { ...currentEdit, category: value as any },
                      }))}
                      options={[
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
                  ) : (
                    <div className="flex items-center gap-2 text-gray-400 italic text-sm">
                      <Tag size={14} className="opacity-50" />
                      <span>{CATEGORY_LABELS[transaction.category] ?? transaction.category}</span>
                    </div>
                  )}
                </td>

                <td className="px-6 py-4 border-y border-gray-800/50 text-gray-500 text-xs font-mono">
                  {isEditing ? (
                    <DatePicker
                      value={currentEdit.date?.split('T')[0] || ''}
                      onChange={(value) => setEditData((prev) => ({
                        ...prev,
                        [transaction.id]: { ...currentEdit, date: value },
                      }))}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      {new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(transaction.date))}
                    </div>
                  )}
                </td>

                <td className="px-6 py-4 rounded-r-xl border-y border-r border-gray-800/50 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {isEditing ? (
                      <>
                        <button onClick={() => handleSaveEdit(transaction.id)} className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-all">
                          <Check size={18} />
                        </button>
                        <button onClick={() => handleCancelEdit(transaction.id)} className="p-1.5 text-gray-500 hover:bg-gray-500/10 rounded-md transition-all">
                          <X size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartEdit(transaction)}
                          className="p-1.5 text-gray-500 hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded-md transition-all"
                          title="Editar"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.id)}
                          className="p-1.5 text-gray-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});
