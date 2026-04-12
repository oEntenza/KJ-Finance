import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

export async function transactionRoutes(app: FastifyInstance) {
  
  // 1. ROTA DE CRIAÇÃO (POST)
  // Adicionamos { onRequest: [app.authenticate] } para validar o Token JWT
  app.post('/transactions', { onRequest: [app.authenticate] }, async (request, reply) => {
    const createTransactionSchema = z.object({
      description: z.string(),
      amount: z.number(),
      type: z.enum(['INCOME', 'EXPENSE']),
  category: z.enum([
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
  ]),
      date: z.string().datetime(),
    });

    const { description, amount, type, category, date } = createTransactionSchema.parse(request.body);

    // Recuperamos o ID do usuário logado através do payload do token
    const userId = request.user.sub;

    const transaction = await prisma.transaction.create({
      data: {
        description,
        amount,
        type,
        category,
        date: new Date(date),
        userId, // Vincula a transação ao usuário dono do token
      },
    });

    return reply.status(201).send(transaction);
  });

  // 2. ROTA DE SALDO (GET)
  app.get('/transactions/balance', { onRequest: [app.authenticate] }, async (request) => {
    const userId = request.user.sub;

    // Filtramos para buscar apenas as transações do usuário logado
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
      },
    });

    const balance = transactions.reduce((acc, transaction) => {
      const amount = Number(transaction.amount);
      return transaction.type === 'INCOME' ? acc + amount : acc - amount;
    }, 0);

    return { balance };
  });

  // 3. ROTA DE HISTÓRICO (GET)
  app.get('/transactions', { onRequest: [app.authenticate] }, async (request) => {
    const userId = request.user.sub;

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return { transactions };
  });
}
