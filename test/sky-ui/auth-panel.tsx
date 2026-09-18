import { useEffect, useRef, useState } from 'react';
import { SkyClient, SkyError, OFFLINE, type WireUser } from './sky-client.js';
import { AUTH_CODES } from './sky-endpoints.js';
import { ACCENT, ALERT, INK, countdown } from './sky-theme.js';

/**
 * Which screen the account dialog is on.
 *
 * Signing up no longer ends in a session — it ends in an email — so "sign up"
 * and "sign in" are not two tabs of one form any more. They are two paths with
 * different endings, and three of the five screens here exist only because of
 * that: `sent`, `unconfirmed` and `confirm`.
 */
export type AuthScreen =
  | { kind: 'signin'; email?: string; note?: string }
  | { kind: 'signup'; email?: string }
  /** signup returned 202. There is no session; there is an email. */
  | { kind: 'sent'; email: string }
  /** login returned 403 `email-not-confirmed`. The account exists and cannot be used yet. */
  | { kind: 'unconfirmed'; email: string }
  /** arrived on `?token=` from the link in that email */
  | { kind: 'confirm'; token: string };

type Props = {
  client: SkyClient;
  initial: AuthScreen;
  onSignedIn: (user: WireUser) => void;
  onClose: () => void;
  /** anything worth putting through the page's live region */
  onSay: (message: string) => void;
};

/* ------------------------------------------------------------------ *
 *  Resend, with the 429 handled properly.
 * ------------------------------------------------------------------ */

function ResendButton({ client, email, onSay, tone = 'ghost' }: { client: SkyClient; email: string; onSay: (m: string) => void; tone?: 'ghost' | 'link' }) {
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);
  const [said, setSaid] = useState('');

  // One interval for the whole countdown, ticking a number down rather than
  // re-arming a timeout per second — a drifting timer here would leave the
  // button dead for longer than the server actually asked for.
  useEffect(() => {
    if (left <= 0) return;
    const id = setInterval(() => setLeft((n) => (n <= 1 ? 0 : n - 1)), 1000);
    return () => clearInterval(id);
  }, [left > 0]);

  const go = async () => {
    if (busy || left > 0) return;
    setBusy(true); setSaid('');
    try {
      await client.resendConfirmation(email);
      setSaid('Sent. Give it a minute.');
      onSay(`A new confirmation link is on its way to ${email}.`);
      // A successful resend is still a rate-limit event on the server's ledger,
      // so the button goes quiet on its own rather than inviting a second one.
      setLeft(30);
    } catch (e) {
      const err = e instanceof SkyError ? e : null;
      if (err?.code === AUTH_CODES.rateLimited || err?.status === 429) {
        const wait = err.retryAfterSeconds ?? 60;
        setLeft(wait);
        setSaid('');
        onSay(`Too many requests. You can ask for another link in ${countdown(wait)}.`);
      } else {
        setSaid(err?.code === OFFLINE ? 'Could not reach the server.' : 'That did not work — try again shortly.');
      }
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy || left > 0;
  return (
    <div>
      <button
        type="button"
        className="skyFocus"
        style={{ ...(tone === 'link' ? P.link : P.ghostWide), opacity: disabled ? 0.55 : 1, cursor: disabled ? 'default' : 'pointer' }}
        onClick={go}
        disabled={disabled}
      >
        {busy ? 'Sending…' : left > 0 ? `Another link in ${countdown(left)}` : 'Send the link again'}
      </button>
      {/* polite, not assertive: a countdown that interrupts is worse than one you can read */}
      <div aria-live="polite" style={P.hint}>
        {left > 0 ? `Too many requests. ${countdown(left)} until you can ask again.` : said}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  The illustrations. Drawn, not shipped — an <img> here would pop in.
 * ------------------------------------------------------------------ */

const Envelope = () => (
  <svg viewBox="0 0 120 84" style={P.art} aria-hidden>
    <defs>
      <linearGradient id="skyEnvA" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1d2534" /><stop offset="1" stopColor="#141a26" />
      </linearGradient>
    </defs>
    <rect x="12" y="20" width="96" height="60" rx="8" fill="url(#skyEnvA)" stroke="#2c3546" />
    <path d="M12 28 L60 58 L108 28" fill="none" stroke="#3d4a63" strokeWidth="2" strokeLinecap="round" />
    <circle cx="96" cy="22" r="11" fill={ACCENT} className="skyPop" />
    <path d="M91 22.5 l3.4 3.4 L101 19" fill="none" stroke="#08090B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <g className="skyLift">
      <path d="M46 12 h28" stroke="#2c3546" strokeWidth="2" strokeLinecap="round" />
      <path d="M54 5 h20" stroke="#232b3a" strokeWidth="2" strokeLinecap="round" />
    </g>
  </svg>
);

const Seal = ({ tone }: { tone: 'good' | 'bad' | 'wait' }) => {
  const c = tone === 'good' ? ACCENT : tone === 'bad' ? ALERT : INK.muted;
  return (
    <svg viewBox="0 0 80 80" style={P.artSmall} aria-hidden>
      <circle cx="40" cy="40" r="30" fill="none" stroke={c} strokeOpacity="0.28" strokeWidth="2" />
      <circle cx="40" cy="40" r="22" fill="none" stroke={c} strokeOpacity="0.5" strokeWidth="1.2" strokeDasharray={tone === 'wait' ? '4 5' : undefined} className={tone === 'wait' ? 'skySpin' : undefined} />
      {tone === 'good' && <path d="M30 41 l7 7 L52 32" fill="none" stroke={c} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" className="skyDraw" />}
      {tone === 'bad' && <path d="M40 27 v19 M40 52 v0.5" fill="none" stroke={c} strokeWidth="3.4" strokeLinecap="round" />}
    </svg>
  );
};

/* ------------------------------------------------------------------ *
 *  The dialog.
 * ------------------------------------------------------------------ */

export function AuthPanel({ client, initial, onSignedIn, onClose, onSay }: Props) {
  const [screen, setScreen] = useState<AuthScreen>(initial);
  useEffect(() => setScreen(initial), [initial]);

  const common = { client, onSay, go: setScreen, onSignedIn, onClose };

  if (screen.kind === 'sent') return <SentScreen {...common} email={screen.email} />;
  if (screen.kind === 'unconfirmed') return <UnconfirmedScreen {...common} email={screen.email} />;
  if (screen.kind === 'confirm') return <ConfirmScreen {...common} token={screen.token} />;
  return <FormScreen {...common} screen={screen} />;
}

type Shared = {
  client: SkyClient;
  onSay: (m: string) => void;
  go: (s: AuthScreen) => void;
  onSignedIn: (u: WireUser) => void;
  onClose: () => void;
};

/* --- sign in / sign up -------------------------------------------- */

function FormScreen({ client, onSay, go, onSignedIn, screen }: Shared & { screen: Extract<AuthScreen, { kind: 'signin' | 'signup' }> }) {
  const isSignup = screen.kind === 'signup';
  const [name, setName] = useState('');
  const [email, setEmail] = useState(screen.email ?? '');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => { first.current?.focus(); }, [screen.kind]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErr(''); setBusy(true);
    try {
      if (isSignup) {
        await client.signUp({ name: name.trim(), email: email.trim(), password });
        onSay(`Account started. We sent a confirmation link to ${email.trim()}.`);
        go({ kind: 'sent', email: email.trim() });
        return;
      }
      const user = await client.signIn({ email: email.trim(), password });
      onSay(`Signed in as ${user.name}.`);
      onSignedIn(user);
    } catch (e2) {
      const ex = e2 instanceof SkyError ? e2 : null;
      // Branch on the code. The prose is never parsed — see `WireError`.
      switch (ex?.code) {
        case AUTH_CODES.notConfirmed:
          // The single most important error state in the whole flow. Somebody
          // who signed up and cannot get in must be told why in one sentence,
          // on a screen that offers the fix, not shown "sign-in failed".
          go({ kind: 'unconfirmed', email: email.trim() });
          onSay('This account still needs its email address confirmed.');
          return;
        case AUTH_CODES.invalidCredentials:
          setErr('That email and password do not match an account.');
          break;
        case AUTH_CODES.weakPassword:
          setErr('Pick a longer, less guessable password — at least eight characters.');
          break;
        case AUTH_CODES.invalidEmail:
          setErr('That does not look like an email address.');
          break;
        case AUTH_CODES.rateLimited:
          setErr(`Too many attempts. Try again in ${countdown(ex.retryAfterSeconds ?? 60)}.`);
          break;
        case AUTH_CODES.unavailable:
          setErr('Accounts are switched off on this deployment. The map still works.');
          break;
        case OFFLINE:
          setErr('Could not reach the server. Check your connection.');
          break;
        default:
          setErr(ex ? ex.message : 'That did not work.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <h2 style={P.title}>{isSignup ? 'Create an account' : 'Sign in'}</h2>
      <p style={P.sub}>
        {isSignup
          ? 'Keep a watchlist, draw watch areas over the places you care about, and log every aircraft you spot.'
          : 'Your watchlist, your areas and your spot log, waiting where you left them.'}
      </p>
      {screen.kind === 'signin' && screen.note ? <div style={P.note}>{screen.note}</div> : null}

      {isSignup && (
        <label style={P.label}>
          <span style={P.labelText}>Name</span>
          <input ref={first} className="skyFocus" style={P.input} value={name} autoComplete="name"
                 onChange={(e) => setName(e.target.value)} placeholder="What should we call you?" />
        </label>
      )}
      <label style={P.label}>
        <span style={P.labelText}>Email</span>
        <input ref={isSignup ? undefined : first} className="skyFocus" style={P.input} value={email} type="email"
               autoComplete="email" inputMode="email"
               onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </label>
      <label style={P.label}>
        <span style={P.labelText}>Password</span>
        <input className="skyFocus" style={P.input} value={password} type="password"
               autoComplete={isSignup ? 'new-password' : 'current-password'}
               onChange={(e) => setPassword(e.target.value)} placeholder={isSignup ? 'At least eight characters' : '••••••••'} />
      </label>

      {err && <div style={P.err} role="alert">{err}</div>}

      <button className="skyFocus" style={{ ...P.primaryWide, opacity: busy ? 0.7 : 1 }} type="submit" disabled={busy}>
        {busy ? 'One moment…' : isSignup ? 'Create account' : 'Sign in'}
      </button>

      {isSignup && <p style={P.fine}>We email you a link to confirm the address. You sign in after that.</p>}

      <button type="button" className="skyFocus" style={P.link}
              onClick={() => go(isSignup ? { kind: 'signin', email } : { kind: 'signup', email })}>
        {isSignup ? 'I already have an account' : 'I need an account'}
      </button>
    </form>
  );
}

/* --- "we sent you an email" --------------------------------------- */

/**
 * The screen most apps get wrong.
 *
 * Signup succeeded, and there is nothing signed in to show for it, so the page
 * has to carry the whole story itself: what happened, where it went, what to do
 * next, and what to do when nothing arrives. Every one of those is on this
 * screen, including the two most common causes — the spam folder, and a typo in
 * the address, which is why the address is repeated back in full.
 */
function SentScreen({ client, onSay, go, email }: Shared & { email: string }) {
  useEffect(() => { onSay(`Check your inbox. We sent a confirmation link to ${email}.`); }, [email]);
  return (
    <div style={P.centred}>
      <Envelope />
      <h2 style={P.title}>Check your inbox</h2>
      <p style={P.sub}>
        We sent a confirmation link to
      </p>
      <div style={P.address}>{email}</div>
      <p style={P.sub}>Click it and your account is live. The link is good for a day.</p>

      <ol style={P.steps}>
        <li style={P.step}><span style={P.stepNo}>1</span>Open the email from Skyline</li>
        <li style={P.step}><span style={P.stepNo}>2</span>Press <em style={P.em}>Confirm my address</em></li>
        <li style={P.step}><span style={P.stepNo}>3</span>Come back here and sign in</li>
      </ol>

      <div style={P.divider} />
      <p style={P.fine}>Nothing after a minute or two? It is usually the spam folder — or a typo in the address above.</p>
      <ResendButton client={client} email={email} onSay={onSay} />
      <button type="button" className="skyFocus" style={P.link} onClick={() => go({ kind: 'signin', email })}>
        I have confirmed it — sign me in
      </button>
    </div>
  );
}

/* --- login refused because the address was never proved ----------- */

function UnconfirmedScreen({ client, onSay, go, email }: Shared & { email: string }) {
  return (
    <div style={P.centred}>
      <Seal tone="wait" />
      <h2 style={P.title}>Nearly there</h2>
      <p style={P.sub}>
        This account exists, but <strong style={P.strong}>{email}</strong> has not been confirmed yet, so it cannot sign in.
        The link is in your inbox.
      </p>
      <div style={P.callout}>
        <span style={P.calloutGlyph} aria-hidden>✉</span>
        <span>Your password was right. Only the address is waiting.</span>
      </div>
      <ResendButton client={client} email={email} onSay={onSay} />
      <button type="button" className="skyFocus" style={P.link} onClick={() => go({ kind: 'signin', email })}>
        Back to sign in
      </button>
    </div>
  );
}

/* --- the confirmation link landed --------------------------------- */

type ConfirmState =
  | { kind: 'working' }
  | { kind: 'done'; user: WireUser }
  | { kind: 'used' }
  | { kind: 'expired' }
  | { kind: 'invalid' }
  | { kind: 'broken'; message: string };

/**
 * Three outcomes, told apart.
 *
 * Already-used and expired are not the same thing and must not read as the
 * same thing: one means you are done and can sign in, the other means you need
 * a fresh link. Collapsing them into "invalid link" sends a confirmed user off
 * to resend a link they do not need.
 */
function ConfirmScreen({ client, onSay, go, token }: Shared & { token: string }) {
  const [state, setState] = useState<ConfirmState>({ kind: 'working' });
  const [email, setEmail] = useState('');
  const asked = useRef('');

  useEffect(() => {
    if (asked.current === token) return;   // StrictMode double-mount would spend the link twice
    asked.current = token;
    let live = true;
    client.confirm(token).then(
      (user) => {
        if (!live) return;
        setState({ kind: 'done', user });
        setEmail(user.email);
        onSay('Email address confirmed. You can sign in now.');
      },
      (e) => {
        if (!live) return;
        const code = e instanceof SkyError ? e.code : '';
        const next: ConfirmState =
          code === AUTH_CODES.alreadyUsed ? { kind: 'used' }
          : code === AUTH_CODES.expiredConfirmation ? { kind: 'expired' }
          : code === AUTH_CODES.invalidConfirmation ? { kind: 'invalid' }
          : { kind: 'broken', message: code === OFFLINE ? 'We could not reach the server.' : (e instanceof Error ? e.message : 'Something went wrong.') };
        setState(next);
        onSay(next.kind === 'used' ? 'That link has already been used.'
            : next.kind === 'expired' ? 'That link has expired.'
            : 'That confirmation link could not be used.');
      }
    );
    return () => { live = false; };
  }, [token]);

  if (state.kind === 'working') {
    return (
      <div style={P.centred}>
        <Seal tone="wait" />
        <h2 style={P.title}>Confirming…</h2>
        <p style={P.sub}>One moment while we check the link.</p>
      </div>
    );
  }

  if (state.kind === 'done') {
    return (
      <div style={P.centred}>
        <Seal tone="good" />
        <h2 style={P.title}>Address confirmed</h2>
        <p style={P.sub}>
          <strong style={P.strong}>{state.user.email}</strong> is yours. Sign in and the globe is yours too —
          watchlist, watch areas, spot log.
        </p>
        <button className="skyFocus" style={P.primaryWide} onClick={() => go({ kind: 'signin', email: state.user.email })}>
          Sign in
        </button>
      </div>
    );
  }

  if (state.kind === 'used') {
    return (
      <div style={P.centred}>
        <Seal tone="good" />
        <h2 style={P.title}>Already confirmed</h2>
        <p style={P.sub}>
          This link has been used once already — which means the address is proved and the account is ready.
          Nothing more to do here.
        </p>
        <button className="skyFocus" style={P.primaryWide} onClick={() => go({ kind: 'signin' })}>Sign in</button>
      </div>
    );
  }

  const expired = state.kind === 'expired';
  return (
    <div style={P.centred}>
      <Seal tone="bad" />
      <h2 style={P.title}>{expired ? 'That link has expired' : state.kind === 'invalid' ? 'We do not recognise that link' : 'That did not work'}</h2>
      <p style={P.sub}>
        {expired
          ? 'Confirmation links are short-lived on purpose. Put your address in below and we will send a fresh one.'
          : state.kind === 'invalid'
            ? 'It may have been cut in half by an email client, or it may not be ours. A new one will fix it.'
            : state.message}
      </p>
      {state.kind !== 'broken' && (
        <>
          <label style={P.label}>
            <span style={P.labelText}>Email</span>
            <input className="skyFocus" style={P.input} value={email} type="email" autoComplete="email"
                   onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          {email.includes('@') ? <ResendButton client={client} email={email.trim()} onSay={onSay} /> : <div style={P.hint}>Enter the address you signed up with.</div>}
        </>
      )}
      <button type="button" className="skyFocus" style={P.link} onClick={() => go({ kind: 'signin', email })}>
        Back to sign in
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export const P: Record<string, React.CSSProperties> = {
  title: { fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: INK.primary },
  sub: { fontSize: 14, lineHeight: 1.5, color: INK.secondary, margin: '10px 0 0' },
  strong: { color: INK.primary, fontWeight: 600 },
  em: { color: INK.primary, fontStyle: 'normal', fontWeight: 600 },
  centred: { textAlign: 'center' },
  art: { width: 128, height: 90, display: 'block', margin: '0 auto 14px' },
  artSmall: { width: 84, height: 84, display: 'block', margin: '0 auto 10px' },
  address: { fontSize: 15, fontWeight: 600, color: INK.primary, margin: '8px 0', wordBreak: 'break-all' },
  steps: { listStyle: 'none', margin: '18px 0 0', padding: 0, textAlign: 'left' },
  step: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: INK.secondary, padding: '7px 0' },
  stepNo: { flex: '0 0 22px', height: 22, borderRadius: 999, background: INK.field, border: `1px solid ${INK.line}`, color: INK.muted, fontSize: 11, fontWeight: 600, display: 'grid', placeItems: 'center' },
  divider: { height: 1, background: INK.line, margin: '20px 0 16px' },
  callout: { display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', fontSize: 13, color: INK.secondary, background: 'rgba(25,158,112,0.10)', border: '1px solid rgba(25,158,112,0.28)', borderRadius: 10, padding: '11px 13px', margin: '16px 0' },
  calloutGlyph: { color: ACCENT, fontSize: 15 },
  note: { fontSize: 13, color: INK.secondary, background: INK.field, border: `1px solid ${INK.line}`, borderRadius: 10, padding: '10px 12px', margin: '14px 0 0' },
  label: { display: 'block', marginTop: 14, textAlign: 'left' },
  labelText: { display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: INK.muted, marginBottom: 6 },
  input: { width: '100%', height: 46, padding: '0 14px', background: INK.field, border: `1px solid ${INK.edge}`, borderRadius: 8, color: INK.primary, fontSize: 15, fontFamily: 'inherit', outline: 'none' },
  err: { color: '#ef8180', fontSize: 13, lineHeight: 1.45, marginTop: 14, textAlign: 'left', background: 'rgba(227,73,72,0.12)', border: '1px solid rgba(227,73,72,0.34)', borderRadius: 8, padding: '9px 11px' },
  hint: { fontSize: 12, color: INK.muted, marginTop: 8, minHeight: 16 },
  fine: { fontSize: 12, color: INK.muted, margin: '12px 0 0', lineHeight: 1.5 },
  primaryWide: { width: '100%', height: 44, marginTop: 18, border: 0, borderRadius: 8, background: '#fff', color: '#08090B', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' },
  ghostWide: { width: '100%', height: 42, marginTop: 4, borderRadius: 8, background: 'transparent', border: `1px solid ${INK.edge}`, color: '#d3d8e2', fontSize: 13.5, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' },
  link: { width: '100%', marginTop: 12, background: 'none', border: 0, color: INK.secondary, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', padding: 6 },
};
