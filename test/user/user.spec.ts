import { User } from './user.js';

describe('user', () => {
  it('verifies a correct password against the stored hash', async () => {
    const user = User.from({
      id: 'u1', email: 'a@b.com', name: 'A',
      passwordHash: User.hashPassword('correct-horse'),
      createdAt: new Date().toISOString(),
    });
    expect(await user.verifyPassword('correct-horse')).toEqual(true);
  });

  it('rejects a wrong password', async () => {
    const user = User.from({
      id: 'u1', email: 'a@b.com', name: 'A',
      passwordHash: User.hashPassword('correct-horse'),
      createdAt: new Date().toISOString(),
    });
    expect(await user.verifyPassword('wrong')).toEqual(false);
  });

  it('never exposes the hash to a client', () => {
    const user = User.from({
      id: 'u1', email: 'a@b.com', name: 'A',
      passwordHash: User.hashPassword('x'),
      createdAt: new Date().toISOString(),
    });
    expect(Object.keys(user.toPublic())).toEqual(['id', 'email', 'name']);
  });
});
