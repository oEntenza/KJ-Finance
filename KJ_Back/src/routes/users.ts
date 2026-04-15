import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { resolveAuthenticatedUserId } from '../lib/current-user';
import { UserService } from '../services/user-service';

const userService = new UserService();

export async function userRoutes(app: FastifyInstance) {
  app.post('/users', async (request, reply) => {
    const createUserSchema = z.object({
      name: z.string().min(3),
      email: z.string().email(),
      password: z.string().min(6),
    });

    const { name, email, password } = createUserSchema.parse(request.body);

    try {
      const user = await userService.create({ name, email, password });
      return reply.status(201).send({ id: user.id });
    } catch (error: any) {
      return reply.status(400).send({ message: error.message || 'Falha ao cadastrar usuário.' });
    }
  });

  app.put('/users/me', { onRequest: [app.authenticate] }, async (request, reply) => {
    const updateUserSchema = z.object({
      name: z.string().min(3),
    });

    const { name } = updateUserSchema.parse(request.body);
    const userId = await resolveAuthenticatedUserId(request.user.sub);

    try {
      const updated = await userService.updateName(userId, name);
      return reply.status(200).send(updated);
    } catch (error) {
      return reply.status(400).send({ message: 'Falha ao atualizar o perfil.' });
    }
  });
}
