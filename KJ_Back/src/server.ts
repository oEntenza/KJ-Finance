import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { z } from 'zod';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { prisma } from './lib/prisma';
import { resolveAuthenticatedUserId } from './lib/current-user';
import {
  CATEGORY_VALUES,
  PAYMENT_METHOD_VALUES,
  createTransactionEntry,
  deleteTransactionEntry,
  updateTransactionEntry,
} from './lib/finance';
import { transactionRoutes } from './routes/transactions';
import { userRoutes } from './routes/users';
import { authRoutes } from './routes/auth';
import { creditCardRoutes } from './routes/cards';

const app = Fastify({ logger: true });

app.register(jwt, {
  secret: 'secreta',
});

app.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
});

app.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch {
    reply.status(401).send({ message: 'Sessão expirada ou não autorizado.' });
  }
});

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      sub: string;
    };
  }
}

declare module 'fastify' {
  export interface FastifyInstance {
    authenticate: any;
  }
}

app.get('/health', async () => ({ status: 'ok' }));

app.put('/transactions/:id', { onRequest: [app.authenticate] }, async (request, reply) => {
  const params = z.object({ id: z.string() });
  const body = z.object({
    description: z.string(),
    amount: z.coerce.number().min(0.01),
    type: z.enum(['INCOME', 'EXPENSE']),
    category: z.enum(CATEGORY_VALUES),
    paymentMethod: z.enum(PAYMENT_METHOD_VALUES),
    creditCardId: z.string().optional().nullable(),
    installments: z.coerce.number().int().min(1).max(24).optional(),
    date: z.string(),
  });

  const { id } = params.parse(request.params);
  const payload = body.parse(request.body);
  const userId = await resolveAuthenticatedUserId(request.user.sub);

  try {
    await updateTransactionEntry(userId, id, payload);
    return reply.status(204).send();
  } catch (error) {
    app.log.error(error);
    return reply.status(400).send({
      message: error instanceof Error ? error.message : 'Falha ao atualizar no K&J Finance.',
    });
  }
});

app.delete('/transactions/:id', { onRequest: [app.authenticate] }, async (request, reply) => {
  const { id } = request.params as { id: string };
  const userId = await resolveAuthenticatedUserId(request.user.sub);

  try {
    await deleteTransactionEntry(userId, id);
    return reply.status(204).send();
  } catch (error) {
    app.log.error(error);
    return reply.status(400).send({
      message: error instanceof Error ? error.message : 'Erro ao excluir registro.',
    });
  }
});

app.delete('/transactions', { onRequest: [app.authenticate] }, async (request, reply) => {
  const userId = await resolveAuthenticatedUserId(request.user.sub);

  try {
    await prisma.transaction.deleteMany({ where: { userId } });
    return reply.status(204).send();
  } catch (error) {
    app.log.error(error);
    return reply.status(400).send({
      message: 'Erro ao excluir os registros do fluxo de caixa.',
    });
  }
});

app.post('/transactions/bulk', { onRequest: [app.authenticate] }, async (request, reply) => {
  const userId = await resolveAuthenticatedUserId(request.user.sub);
  const body = z.object({
    transactions: z.array(z.object({
      description: z.string(),
      amount: z.coerce.number().min(0.01),
      type: z.enum(['INCOME', 'EXPENSE']),
      category: z.enum(CATEGORY_VALUES),
      paymentMethod: z.enum(PAYMENT_METHOD_VALUES),
      creditCardId: z.string().optional().nullable(),
      installments: z.coerce.number().int().min(1).max(24).optional(),
      date: z.string(),
    })),
  });

  const { transactions } = body.parse(request.body);

  try {
    if (!transactions.length) {
      return reply.status(400).send({ message: 'Nenhum registro recebido para processamento.' });
    }

    for (const transaction of transactions) {
      await createTransactionEntry(userId, transaction);
    }

    return reply.status(201).send({ message: 'Carga em massa concluída!' });
  } catch (error) {
    app.log.error(error);
    const errorMessage = error instanceof Error ? error.message : 'Erro no processamento em massa.';
    return reply.status(400).send({
      message: 'Erro no processamento em massa.',
      detail: errorMessage,
    });
  }
});

app.register(authRoutes);
app.register(transactionRoutes);
app.register(userRoutes);
app.register(creditCardRoutes);

const frontDistPath = path.resolve(__dirname, '../../KJ_Front/dist');

const mimeTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function getMimeType(filePath: string) {
  return mimeTypes[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

app.get('/*', async (request, reply) => {
  if (!existsSync(frontDistPath)) {
    return reply.status(503).type('text/plain; charset=utf-8').send(
      'Build do frontend não encontrado. Execute "npm run build" em KJ_Front antes de iniciar o modo de produção.',
    );
  }

  const requestedPath = ((request.params as { '*': string })['*'] || '').trim();
  const safePath = requestedPath.replace(/^\/+/, '');
  const resolvedPath = path.resolve(frontDistPath, safePath);

  if (safePath && resolvedPath.startsWith(frontDistPath) && existsSync(resolvedPath) && statSync(resolvedPath).isFile()) {
    return reply.type(getMimeType(resolvedPath)).send(readFileSync(resolvedPath));
  }

  const indexPath = path.join(frontDistPath, 'index.html');
  return reply.type('text/html; charset=utf-8').send(readFileSync(indexPath, 'utf-8'));
});

const start = async () => {
  try {
    await app.listen({ port: 3333, host: '0.0.0.0' });
    console.log('K&J Backend online!');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

