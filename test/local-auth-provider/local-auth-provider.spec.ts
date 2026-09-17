import { MIN_AUTH_SECRET_LENGTH } from '@luvktest/test.token-crypto';
import { MemorySessionStore, SessionManager } from '@luvktest/test.session-manager';
import { ConfirmationManager, MemoryConfirmationStore } from '@luvktest/test.email-confirmation';
import type { MailMessage, Mailer } from '@luvktest/test.mailer';
import type { AuthFailure } from '@luvktest/test.auth-provider';
import { LocalAuthProvider } from './local-auth-provider.js';
import { MemoryAccountStore } from './memory-account-store.js';
import { authLinksFrom } from './auth-links.js';

const SECRET = 'l'.repeat(MIN_AUTH_SECRET_LENGTH);
const START = new Date('2026-09-17T12:00:00.000Z');
const PASSWORD = 'correct-horse';
const EMAIL = 'pilot@skyline.test';

/** a mailer that keeps what it was given, and can be told to fail. */
function recordingMailer() {
  const sent: MailMessage[] = [];
  let broken = false;
  const mailer: Mailer = {
    name: 'recording',
    isConfigured: () => true,
    async send(message) {
      if (broken) throw new Error('transport is down');
      sent.push(message);
    },
  };
  return {
    mailer,
    sent,
    break: () => {
      broken = true;
    },
    last: () => sent[sent.length - 1],
  };
}

function harness() {
  const accounts = new MemoryAccountStore();
  const mail = recordingMailer();
  let now = new Date(START);
  let seq = 0;
  const clock = { now: () => new Date(now) };

  const sessions = new SessionManager(new MemorySessionStore(), SECRET, { now: clock.now });
  const confirmations = new ConfirmationManager(new MemoryConfirmationStore(), SECRET, { now: clock.now });
  const auth = new LocalAuthProvider({
    accounts,
    sessions,
    confirmations,
    mailer: mail.mailer,
    links: authLinksFrom('https://skyline.test'),
    now: clock.now,
    newId: () => `u-${(seq += 1)}`,
  });

  return {
    auth,
    accounts,
    mail,
    advance: (ms: number) => {
      now = new Date(now.getTime() + ms);
    },
  };
}

/** pull the confirmation token out of the last email, as a user would. */
function tokenFromLastMail(mail: ReturnType<typeof recordingMailer>): string {
  const text = mail.last()?.text ?? '';
  return /token=([A-Za-z0-9_%-]+)/.exec(text)?.[1] ?? '';
}

function failure(result: { ok: boolean }): AuthFailure {
  if (result.ok) throw new Error('expected a refusal');
  return result as AuthFailure;
}

/** sign up and click the link, which is what most tests need to start from. */
async function confirmedUser(h: ReturnType<typeof harness>) {
  await h.auth.signUp({ email: EMAIL, name: 'Pilot', password: PASSWORD });
  const confirmed = await h.auth.confirmEmail(tokenFromLastMail(h.mail));
  if (!confirmed.ok) throw new Error('expected the confirmation to work');
  return confirmed.user;
}

describe('signing up', () => {
  it('creates an unconfirmed account and emails a link', async () => {
    const h = harness();
    const result = await h.auth.signUp({ email: EMAIL, name: 'Pilot', password: PASSWORD });

    expect(result).toEqual({ ok: true, next: 'confirmation-sent' });
    expect(h.accounts.all().length).toEqual(1);
    expect(h.accounts.all()[0]?.confirmedAt).toEqual(undefined);
    expect(h.mail.last()?.to).toEqual(EMAIL);
    expect(h.mail.last()?.text).toContain('https://skyline.test/auth/confirm?token=');
  });

  it('hands back no session at all — the account is not usable yet', async () => {
    const h = harness();
    const result = await h.auth.signUp({ email: EMAIL, name: 'Pilot', password: PASSWORD });
    expect(JSON.stringify(result)).not.toContain('accessToken');
  });

  it('stores a hash, never the password', async () => {
    const h = harness();
    await h.auth.signUp({ email: EMAIL, name: 'Pilot', password: PASSWORD });
    expect(JSON.stringify(h.accounts.all())).not.toContain(PASSWORD);
  });

  it('refuses a malformed address and a short password', async () => {
    const h = harness();
    expect(failure(await h.auth.signUp({ email: 'nope', name: 'x', password: PASSWORD })).code).toEqual('invalid-email');
    expect(failure(await h.auth.signUp({ email: EMAIL, name: 'x', password: 'short' })).code).toEqual('weak-password');
    expect(h.accounts.all()).toEqual([]);
  });

  it('normalises the address, so two casings are one account', async () => {
    const h = harness();
    await h.auth.signUp({ email: '  Pilot@Skyline.TEST ', name: 'Pilot', password: PASSWORD });
    expect(h.accounts.all()[0]?.email).toEqual(EMAIL);
  });

  it('answers identically for an address that already exists', async () => {
    const h = harness();
    const first = await h.auth.signUp({ email: EMAIL, name: 'Pilot', password: PASSWORD });
    const second = await h.auth.signUp({ email: EMAIL, name: 'Impostor', password: 'another-password' });

    expect(second).toEqual(first);
  });

  it('creates nothing and changes nothing on that second attempt', async () => {
    const h = harness();
    await h.auth.signUp({ email: EMAIL, name: 'Pilot', password: PASSWORD });
    const before = h.accounts.all();
    await h.auth.signUp({ email: EMAIL, name: 'Impostor', password: 'another-password' });

    expect(h.accounts.all()).toEqual(before);
  });

  it('emails the owner instead, telling them nothing has changed', async () => {
    const h = harness();
    await h.auth.signUp({ email: EMAIL, name: 'Pilot', password: PASSWORD });
    await h.auth.signUp({ email: EMAIL, name: 'Impostor', password: 'another-password' });

    expect(h.mail.sent.length).toEqual(2);
    expect(h.mail.last()?.text).toContain('already have one');
    expect(h.mail.last()?.text).not.toContain('/auth/confirm?token=');
  });

  it('answers a signup identically whether or not the mail could be sent', async () => {
    // A transport that fails for some recipients and not others — a sandboxed
    // provider, a per-domain block, greylisting — turns any difference here into
    // an account-enumeration oracle. Observed for real against a sandboxed
    // Resend key: a known address answered 200 and an unknown one 503.
    const working = harness();
    const broken = harness();
    broken.mail.break();

    const a = await working.auth.signUp({ email: EMAIL, name: 'Pilot', password: PASSWORD });
    const b = await broken.auth.signUp({ email: EMAIL, name: 'Pilot', password: PASSWORD });

    expect(JSON.stringify(b)).toEqual(JSON.stringify(a));
    expect(b.ok).toEqual(true);
  });

  it('answers a resend identically whether the address exists or the mail fails', async () => {
    const known = harness();
    await known.auth.signUp({ email: EMAIL, name: 'Pilot', password: PASSWORD });

    const unknown = harness();
    const brokenMail = harness();
    brokenMail.mail.break();

    const a = await known.auth.resendConfirmation(EMAIL);
    const b = await unknown.auth.resendConfirmation('no-such-person@example.com');
    const c = await brokenMail.auth.resendConfirmation('no-such-person@example.com');

    expect(JSON.stringify(b)).toEqual(JSON.stringify(a));
    expect(JSON.stringify(c)).toEqual(JSON.stringify(a));
  });

  it('rate limits, and the limit does not depend on the address existing', async () => {
    const h = harness();
    const known: string[] = [];
    const unknown: string[] = [];
    await h.auth.signUp({ email: EMAIL, name: 'Pilot', password: PASSWORD });

    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const a = await h.auth.signUp({ email: EMAIL, name: 'x', password: PASSWORD });
      // eslint-disable-next-line no-await-in-loop
      const b = await h.auth.signUp({ email: 'nobody@skyline.test', name: 'x', password: PASSWORD });
      known.push(a.ok ? 'ok' : (a as AuthFailure).code);
      unknown.push(b.ok ? 'ok' : (b as AuthFailure).code);
    }

    expect(known).toEqual(['ok', 'ok', 'rate-limited']);
    expect(unknown).toEqual(['ok', 'ok', 'ok']);
  });

  it('says how long to wait when it refuses', async () => {
    const h = harness();
    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await h.auth.signUp({ email: EMAIL, name: 'x', password: PASSWORD });
    }
    const limited = failure(await h.auth.signUp({ email: EMAIL, name: 'x', password: PASSWORD }));
    expect(limited.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe('confirming', () => {
  it('activates the account', async () => {
    const h = harness();
    const user = await confirmedUser(h);
    expect(user.emailConfirmed).toEqual(true);
    expect(h.accounts.all()[0]?.confirmedAt).toEqual(START.toISOString());
  });

  it('signs the user in, so confirming is the end of signing up', async () => {
    // This asserted the opposite until somebody actually used it. Being told to
    // go and type a password after proving you control the address reads as
    // failure every time — it was reported as "the link doesn't sign me in" on
    // three separate attempts. The prefetch risk that motivated the old rule is
    // handled by the emailed URL pointing at a page that confirms on a POST, so
    // a prefetcher's GET spends nothing.
    const h = harness();
    await h.auth.signUp({ email: EMAIL, name: 'Pilot', password: PASSWORD });

    const result = await h.auth.confirmEmail(tokenFromLastMail(h.mail));
    if (!result.ok) throw new Error('expected the confirmation to succeed');

    expect(result.user.emailConfirmed).toEqual(true);
    expect(result.tokens?.accessToken).toBeTruthy();
    expect(result.tokens?.refreshToken).toBeTruthy();
  });

  it('tells a second click that the link is spent, not that it is invalid', async () => {
    const h = harness();
    await h.auth.signUp({ email: EMAIL, name: 'Pilot', password: PASSWORD });
    const token = tokenFromLastMail(h.mail);
    await h.auth.confirmEmail(token);

    expect(failure(await h.auth.confirmEmail(token)).code).toEqual('confirmation-already-used');
  });

  it('tells an old link that it has expired', async () => {
    const h = harness();
    await h.auth.signUp({ email: EMAIL, name: 'Pilot', password: PASSWORD });
    const token = tokenFromLastMail(h.mail);
    h.advance(25 * 60 * 60 * 1000);

    expect(failure(await h.auth.confirmEmail(token)).code).toEqual('expired-confirmation');
  });

  it('tells a forged link that it is not a link', async () => {
    const h = harness();
    expect(failure(await h.auth.confirmEmail('made-up')).code).toEqual('invalid-confirmation');
    expect(failure(await h.auth.confirmEmail('')).code).toEqual('invalid-confirmation');
  });

  it('gives all three refusals different codes, so the page can say different things', async () => {
    const h = harness();
    await h.auth.signUp({ email: EMAIL, name: 'Pilot', password: PASSWORD });
    const token = tokenFromLastMail(h.mail);
    await h.auth.confirmEmail(token);

    const used = failure(await h.auth.confirmEmail(token));
    const forged = failure(await h.auth.confirmEmail('made-up'));
    expect(new Set([used.code, forged.code]).size).toEqual(2);
    expect(used.message).not.toEqual(forged.message);
  });
});

describe('resending', () => {
  it('sends a fresh link and retires the previous one', async () => {
    const h = harness();
    await h.auth.signUp({ email: EMAIL, name: 'Pilot', password: PASSWORD });
    const first = tokenFromLastMail(h.mail);

    expect(await h.auth.resendConfirmation(EMAIL)).toEqual({ ok: true });
    const second = tokenFromLastMail(h.mail);
    expect(second).not.toEqual(first);

    expect(failure(await h.auth.confirmEmail(first)).code).toEqual('expired-confirmation');
    expect((await h.auth.confirmEmail(second)).ok).toEqual(true);
  });

  it('answers identically for an address with no account', async () => {
    const h = harness();
    await h.auth.signUp({ email: EMAIL, name: 'Pilot', password: PASSWORD });

    expect(await h.auth.resendConfirmation('nobody@skyline.test')).toEqual(
      await h.auth.resendConfirmation(EMAIL)
    );
  });

  it('still sends a message to an unknown address, so silence gives nothing away', async () => {
    const h = harness();
    await h.auth.resendConfirmation('nobody@skyline.test');
    expect(h.mail.sent.length).toEqual(1);
    expect(h.mail.last()?.text).toContain('no Skyline account');
    expect(h.mail.last()?.text).not.toContain('/auth/confirm?token=');
  });

  it('sends a sign-in nudge, not a link, to an address that is already confirmed', async () => {
    const h = harness();
    await confirmedUser(h);
    await h.auth.resendConfirmation(EMAIL);

    expect(h.mail.last()?.text).toContain('already have one');
    expect(h.mail.last()?.text).not.toContain('/auth/confirm?token=');
  });

  it('is rate limited', async () => {
    const h = harness();
    await h.auth.signUp({ email: EMAIL, name: 'Pilot', password: PASSWORD });
    await h.auth.resendConfirmation(EMAIL);
    await h.auth.resendConfirmation(EMAIL);

    expect(failure(await h.auth.resendConfirmation(EMAIL)).code).toEqual('rate-limited');
  });
});

describe('signing in', () => {
  it('refuses an unconfirmed account, and says why', async () => {
    const h = harness();
    await h.auth.signUp({ email: EMAIL, name: 'Pilot', password: PASSWORD });

    const refused = failure(await h.auth.signIn({ email: EMAIL, password: PASSWORD }));
    expect(refused.code).toEqual('email-not-confirmed');
    expect(refused.message).toContain('confirm');
  });

  it('works once the link has been clicked', async () => {
    const h = harness();
    await confirmedUser(h);

    const session = await h.auth.signIn({ email: EMAIL, password: PASSWORD });
    expect(session.ok).toEqual(true);
    expect(session.ok && session.tokens.tokenType).toEqual('Bearer');
    expect(session.ok && session.user.emailConfirmed).toEqual(true);
  });

  it('refuses the wrong password identically to an unknown address', async () => {
    const h = harness();
    await confirmedUser(h);

    const wrong = failure(await h.auth.signIn({ email: EMAIL, password: 'wrong' }));
    const missing = failure(await h.auth.signIn({ email: 'nobody@skyline.test', password: 'wrong' }));
    expect(wrong).toEqual(missing);
  });

  it('does not say "not confirmed" to somebody who guessed the password wrong', async () => {
    const h = harness();
    await h.auth.signUp({ email: EMAIL, name: 'Pilot', password: PASSWORD });
    expect(failure(await h.auth.signIn({ email: EMAIL, password: 'wrong' })).code).toEqual('invalid-credentials');
  });
});

describe('sessions through the interface', () => {
  it('identifies the holder of an access token', async () => {
    const h = harness();
    const user = await confirmedUser(h);
    const session = await h.auth.signIn({ email: EMAIL, password: PASSWORD });
    if (!session.ok) throw new Error('expected a session');

    const who = await h.auth.currentUser(session.tokens.accessToken);
    expect(who.ok && who.user.id).toEqual(user.id);
  });

  it('refuses a forged or missing access token', async () => {
    const h = harness();
    expect(failure(await h.auth.currentUser('made-up')).code).toEqual('invalid-token');
    expect(failure(await h.auth.currentUser('')).code).toEqual('no-token');
  });

  it('refreshes without a password and rotates the refresh token', async () => {
    const h = harness();
    await confirmedUser(h);
    const first = await h.auth.signIn({ email: EMAIL, password: PASSWORD });
    if (!first.ok) throw new Error('expected a session');
    h.advance(16 * 60 * 1000);

    expect(failure(await h.auth.currentUser(first.tokens.accessToken)).code).toEqual('expired-access-token');

    const second = await h.auth.refresh(first.tokens.refreshToken);
    expect(second.ok).toEqual(true);
    expect(second.ok && second.tokens.refreshToken).not.toEqual(first.tokens.refreshToken);
    expect((await h.auth.currentUser(second.ok ? second.tokens.accessToken : '')).ok).toEqual(true);
  });

  it('fails closed when a spent refresh token comes back', async () => {
    const h = harness();
    await confirmedUser(h);
    const first = await h.auth.signIn({ email: EMAIL, password: PASSWORD });
    if (!first.ok) throw new Error('expected a session');
    const second = await h.auth.refresh(first.tokens.refreshToken);

    expect(failure(await h.auth.refresh(first.tokens.refreshToken)).code).toEqual('token-reused');
    expect(failure(await h.auth.currentUser(second.ok ? second.tokens.accessToken : '')).code).toEqual('revoked');
  });

  it('will not serve a session whose account has been deleted', async () => {
    const h = harness();
    const user = await confirmedUser(h);
    const session = await h.auth.signIn({ email: EMAIL, password: PASSWORD });
    if (!session.ok) throw new Error('expected a session');
    h.accounts.delete(user.id);

    expect(failure(await h.auth.currentUser(session.tokens.accessToken)).code).toEqual('invalid-token');
  });

  it('will not refresh a session whose account has been deleted', async () => {
    const h = harness();
    const user = await confirmedUser(h);
    const session = await h.auth.signIn({ email: EMAIL, password: PASSWORD });
    if (!session.ok) throw new Error('expected a session');
    h.accounts.delete(user.id);

    expect(failure(await h.auth.refresh(session.tokens.refreshToken)).code).toEqual('invalid-token');
  });

  it('signs out immediately, and says so even for a token it never issued', async () => {
    const h = harness();
    await confirmedUser(h);
    const session = await h.auth.signIn({ email: EMAIL, password: PASSWORD });
    if (!session.ok) throw new Error('expected a session');

    expect(await h.auth.signOut(session.tokens.refreshToken)).toEqual({ ok: true });
    expect(failure(await h.auth.currentUser(session.tokens.accessToken)).code).toEqual('revoked');
    expect(await h.auth.signOut('made-up')).toEqual({ ok: true });
  });

  it('names itself, for logs and health checks', () => {
    expect(harness().auth.name).toEqual('local');
  });
});
