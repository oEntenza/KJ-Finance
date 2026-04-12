import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { compare } from 'bcryptjs';
import { prisma } from '../lib/prisma';

export async function authRoutes(app: FastifyInstance) {
  app.post('/sessions', async (request, reply) => {
    const authenticateBodySchema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
    });

    const { email, password } = authenticateBodySchema.parse(request.body);

    // 1. Buscar usuário no Neon
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return reply.status(400).send({ message: 'E-mail ou senha inválidos.' });
    }

    // 2. Comparar a senha enviada com o hash do banco
    const isPasswordValid = await compare(password, user.password_hash);

    if (!isPasswordValid) {
      return reply.status(400).send({ message: 'E-mail ou senha inválidos.' });
    }

    // 3. Gerar o Token JWT
    const token = await reply.jwtSign({}, {
      sign: {
        sub: user.id, // O ID do usuário fica "escondido" dentro do token
        expiresIn: '7d', // O login dura 7 dias
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
  });
}