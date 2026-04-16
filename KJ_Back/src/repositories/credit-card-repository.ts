import { prisma } from '../lib/prisma';

export class CreditCardRepository {
  findManyByUser(userId: string) {
    return prisma.creditCard.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
        transactions: {
          where: { isCardStatement: true },
          orderBy: { date: 'desc' },
          include: { creditCard: true },
        },
      },
    });
  }

  findFutureStatementsByUser(userId: string) {
    return prisma.transaction.findMany({
      where: {
        userId,
        isCardStatement: true,
        parentTransactionId: null,
      },
      include: {
        creditCard: true,
        childTransactions: {
          include: { creditCard: true },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });
  }

  create(data: { name: string; closingDay: number; userId: string }) {
    return prisma.creditCard.create({ data: { ...data, limit: 0 } });
  }

  updateByUser(id: string, userId: string, data: { name: string; closingDay: number }) {
    return prisma.creditCard.updateMany({
      where: { id, userId },
      data,
    });
  }

  findById(id: string) {
    return prisma.creditCard.findUnique({ where: { id } });
  }

  findStatementsByCard(userId: string, creditCardId: string) {
    return prisma.transaction.findMany({
      where: {
        userId,
        creditCardId,
        isCardStatement: true,
        parentTransactionId: null,
      },
      orderBy: [{ statementYear: 'asc' }, { statementMonth: 'asc' }],
    });
  }

  updateStatement(id: string, data: { description: string; date: Date }) {
    return prisma.transaction.update({
      where: { id },
      data,
    });
  }

  countTransactionsByUserAndCard(userId: string, creditCardId: string) {
    return prisma.transaction.count({
      where: { userId, creditCardId },
    });
  }

  async deleteByUser(id: string, userId: string) {
    const [, deleted] = await prisma.$transaction([
      prisma.transaction.deleteMany({
        where: { userId, creditCardId: id },
      }),
      prisma.creditCard.deleteMany({ where: { id, userId } }),
    ]);

    return deleted;
  }
}
