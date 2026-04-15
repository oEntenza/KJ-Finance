import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../services/auth-service';

const authService = new AuthService();

export async function authRoutes(app: FastifyInstance) {
  app.post('/sessions', async (request, reply) => {
    const authenticateBodySchema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
    });

    const { email, password } = authenticateBodySchema.parse(request.body);

    try {
      const user = await authService.authenticate(email, password);

      const token = await reply.jwtSign({}, {
        sign: {
          sub: user.id,
          expiresIn: '7d',
        },
      });

      return reply.status(200).send({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        token,
      });
    } catch (error: any) {
      return reply.status(400).send({ message: error.message || 'Falha na autenticação.' });
    }
  });
}
