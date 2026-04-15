import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CATEGORY_VALUES, PAYMENT_METHOD_VALUES, calculateVisibleBalance, createTransactionEntry, listVisibleTransactions, serializeTransaction } from '../lib/finance';
import { resolveAuthenticatedUserId } from '../lib/current-user';

export async function transactionRoutes(app: FastifyInstance) {
  app.post('/transactions', { onRequest: [app.authenticate] }, async (request, reply) => {
    const createTransactionSchema = z.object({
      description: z.string(),
      amount: z.coerce.number().min(0.01),
      type: z.enum(['INCOME', 'EXPENSE']),
      category: z.enum(CATEGORY_VALUES),
      paymentMethod: z.enum(PAYMENT_METHOD_VALUES),
      creditCardId: z.string().optional().nullable(),
      installments: z.coerce.number().int().min(1).max(24).optional(),
      date: z.string().datetime(),
    });

    const userId = await resolveAuthenticatedUserId(request.user.sub);
    const payload = createTransactionSchema.parse(request.body);

    try {
      const transaction = await createTransactionEntry(userId, payload);
      return reply.status(201).send(serializeTransaction(transaction));
    } catch (error) {
      return reply.status(400).send({
        message: error instanceof Error ? error.message : 'Falha ao criar o registro.',
      });
    }
  });

  app.get('/transactions/balance', { onRequest: [app.authenticate] }, async (request) => {
    const userId = await resolveAuthenticatedUserId(request.user.sub);
    const balance = await calculateVisibleBalance(userId);
    return { balance };
  });

  app.get('/transactions', { onRequest: [app.authenticate] }, async (request) => {
    const userId = await resolveAuthenticatedUserId(request.user.sub);
    const transactions = await listVisibleTransactions(userId);
    return { transactions };
  });
}
