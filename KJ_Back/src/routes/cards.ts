import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { resolveAuthenticatedUserId } from '../lib/current-user';

export async function creditCardRoutes(app: FastifyInstance) {
  app.get('/credit-cards', { onRequest: [app.authenticate] }, async (request) => {
    const userId = await resolveAuthenticatedUserId(request.user.sub);

    const cards = await prisma.creditCard.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: {
        transactions: {
          where: { isCardStatement: true },
          orderBy: { date: 'desc' },
        },
      },
    });

    return {
      cards: cards.map((card) => ({
        ...card,
        limit: Number(card.limit),
        outstandingAmount: card.transactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0),
      })),
    };
  });

  app.post('/credit-cards', { onRequest: [app.authenticate] }, async (request, reply) => {
    const schema = z.object({
      name: z.string().min(2),
      limit: z.coerce.number().min(0),
      closingDay: z.coerce.number().int().min(1).max(31),
    });

    const userId = await resolveAuthenticatedUserId(request.user.sub);
    const { name, limit, closingDay } = schema.parse(request.body);

    const card = await prisma.creditCard.create({
      data: {
        name,
        limit,
        closingDay,
        userId,
      },
    });

    return reply.status(201).send({
      ...card,
      limit: Number(card.limit),
    });
  });

  app.put('/credit-cards/:id', { onRequest: [app.authenticate] }, async (request, reply) => {
    const params = z.object({ id: z.string() });
    const body = z.object({
      name: z.string().min(2),
      limit: z.coerce.number().min(0),
      closingDay: z.coerce.number().int().min(1).max(31),
    });

    const userId = await resolveAuthenticatedUserId(request.user.sub);
    const { id } = params.parse(request.params);
    const { name, limit, closingDay } = body.parse(request.body);

    const card = await prisma.creditCard.updateMany({
      where: { id, userId },
      data: { name, limit, closingDay },
    });

    if (card.count === 0) {
      return reply.status(404).send({ message: 'Cartão não encontrado.' });
    }

    const updated = await prisma.creditCard.findUnique({ where: { id } });
    return reply.send({
      ...updated,
      limit: Number(updated?.limit ?? 0),
    });
  });

  app.delete('/credit-cards/:id', { onRequest: [app.authenticate] }, async (request, reply) => {
    const params = z.object({ id: z.string() });
    const userId = await resolveAuthenticatedUserId(request.user.sub);
    const { id } = params.parse(request.params);

    const transactionsCount = await prisma.transaction.count({
      where: { userId, creditCardId: id },
    });

    if (transactionsCount > 0) {
      return reply.status(400).send({
        message: 'Este cartão possui lançamentos vinculados e não pode ser removido.',
      });
    }

    const deleted = await prisma.creditCard.deleteMany({ where: { id, userId } });
    if (deleted.count === 0) {
      return reply.status(404).send({ message: 'Cartão não encontrado.' });
    }

    return reply.status(204).send();
  });
}

