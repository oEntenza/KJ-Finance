import { buildStatementDate, buildStatementDescription, isVisibleStatementPeriod, serializeTransaction } from '../lib/finance';
import { CreditCardRepository } from '../repositories/credit-card-repository';

export class CreditCardService {
  constructor(private readonly creditCardRepository = new CreditCardRepository()) {}

  async listByUser(userId: string) {
    const cards = await this.creditCardRepository.findManyByUser(userId);
    const futureStatements = await this.creditCardRepository.findFutureStatementsByUser(userId);

    return {
      cards: cards.map((card) => ({
        id: card.id,
        name: card.name,
        closingDay: card.closingDay,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
        userId: card.userId,
        transactionsCount: Math.max(card._count.transactions - card.transactions.length, 0),
        outstandingAmount: card.transactions
          .filter((transaction) => isVisibleStatementPeriod(transaction.statementMonth, transaction.statementYear, transaction.date))
          .reduce((sum, transaction) => sum + Number(transaction.amount), 0),
      })),
      futureStatements: futureStatements
        .filter((transaction) => !isVisibleStatementPeriod(transaction.statementMonth, transaction.statementYear, transaction.date))
        .map(serializeTransaction),
    };
  }

  async create(data: { name: string; closingDay: number; userId: string }) {
    return this.creditCardRepository.create(data);
  }

  async update(id: string, userId: string, data: { name: string; closingDay: number }) {
    const result = await this.creditCardRepository.updateByUser(id, userId, data);

    if (result.count === 0) {
      throw new Error('Cartão não encontrado.');
    }

    const updated = await this.creditCardRepository.findById(id);
    if (!updated) {
      throw new Error('Cartão não encontrado.');
    }

    const statements = await this.creditCardRepository.findStatementsByCard(userId, id);
    await Promise.all(
      statements.map((statement) => {
        const statementMonth = statement.statementMonth ?? 1;
        const statementYear = statement.statementYear ?? new Date().getUTCFullYear();

        return this.creditCardRepository.updateStatement(statement.id, {
          description: buildStatementDescription(updated.name, statementMonth, statementYear),
          date: buildStatementDate(statementMonth, statementYear, updated.closingDay),
        });
      }),
    );

    return updated;
  }

  async remove(id: string, userId: string) {
    const deleted = await this.creditCardRepository.deleteByUser(id, userId);

    if (deleted.count === 0) {
      throw new Error('Cartão não encontrado.');
    }
  }
}
