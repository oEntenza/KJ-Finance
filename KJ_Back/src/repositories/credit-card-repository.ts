import { prisma } from '../lib/prisma';

export class CreditCardRepository {
  findManyByUser(userId: string) {
    return prisma.creditCard.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: {
        transactions: {
          where: { isCardStatement: true },
          orderBy: { date: 'desc' },
        },
      },
    });
  }

  create(data: { name: string; limit: number; closingDay: number; userId: string }) {
    return prisma.creditCard.create({ data });
  }

  updateByUser(id: string, userId: string, data: { name: string; limit: number; closingDay: number }) {
    return prisma.creditCard.updateMany({
      where: { id, userId },
      data,
    });
  }

  findById(id: string) {
    return prisma.creditCard.findUnique({ where: { id } });
  }

  countTransactionsByUserAndCard(userId: string, creditCardId: string) {
    return prisma.transaction.count({
      where: { userId, creditCardId },
    });
  }

  deleteByUser(id: string, userId: string) {
    return prisma.creditCard.deleteMany({ where: { id, userId } });
  }
}
