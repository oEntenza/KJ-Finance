import { CreditCardRepository } from '../repositories/credit-card-repository';

export class CreditCardService {
  constructor(private readonly creditCardRepository = new CreditCardRepository()) {}

  async listByUser(userId: string) {
    const cards = await this.creditCardRepository.findManyByUser(userId);

    return cards.map((card) => ({
      ...card,
      limit: Number(card.limit),
      outstandingAmount: card.transactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0),
    }));
  }

  async create(data: { name: string; limit: number; closingDay: number; userId: string }) {
    const card = await this.creditCardRepository.create(data);

    return {
      ...card,
      limit: Number(card.limit),
    };
  }

  async update(id: string, userId: string, data: { name: string; limit: number; closingDay: number }) {
    const result = await this.creditCardRepository.updateByUser(id, userId, data);

    if (result.count === 0) {
      throw new Error('Cartão não encontrado.');
    }

    const updated = await this.creditCardRepository.findById(id);

    return {
      ...updated,
      limit: Number(updated?.limit ?? 0),
    };
  }

  async remove(id: string, userId: string) {
    const transactionsCount = await this.creditCardRepository.countTransactionsByUserAndCard(userId, id);

    if (transactionsCount > 0) {
      throw new Error('Este cartão possui lançamentos vinculados e não pode ser removido.');
    }

    const deleted = await this.creditCardRepository.deleteByUser(id, userId);

    if (deleted.count === 0) {
      throw new Error('Cartão não encontrado.');
    }
  }
}
