import { Category, PaymentMethod, Prisma, TransactionType } from '@prisma/client';
import { prisma } from './prisma';

const PLUGGY_BASE_URL = 'https://api.pluggy.ai';
const PAGE_SIZE = 500;

type PluggyAuthResponse = {
  apiKey: string;
};

type PluggyItemResponse = {
  id: string;
  status?: string | null;
  connector?: {
    name?: string | null;
  } | null;
  createdAt?: string | null;
};

type PluggyAccountResponse = {
  id: string;
  name?: string | null;
  type?: string | null;
  subtype?: string | null;
  currencyCode?: string | null;
  balance?: number | null;
  itemId?: string | null;
};

type PluggyTransactionResponse = {
  id: string;
  description?: string | null;
  descriptionRaw?: string | null;
  amount: number;
  date: string;
  type?: string | null;
  category?: string | null;
  status?: string | null;
  paymentData?: {
    paymentMethod?: string | null;
  } | null;
  merchant?: {
    name?: string | null;
    businessName?: string | null;
  } | null;
};

type PluggyPagedResponse<T> = {
  results?: T[];
  page?: number;
  total?: number;
  totalPages?: number;
};

type PluggyWebhookPayload = {
  event?: string;
  eventId?: string;
  clientUserId?: string;
  itemId?: string;
  accountId?: string;
  transactionIds?: string[];
  createdTransactionsLink?: string;
  transactionsCreatedAtFrom?: string;
  triggeredBy?: string;
  error?: unknown;
  [key: string]: unknown;
};

let cachedApiKey: { value: string; expiresAt: number } | null = null;

function ensurePluggyCredentials() {
  const clientId = process.env.PLUGGY_CLIENT_ID?.trim();
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error('As variáveis PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET precisam estar configuradas.');
  }

  return { clientId, clientSecret };
}

function parseJwtExpiration(token: string) {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8')) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

async function getPluggyApiKey() {
  const now = Date.now();
  if (cachedApiKey && cachedApiKey.expiresAt > now + 30_000) {
    return cachedApiKey.value;
  }

  const { clientId, clientSecret } = ensurePluggyCredentials();
  const response = await fetch(`${PLUGGY_BASE_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao autenticar no Pluggy (${response.status}).`);
  }

  const data = await response.json() as PluggyAuthResponse;
  const expiresAt = parseJwtExpiration(data.apiKey) ?? now + (60 * 60 * 1000);

  cachedApiKey = {
    value: data.apiKey,
    expiresAt,
  };

  return data.apiKey;
}

async function pluggyRequest<T>(pathname: string, init?: RequestInit) {
  const apiKey = await getPluggyApiKey();
  const response = await fetch(`${PLUGGY_BASE_URL}${pathname}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pluggy respondeu ${response.status}: ${errorText || 'sem detalhes adicionais.'}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

async function pluggyRequestWithAbsoluteUrl<T>(url: string, init?: RequestInit) {
  const apiKey = await getPluggyApiKey();
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pluggy respondeu ${response.status}: ${errorText || 'sem detalhes adicionais.'}`);
  }

  return response.json() as Promise<T>;
}

function plusOneSecond(date: Date) {
  return new Date(date.getTime() + 1_000);
}

function normalizeIsoDate(date: Date) {
  return date.toISOString();
}

function mapPluggyCategory(category?: string | null): Category {
  const value = String(category || '').toUpperCase();

  if (value.includes('SALARY') || value.includes('PAYROLL')) return 'SALARY';
  if (value.includes('HOUSING') || value.includes('RENT')) return 'HOUSING';
  if (value.includes('TRANSPORT') || value.includes('FUEL')) return 'TRANSPORT';
  if (value.includes('FOOD') || value.includes('RESTAURANT') || value.includes('GROCERY')) return 'FOOD';
  if (value.includes('HEALTH') || value.includes('PHARM')) return 'HEALTH_WELLNESS';
  if (value.includes('LEISURE') || value.includes('ENTERTAINMENT')) return 'LEISURE_ENTERTAINMENT';
  if (value.includes('EDUCATION')) return 'EDUCATION';
  if (value.includes('INVEST') || value.includes('FINANCE') || value.includes('BANK_FEE')) return 'FINANCE_INVESTMENTS';

  return 'OTHERS';
}

function mapPluggyPaymentMethod(accountType?: string | null, paymentMethod?: string | null): PaymentMethod {
  const normalizedMethod = String(paymentMethod || '').toUpperCase();
  const normalizedAccountType = String(accountType || '').toUpperCase();

  if (normalizedMethod.includes('PIX')) return 'PIX';
  if (normalizedMethod.includes('CREDIT')) return 'CREDIT_CARD';
  if (normalizedMethod.includes('DEBIT')) return 'DEBIT_CARD';
  if (
    normalizedMethod.includes('TRANSFER')
    || normalizedMethod.includes('TED')
    || normalizedMethod.includes('DOC')
    || normalizedMethod.includes('WIRE')
  ) {
    return 'BANK_TRANSFER';
  }
  if (normalizedAccountType.includes('CREDIT')) return 'CREDIT_CARD';

  return 'OTHERS';
}

function mapPluggyTransactionType(type?: string | null, amount?: number): TransactionType {
  const normalizedType = String(type || '').toUpperCase();

  if (normalizedType === 'CREDIT') return 'INCOME';
  if (normalizedType === 'DEBIT') return 'EXPENSE';
  if (typeof amount === 'number' && amount < 0) return 'EXPENSE';

  return 'INCOME';
}

function buildTransactionDescription(transaction: PluggyTransactionResponse) {
  return transaction.descriptionRaw
    || transaction.description
    || transaction.merchant?.businessName
    || transaction.merchant?.name
    || 'Transacao Pluggy';
}

export async function createPluggyConnectToken(userId: string) {
  const data = await pluggyRequest<{ accessToken: string }>('/connect_token', {
    method: 'POST',
    body: JSON.stringify({
      clientUserId: userId,
      avoidDuplicates: true,
      webhookUrl: process.env.PLUGGY_WEBHOOK_URL || undefined,
    }),
  });

  return data;
}

async function fetchPluggyItem(itemId: string) {
  return pluggyRequest<PluggyItemResponse>(`/items/${itemId}`);
}

async function fetchPluggyAccounts(itemId: string) {
  const params = new URLSearchParams({ itemId });
  const data = await pluggyRequest<PluggyPagedResponse<PluggyAccountResponse>>(`/accounts?${params.toString()}`);
  return data.results ?? [];
}

async function fetchPluggyTransactions(accountId: string, createdAtFrom?: string) {
  const transactions: PluggyTransactionResponse[] = [];
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      accountId,
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });

    if (createdAtFrom) {
      params.set('createdAtFrom', createdAtFrom);
    }

    const data = await pluggyRequest<PluggyPagedResponse<PluggyTransactionResponse>>(`/transactions?${params.toString()}`);
    const pageResults = data.results ?? [];
    transactions.push(...pageResults);

    if (pageResults.length < PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  return transactions;
}

async function fetchPluggyTransactionsFromAbsoluteUrl(url: string) {
  const transactions: PluggyTransactionResponse[] = [];
  let nextUrl: string | null = url;

  while (nextUrl) {
    const data = await pluggyRequestWithAbsoluteUrl<PluggyPagedResponse<PluggyTransactionResponse>>(nextUrl);
    const pageResults = data.results ?? [];
    transactions.push(...pageResults);

    if (pageResults.length < PAGE_SIZE) {
      nextUrl = null;
      continue;
    }

    const currentUrl = new URL(nextUrl);
    const currentPage = Number(currentUrl.searchParams.get('page') || '1');
    currentUrl.searchParams.set('page', String(currentPage + 1));
    nextUrl = currentUrl.toString();
  }

  return transactions;
}

async function upsertPluggyAccountsForItem(userId: string, localItemId: string, pluggyItemId: string) {
  const accounts = await fetchPluggyAccounts(pluggyItemId);

  for (const account of accounts) {
    await prisma.pluggyAccount.upsert({
      where: { pluggyAccountId: account.id },
      update: {
        name: account.name || 'Conta sem nome',
        type: account.type || null,
        subtype: account.subtype || null,
        currencyCode: account.currencyCode || null,
        balance: typeof account.balance === 'number' ? account.balance : null,
        itemId: localItemId,
        userId,
      },
      create: {
        pluggyAccountId: account.id,
        name: account.name || 'Conta sem nome',
        type: account.type || null,
        subtype: account.subtype || null,
        currencyCode: account.currencyCode || null,
        balance: typeof account.balance === 'number' ? account.balance : null,
        itemId: localItemId,
        userId,
      },
    });
  }

  return prisma.pluggyAccount.findMany({
    where: { itemId: localItemId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function registerPluggyItem(userId: string, pluggyItemId: string) {
  const trimmedItemId = pluggyItemId.trim();
  if (!trimmedItemId) {
    throw new Error('Informe um itemId válido do Pluggy.');
  }

  const remoteItem = await fetchPluggyItem(trimmedItemId);
  const localItem = await prisma.pluggyItem.upsert({
    where: { pluggyItemId: trimmedItemId },
    update: {
      userId,
      status: remoteItem.status || null,
      connectorName: remoteItem.connector?.name || null,
      itemCreatedAt: remoteItem.createdAt ? new Date(remoteItem.createdAt) : null,
    },
    create: {
      pluggyItemId: trimmedItemId,
      userId,
      status: remoteItem.status || null,
      connectorName: remoteItem.connector?.name || null,
      itemCreatedAt: remoteItem.createdAt ? new Date(remoteItem.createdAt) : null,
    },
  });

  const accounts = await upsertPluggyAccountsForItem(userId, localItem.id, trimmedItemId);

  console.log('[Pluggy] item registrado', {
    userId,
    pluggyItemId: trimmedItemId,
    connectorName: localItem.connectorName,
    accounts: accounts.map((account) => ({
      id: account.pluggyAccountId,
      name: account.name,
      type: account.type,
      subtype: account.subtype,
    })),
  });

  return {
    item: localItem,
    accounts,
  };
}

export async function listRegisteredPluggyItems(userId: string) {
  return prisma.pluggyItem.findMany({
    where: { userId },
    include: {
      accounts: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

async function syncPluggyTransactionsForStoredAccount(userId: string, pluggyAccountId: string) {
  return syncPluggyTransactions(userId, { accountId: pluggyAccountId });
}

function buildTransactionBaseData(localAccountId: string, accountType: string | null, transaction: PluggyTransactionResponse) {
  return {
    description: buildTransactionDescription(transaction),
    amount: Math.abs(Number(transaction.amount || 0)),
    type: mapPluggyTransactionType(transaction.type, transaction.amount),
    category: mapPluggyCategory(transaction.category),
    paymentMethod: mapPluggyPaymentMethod(accountType, transaction.paymentData?.paymentMethod),
    date: new Date(transaction.date),
    source: 'PLUGGY' as const,
    externalId: transaction.id,
    pluggyAccountId: localAccountId,
    externalData: {
      category: transaction.category ?? null,
      status: transaction.status ?? null,
      type: transaction.type ?? null,
      paymentMethod: transaction.paymentData?.paymentMethod ?? null,
      merchantName: transaction.merchant?.name ?? null,
      merchantBusinessName: transaction.merchant?.businessName ?? null,
      rawDescription: transaction.descriptionRaw ?? null,
    },
  };
}

function buildTransactionCreateData(userId: string, localAccountId: string, accountType: string | null, transaction: PluggyTransactionResponse): Prisma.TransactionUncheckedCreateInput {
  return {
    ...buildTransactionBaseData(localAccountId, accountType, transaction),
    userId,
  };
}

function buildTransactionUpdateData(localAccountId: string, accountType: string | null, transaction: PluggyTransactionResponse): Prisma.TransactionUncheckedUpdateInput {
  return buildTransactionBaseData(localAccountId, accountType, transaction);
}

export async function syncPluggyTransactions(userId: string, options?: { itemId?: string; accountId?: string }) {
  if (options?.itemId) {
    await registerPluggyItem(userId, options.itemId);
  }

  const accountFilter = options?.accountId
    ? { userId, pluggyAccountId: options.accountId }
    : { userId };

  const accounts = await prisma.pluggyAccount.findMany({
    where: accountFilter,
    include: {
      item: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!accounts.length) {
    console.log('[Pluggy] nenhuma conta vinculada para sincronizar', {
      userId,
      filters: options ?? null,
    });
    throw new Error('Nenhuma conta Pluggy foi vinculada ainda. Registre um itemId antes de sincronizar.');
  }

  console.log('[Pluggy] iniciando sincronizacao', {
    userId,
    accounts: accounts.map((account) => ({
      accountId: account.pluggyAccountId,
      accountName: account.name,
      lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
    })),
  });

  const summary: Array<{
    accountId: string;
    accountName: string;
    imported: number;
    updated: number;
    requestedFrom: string | null;
    syncedAt: string;
  }> = [];

  for (const account of accounts) {
    const syncStartedAt = new Date();
    const createdAtFrom = account.lastSyncedAt ? normalizeIsoDate(plusOneSecond(account.lastSyncedAt)) : undefined;
    const transactions = await fetchPluggyTransactions(account.pluggyAccountId, createdAtFrom);

    console.log('[Pluggy] transacoes recebidas', {
      userId,
      accountId: account.pluggyAccountId,
      accountName: account.name,
      requestedFrom: createdAtFrom ?? null,
      count: transactions.length,
      transactions: transactions.map((transaction) => ({
        id: transaction.id,
        description: buildTransactionDescription(transaction),
        amount: transaction.amount,
        date: transaction.date,
        type: transaction.type,
        category: transaction.category,
        status: transaction.status,
        paymentMethod: transaction.paymentData?.paymentMethod ?? null,
      })),
    });

    let imported = 0;
    let updated = 0;

    for (const transaction of transactions) {
      const createData = buildTransactionCreateData(userId, account.id, account.type, transaction);
      const updateData = buildTransactionUpdateData(account.id, account.type, transaction);
      const existing = await prisma.transaction.findUnique({
        where: {
          source_externalId: {
            source: 'PLUGGY',
            externalId: transaction.id,
          },
        },
        select: { id: true },
      });

      await prisma.transaction.upsert({
        where: {
          source_externalId: {
            source: 'PLUGGY',
            externalId: transaction.id,
          },
        },
        update: updateData,
        create: createData,
      });

      if (existing) {
        updated += 1;
      } else {
        imported += 1;
      }
    }

    await prisma.pluggyAccount.update({
      where: { id: account.id },
      data: {
        lastSyncedAt: syncStartedAt,
        lastSuccessfulSyncAt: syncStartedAt,
      },
    });

    summary.push({
      accountId: account.pluggyAccountId,
      accountName: account.name,
      imported,
      updated,
      requestedFrom: createdAtFrom ?? null,
      syncedAt: syncStartedAt.toISOString(),
    });
  }

  console.log('[Pluggy] sincronizacao concluida', {
    userId,
    summary,
  });

  return {
    accounts: summary,
  };
}

export async function processPluggyWebhook(payload: PluggyWebhookPayload) {
  console.log('[Pluggy][Webhook] payload recebido', payload);

  const event = String(payload.event || '').trim();
  const clientUserId = String(payload.clientUserId || '').trim();
  const itemId = String(payload.itemId || '').trim();
  const accountId = String(payload.accountId || '').trim();

  if (!event) {
    throw new Error('Webhook do Pluggy recebido sem event.');
  }

  if (!clientUserId && !itemId) {
    console.log('[Pluggy][Webhook] ignorado por falta de clientUserId e itemId', payload);
    return { ignored: true, reason: 'missing-client-user-id-and-item-id' };
  }

  if (event === 'item/created' || event === 'item/updated') {
    if (!clientUserId || !itemId) {
      console.log('[Pluggy][Webhook] item event sem clientUserId ou itemId', payload);
      return { ignored: true, reason: 'missing-user-or-item' };
    }

    await registerPluggyItem(clientUserId, itemId);
    const syncResult = await syncPluggyTransactions(clientUserId, { itemId });
    return { ok: true, event, syncResult };
  }

  if (event === 'transactions/created') {
    if (!clientUserId || !itemId) {
      console.log('[Pluggy][Webhook] transactions/created sem clientUserId ou itemId', payload);
      return { ignored: true, reason: 'missing-user-or-item' };
    }

    await registerPluggyItem(clientUserId, itemId);

    if (payload.createdTransactionsLink && accountId) {
      const localAccount = await prisma.pluggyAccount.findUnique({
        where: { pluggyAccountId: accountId },
      });

      if (!localAccount) {
        console.log('[Pluggy][Webhook] conta ainda nao registrada localmente, fazendo sync normal', {
          clientUserId,
          itemId,
          accountId,
        });
        const syncResult = await syncPluggyTransactions(clientUserId, { itemId });
        return { ok: true, event, syncResult };
      }

      const transactions = await fetchPluggyTransactionsFromAbsoluteUrl(String(payload.createdTransactionsLink));

      console.log('[Pluggy][Webhook] transacoes criadas recebidas via link', {
        clientUserId,
        itemId,
        accountId,
        count: transactions.length,
      });

      let imported = 0;
      let updated = 0;

      for (const transaction of transactions) {
        const createData = buildTransactionCreateData(clientUserId, localAccount.id, localAccount.type, transaction);
        const updateData = buildTransactionUpdateData(localAccount.id, localAccount.type, transaction);
        const existing = await prisma.transaction.findUnique({
          where: {
            source_externalId: {
              source: 'PLUGGY',
              externalId: transaction.id,
            },
          },
          select: { id: true },
        });

        await prisma.transaction.upsert({
          where: {
            source_externalId: {
              source: 'PLUGGY',
              externalId: transaction.id,
            },
          },
          update: updateData,
          create: createData,
        });

        if (existing) {
          updated += 1;
        } else {
          imported += 1;
        }
      }

      await prisma.pluggyAccount.update({
        where: { id: localAccount.id },
        data: {
          lastSyncedAt: new Date(),
          lastSuccessfulSyncAt: new Date(),
        },
      });

      return {
        ok: true,
        event,
        imported,
        updated,
      };
    }

    if (accountId) {
      const syncResult = await syncPluggyTransactionsForStoredAccount(clientUserId, accountId);
      return { ok: true, event, syncResult };
    }

    const syncResult = await syncPluggyTransactions(clientUserId, { itemId });
    return { ok: true, event, syncResult };
  }

  if (event === 'transactions/updated') {
    if (!clientUserId || !itemId) {
      return { ignored: true, reason: 'missing-user-or-item' };
    }

    await registerPluggyItem(clientUserId, itemId);
    const syncResult = accountId
      ? await syncPluggyTransactionsForStoredAccount(clientUserId, accountId)
      : await syncPluggyTransactions(clientUserId, { itemId });
    return { ok: true, event, syncResult };
  }

  if (event === 'item/error' || event === 'item/waiting_user_input' || event === 'item/login_succeeded' || event === 'item/deleted' || event === 'transactions/deleted') {
    console.log('[Pluggy][Webhook] evento registrado sem acao de sync imediata', payload);
    return { ok: true, event, ignored: true };
  }

  console.log('[Pluggy][Webhook] evento nao tratado explicitamente', payload);
  return { ok: true, event, ignored: true };
}
