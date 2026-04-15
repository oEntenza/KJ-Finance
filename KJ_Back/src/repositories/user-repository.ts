import { prisma } from '../lib/prisma';

export class UserRepository {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  create(data: { name: string; email: string; password_hash: string }) {
    return prisma.user.create({ data });
  }

  updateName(id: string, name: string) {
    return prisma.user.update({
      where: { id },
      data: { name },
      select: { id: true, name: true, email: true },
    });
  }
}
