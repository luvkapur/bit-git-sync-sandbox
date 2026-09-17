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
    expect(Object.keys(user.toPublic())).toEqual(['id', 'email', 'name', 'emailConfirmed']);
  });

  it('is unconfirmed until an address is proved — including rows written before confirmation existed', () => {
    const user = User.from({
      id: 'u1', email: 'a@b.com', name: 'A',
      passwordHash: 'x', createdAt: new Date().toISOString(),
    });
    expect(user.isEmailConfirmed()).toEqual(false);
    expect(user.toPublic().emailConfirmed).toEqual(false);
  });

  it('confirms without mutating the user it was asked about', () => {
    const at = new Date('2026-09-17T12:00:00.000Z');
    const user = User.from({
      id: 'u1', email: 'a@b.com', name: 'A',
      passwordHash: 'x', createdAt: at.toISOString(),
    });
    const confirmed = user.confirmed(at);

    expect(confirmed.isEmailConfirmed()).toEqual(true);
    expect(user.isEmailConfirmed()).toEqual(false);
    expect(confirmed.toObject().confirmedAt).toEqual(at.toISOString());
  });

  it('round-trips an unconfirmed user without inventing a confirmedAt', () => {
    const plain = {
      id: 'u1', email: 'a@b.com', name: 'A',
      passwordHash: 'x', createdAt: new Date().toISOString(),
    };
    expect(User.from(plain).toObject()).toEqual(plain);
  });
});
