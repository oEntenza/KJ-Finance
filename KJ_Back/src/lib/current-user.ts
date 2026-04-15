import { prisma } from './prisma';

export async function resolveAuthenticatedUserId(subject: string) {
  const normalized = String(subject || '').trim();
  if (!normalized) {
    throw new Error('Usuário autenticado inválido.');
  }

  const userById = await prisma.user.findUnique({
    where: { id: normalized },
    select: { id: true },
  });

  if (userById) {
    return userById.id;
  }

  const userByEmail = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true },
  });

  if (userByEmail) {
    return userByEmail.id;
  }

  throw new Error('Usuário autenticado não encontrado. Faça login novamente.');
}
