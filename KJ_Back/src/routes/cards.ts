import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { resolveAuthenticatedUserId } from '../lib/current-user';
import { CreditCardService } from '../services/credit-card-service';

const creditCardService = new CreditCardService();

export async function creditCardRoutes(app: FastifyInstance) {
  app.get('/credit-cards', { onRequest: [app.authenticate] }, async (request) => {
    const userId = await resolveAuthenticatedUserId(request.user.sub);
    const result = await creditCardService.listByUser(userId);
    return result;
  });

  app.post('/credit-cards', { onRequest: [app.authenticate] }, async (request, reply) => {
    const schema = z.object({
      name: z.string().min(2),
      closingDay: z.coerce.number().int().min(1).max(31),
    });

    const userId = await resolveAuthenticatedUserId(request.user.sub);
    const { name, closingDay } = schema.parse(request.body);

    const card = await creditCardService.create({
      name,
      closingDay,
      userId,
    });

    return reply.status(201).send(card);
  });

  app.put('/credit-cards/:id', { onRequest: [app.authenticate] }, async (request, reply) => {
    const params = z.object({ id: z.string() });
    const body = z.object({
      name: z.string().min(2),
      closingDay: z.coerce.number().int().min(1).max(31),
    });

    const userId = await resolveAuthenticatedUserId(request.user.sub);
    const { id } = params.parse(request.params);
    const { name, closingDay } = body.parse(request.body);

    try {
      const updated = await creditCardService.update(id, userId, { name, closingDay });
      return reply.send(updated);
    } catch (error: any) {
      const statusCode = error.message === 'Cartão não encontrado.' ? 404 : 400;
      return reply.status(statusCode).send({ message: error.message || 'Falha ao atualizar cartão.' });
    }
  });

  app.delete('/credit-cards/:id', { onRequest: [app.authenticate] }, async (request, reply) => {
    const params = z.object({ id: z.string() });
    const userId = await resolveAuthenticatedUserId(request.user.sub);
    const { id } = params.parse(request.params);

    try {
      await creditCardService.remove(id, userId);
      return reply.status(204).send();
    } catch (error: any) {
      const statusCode = error.message === 'Cartão não encontrado.' ? 404 : 400;
      return reply.status(statusCode).send({ message: error.message || 'Falha ao remover cartão.' });
    }
  });
}
