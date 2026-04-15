import { compare } from 'bcryptjs';
import { UserRepository } from '../repositories/user-repository';

export class AuthService {
  constructor(private readonly userRepository = new UserRepository()) {}

  async authenticate(email: string, password: string) {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new Error('E-mail ou senha inválidos.');
    }

    const isPasswordValid = await compare(password, user.password_hash);

    if (!isPasswordValid) {
      throw new Error('E-mail ou senha inválidos.');
    }

    return user;
  }
}
