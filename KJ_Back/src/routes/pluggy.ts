import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { resolveAuthenticatedUserId } from '../lib/current-user';
import {
  createPluggyConnectToken,
  listRegisteredPluggyItems,
  processPluggyWebhook,
  registerPluggyItem,
  syncPluggyTransactions,
} from '../lib/pluggy';

export async function pluggyRoutes(app: FastifyInstance) {
  const handleWebhook = async (request: any, reply: any) => {
    const expectedSecret = process.env.PLUGGY_WEBHOOK_SECRET?.trim();
    const receivedSecret = String(
      request.headers['x-pluggy-webhook-secret']
      || request.headers['pluggy-webhook-secret']
      || '',
    ).trim();

    if (expectedSecret && receivedSecret !== expectedSecret) {
      app.log.warn({
        receivedSecret: receivedSecret ? '[present]' : '[missing]',
      }, 'Webhook do Pluggy rejeitado por segredo invalido.');
      return reply.status(401).send({ message: 'Webhook não autorizado.' });
    }

    reply.status(202).send({ received: true });

    try {
      const result = await processPluggyWebhook(request.body ?? {});
      app.log.info({ result }, 'Webhook do Pluggy processado com sucesso.');
    } catch (error) {
      app.log.error(error, 'Falha ao processar webhook do Pluggy.');
    }
  };

  app.post('/api/webhooks/pluggy', handleWebhook);
  app.post('/pluggy/webhook', handleWebhook);

  app.get('/pluggy/items', { onRequest: [app.authenticate] }, async (request) => {
    const userId = await resolveAuthenticatedUserId(request.user.sub);
    const items = await listRegisteredPluggyItems(userId);
    return { items };
  });

  app.post('/pluggy/connect-token', { onRequest: [app.authenticate] }, async (request, reply) => {
    const userId = await resolveAuthenticatedUserId(request.user.sub);

    try {
      const token = await createPluggyConnectToken(userId);
      return reply.status(200).send(token);
    } catch (error) {
      app.log.error(error);
      return reply.status(400).send({
        message: error instanceof Error ? error.message : 'Falha ao gerar o connect token do Pluggy.',
      });
    }
  });

  app.post('/pluggy/items/register', { onRequest: [app.authenticate] }, async (request, reply) => {
    const body = z.object({
      itemId: z.string().min(1),
    });

    const { itemId } = body.parse(request.body);
    const userId = await resolveAuthenticatedUserId(request.user.sub);

    try {
      const result = await registerPluggyItem(userId, itemId);
      return reply.status(201).send(result);
    } catch (error) {
      app.log.error(error);
      return reply.status(400).send({
        message: error instanceof Error ? error.message : 'Falha ao registrar o item do Pluggy.',
      });
    }
  });

  app.post('/pluggy/sync', { onRequest: [app.authenticate] }, async (request, reply) => {
    const body = z.object({
      itemId: z.string().optional(),
      accountId: z.string().optional(),
    });

    const payload = body.parse(request.body ?? {});
    const userId = await resolveAuthenticatedUserId(request.user.sub);

    try {
      const result = await syncPluggyTransactions(userId, payload);
      return reply.status(200).send(result);
    } catch (error) {
      app.log.error(error);
      return reply.status(400).send({
        message: error instanceof Error ? error.message : 'Falha ao sincronizar transações do Pluggy.',
      });
    }
  });
}
