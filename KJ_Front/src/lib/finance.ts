export const CATEGORY_OPTIONS = [
  { value: 'SALARY', label: 'Salário' },
  { value: 'HOUSING', label: 'Habitação' },
  { value: 'TRANSPORT', label: 'Transporte' },
  { value: 'FOOD', label: 'Alimentação' },
  { value: 'HEALTH_WELLNESS', label: 'Saúde e Bem-estar' },
  { value: 'LEISURE_ENTERTAINMENT', label: 'Lazer e entretenimento' },
  { value: 'EDUCATION', label: 'Educação' },
  { value: 'FINANCE_INVESTMENTS', label: 'Finanças e Investimentos' },
  { value: 'OTHERS', label: 'Outros' },
] as const;

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((option) => [option.value, option.label]),
);

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'PIX', label: 'PIX' },
  { value: 'DEBIT_CARD', label: 'Cartão de Débito' },
  { value: 'CREDIT_CARD', label: 'Cartão de Crédito' },
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'BANK_TRANSFER', label: 'Transferência Bancária' },
  { value: 'OTHERS', label: 'Outros' },
] as const;

export const PAYMENT_METHOD_LABELS: Record<string, string> = Object.fromEntries(
  PAYMENT_METHOD_OPTIONS.map((option) => [option.value, option.label]),
);

export type CategoryValue = (typeof CATEGORY_OPTIONS)[number]['value'];
export type PaymentMethodValue = (typeof PAYMENT_METHOD_OPTIONS)[number]['value'];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function normalizeCategoryInput(value: string): CategoryValue | null {
  const normalized = normalizeText(value);

  if (['salario', 'salary'].includes(normalized)) return 'SALARY';
  if (['habitacao', 'moradia', 'housing', 'aluguel', 'casa', 'condominio'].includes(normalized)) return 'HOUSING';
  if (['transporte', 'transport', 'uber', 'combustivel', 'gasolina'].includes(normalized)) return 'TRANSPORT';
  if (['alimentacao', 'food', 'mercado', 'restaurante'].includes(normalized)) return 'FOOD';
  if (['saude', 'saudeebemestar', 'bemestar', 'health', 'wellness'].includes(normalized)) return 'HEALTH_WELLNESS';
  if (['lazer', 'entretenimento', 'lazereentretenimento', 'leisure', 'entertainment'].includes(normalized)) return 'LEISURE_ENTERTAINMENT';
  if (['educacao', 'education', 'curso', 'faculdade'].includes(normalized)) return 'EDUCATION';
  if (['financas', 'financaseinvestimentos', 'finance', 'investment', 'investimentos', 'aporte'].includes(normalized)) return 'FINANCE_INVESTMENTS';
  if (['outros', 'others', 'diversos', 'misc', 'geral'].includes(normalized)) return 'OTHERS';

  return null;
}

export function normalizePaymentMethodInput(value: string) {
  const normalized = normalizeText(value);

  if (['pix'].includes(normalized)) return { paymentMethod: 'PIX' as const };
  if (['cartaodedebito', 'cartaodebito', 'debitcard', 'debito'].includes(normalized)) {
    return { paymentMethod: 'DEBIT_CARD' as const };
  }
  if (['dinheiro', 'cash'].includes(normalized)) return { paymentMethod: 'CASH' as const };
  if (['transferenciabancaria', 'transferencia', 'ted', 'banktransfer'].includes(normalized)) {
    return { paymentMethod: 'BANK_TRANSFER' as const };
  }
  if (['outros', 'others'].includes(normalized)) return { paymentMethod: 'OTHERS' as const };

  const creditMatch = normalized.match(/^credito(\d+)$/);
  if (creditMatch) {
    return {
      paymentMethod: 'CREDIT_CARD' as const,
      creditIndex: Number(creditMatch[1]),
    };
  }

  if (['cartaocredito', 'cartaodecredito', 'creditcard', 'credito'].includes(normalized)) {
    return { paymentMethod: 'CREDIT_CARD' as const };
  }

  return null;
}
