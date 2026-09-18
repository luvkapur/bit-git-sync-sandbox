import { PlainSession, Session } from './session.js';

const NOW = new Date('2026-09-17T12:00:00.000Z');
const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000).toISOString();

const plain: PlainSession = {
  id: 's1',
  userId: 'u1',
  familyId: 'f1',
  accessTokenHash: 'a-hash',
  refreshTokenHash: 'r-hash',
  generation: 0,
  issuedAt: NOW.toISOString(),
  accessExpiresAt: minutes(15),
  refreshExpiresAt: minutes(60 * 24 * 14),
  absoluteExpiresAt: minutes(60 * 24 * 90),
};

describe('session validity', () => {
  it('accepts a fresh access token', () => {
    expect(Session.from(plain).isAccessValidAt(NOW)).toEqual(true);
  });

  it('rejects an access token past its expiry', () => {
    const at = new Date(NOW.getTime() + 16 * 60_000);
    expect(Session.from(plain).isAccessValidAt(at)).toEqual(false);
  });

  it('rejects an access token whose generation was rotated away', () => {
    const rotated = Session.from({ ...plain, rotatedAt: NOW.toISOString() });
    expect(rotated.isAccessValidAt(NOW)).toEqual(false);
  });

  it('rejects everything once the family is revoked', () => {
    const revoked = Session.from({ ...plain, revokedAt: NOW.toISOString(), revokedReason: 'logout' });
    expect(revoked.isAccessValidAt(NOW)).toEqual(false);
    expect(revoked.isRefreshValidAt(NOW)).toEqual(false);
  });

  it('accepts a refresh token long after the access token has died', () => {
    const at = new Date(NOW.getTime() + 60 * 60_000);
    const session = Session.from(plain);
    expect(session.isAccessValidAt(at)).toEqual(false);
    expect(session.isRefreshValidAt(at)).toEqual(true);
  });

  it('refuses a refresh token that has already been spent', () => {
    const spent = Session.from({ ...plain, rotatedAt: minutes(20) });
    expect(spent.isRotated()).toEqual(true);
    expect(spent.isRefreshValidAt(new Date(NOW.getTime() + 21 * 60_000))).toEqual(false);
  });

  it('stops honouring anything past the absolute ceiling, however often it refreshed', () => {
    const ceiling = Session.from({
      ...plain,
      accessExpiresAt: minutes(60 * 24 * 100),
      refreshExpiresAt: minutes(60 * 24 * 100),
    });
    const at = new Date(NOW.getTime() + 91 * 24 * 60 * 60_000);
    expect(ceiling.isAccessValidAt(at)).toEqual(false);
    expect(ceiling.isRefreshValidAt(at)).toEqual(false);
  });

  it('reports the remaining access lifetime in whole seconds, never negative', () => {
    const session = Session.from(plain);
    expect(session.accessExpiresInSeconds(NOW)).toEqual(900);
    expect(session.accessExpiresInSeconds(new Date(NOW.getTime() + 60 * 60_000))).toEqual(0);
  });
});

describe('session serialization', () => {
  it('round-trips through a plain object', () => {
    expect(Session.from(plain).toObject()).toEqual(plain);
  });

  it('keeps optional fields absent rather than undefined, so Mongo does not store them', () => {
    expect(Object.keys(Session.from(plain).toObject())).not.toContain('revokedAt');
  });

  it('round-trips a revoked, rotated session too', () => {
    const full: PlainSession = {
      ...plain,
      rotatedAt: minutes(5),
      revokedAt: minutes(6),
      revokedReason: 'token-reuse',
    };
    expect(Session.from(full).toObject()).toEqual(full);
  });

  it('never exposes a token fingerprint or the user id to a client', () => {
    expect(Object.keys(Session.from(plain).toPublic())).toEqual([
      'id',
      'issuedAt',
      'accessExpiresAt',
      'refreshExpiresAt',
    ]);
  });
});
