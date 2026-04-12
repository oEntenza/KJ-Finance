import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { PlusCircle, DollarSign, Activity, Upload, X, ChevronUp, ChevronDown } from 'lucide-react';
import { api } from '../lib/api';
import { useDialog } from './DialogProvider';
import { DatePicker } from './DatePicker';
import { SelectDropdown } from './SelectDropdown';

const CATEGORY_VALUES = [
  'SALARY',
  'CREDIT_CARD',
  'HOUSING',
  'TRANSPORT',
  'FOOD',
  'HEALTH_WELLNESS',
  'LEISURE_ENTERTAINMENT',
  'EDUCATION',
  'FINANCE_INVESTMENTS',
  'OTHERS',
] as const;

const newTransactionFormSchema = z.object({
  description: z.string().min(1, 'Obrigatório'),
  amount: z.number().min(0.01, 'Mínimo 0.01'),
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z
    .string()
    .min(1, 'Selecione uma categoria')
    .refine((value) => CATEGORY_VALUES.includes(value as any), 'Categoria inválida'),
  date: z.string().min(1, 'Obrigatório'),
});

type NewTransactionFormInputs = z.infer<typeof newTransactionFormSchema>;

interface NewTransactionFormProps {
  onTransactionCreated: () => void;
}

export function NewTransactionForm({ onTransactionCreated }: NewTransactionFormProps) {
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkFileName, setBulkFileName] = useState<string | null>(null);
  const [bulkFileData, setBulkFileData] = useState<ArrayBuffer | null>(null);
  const dialog = useDialog();

  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm<NewTransactionFormInputs>({
    resolver: zodResolver(newTransactionFormSchema),
    defaultValues: { type: 'INCOME', category: '' },
  });
  const amountValue = watch('amount');
  const selectedDate = watch('date');
  const selectedType = watch('type');
  const selectedCategory = watch('category');

  function normalizeHeader(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  async function handleBulkInsert() {
    if (!bulkFileData) {
      await dialog.alert({
        title: 'Arquivo obrigatório',
        message: 'Selecione uma planilha do Excel para continuar.',
      });
      return;
    }

    try {
      const workbook = XLSX.read(bulkFileData, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

      if (!firstSheet) {
        throw new Error('A planilha está vazia.');
      }

      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: true }) as Array<Array<string | number | Date>>;

      if (rows.length < 2) {
        throw new Error('A planilha precisa ter pelo menos uma linha de dados.');
      }

      const headers = rows[0].map((cell) => normalizeHeader(String(cell || '')));
      const mapIndex = (key: string) => headers.indexOf(normalizeHeader(key));

      const descIndex = mapIndex('descricao');
      const amountIndex = mapIndex('valor');
      const typeIndex = mapIndex('tipo');
      const categoryIndex = mapIndex('categoria');
      const dateIndex = mapIndex('data');

      if ([descIndex, amountIndex, typeIndex, categoryIndex, dateIndex].some((i) => i === -1)) {
        throw new Error('Cabeçalhos inválidos. Use: Descrição, Valor, Tipo, Categoria, Data.');
      }

      const dataRows = rows.slice(1).filter((row) =>
        row.some((cell) => String(cell ?? '').trim() !== ''),
      );

      const normalizeValue = (value: string) =>
        value
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '')
          .trim();

      const normalizeType = (value: string) => {
        const normalized = normalizeValue(value);
        if (['income', 'credito', 'credit', 'entrada'].includes(normalized)) return 'INCOME';
        if (['expense', 'debito', 'debit', 'saida'].includes(normalized)) return 'EXPENSE';
        return value.toUpperCase();
      };

      const normalizeCategory = (value: string) => {
        const normalized = normalizeValue(value);
        if (['salario', 'salary'].includes(normalized)) return 'SALARY';
        if (['cartao', 'cartaocredito', 'creditcard', 'cartaodecredito'].includes(normalized)) return 'CREDIT_CARD';
        if (['habitacao', 'moradia', 'casa', 'aluguel', 'housing'].includes(normalized)) return 'HOUSING';
        if (['transporte', 'transport', 'transito', 'uber', 'combustivel', 'gasolina'].includes(normalized)) return 'TRANSPORT';
        if (['alimentacao', 'food', 'mercado', 'restaurante'].includes(normalized)) return 'FOOD';
        if (['saude', 'saudeebemestar', 'bemestar', 'health', 'wellness'].includes(normalized)) {
          return 'HEALTH_WELLNESS';
        }
        if (['lazer', 'entretenimento', 'lazereentretenimento', 'leisure', 'entertainment'].includes(normalized)) {
          return 'LEISURE_ENTERTAINMENT';
        }
        if (['educacao', 'education', 'curso', 'faculdade'].includes(normalized)) return 'EDUCATION';
        if (['financas', 'financaseinvestimentos', 'finance', 'investment', 'investimentos', 'aporte'].includes(normalized)) {
          return 'FINANCE_INVESTMENTS';
        }
        if (['outros', 'others', 'diversos', 'misc'].includes(normalized)) return 'OTHERS';
        if (['boletos', 'contas', 'bills'].includes(normalized)) return 'HOUSING';
        return value.toUpperCase();
      };

      const parseAmount = (value: string | number) => {
        if (typeof value === 'number') {
          return value;
        }
        const raw = String(value).trim();
        if (!raw) return NaN;
        const hasComma = raw.includes(',');
        const hasDot = raw.includes('.');
        if (hasComma && hasDot) {
          return Number(raw.replace(/\./g, '').replace(',', '.'));
        }
        if (hasComma && !hasDot) {
          return Number(raw.replace(',', '.'));
        }
        return Number(raw);
      };

      const transactions = dataRows.map((row, rowIndex) => {
        const description = String(row[descIndex] ?? '').trim();
        const rawAmountCell = row[amountIndex];
        const rawAmount = String(rawAmountCell ?? '').trim();
        const rawType = String(row[typeIndex] ?? '').trim();
        const rawCategory = String(row[categoryIndex] ?? '').trim();
        const rawDateCell = row[dateIndex];
        const rawDate = rawDateCell ?? '';

        if (!description || !rawAmount || !rawType || !rawCategory || !rawDate) {
          throw new Error(`Linha ${rowIndex + 2} incompleta. Verifique os dados.`);
        }

        const numericAmount = parseAmount(rawAmountCell as any);

        if (isNaN(numericAmount)) {
          throw new Error(`Linha ${rowIndex + 2}: Valor "${rawAmount}" inválido.`);
        }

        let formattedDate = '';
        if (rawDate instanceof Date) {
          const year = rawDate.getFullYear();
          const month = String(rawDate.getMonth() + 1).padStart(2, '0');
          const day = String(rawDate.getDate()).padStart(2, '0');
          formattedDate = `${year}-${month}-${day}`;
        } else if (typeof rawDate === 'number') {
          const parsed = XLSX.SSF.parse_date_code(rawDate);
          if (!parsed) {
            throw new Error(`Linha ${rowIndex + 2}: Data "${rawDate}" é inválida.`);
          }
          const year = parsed.y;
          const month = String(parsed.m).padStart(2, '0');
          const day = String(parsed.d).padStart(2, '0');
          formattedDate = `${year}-${month}-${day}`;
        } else {
          const rawDateString = String(rawDate).trim();
          formattedDate = rawDateString;
          if (rawDateString.includes('/')) {
            const [day, month, year] = rawDateString.split('/');
            formattedDate = `${year}-${month}-${day}`;
          }
        }

        const dateObj = new Date(`${formattedDate}T12:00:00`);

        if (isNaN(dateObj.getTime())) {
          throw new Error(`Linha ${rowIndex + 2}: Data "${String(rawDate)}" é inválida.`);
        }

        return {
          description,
          amount: numericAmount,
          type: normalizeType(rawType) as 'INCOME' | 'EXPENSE',
          category: normalizeCategory(rawCategory) as any,
          date: dateObj.toISOString(),
        };
      });

      await api.post('/transactions/bulk', { transactions });

      setBulkFileName(null);
      setBulkFileData(null);
      setIsBulkModalOpen(false);
      onTransactionCreated();
      await dialog.alert({
        title: 'Importação concluída',
        message: ' realizada com sucesso!',
      });
    } catch (err: any) {
      console.error('Erro no Bulk:', err);
      await dialog.alert({
        title: 'Falha na importação',
        message: err.response?.data?.detail || err.response?.data?.message || err.message || 'Erro na formatação dos dados.',
      });
    }
  }

  function handleDownloadTemplate() {
    const headers = ['Descrição', 'Valor', 'Tipo', 'Categoria', 'Data'];
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo');
    XLSX.writeFile(workbook, 'modelo-importacao.xlsx');
  }

  async function handleCreateNewTransaction(data: NewTransactionFormInputs) {
    try {
      const dateWithTime = `${data.date}T12:00:00`;
      await api.post('/transactions', {
        ...data,
        date: new Date(dateWithTime).toISOString(),
      });
      reset();
      onTransactionCreated();
    } catch (err) {
      await dialog.alert({
        title: 'Falha na operação',
        message: 'Falha na comunicação com o servidor K&J.',
      });
    }
  }

  function handleOpenBulkModal() {
    setIsBulkModalOpen(true);
  }

  function handleCloseBulkModal() {
    setIsBulkModalOpen(false);
    setBulkFileName(null);
    setBulkFileData(null);
  }

  return (
    <section className="bg-[var(--color-surface)] p-6 rounded-2xl border border-gray-800 shadow-2xl h-full flex flex-col justify-center">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--color-accent)]/10 rounded-lg text-[var(--color-accent)]">
            <Activity size={18} />
          </div>
          <h3 className="text-s font-semibold text-[var(--color-text)] tracking-widest">
            Novo registro
          </h3>
        </div>

        <button
          onClick={handleOpenBulkModal}
          className="flex items-center gap-2 text-[10px] font-bold text-[var(--color-accent)] uppercase tracking-tighter hover:text-[var(--color-accent-strong)] transition-colors"
        >
          <Upload size={14} />
          Carregar em Massa
        </button>
      </div>

      <form onSubmit={handleSubmit(handleCreateNewTransaction)}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-[var(--color-accent)] uppercase ml-1">Descrição</label>
            <div className="relative">
              <PlusCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
              <input {...register('description')} placeholder="Ex: Venda..." className="w-full bg-[var(--color-bg)] border border-gray-800 p-2.5 pl-9 rounded-xl text-gray-200 outline-none focus:border-[var(--color-accent)]/50 text-xs transition-all" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-[var(--color-accent)] uppercase ml-1">Montante</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
              <input
                {...register('amount', { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder="0,00"
                  className="no-spinner w-full bg-[var(--color-bg)] border border-gray-800 p-2.5 pl-9 pr-10 rounded-xl text-gray-200 outline-none focus:border-[var(--color-accent)]/50 text-xs transition-all"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col">
                <button
                  type="button"
                  onClick={() => setValue('amount', Math.max(0, (Number(amountValue) || 0) + 1), { shouldValidate: true })}
                  className="h-4 w-5 flex items-center justify-center text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]"
                  aria-label="Aumentar valor"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setValue('amount', Math.max(0, (Number(amountValue) || 0) - 1), { shouldValidate: true })}
                  className="h-4 w-5 flex items-center justify-center text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]"
                  aria-label="Diminuir valor"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-[var(--color-accent)] uppercase ml-1">Natureza</label>
            <input type="hidden" {...register('type')} />
            <SelectDropdown
              value={selectedType}
              onChange={(value) => setValue('type', value as NewTransactionFormInputs['type'], { shouldValidate: true })}
              options={[
                { value: 'INCOME', label: 'Crédito' },
                { value: 'EXPENSE', label: 'Débito' },
              ]}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-[var(--color-accent)] uppercase ml-1">Categoria</label>
            <input type="hidden" {...register('category')} />
            <SelectDropdown
              value={selectedCategory}
              onChange={(value) => setValue('category', value, { shouldValidate: true })}
              placeholder="Selecione uma categoria"
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
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-[var(--color-accent)] uppercase ml-1">Data</label>
            <input type="hidden" {...register('date')} />
            <DatePicker
              value={selectedDate || ''}
              onChange={(value) => setValue('date', value, { shouldValidate: true })}
              placeholder="Selecionar data"
            />
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full h-[42px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-strong)] text-[var(--color-bg)] font-bold uppercase text-[10px] tracking-widest rounded-xl disabled:opacity-30 transition-all">
            {isSubmitting ? '...' : 'Efetivar'}
          </button>
        </div>
      </form>

      {isBulkModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={handleCloseBulkModal}
        >
          <div
            className="w-full max-w-3xl rounded-2xl border border-transparent bg-[var(--color-surface)] p-6 shadow-2xl modal-gold-border"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--color-accent)]/10 rounded-lg text-[var(--color-accent)]">
                  <Activity size={18} />
                </div>
                <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-widest">
                  Carregar em Massa
                </h3>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="border border-dashed border-gray-700 rounded-2xl bg-[var(--color-bg)] p-6 text-center relative">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
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
                      } else {
                        setBulkFileName(null);
                        setBulkFileData(null);
                        dialog.alert({
                          title: 'Falha ao ler arquivo',
                          message: 'Não foi possível carregar a planilha. Tente novamente.',
                        });
                      }
                    };
                    reader.onerror = () => {
                      setBulkFileName(null);
                      setBulkFileData(null);
                      dialog.alert({
                        title: 'Falha ao ler arquivo',
                        message: 'O arquivo não pôde ser lido. Verifique as permissões e tente novamente.',
                      });
                    };
                    reader.readAsArrayBuffer(file);
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <div className="h-10 w-10 rounded-full border border-gray-700 flex items-center justify-center text-[var(--color-accent)]">
                    <Upload size={18} />
                  </div>
                  <p className="text-[11px] text-gray-300 font-medium">
                    Arraste e solte o arquivo aqui ou clique para selecionar
                  </p>
                  <p className="text-[9px] text-gray-500">
                    Apenas arquivos Excel (.xlsx, .xls)
                  </p>
                </div>
              </div>

              {bulkFileName && (
                <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-[var(--color-bg)] px-4 py-3">
                  <span className="text-[10px] text-gray-300">{bulkFileName}</span>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]"
                  >
                    Baixar modelo
                  </button>
                </div>
              )}

              {!bulkFileName && (
                <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-[var(--color-bg)] px-4 py-3">
                  <span className="text-[10px] text-gray-400">
                    Baixe o modelo com os cabeçalhos corretos
                  </span>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]"
                  >
                    Baixar modelo
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-gray-500 italic">
                    Tipos aceitos: Crédito ou Débito
                  </span>
                  <span className="text-[10px] text-gray-500 italic">
                    Categorias aceitas: salario, cartao, habitacao, transporte, alimentacao, saude, lazer, educacao, financas e outros
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBulkInsert}
                    disabled={!bulkFileData}
                    className="px-8 h-[42px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-strong)] text-[var(--color-bg)] font-bold uppercase text-[10px] tracking-widest rounded-xl transition-all disabled:opacity-30 shadow-lg"
                  >
                    Importar Planilha
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
