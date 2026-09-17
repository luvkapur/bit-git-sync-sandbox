import { MIN_AUTH_SECRET_LENGTH } from '@luvktest/test.token-crypto';
import { Confirmation } from './confirmation.js';
import { ConfirmationManager, DEFAULT_CONFIRMATION_POLICY } from './confirmation-manager.js';
import { MemoryConfirmationStore } from './memory-confirmation-store.js';

const SECRET = 'c'.repeat(MIN_AUTH_SECRET_LENGTH);
const START = new Date('2026-09-17T12:00:00.000Z');
const minutes = (n: number) => n * 60 * 1000;
const hours = (n: number) => n * 60 * minutes(1);

function harness() {
  const store = new MemoryConfirmationStore();
  let now = new Date(START);
  let seq = 0;
  const confirmations = new ConfirmationManager(store, SECRET, {
    now: () => new Date(now),
    newId: () => `c-${(seq += 1)}`,
  });
  return {
    store,
    confirmations,
    advance: (ms: number) => {
      now = new Date(now.getTime() + ms);
    },
  };
}

describe('the entity', () => {
  const plain = {
    id: 'c1',
    userId: 'u1',
    email: 'pilot@skyline.test',
    tokenHash: 'hash',
    issuedAt: START.toISOString(),
    expiresAt: new Date(START.getTime() + hours(24)).toISOString(),
  };

  it('round-trips', () => {
    expect(Confirmation.from(plain).toObject()).toEqual(plain);
  });

  it('is usable while it is fresh and unused', () => {
    expect(Confirmation.from(plain).isUsableAt(START)).toEqual(true);
  });

  it('is not usable once used, however fresh', () => {
    expect(Confirmation.from({ ...plain, usedAt: START.toISOString() }).isUsableAt(START)).toEqual(false);
  });

  it('is not usable a day and a minute later', () => {
    const at = new Date(START.getTime() + hours(24) + minutes(1));
    expect(Confirmation.from(plain).isUsableAt(at)).toEqual(false);
  });
});

describe('issuing a link', () => {
  it('hands back a token that is not stored anywhere in the clear', async () => {
    const h = harness();
    const issued = await h.confirmations.issue('u1', 'pilot@skyline.test');
    expect(JSON.stringify(h.store.all())).not.toContain(issued.token);
  });

  it('expires in a day', async () => {
    const h = harness();
    const issued = await h.confirmations.issue('u1', 'pilot@skyline.test');
    expect(new Date(issued.expiresAt).getTime()).toEqual(START.getTime() + DEFAULT_CONFIRMATION_POLICY.ttlMs);
  });

  it('normalises the address it is proving', async () => {
    const h = harness();
    await h.confirmations.issue('u1', '  Pilot@Skyline.TEST ');
    expect(h.store.all()[0]?.email).toEqual('pilot@skyline.test');
  });

  it('retires the previous link, so a mailbox is not a ring of keys', async () => {
    const h = harness();
    const first = await h.confirmations.issue('u1', 'pilot@skyline.test');
    h.advance(minutes(1));
    const second = await h.confirmations.issue('u1', 'pilot@skyline.test');

    expect((await h.confirmations.confirm(first.token)).ok).toEqual(false);
    expect((await h.confirmations.confirm(second.token)).ok).toEqual(true);
  });

  it('leaves other users’ links alone', async () => {
    const h = harness();
    const mine = await h.confirmations.issue('u1', 'pilot@skyline.test');
    await h.confirmations.issue('u2', 'other@skyline.test');
    expect((await h.confirmations.confirm(mine.token)).ok).toEqual(true);
  });
});

describe('clicking a link', () => {
  it('confirms, and says which address was proved', async () => {
    const h = harness();
    const issued = await h.confirmations.issue('u1', 'pilot@skyline.test');
    const outcome = await h.confirmations.confirm(issued.token);
    expect(outcome).toEqual({ ok: true, userId: 'u1', email: 'pilot@skyline.test' });
  });

  it('refuses a second click, distinguishably', async () => {
    const h = harness();
    const issued = await h.confirmations.issue('u1', 'pilot@skyline.test');
    await h.confirmations.confirm(issued.token);

    const again = await h.confirmations.confirm(issued.token);
    expect(again).toEqual({ ok: false, code: 'confirmation-already-used' });
  });

  it('refuses an expired link, distinguishably', async () => {
    const h = harness();
    const issued = await h.confirmations.issue('u1', 'pilot@skyline.test');
    h.advance(hours(24) + 1000);

    expect(await h.confirmations.confirm(issued.token)).toEqual({ ok: false, code: 'expired-confirmation' });
  });

  it('refuses a forged link, distinguishably', async () => {
    const h = harness();
    await h.confirmations.issue('u1', 'pilot@skyline.test');
    expect(await h.confirmations.confirm('made-up')).toEqual({ ok: false, code: 'invalid-confirmation' });
  });

  it('refuses an empty token without touching the store', async () => {
    const h = harness();
    expect(await h.confirmations.confirm('')).toEqual({ ok: false, code: 'invalid-confirmation' });
  });

  it('refuses a token minted under a different secret', async () => {
    const h = harness();
    const issued = await h.confirmations.issue('u1', 'pilot@skyline.test');
    const other = new ConfirmationManager(h.store, `${SECRET}-different`);
    expect((await other.confirm(issued.token)).ok).toEqual(false);
  });

  it('lets only one of two simultaneous clicks win', async () => {
    const h = harness();
    const issued = await h.confirmations.issue('u1', 'pilot@skyline.test');
    const [a, b] = await Promise.all([
      h.confirmations.confirm(issued.token),
      h.confirmations.confirm(issued.token),
    ]);
    expect([a.ok, b.ok].filter(Boolean).length).toEqual(1);
  });
});

describe('rate limiting', () => {
  it('allows the first three attempts in the window', async () => {
    const h = harness();
    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      expect((await h.confirmations.recordAttempt('pilot@skyline.test')).allowed).toEqual(true);
    }
  });

  it('refuses the fourth, and says how long to wait', async () => {
    const h = harness();
    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await h.confirmations.recordAttempt('pilot@skyline.test');
    }
    h.advance(minutes(5));

    const fourth = await h.confirmations.recordAttempt('pilot@skyline.test');
    expect(fourth.allowed).toEqual(false);
    expect(fourth.allowed === false && fourth.retryAfterSeconds).toEqual(10 * 60);
  });

  it('forgives once the window has rolled past', async () => {
    const h = harness();
    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await h.confirmations.recordAttempt('pilot@skyline.test');
    }
    h.advance(minutes(16));
    expect((await h.confirmations.recordAttempt('pilot@skyline.test')).allowed).toEqual(true);
  });

  it('counts an address that has no account exactly as it counts one that has', async () => {
    const h = harness();
    // the whole point: an attacker cannot tell the two apart by the 429
    const known: boolean[] = [];
    const unknown: boolean[] = [];
    for (let i = 0; i < 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      known.push((await h.confirmations.recordAttempt('pilot@skyline.test')).allowed);
      // eslint-disable-next-line no-await-in-loop
      unknown.push((await h.confirmations.recordAttempt('nobody@skyline.test')).allowed);
    }
    expect(known).toEqual(unknown);
    expect(known).toEqual([true, true, true, false]);
  });

  it('treats the same address typed differently as the same address', async () => {
    const h = harness();
    await h.confirmations.recordAttempt('pilot@skyline.test');
    await h.confirmations.recordAttempt('PILOT@skyline.test');
    await h.confirmations.recordAttempt('  pilot@Skyline.test  ');
    expect((await h.confirmations.recordAttempt('pilot@skyline.test')).allowed).toEqual(false);
  });

  it('limits each address separately', async () => {
    const h = harness();
    for (let i = 0; i < 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await h.confirmations.recordAttempt('pilot@skyline.test');
    }
    expect((await h.confirmations.recordAttempt('other@skyline.test')).allowed).toEqual(true);
  });
});

describe('housekeeping', () => {
  it('drops links that are past their expiry', async () => {
    const h = harness();
    await h.confirmations.issue('u1', 'pilot@skyline.test');
    h.advance(hours(25));
    expect(await h.confirmations.purgeExpired()).toEqual(1);
    expect(h.store.all()).toEqual([]);
  });
});
