import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { hash } from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { resolveAuthenticatedUserId } from '../lib/current-user';

export async function userRoutes(app: FastifyInstance) {
  app.post('/users', async (request, reply) => {
    const createUserSchema = z.object({
      name: z.string().min(3),
      email: z.string().email(),
      password: z.string().min(6),
    });

    const { name, email, password } = createUserSchema.parse(request.body);

    // 1. Verificar se o e-mail jÃ¡ existe
    const userWithSameEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (userWithSameEmail) {
      return reply.status(400).send({ message: 'E-mail jÃ¡ cadastrado.' });
    }

    // 2. Criptografar a senha
    const password_hash = await hash(password, 6);

    // 3. Salvar no Neon
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password_hash,
      },
    });

    return reply.status(201).send({ id: user.id });
  });

  app.put('/users/me', { onRequest: [app.authenticate] }, async (request, reply) => {
    const updateUserSchema = z.object({
      name: z.string().min(3),
    });

    const { name } = updateUserSchema.parse(request.body);
    const userId = await resolveAuthenticatedUserId(request.user.sub);

    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { name },
        select: { id: true, name: true, email: true },
      });

      return reply.status(200).send(updated);
    } catch (error) {
      return reply.status(400).send({ message: 'Falha ao atualizar o perfil.' });
    }
  });
}

