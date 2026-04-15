import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CreditCard,
  Edit3,
  Square,
  Tag,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import { useDialog } from './DialogProvider';
import { DatePicker } from './DatePicker';
import { SelectDropdown } from './SelectDropdown';
import { CATEGORY_LABELS, CATEGORY_OPTIONS, PAYMENT_METHOD_LABELS, PAYMENT_METHOD_OPTIONS } from '../lib/finance';

interface CreditCardSummary {
  id: string;
  name: string;
  closingDay: number;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  paymentMethod: string;
  date: string;
  isCardStatement?: boolean;
  statementMonth?: number | null;
  statementYear?: number | null;
  parentTransactionId?: string | null;
  creditCard?: CreditCardSummary | null;
  childTransactions?: Transaction[];
}

interface CreditCardItem {
  id: string;
  name: string;
  closingDay: number;
}

interface EditableTransaction extends Transaction {
  creditCardId?: string | null;
}

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

function currency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(date));
}

export const TransactionTable = forwardRef<TransactionTableHandle, TransactionTableProps>(function TransactionTable(
  { transactions, onTransactionUpdated, onSelectionChange },
  ref,
) {
  const [editingIds, setEditingIds] = useState<Set<string>>(new Set());
  const [editData, setEditData] = useState<Record<string, EditableTransaction>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedStatements, setExpandedStatements] = useState<Set<string>>(new Set());
  const [cards, setCards] = useState<CreditCardItem[]>([]);
  const dialog = useDialog();

  const selectableTransactions = useMemo(() => {
    const items: Transaction[] = [];

    function collect(transactionList: Transaction[]) {
      transactionList.forEach((transaction) => {
        if (transaction.isCardStatement) {
          collect(transaction.childTransactions || []);
          return;
        }
        items.push(transaction);
      });
    }

    collect(transactions);
    return items;
  }, [transactions]);

  const transactionMap = useMemo(() => {
    const map = new Map<string, Transaction>();

    function collect(transactionList: Transaction[]) {
      transactionList.forEach((transaction) => {
        map.set(transaction.id, transaction);
        if (transaction.childTransactions?.length) {
          collect(transaction.childTransactions);
        }
      });
    }

    collect(transactions);
    return map;
  }, [transactions]);

  useEffect(() => {
    api.get('/credit-cards')
      .then((response) => setCards(response.data.cards || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    setSelectedIds((prev) => new Set(Array.from(prev).filter((id) => transactionMap.has(id))));
    setEditingIds((prev) => new Set(Array.from(prev).filter((id) => transactionMap.has(id))));
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

  function setTransactionEdit(id: string, updater: (current: EditableTransaction) => EditableTransaction) {
    setEditData((prev) => {
      const fallback = transactionMap.get(id);
      if (!fallback) return prev;
      const base: EditableTransaction = prev[id] || {
        ...fallback,
        creditCardId: fallback.creditCard?.id || null,
      };
      return { ...prev, [id]: updater(base) };
    });
  }

  function toggleExpand(statementId: string) {
    setExpandedStatements((prev) => {
      const next = new Set(prev);
      if (next.has(statementId)) next.delete(statementId);
      else next.add(statementId);
      return next;
    });
  }

  function handleStartEdit(transaction: Transaction) {
    if (transaction.isCardStatement) return;

    setEditingIds((prev) => new Set(prev).add(transaction.id));
    setEditData((prev) => ({
      ...prev,
      [transaction.id]: {
        ...transaction,
        creditCardId: transaction.creditCard?.id || null,
      },
    }));
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

  async function saveTransaction(id: string) {
    const payload = editData[id];
    if (!payload) return;

    if (payload.paymentMethod === 'CREDIT_CARD' && payload.type !== 'EXPENSE') {
      await dialog.alert({
        title: 'Natureza inválida',
        message: 'Lançamentos em cartão de crédito devem ser do tipo débito.',
      });
      return;
    }

    if (payload.paymentMethod === 'CREDIT_CARD' && !payload.creditCardId) {
      await dialog.alert({
        title: 'Cartão obrigatório',
        message: 'Selecione o cartão de crédito para continuar.',
      });
      return;
    }

    await api.put(`/transactions/${id}`, {
      description: payload.description,
      amount: Number(payload.amount),
      type: payload.type,
      category: payload.category,
      paymentMethod: payload.paymentMethod,
      creditCardId: payload.paymentMethod === 'CREDIT_CARD' ? payload.creditCardId : null,
      date: new Date(`${payload.date.split('T')[0]}T12:00:00`).toISOString(),
    });

    handleCancelEdit(id);
    onTransactionUpdated();
  }

  async function handleSaveEdit(id: string) {
    try {
      await saveTransaction(id);
    } catch (error) {
      console.error(error);
      await dialog.alert({
        title: 'Falha na atualização',
        message: 'Erro ao atualizar no servidor K&J.',
      });
    }
  }

  async function handleSaveSelected() {
    if (editingIds.size === 0) return;

    try {
      for (const id of editingIds) {
        await saveTransaction(id);
      }
      setEditingIds(new Set());
      setEditData({});
      onTransactionUpdated();
    } catch (error) {
      console.error(error);
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
    setTransactionEdit(id, (current) => ({
      ...current,
      amount: Math.max(0, Number((Number(current.amount || 0) + delta).toFixed(2))),
    }));
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (prev.size === selectableTransactions.length) {
        return new Set();
      }
      return new Set(selectableTransactions.map((transaction) => transaction.id));
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
      await Promise.all(Array.from(selectedIds).map((id) => api.delete(`/transactions/${id}`)));
      setSelectedIds(new Set());
      onTransactionUpdated();
    } catch (error) {
      console.error(error);
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
            next[id] = {
              ...transaction,
              creditCardId: transaction.creditCard?.id || null,
            };
          }
        }
      });
      return next;
    });
  }

  async function handleDelete(transaction: Transaction) {
    const confirmed = await dialog.confirm({
      title: transaction.isCardStatement ? 'Excluir fatura' : 'Excluir registro',
      message: transaction.isCardStatement
        ? 'Deseja excluir a fatura e todos os lançamentos vinculados a ela?'
        : 'Deseja excluir permanentemente este registro do K&J Finance?',
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });

    if (!confirmed) return;

    try {
      await api.delete(`/transactions/${transaction.id}`);
      onTransactionUpdated();
    } catch (error) {
      console.error(error);
      await dialog.alert({
        title: 'Falha na exclusão',
        message: 'Erro ao excluir registro no servidor.',
      });
    }
  }

  function renderPaymentMethodText(transaction: Transaction) {
    if (transaction.isCardStatement) {
      return `Cartão de Crédito · ${transaction.creditCard?.name || 'Cartão'}`;
    }

    if (transaction.paymentMethod === 'CREDIT_CARD') {
      return `${PAYMENT_METHOD_LABELS[transaction.paymentMethod] ?? transaction.paymentMethod} · ${transaction.creditCard?.name || 'Cartão'}`;
    }

    return PAYMENT_METHOD_LABELS[transaction.paymentMethod] ?? transaction.paymentMethod;
  }

  function renderLeafRow(
    transaction: Transaction,
    options?: { isChild?: boolean; isLastChild?: boolean },
  ) {
    const isChild = options?.isChild ?? false;
    const isLastChild = options?.isLastChild ?? false;
    const isEditing = editingIds.has(transaction.id);
    const currentEdit = editData[transaction.id] || { ...transaction, creditCardId: transaction.creditCard?.id || null };
    const isSelected = selectedIds.has(transaction.id);

    const rowClass = isChild
      ? `bg-[var(--color-surface)]/55 transition-all duration-300 ${
          isEditing
            ? 'ring-1 ring-inset ring-[var(--color-accent)]/45 shadow-[0_0_15px_rgba(192,160,96,0.12)]'
            : 'hover:bg-[var(--color-surface)]/72'
        }`
      : `bg-[var(--color-bg)] transition-all duration-300 ${
          isEditing
            ? 'ring-1 ring-[var(--color-accent)]/50 shadow-[0_0_15px_rgba(192,160,96,0.15)]'
            : 'hover:bg-[var(--color-surface)] hover:border-[var(--color-accent)]/20'
        }`;

    const leftCellClass = isChild
      ? `px-4 py-4 border-l border-[#c8a75a]/90 ${isLastChild ? 'border-b rounded-bl-xl' : ''}`
      : 'px-4 py-4 rounded-l-xl border-y border-l border-gray-800/50';

    const middleCellClass = isChild
      ? `px-6 py-4 ${isLastChild ? 'border-b border-[#c8a75a]/90' : ''}`
      : 'px-6 py-4 border-y border-gray-800/50';

    const rightCellClass = isChild
      ? `px-6 py-4 border-r border-[#c8a75a]/90 text-right ${isLastChild ? 'border-b rounded-br-xl' : ''}`
      : 'px-6 py-4 rounded-r-xl border-y border-r border-gray-800/50 text-right';

    return (
      <tr key={transaction.id} className={rowClass}>
        <td className={leftCellClass}>
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
        <td className={middleCellClass}>
          {isEditing ? (
            <input
              className="bg-[var(--color-surface)] border border-gray-700 rounded px-2 py-1 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] w-full"
              value={currentEdit.description}
              onChange={(event) => setTransactionEdit(transaction.id, (current) => ({ ...current, description: event.target.value }))}
            />
          ) : (
            <div className={`flex items-center gap-4 ${isChild ? 'pl-2' : ''}`}>
              <div className={transaction.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}>
                {transaction.type === 'INCOME' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
              </div>
              <div>
                <span className="font-medium text-gray-200">{transaction.description}</span>
                {isChild && <p className="mt-1 text-[10px] uppercase tracking-widest text-[var(--color-accent)]/75">Compra vinculada à fatura</p>}
              </div>
            </div>
          )}
        </td>
        <td className={`${middleCellClass} font-bold ${transaction.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isEditing ? (
            <div className="relative w-28">
              <input
                type="number"
                className="no-spinner bg-[var(--color-surface)] border border-gray-700 rounded px-2 py-1 pr-7 text-sm text-[var(--color-text)] w-full outline-none focus:border-[var(--color-accent)]"
                value={currentEdit.amount}
                onChange={(event) => setTransactionEdit(transaction.id, (current) => ({ ...current, amount: Number(event.target.value) }))}
              />
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col">
                <button type="button" onClick={() => adjustEditAmount(transaction.id, 1)} className="h-4 w-5 flex items-center justify-center text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]" aria-label="Aumentar valor"><ChevronUp size={14} /></button>
                <button type="button" onClick={() => adjustEditAmount(transaction.id, -1)} className="h-4 w-5 flex items-center justify-center text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]" aria-label="Diminuir valor"><ChevronDown size={14} /></button>
              </div>
            </div>
          ) : (
            currency(transaction.amount)
          )}
        </td>
        <td className={middleCellClass}>
          {isEditing ? (
            <SelectDropdown
              value={String(currentEdit.type ?? '')}
              onChange={(value) => setTransactionEdit(transaction.id, (current) => ({ ...current, type: value as 'INCOME' | 'EXPENSE' }))}
              options={[
                { value: 'INCOME', label: 'Crédito' },
                { value: 'EXPENSE', label: 'Débito' },
              ]}
            />
          ) : (
            <span className={`text-sm font-medium ${transaction.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {transaction.type === 'INCOME' ? 'Crédito' : 'Débito'}
            </span>
          )}
        </td>
        <td className={middleCellClass}>
          {isEditing ? (
            <SelectDropdown
              value={String(currentEdit.category ?? '')}
              onChange={(value) => setTransactionEdit(transaction.id, (current) => ({ ...current, category: value }))}
              options={[...CATEGORY_OPTIONS]}
            />
          ) : (
            <div className="flex items-center gap-2 text-sm italic text-gray-400">
              <Tag size={14} className="opacity-50" />
              <span>{CATEGORY_LABELS[transaction.category] ?? transaction.category}</span>
            </div>
          )}
        </td>
        <td className={`${middleCellClass} text-sm text-gray-300`}>
          {isEditing ? (
            <div className="space-y-2">
              <SelectDropdown
                value={String(currentEdit.paymentMethod ?? '')}
                onChange={(value) =>
                  setTransactionEdit(transaction.id, (current) => ({
                    ...current,
                    paymentMethod: value,
                    type: value === 'CREDIT_CARD' ? 'EXPENSE' : current.type,
                    creditCardId: value === 'CREDIT_CARD' ? current.creditCardId ?? cards[0]?.id ?? null : null,
                  }))
                }
                options={[...PAYMENT_METHOD_OPTIONS]}
              />
              {currentEdit.paymentMethod === 'CREDIT_CARD' && (
                <SelectDropdown
                  value={currentEdit.creditCardId || ''}
                  onChange={(value) => setTransactionEdit(transaction.id, (current) => ({ ...current, creditCardId: value }))}
                  placeholder="Selecione um cartão"
                  options={cards.map((card) => ({ value: card.id, label: `${card.name} ? Fecha dia ${card.closingDay}` }))}
                />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <WalletCards size={14} className="text-gray-500" />
              <span>{renderPaymentMethodText(transaction)}</span>
            </div>
          )}
        </td>
        <td className={`${middleCellClass} text-xs font-mono text-gray-500`}>
          {isEditing ? (
            <DatePicker
              value={currentEdit.date?.split('T')[0] || ''}
              onChange={(value) => setTransactionEdit(transaction.id, (current) => ({ ...current, date: value }))}
            />
          ) : (
            <div className="flex items-center gap-2">
              <Calendar size={14} />
              {formatDate(transaction.date)}
            </div>
          )}
        </td>
        <td className={rightCellClass}>
          <div className="flex items-center justify-end gap-2">
            {isEditing ? (
              <>
                <button type="button" onClick={() => handleSaveEdit(transaction.id)} className="rounded-md p-1.5 text-emerald-400 transition-all hover:bg-emerald-400/10"><Check size={18} /></button>
                <button type="button" onClick={() => handleCancelEdit(transaction.id)} className="rounded-md p-1.5 text-gray-500 transition-all hover:bg-gray-500/10"><X size={18} /></button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => handleStartEdit(transaction)} className="rounded-md p-1.5 text-gray-500 transition-all hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)]" title="Editar"><Edit3 size={18} /></button>
                <button type="button" onClick={() => handleDelete(transaction)} className="rounded-md p-1.5 text-gray-500 transition-all hover:bg-rose-500/10 hover:text-rose-500" title="Excluir"><Trash2 size={18} /></button>
              </>
            )}
          </div>
        </td>
      </tr>
    );
  }

  function renderStatementRow(statement: Transaction) {
    const isExpanded = expandedStatements.has(statement.id);
    const purchasesCount = statement.childTransactions?.length || 0;
    const groupedChildren = statement.childTransactions || [];

    return (
      <React.Fragment key={statement.id}>
        <tr className="bg-[var(--color-surface)]/95">
          <td className={`px-4 py-4 border-l border-t border-[#c8a75a]/90 ${isExpanded ? '' : 'border-b rounded-bl-xl'} rounded-tl-xl`}>
            <button
              type="button"
              onClick={() => toggleExpand(statement.id)}
              className="text-[var(--color-accent)] hover:text-[var(--color-accent-strong)] transition-colors"
              aria-label={isExpanded ? 'Recolher fatura' : 'Expandir fatura'}
            >
              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
          </td>
          <td className={`px-6 py-4 border-t border-[#c8a75a]/90 ${isExpanded ? '' : 'border-b'} text-[var(--color-accent-strong)]`}>
            <div className="flex items-center gap-4">
              <div className="text-[var(--color-accent)]">
                <CreditCard size={20} />
              </div>
              <div>
                <span className="font-semibold">{statement.description}</span>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-gray-500">{purchasesCount} lançamento(s) consolidado(s)</p>
              </div>
            </div>
          </td>
          <td className={`px-6 py-4 border-t border-[#c8a75a]/90 ${isExpanded ? '' : 'border-b'} font-bold text-rose-400`}>
            {currency(statement.amount)}
          </td>
          <td className={`px-6 py-4 border-t border-[#c8a75a]/90 ${isExpanded ? '' : 'border-b'}`}>
            <span className="text-sm font-medium text-rose-400">Débito</span>
          </td>
          <td className={`px-6 py-4 border-t border-[#c8a75a]/90 ${isExpanded ? '' : 'border-b'} text-sm text-gray-300`}>Fatura consolidada</td>
          <td className={`px-6 py-4 border-t border-[#c8a75a]/90 ${isExpanded ? "" : "border-b"} text-sm text-gray-300`}>Cartão de Crédito · {statement.creditCard?.name || "Cartão"}</td>
          <td className={`px-6 py-4 border-t border-[#c8a75a]/90 ${isExpanded ? '' : 'border-b'} text-xs font-mono text-gray-500`}>
            <div className="flex items-center gap-2">
              <Calendar size={14} />
              {formatDate(statement.date)}
            </div>
          </td>
          <td className={`px-6 py-4 border-r border-t border-[#c8a75a]/90 ${isExpanded ? '' : 'border-b rounded-br-xl'} rounded-tr-xl text-right`}>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => handleDelete(statement)} className="rounded-md p-1.5 text-gray-500 transition-all hover:bg-rose-500/10 hover:text-rose-500" title="Excluir fatura e lançamentos"><Trash2 size={18} /></button>
            </div>
          </td>
        </tr>
        {isExpanded && groupedChildren.map((child, index) => renderLeafRow(child, { isChild: true, isLastChild: index === groupedChildren.length - 1 }))}
      </React.Fragment>
    );
  }

  return (
    <div className="custom-scroll mt-4 overflow-x-auto">
      <table className="w-full min-w-[1450px] border-separate border-spacing-y-3 text-left">
        <thead>
          <tr className="text-[var(--color-accent)] uppercase text-[10px] tracking-[0.2em] font-bold">
            <th className="px-4 py-3">
              <button
                type="button"
                onClick={toggleSelectAll}
                role="checkbox"
                aria-checked={selectedIds.size > 0 && selectedIds.size === selectableTransactions.length}
                aria-label="Selecionar todas"
                className="text-[var(--color-accent)] hover:text-[var(--color-accent-strong)] transition-colors"
              >
                {selectableTransactions.length > 0 && selectedIds.size === selectableTransactions.length ? (
                  <CheckSquare size={18} />
                ) : (
                  <Square size={18} />
                )}
              </button>
            </th>
            <th className="px-6 py-3">Descrição</th>
            <th className="px-6 py-3">Valor</th>
            <th className="px-6 py-3">Natureza</th>
            <th className="px-6 py-3">Categoria</th>
            <th className="px-6 py-3">Meio de pagamento</th>
            <th className="px-6 py-3">Data</th>
            <th className="px-6 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            transaction.isCardStatement ? renderStatementRow(transaction) : renderLeafRow(transaction)
          ))}
        </tbody>
      </table>
    </div>
  );
});
