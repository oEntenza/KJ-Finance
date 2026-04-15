import { hash } from 'bcryptjs';
import { UserRepository } from '../repositories/user-repository';

export class UserService {
  constructor(private readonly userRepository = new UserRepository()) {}

  async create(data: { name: string; email: string; password: string }) {
    const userWithSameEmail = await this.userRepository.findByEmail(data.email);

    if (userWithSameEmail) {
      throw new Error('E-mail já cadastrado.');
    }

    const password_hash = await hash(data.password, 6);

    return this.userRepository.create({
      name: data.name,
      email: data.email,
      password_hash,
    });
  }

  updateName(userId: string, name: string) {
    return this.userRepository.updateName(userId, name);
  }
}
