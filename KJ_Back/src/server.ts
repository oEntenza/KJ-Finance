import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { compare } from 'bcryptjs';
import { prisma } from './lib/prisma';
import { transactionRoutes } from './routes/transactions';
import { userRoutes } from './routes/users';
import { authRoutes } from './routes/auth';

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
  } catch (err) {
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

app.put('/transactions/:id', { onRequest: [app.authenticate] }, async (request, reply) => {
  const { id } = request.params as { id: string };
  const { description, amount, category, date } = request.body as any;
  const userId = request.user.sub;

  try {
    const updated = await prisma.transaction.updateMany({
      where: {
        id,
        userId,
      },
      data: {
        description,
        amount: Number(amount),
        category,
        date: new Date(date),
      },
    });

    if (updated.count === 0) {
      return reply.status(404).send({ message: 'Registro não encontrado ou sem permissão.' });
    }

    return reply.status(204).send();
  } catch (error) {
    app.log.error(error);
    return reply.status(400).send({ message: 'Falha ao atualizar no K&J Finance.' });
  }
});

app.delete('/transactions/:id', { onRequest: [app.authenticate] }, async (request, reply) => {
  const { id } = request.params as { id: string };
  const userId = request.user.sub;

  try {
    const deleted = await prisma.transaction.deleteMany({
      where: {
        id,
        userId,
      },
    });

    if (deleted.count === 0) {
      return reply.status(404).send({ message: 'Registro não encontrado.' });
    }

    return reply.status(204).send();
  } catch (error) {
    app.log.error(error);
    return reply.status(400).send({ message: 'Erro ao excluir: permissão negada.' });
  }
});

app.delete('/transactions', { onRequest: [app.authenticate] }, async (request, reply) => {
  const userId = request.user.sub;

  try {
    await prisma.transaction.deleteMany({
      where: {
        userId,
      },
    });

    return reply.status(204).send();
  } catch (error) {
    app.log.error(error);
    return reply.status(400).send({ message: 'Erro ao excluir os registros do fluxo de caixa.' });
  }
});

app.post('/transactions/bulk', { onRequest: [app.authenticate] }, async (request, reply) => {
  const userId = request.user.sub;
  const { transactions } = request.body as { transactions: any[] };

  try {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return reply.status(400).send({ message: 'Nenhum registro recebido para processamento.' });
    }

    const allowedTypes = new Set(['INCOME', 'EXPENSE']);
    const allowedCategories = new Set([
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
    ]);

    for (let i = 0; i < transactions.length; i += 1) {
      const t = transactions[i];
      if (!t || typeof t !== 'object') {
        return reply.status(400).send({ message: `Registro ${i + 1} inválido.` });
      }
      if (!t.description || String(t.description).trim().length === 0) {
        return reply.status(400).send({ message: `Registro ${i + 1}: descrição obrigatória.` });
      }
      const amount = Number(t.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return reply.status(400).send({ message: `Registro ${i + 1}: valor inválido.` });
      }
      if (!allowedTypes.has(t.type)) {
        return reply.status(400).send({ message: `Registro ${i + 1}: tipo inválido.` });
      }
      if (!allowedCategories.has(t.category)) {
        return reply.status(400).send({ message: `Registro ${i + 1}: categoria inválida.` });
      }
      const parsedDate = new Date(t.date);
      if (Number.isNaN(parsedDate.getTime())) {
        return reply.status(400).send({ message: `Registro ${i + 1}: data inválida.` });
      }
    }

    const formattedTransactions = transactions.map((t) => ({
      description: t.description,
      amount: Number(t.amount),
      type: t.type,
      category: t.category,
      date: new Date(t.date),
      userId,
    }));

    await prisma.transaction.createMany({
      data: formattedTransactions,
      skipDuplicates: true,
    });

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
