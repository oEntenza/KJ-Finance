import { prisma } from './prisma';

export const CATEGORY_VALUES = [
  'SALARY',
  'HOUSING',
  'TRANSPORT',
  'FOOD',
  'HEALTH_WELLNESS',
  'LEISURE_ENTERTAINMENT',
  'EDUCATION',
  'FINANCE_INVESTMENTS',
  'OTHERS',
] as const;

export const PAYMENT_METHOD_VALUES = [
  'PIX',
  'DEBIT_CARD',
  'CREDIT_CARD',
  'CASH',
  'BANK_TRANSFER',
  'OTHERS',
] as const;

export function buildStatementPeriod(dateValue: Date, closingDay: number) {
  const date = new Date(dateValue);
  let month = date.getUTCMonth() + 1;
  let year = date.getUTCFullYear();

  if (date.getUTCDate() > closingDay) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return { statementMonth: month, statementYear: year };
}

export function buildStatementDescription(cardName: string, statementMonth: number, statementYear: number) {
  return `Fatura ${cardName} (${String(statementMonth).padStart(2, '0')}/${statementYear})`;
}

export function buildStatementDate(statementMonth: number, statementYear: number, closingDay: number) {
  const safeClosingDay = Math.min(Math.max(closingDay, 1), 31);
  const lastDayOfMonth = new Date(Date.UTC(statementYear, statementMonth, 0)).getUTCDate();
  const statementDay = Math.min(safeClosingDay, lastDayOfMonth);

  return new Date(Date.UTC(statementYear, statementMonth - 1, statementDay, 12, 0, 0));
}

export function isVisibleStatementPeriod(statementMonth?: number | null, statementYear?: number | null, statementDateValue?: Date | string | null) {
  if (!statementMonth || !statementYear) return true;

  if (statementDateValue) {
    const statementDate = new Date(statementDateValue);
    const visibleFrom = new Date(Date.UTC(
      statementDate.getUTCFullYear(),
      statementDate.getUTCMonth() - 1,
      statementDate.getUTCDate() + 1,
      12,
      0,
      0,
      0,
    ));

    const now = new Date();
    const todayKey = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const visibleFromKey = Date.UTC(
      visibleFrom.getUTCFullYear(),
      visibleFrom.getUTCMonth(),
      visibleFrom.getUTCDate(),
    );

    return todayKey >= visibleFromKey;
  }

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  if (statementYear < currentYear) return true;
  if (statementYear > currentYear) return false;
  return statementMonth <= currentMonth;
}

export function isVisibleStatementTransaction(transaction: {
  isCardStatement?: boolean | null;
  statementMonth?: number | null;
  statementYear?: number | null;
  date?: Date | string | null;
}) {
  if (!transaction.isCardStatement) return true;
  return isVisibleStatementPeriod(transaction.statementMonth, transaction.statementYear, transaction.date);
}
function addMonthsToPeriod(statementMonth: number, statementYear: number, offset: number) {
  const baseDate = new Date(Date.UTC(statementYear, statementMonth - 1 + offset, 1, 12, 0, 0));
  return {
    statementMonth: baseDate.getUTCMonth() + 1,
    statementYear: baseDate.getUTCFullYear(),
  };
}

function buildInstallmentPurchaseDate(originalDate: Date, statementMonth: number, statementYear: number) {
  const originalDay = originalDate.getUTCDate();
  const lastDayOfMonth = new Date(Date.UTC(statementYear, statementMonth, 0)).getUTCDate();
  const safeDay = Math.min(originalDay, lastDayOfMonth);
  return new Date(Date.UTC(statementYear, statementMonth - 1, safeDay, 12, 0, 0));
}

function splitInstallmentAmounts(totalAmount: number, installments: number) {
  const totalCents = Math.round(totalAmount * 100);
  const baseCents = Math.floor(totalCents / installments);
  const remainder = totalCents - baseCents * installments;

  return Array.from({ length: installments }, (_, index) => (baseCents + (index < remainder ? 1 : 0)) / 100);
}

export function serializeTransaction(transaction: any): any {
  return {
    ...transaction,
    amount: Number(transaction.amount),
    childTransactions: Array.isArray(transaction.childTransactions)
      ? transaction.childTransactions.map(serializeTransaction)
      : undefined,
    creditCard: transaction.creditCard
      ? {
          id: transaction.creditCard.id,
          name: transaction.creditCard.name,
          closingDay: transaction.creditCard.closingDay,
        }
      : undefined,
  };
}

async function findOrCreateStatement(userId: string, creditCard: any, date: Date) {
  const { statementMonth, statementYear } = buildStatementPeriod(date, creditCard.closingDay);
  return findOrCreateStatementForPeriod(userId, creditCard, statementMonth, statementYear);
}

async function findOrCreateStatementForPeriod(userId: string, creditCard: any, statementMonth: number, statementYear: number) {
  const description = buildStatementDescription(creditCard.name, statementMonth, statementYear);

  const existing = await prisma.transaction.findFirst({
    where: {
      userId,
      creditCardId: creditCard.id,
      isCardStatement: true,
      statementMonth,
      statementYear,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.transaction.create({
    data: {
      description,
      amount: 0,
      type: 'EXPENSE',
      category: 'OTHERS',
      paymentMethod: 'CREDIT_CARD',
      date: buildStatementDate(statementMonth, statementYear, creditCard.closingDay),
      userId,
      creditCardId: creditCard.id,
      isCardStatement: true,
      statementMonth,
      statementYear,
    },
  });
}

export async function syncStatementTotal(statementId: string) {
  const statement = await prisma.transaction.findUnique({
    where: { id: statementId },
    include: { childTransactions: true, creditCard: true },
  });

  if (!statement) return;

  const total = statement.childTransactions.reduce((sum, item) => sum + Number(item.amount), 0);

  if (statement.childTransactions.length === 0) {
    await prisma.transaction.delete({ where: { id: statementId } });
    return;
  }

  await prisma.transaction.update({
    where: { id: statementId },
    data: {
      amount: total,
      description: buildStatementDescription(
        statement.creditCard?.name ?? 'Cartão',
        statement.statementMonth ?? 1,
        statement.statementYear ?? new Date().getUTCFullYear(),
      ),
    },
  });
}

export async function createTransactionEntry(userId: string, payload: any) {
  const date = new Date(payload.date);

  if (payload.paymentMethod === 'CREDIT_CARD') {
    if (payload.type !== 'EXPENSE') {
      throw new Error('Lançamentos em cartão de crédito devem ser do tipo débito.');
    }

    if (!payload.creditCardId) {
      throw new Error('Selecione um cartão de crédito para continuar.');
    }

    const creditCard = await prisma.creditCard.findFirst({
      where: { id: payload.creditCardId, userId },
    });

    if (!creditCard) {
      throw new Error('Cartão de crédito não encontrado.');
    }

    const installments = Math.min(Math.max(Number(payload.installments || 1), 1), 24);
    const installmentAmounts = splitInstallmentAmounts(Number(payload.amount), installments);
    const basePeriod = buildStatementPeriod(date, creditCard.closingDay);
    const createdTransactions = [];

    for (let installmentIndex = 0; installmentIndex < installments; installmentIndex += 1) {
      const period = addMonthsToPeriod(basePeriod.statementMonth, basePeriod.statementYear, installmentIndex);
      const statement = await findOrCreateStatementForPeriod(userId, creditCard, period.statementMonth, period.statementYear);
      const installmentDate = buildInstallmentPurchaseDate(date, period.statementMonth, period.statementYear);
      const installmentDescription = installments > 1
        ? `${payload.description} (${installmentIndex + 1}/${installments})`
        : payload.description;

      const created = await prisma.transaction.create({
        data: {
          description: installmentDescription,
          amount: installmentAmounts[installmentIndex],
          type: payload.type,
          category: payload.category,
          paymentMethod: 'CREDIT_CARD',
          date: installmentDate,
          userId,
          creditCardId: creditCard.id,
          parentTransactionId: statement.id,
        },
        include: { creditCard: true },
      });

      createdTransactions.push(created);
      await syncStatementTotal(statement.id);
    }

    return createdTransactions[0];
  }

  return prisma.transaction.create({
    data: {
      description: payload.description,
      amount: Number(payload.amount),
      type: payload.type,
      category: payload.category,
      paymentMethod: payload.paymentMethod,
      date,
      userId,
    },
    include: { creditCard: true },
  });
}

export async function updateTransactionEntry(userId: string, transactionId: string, payload: any) {
  const existing = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
  });

  if (!existing) {
    throw new Error('Registro não encontrado.');
  }

  if (existing.isCardStatement) {
    throw new Error('A fatura é gerada automaticamente e não pode ser editada diretamente.');
  }

  const previousStatementId = existing.parentTransactionId;
  const date = new Date(payload.date);

  if (payload.paymentMethod === 'CREDIT_CARD') {
    if (payload.type !== 'EXPENSE') {
      throw new Error('Lançamentos em cartão de crédito devem ser do tipo débito.');
    }

    if (!payload.creditCardId) {
      throw new Error('Selecione um cartão de crédito para continuar.');
    }

    const creditCard = await prisma.creditCard.findFirst({
      where: { id: payload.creditCardId, userId },
    });

    if (!creditCard) {
      throw new Error('Cartão de crédito não encontrado.');
    }

    const statement = await findOrCreateStatement(userId, creditCard, date);

    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        description: payload.description,
        amount: Number(payload.amount),
        type: payload.type,
        category: payload.category,
        paymentMethod: 'CREDIT_CARD',
        date,
        creditCardId: creditCard.id,
        parentTransactionId: statement.id,
      },
      include: { creditCard: true },
    });

    if (previousStatementId && previousStatementId !== statement.id) {
      await syncStatementTotal(previousStatementId);
    }
    await syncStatementTotal(statement.id);
    return updated;
  }

  const updated = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      description: payload.description,
      amount: Number(payload.amount),
      type: payload.type,
      category: payload.category,
      paymentMethod: payload.paymentMethod,
      date,
      creditCardId: null,
      parentTransactionId: null,
    },
    include: { creditCard: true },
  });

  if (previousStatementId) {
    await syncStatementTotal(previousStatementId);
  }

  return updated;
}

export async function deleteTransactionEntry(userId: string, transactionId: string) {
  const existing = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
    include: { childTransactions: true },
  });

  if (!existing) {
    throw new Error('Registro não encontrado.');
  }

  if (existing.isCardStatement) {
    await prisma.transaction.deleteMany({
      where: {
        OR: [{ id: existing.id }, { parentTransactionId: existing.id }],
        userId,
      },
    });
    return;
  }

  const previousStatementId = existing.parentTransactionId;
  await prisma.transaction.delete({ where: { id: existing.id } });

  if (previousStatementId) {
    await syncStatementTotal(previousStatementId);
  }
}

export async function listVisibleTransactions(userId: string) {
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      parentTransactionId: null,
    },
    include: {
      creditCard: true,
      childTransactions: {
        include: { creditCard: true },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      },
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });

  return transactions
    .filter(isVisibleStatementTransaction)
    .map(serializeTransaction);
}

export async function calculateVisibleBalance(userId: string) {
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      parentTransactionId: null,
    },
  });

  return transactions
    .filter(isVisibleStatementTransaction)
    .reduce((acc, transaction) => {
      const amount = Number(transaction.amount);
      return transaction.type === 'INCOME' ? acc + amount : acc - amount;
    }, 0);
}






