import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { PlusCircle, DollarSign, Activity, Upload, ChevronUp, ChevronDown, CreditCard } from 'lucide-react';
import { api } from '../lib/api';
import { useDialog } from './DialogProvider';
import { DatePicker } from './DatePicker';
import { SelectDropdown } from './SelectDropdown';
import { CATEGORY_OPTIONS, CATEGORY_LABELS, PAYMENT_METHOD_OPTIONS, normalizeCategoryInput, normalizePaymentMethodInput } from '../lib/finance';

const CATEGORY_VALUES = CATEGORY_OPTIONS.map((option) => option.value) as [string, ...string[]];
const PAYMENT_METHOD_VALUES = PAYMENT_METHOD_OPTIONS.map((option) => option.value) as [string, ...string[]];

const newTransactionFormSchema = z.object({
  description: z.string().min(1, 'Obrigatório'),
  amount: z.number({ required_error: 'Obrigatório', invalid_type_error: 'Informe um valor válido' }).min(0.01, 'Mínimo R$0,01'),
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.enum(CATEGORY_VALUES),
  paymentMethod: z.enum(PAYMENT_METHOD_VALUES),
  creditCardId: z.string().optional(),
  installments: z.number().int().min(1).max(24).default(1),
  date: z.string().min(1, 'Obrigatório'),
});

type NewTransactionFormInputs = z.infer<typeof newTransactionFormSchema>;

interface NewTransactionFormProps {
  onTransactionCreated: () => void;
}

interface CreditCardItem {
  id: string;
  name: string;
  limit: number;
  closingDay: number;
}

export function NewTransactionForm({ onTransactionCreated }: NewTransactionFormProps) {
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkFileName, setBulkFileName] = useState<string | null>(null);
  const [bulkFileData, setBulkFileData] = useState<ArrayBuffer | null>(null);
  const [cards, setCards] = useState<CreditCardItem[]>([]);
  const [newCardName, setNewCardName] = useState('');
  const [newCardLimit, setNewCardLimit] = useState('');
  const [newCardClosingDay, setNewCardClosingDay] = useState('');
  const dialog = useDialog();
  const navigate = useNavigate();

  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting, errors } } = useForm<NewTransactionFormInputs>({
    resolver: zodResolver(newTransactionFormSchema),
    defaultValues: { type: 'INCOME', category: 'OTHERS', paymentMethod: 'CASH', creditCardId: '', installments: 1 },
  });

  const amountValue = watch('amount');
  const selectedDate = watch('date');
  const selectedType = watch('type');
  const selectedCategory = watch('category');
  const selectedPaymentMethod = watch('paymentMethod');
  const selectedCreditCardId = watch('creditCardId');
  const selectedInstallments = watch('installments') || 1;

  const fieldErrorClass = 'pointer-events-none absolute left-2 top-0 z-20 -translate-y-[calc(100%+0.55rem)] whitespace-nowrap rounded-xl border border-[var(--color-accent)]/70 bg-[var(--color-bg)] px-3 py-1.5 text-[10px] font-semibold text-[var(--color-accent)] shadow-[0_10px_30px_rgba(0,0,0,0.35)]';

  function renderFieldError(message?: string) {
    if (!message) return null;

    return (
      <div className={fieldErrorClass}>
        <span>{message}</span>
        <span className="absolute left-4 top-full h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-r border-b border-[var(--color-accent)]/70 bg-[var(--color-bg)]" />
      </div>
    );
  }

  useEffect(() => {
    fetchCards().catch(console.error);
  }, []);

  async function fetchCards() {
    const response = await api.get('/credit-cards');
    setCards(response.data.cards || []);
  }

  function handleCardLimitChange(value: string) {
    if (!value) {
      setNewCardLimit('');
      return;
    }

    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    setNewCardLimit(String(Math.max(0, parsed)));
  }

  function updateCardLimit(delta: number) {
    const current = Number(newCardLimit || 0);
    setNewCardLimit(String(Math.max(0, current + delta)));
  }

  function handleClosingDayChange(value: string) {
    if (!value) {
      setNewCardClosingDay('');
      return;
    }

    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    setNewCardClosingDay(String(Math.min(31, Math.max(1, parsed))));
  }

  function updateClosingDay(delta: number) {
    const current = Number(newCardClosingDay || 1);
    setNewCardClosingDay(String(Math.min(31, Math.max(1, current + delta))));
  }

  function updateInstallments(delta: number) {
    const current = Number(selectedInstallments || 1);
    setValue('installments', Math.min(24, Math.max(1, current + delta)), { shouldValidate: true });
  }

  function normalizeHeader(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  function parseAmount(value: string | number) {
    if (typeof value === 'number') return value;
    const raw = String(value).trim();
    if (!raw) return NaN;
    const hasComma = raw.includes(',');
    const hasDot = raw.includes('.');
    if (hasComma && hasDot) return Number(raw.replace(/\./g, '').replace(',', '.'));
    if (hasComma) return Number(raw.replace(',', '.'));
    return Number(raw);
  }

  function parseDate(rawDate: any, rowIndex: number) {
    if (rawDate instanceof Date) {
      const year = rawDate.getFullYear();
      const month = String(rawDate.getMonth() + 1).padStart(2, '0');
      const day = String(rawDate.getDate()).padStart(2, '0');
      return new Date(`${year}-${month}-${day}T12:00:00`).toISOString();
    }

    if (typeof rawDate === 'number') {
      const parsed = XLSX.SSF.parse_date_code(rawDate);
      if (!parsed) {
        throw new Error(`Linha ${rowIndex + 2}: Data inválida.`);
      }
      const month = String(parsed.m).padStart(2, '0');
      const day = String(parsed.d).padStart(2, '0');
      return new Date(`${parsed.y}-${month}-${day}T12:00:00`).toISOString();
    }

    const value = String(rawDate ?? '').trim();
    if (!value) {
      throw new Error(`Linha ${rowIndex + 2}: Data obrigatória.`);
    }

    const formatted = value.includes('/')
      ? value.split('/').reverse().join('-')
      : value;

    const date = new Date(`${formatted}T12:00:00`);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`Linha ${rowIndex + 2}: Data "${value}" inválida.`);
    }

    return date.toISOString();
  }

  async function ensureCreditCardForSingleEntry() {
    if (selectedPaymentMethod !== 'CREDIT_CARD') return null;

    if (cards.length > 0) {
      if (!selectedCreditCardId) {
        throw new Error('Selecione um cartão de crédito.');
      }
      return selectedCreditCardId;
    }

    if (!newCardName || !newCardClosingDay) {
      throw new Error('Informe o nome do cartão e o dia de fechamento da fatura.');
    }

    const response = await api.post('/credit-cards', {
      name: newCardName,
      limit: Number(newCardLimit || 0),
      closingDay: Number(newCardClosingDay),
    });

    const newCard = response.data as CreditCardItem;
    await fetchCards();
    setValue('creditCardId', newCard.id, { shouldValidate: true });
    return newCard.id;
  }

  async function handleBulkInsert() {
    if (!bulkFileData) {
      await dialog.alert({ title: 'Arquivo obrigatório', message: 'Selecione uma planilha do Excel para continuar.' });
      return;
    }

    try {
      const workbook = XLSX.read(bulkFileData, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) throw new Error('A planilha está vazia.');

      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: true }) as Array<Array<string | number | Date>>;
      if (rows.length < 2) throw new Error('A planilha precisa ter pelo menos uma linha de dados.');

      const headers = rows[0].map((cell) => normalizeHeader(String(cell || '')));
      const mapIndex = (key: string) => headers.indexOf(normalizeHeader(key));

      const descIndex = mapIndex('descricao');
      const amountIndex = mapIndex('valor');
      const typeIndex = mapIndex('tipo');
      const categoryIndex = mapIndex('categoria');
      const dateIndex = mapIndex('data');
      const paymentMethodIndex = mapIndex('meiodepagamento');

      if ([descIndex, amountIndex, typeIndex, categoryIndex, dateIndex, paymentMethodIndex].some((value) => value === -1)) {
        throw new Error('Cabeçalhos inválidos. Use: Descrição, Valor, Tipo, Categoria, Data, Meio de Pagamento.');
      }

      const dataRows = rows.slice(1).filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''));
      const orderedCards = [...cards];

      const transactions = dataRows.map((row, rowIndex) => {
        const description = String(row[descIndex] ?? '').trim();
        const rawType = String(row[typeIndex] ?? '').trim();
        const rawCategory = String(row[categoryIndex] ?? '').trim();
        const rawPaymentMethod = String(row[paymentMethodIndex] ?? '').trim();

        if (!description || !rawType || !rawCategory || !rawPaymentMethod) {
          throw new Error(`Linha ${rowIndex + 2} incompleta. Verifique os dados.`);
        }

        const amount = parseAmount(row[amountIndex] as any);
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error(`Linha ${rowIndex + 2}: valor inválido.`);
        }

        const type = rawType.toLowerCase().includes('cr') ? 'INCOME' : rawType.toLowerCase().includes('dé') || rawType.toLowerCase().includes('de') ? 'EXPENSE' : rawType.toUpperCase();
        const category = normalizeCategoryInput(rawCategory);
        if (!category) {
          throw new Error(`Linha ${rowIndex + 2}: categoria inválida.`);
        }

        const payment = normalizePaymentMethodInput(rawPaymentMethod);
        if (!payment) {
          throw new Error(`Linha ${rowIndex + 2}: meio de pagamento inválido.`);
        }

        let creditCardId: string | null = null;
        if (payment.paymentMethod === 'CREDIT_CARD') {
          if (payment.creditIndex) {
            const card = orderedCards[payment.creditIndex - 1];
            if (!card) {
              throw new Error(`Erro na linha ${rowIndex + 2}: o meio de pagamento ${rawPaymentMethod} não corresponde a nenhum cartão cadastrado, confirme se o cartão ja está configurado na plataforma.`);
            }
            creditCardId = card.id;
          } else if (orderedCards.length === 1) {
            creditCardId = orderedCards[0].id;
          } else {
            throw new Error(`Erro na linha ${rowIndex + 2}: use credito1, credito2, credito3... para identificar o cartão.`);
          }
        }

        return {
          description,
          amount,
          type: type as 'INCOME' | 'EXPENSE',
          category,
          paymentMethod: payment.paymentMethod,
          creditCardId,
          date: parseDate(row[dateIndex], rowIndex),
        };
      });

      await api.post('/transactions/bulk', { transactions });
      setBulkFileName(null);
      setBulkFileData(null);
      setIsBulkModalOpen(false);
      onTransactionCreated();
      await dialog.alert({ title: 'Importação concluída', message: 'A importação em massa foi realizada com sucesso!' });
    } catch (err: any) {
      await dialog.alert({
        title: 'Falha na importação',
        message: err.response?.data?.detail || err.response?.data?.message || err.message || 'Erro na formatação dos dados.',
      });
    }
  }

  function handleDownloadTemplate() {
    const headers = ['Descrição', 'Valor', 'Tipo', 'Categoria', 'Data', 'Meio de Pagamento'];
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo');
    XLSX.writeFile(workbook, 'modelo-importacao.xlsx');
  }

  async function handleCreateNewTransaction(data: NewTransactionFormInputs) {
    try {
      if (data.paymentMethod === 'CREDIT_CARD' && data.type !== 'EXPENSE') {
        throw new Error('Lançamentos em cartão de crédito devem ser do tipo débito.');
      }

      let creditCardId = data.creditCardId || null;
      if (data.paymentMethod === 'CREDIT_CARD') {
        creditCardId = await ensureCreditCardForSingleEntry();
      }

      await api.post('/transactions', {
        ...data,
        creditCardId,
        installments: data.paymentMethod === 'CREDIT_CARD' ? data.installments || 1 : 1,
        date: new Date(`${data.date}T12:00:00`).toISOString(),
      });

      reset({ type: 'INCOME', category: 'OTHERS', paymentMethod: 'CASH', creditCardId: '', installments: 1 });
      setNewCardName('');
      setNewCardLimit('');
      setNewCardClosingDay('');
      onTransactionCreated();
      await fetchCards();
    } catch (err: any) {
      await dialog.alert({
        title: 'Falha na operação',
        message: err.response?.data?.message || err.message || 'Falha na comunicação com o servidor K&J.',
      });
    }
  }

  return (
    <section className="bg-[var(--color-surface)] p-6 rounded-2xl border border-gray-800 shadow-2xl h-full flex flex-col justify-center">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--color-accent)]/10 rounded-lg text-[var(--color-accent)]">
            <Activity size={18} />
          </div>
          <h3 className="text-s font-semibold text-[var(--color-text)] tracking-widest">Novo registro</h3>
        </div>

        <button onClick={() => setIsBulkModalOpen(true)} className="flex items-center gap-2 text-[10px] font-bold text-[var(--color-accent)] uppercase tracking-tighter hover:text-[var(--color-accent-strong)] transition-colors">
          <Upload size={14} />
          Carregar em Massa
        </button>
      </div>

      <form onSubmit={handleSubmit(handleCreateNewTransaction)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-[var(--color-accent)] uppercase ml-1">Descrição</label>
            <div className="relative">
              <PlusCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
              <input {...register('description')} placeholder="Ex: Venda..." className={`w-full bg-[var(--color-bg)] border p-2.5 pl-9 rounded-xl text-gray-200 outline-none focus:border-[var(--color-accent)]/50 text-xs transition-all ${errors.description ? 'border-[var(--color-accent)]/60' : 'border-gray-800'}`} />
              {renderFieldError(errors.description?.message)}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-[var(--color-accent)] uppercase ml-1">Montante</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
              <input {...register('amount', { valueAsNumber: true })} type="number" step="0.01" placeholder="0,00" className={`no-spinner w-full bg-[var(--color-bg)] border p-2.5 pl-9 pr-10 rounded-xl text-gray-200 outline-none focus:border-[var(--color-accent)]/50 text-xs transition-all ${errors.amount ? 'border-[var(--color-accent)]/60' : 'border-gray-800'}`} />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col">
                <button type="button" onClick={() => setValue('amount', Math.max(0, (Number(amountValue) || 0) + 1), { shouldValidate: true })} className="h-4 w-5 flex items-center justify-center text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]"><ChevronUp size={14} /></button>
                <button type="button" onClick={() => setValue('amount', Math.max(0, (Number(amountValue) || 0) - 1), { shouldValidate: true })} className="h-4 w-5 flex items-center justify-center text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]"><ChevronDown size={14} /></button>
              </div>
              {renderFieldError(errors.amount?.message)}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-[var(--color-accent)] uppercase ml-1">Natureza</label>
            <input type="hidden" {...register('type')} />
            <div className="relative">
              <SelectDropdown value={selectedType} onChange={(value) => setValue('type', value as NewTransactionFormInputs['type'], { shouldValidate: true })} options={[{ value: 'INCOME', label: 'Crédito' }, { value: 'EXPENSE', label: 'Débito' }]} />
              {renderFieldError(errors.type?.message)}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-[var(--color-accent)] uppercase ml-1">Categoria</label>
            <input type="hidden" {...register('category')} />
            <div className="relative">
              <SelectDropdown value={selectedCategory} onChange={(value) => setValue('category', value as any, { shouldValidate: true })} options={CATEGORY_OPTIONS as any} />
              {renderFieldError(errors.category?.message)}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-[var(--color-accent)] uppercase ml-1">Meio de pagamento</label>
            <input type="hidden" {...register('paymentMethod')} />
            <div className="relative">
              <SelectDropdown value={selectedPaymentMethod} onChange={(value) => setValue('paymentMethod', value as any, { shouldValidate: true })} options={PAYMENT_METHOD_OPTIONS as any} />
              {renderFieldError(errors.paymentMethod?.message)}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-[var(--color-accent)] uppercase ml-1">Data</label>
            <input type="hidden" {...register('date')} />
            <div className="relative">
              <DatePicker value={selectedDate || ''} onChange={(value) => setValue('date', value, { shouldValidate: true })} placeholder="Selecionar data" />
              {renderFieldError(errors.date?.message)}
            </div>
          </div>
        </div>

        {selectedPaymentMethod === 'CREDIT_CARD' && (
          <div className="gold-border gold-border-relative grid grid-cols-1 lg:grid-cols-3 gap-4 rounded-2xl border border-transparent bg-[var(--color-bg)] p-4">
            <div className="lg:col-span-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--color-accent)]/10 rounded-lg text-[var(--color-accent)]">
                  <CreditCard size={16} />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-accent)]">Cartão de crédito</p>
                  <p className="text-[11px] text-gray-400">{cards.length > 0 ? 'Selecione o cartão para consolidar a fatura.' : 'Primeiro uso detectado: informe o cartão e o fechamento da fatura.'}</p>
                </div>
              </div>
              {cards.length > 0 && (
                <button type="button" onClick={() => navigate('/cards')} className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]">
                  Gerenciar cartões
                </button>
              )}
            </div>

            {cards.length > 0 ? (
              <>
                <div className="lg:col-span-2">
                  <label className="text-[9px] font-bold text-[var(--color-accent)] uppercase ml-1 mb-1 block">Cartão</label>
                  <input type="hidden" {...register('creditCardId')} />
                  <SelectDropdown
                    value={selectedCreditCardId || ''}
                    onChange={(value) => setValue('creditCardId', value, { shouldValidate: true })}
                    placeholder="Selecione um cartão"
                    options={cards.map((card) => ({ value: card.id, label: `${card.name} · Fecha dia ${card.closingDay}` }))}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--color-accent)] uppercase ml-1 mb-1 block">Parcelas</label>
                  <input type="hidden" {...register('installments', { valueAsNumber: true })} />
                  <div className="relative">
                    <input
                      value={selectedInstallments}
                      onChange={(event) => setValue('installments', Math.min(24, Math.max(1, Number(event.target.value) || 1)), { shouldValidate: true })}
                      type="number"
                      min="1"
                      max="24"
                      className="no-spinner w-full bg-[var(--color-bg)] border border-gray-800 p-2 pr-10 rounded-xl text-sm text-gray-200 outline-none focus:border-[var(--color-accent)]/50"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col">
                      <button type="button" onClick={() => updateInstallments(1)} className="h-4 w-5 flex items-center justify-center text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]">
                        <ChevronUp size={14} />
                      </button>
                      <button type="button" onClick={() => updateInstallments(-1)} className="h-4 w-5 flex items-center justify-center text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]">
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] text-gray-500">Se parcelado, o sistema distribuirá automaticamente o valor nas próximas faturas.</p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-[9px] font-bold text-[var(--color-accent)] uppercase ml-1 mb-1 block">Nome do cartão</label>
                  <input value={newCardName} onChange={(event) => setNewCardName(event.target.value)} placeholder="Ex: Nubank" className="w-full bg-[var(--color-surface)] border border-gray-800 p-3 rounded-xl text-sm text-gray-200 outline-none focus:border-[var(--color-accent)]/50" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--color-accent)] uppercase ml-1 mb-1 block">Limite</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                    <input value={newCardLimit} onChange={(event) => handleCardLimitChange(event.target.value)} type="number" min="0" step="0.01" placeholder="Limite disponível no cartão" className="no-spinner w-full bg-[var(--color-surface)] border border-gray-800 p-3 pl-9 pr-10 rounded-xl text-sm text-gray-200 outline-none focus:border-[var(--color-accent)]/50" />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col">
                      <button type="button" onClick={() => updateCardLimit(1)} className="h-4 w-5 flex items-center justify-center text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]">
                        <ChevronUp size={14} />
                      </button>
                      <button type="button" onClick={() => updateCardLimit(-1)} className="h-4 w-5 flex items-center justify-center text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]">
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--color-accent)] uppercase ml-1 mb-1 block">Parcelas</label>
                  <input type="hidden" {...register('installments', { valueAsNumber: true })} />
                  <div className="relative">
                    <input
                      value={selectedInstallments}
                      onChange={(event) => setValue('installments', Math.min(24, Math.max(1, Number(event.target.value) || 1)), { shouldValidate: true })}
                      type="number"
                      min="1"
                      max="24"
                      className="no-spinner w-full bg-[var(--color-surface)] border border-gray-800 p-3 pr-10 rounded-xl text-sm text-gray-200 outline-none focus:border-[var(--color-accent)]/50"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col">
                      <button type="button" onClick={() => updateInstallments(1)} className="h-4 w-5 flex items-center justify-center text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]">
                        <ChevronUp size={14} />
                      </button>
                      <button type="button" onClick={() => updateInstallments(-1)} className="h-4 w-5 flex items-center justify-center text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]">
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] text-gray-500">1x para compra à vista no cartão.</p>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[var(--color-accent)] uppercase ml-1 mb-1 block">Fechamento da fatura</label>
                  <div className="relative">
                    <input value={newCardClosingDay} onChange={(event) => handleClosingDayChange(event.target.value)} type="number" min="1" max="31" placeholder="Dia do fechamento da fatura" className="no-spinner w-full bg-[var(--color-surface)] border border-gray-800 p-3 pr-10 rounded-xl text-sm text-gray-200 outline-none focus:border-[var(--color-accent)]/50" />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col">
                      <button type="button" onClick={() => updateClosingDay(1)} className="h-4 w-5 flex items-center justify-center text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]">
                        <ChevronUp size={14} />
                      </button>
                      <button type="button" onClick={() => updateClosingDay(-1)} className="h-4 w-5 flex items-center justify-center text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]">
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <button type="submit" disabled={isSubmitting} className="w-full h-[42px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-strong)] text-[var(--color-bg)] font-bold uppercase text-[10px] tracking-widest rounded-xl disabled:opacity-30 transition-all">
          {isSubmitting ? '...' : 'Efetivar'}
        </button>
      </form>

      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => { setIsBulkModalOpen(false); setBulkFileName(null); setBulkFileData(null); }}>
          <div className="w-full max-w-3xl rounded-2xl border border-transparent bg-[var(--color-surface)] p-6 shadow-2xl modal-gold-border" onClick={(event) => event.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--color-accent)]/10 rounded-lg text-[var(--color-accent)]"><Activity size={18} /></div>
                <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-widest">Carregar em Massa</h3>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="border border-dashed border-gray-700 rounded-2xl bg-[var(--color-bg)] p-6 text-center relative">
                <input type="file" accept=".xlsx,.xls" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    setBulkFileName(null);
                    setBulkFileData(null);
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    if (reader.result instanceof ArrayBuffer) {
                      setBulkFileName(file.name);
                      setBulkFileData(reader.result);
                    }
                  };
                  reader.onerror = () => dialog.alert({ title: 'Falha ao ler arquivo', message: 'O arquivo não pôde ser lido. Verifique as permissões e tente novamente.' });
                  reader.readAsArrayBuffer(file);
                }} className="absolute inset-0 opacity-0 cursor-pointer" />
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <div className="h-10 w-10 rounded-full border border-gray-700 flex items-center justify-center text-[var(--color-accent)]"><Upload size={18} /></div>
                  <p className="text-[11px] text-gray-300 font-medium">Arraste e solte o arquivo aqui ou clique para selecionar</p>
                  <p className="text-[9px] text-gray-500">Apenas arquivos Excel (.xlsx, .xls)</p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-[var(--color-bg)] px-4 py-3">
                <span className="text-[10px] text-gray-300">{bulkFileName || 'Baixe o modelo com os cabeçalhos corretos'}</span>
                <button type="button" onClick={handleDownloadTemplate} className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]">Baixar modelo</button>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-1 text-[10px] text-gray-500 italic">
                  <span>Tipos aceitos: Crédito ou Débito</span>
                  <span>Categorias aceitas: {CATEGORY_OPTIONS.map((option) => option.label.toLowerCase()).join(', ')}</span>
                  <span>Meios de pagamento: pix, cartao debito, credito1, credito2, credito3..., dinheiro, ted, outros</span>
                </div>
                <button onClick={handleBulkInsert} disabled={!bulkFileData} className="px-8 h-[42px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-strong)] text-[var(--color-bg)] font-bold uppercase text-[10px] tracking-widest rounded-xl transition-all disabled:opacity-30 shadow-lg">
                  Importar Planilha
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
