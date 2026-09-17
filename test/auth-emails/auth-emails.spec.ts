import {
  accountAlreadyExistsEmail,
  confirmationEmail,
  escapeHtml,
  noAccountEmail,
} from './auth-emails.js';

const to = 'pilot@skyline.test';
const confirmUrl = 'https://skyline.test/auth/confirm?token=abc123';

describe('the confirmation email', () => {
  it('carries the link in both bodies, so a text-only client still works', () => {
    const mail = confirmationEmail({ to, name: 'Pilot', confirmUrl });
    expect(mail.text).toContain(confirmUrl);
    expect(mail.html).toContain(confirmUrl);
  });

  it('greets by name, and still reads properly without one', () => {
    expect(confirmationEmail({ to, name: 'Pilot', confirmUrl }).text).toContain('Hello Pilot,');
    expect(confirmationEmail({ to, confirmUrl }).text).toContain('Hello,');
    expect(confirmationEmail({ to, name: '   ', confirmUrl }).text).toContain('Hello,');
  });

  it('says the link is single use and says when it dies', () => {
    const mail = confirmationEmail({ to, confirmUrl });
    expect(mail.text).toContain('works once');
    expect(mail.text).toContain('24 hours');
  });

  it('tells a stranger that ignoring it is safe', () => {
    expect(confirmationEmail({ to, confirmUrl }).text).toContain('did not create this account');
  });

  it('takes the product name from the caller', () => {
    expect(confirmationEmail({ to, confirmUrl, appName: 'Tower' }).subject).toContain('Tower');
  });

  it('mentions no vendor anywhere', () => {
    const mail = confirmationEmail({ to, name: 'Pilot', confirmUrl });
    const whole = `${mail.subject}${mail.text}${mail.html}`.toLowerCase();
    for (const vendor of ['resend', 'sendgrid', 'mailgun', 'postmark', 'ses', 'clerk']) {
      expect(whole).not.toContain(vendor);
    }
  });
});

describe('the two silences', () => {
  it('tells an existing account that nothing happened, without creating one', () => {
    const mail = accountAlreadyExistsEmail({ to, name: 'Pilot', signInUrl: 'https://skyline.test/' });
    expect(mail.text).toContain('already have one');
    expect(mail.text).toContain('nothing has changed');
  });

  it('tells an unknown address that there is no account', () => {
    const mail = noAccountEmail({ to, signUpUrl: 'https://skyline.test/' });
    expect(mail.text).toContain('no Skyline account');
  });

  it('gives both the same subject line, so the envelope gives nothing away', () => {
    const exists = accountAlreadyExistsEmail({ to, signInUrl: 'https://skyline.test/' });
    const missing = noAccountEmail({ to, signUpUrl: 'https://skyline.test/' });
    expect(exists.subject).toEqual(missing.subject);
  });
});

describe('escaping', () => {
  it('neutralises a name that is trying to be markup', () => {
    const mail = confirmationEmail({ to, name: '<script>alert(1)</script>', confirmUrl });
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;script&gt;');
  });

  it('escapes the five characters that matter', () => {
    expect(escapeHtml(`<&>"'`)).toEqual('&lt;&amp;&gt;&quot;&#39;');
  });

  it('escapes a url carrying a quote, so it cannot break out of the href', () => {
    const mail = confirmationEmail({ to, confirmUrl: 'https://x.test/?t="onmouseover="x' });
    expect(mail.html).not.toContain('"onmouseover="');
  });
});
