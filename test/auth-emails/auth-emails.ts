import type { MailMessage } from '@luvktest/test.mailer';

/** what every message in this file needs to know. */
export type EmailContext = {
  /** the recipient address. */
  to: string;
  /** the person's name, for the greeting. Falls back gracefully when empty. */
  name?: string;
  /** the product name in the subject line and signature. */
  appName?: string;
};

const DEFAULT_APP_NAME = 'Skyline';

function greeting(name?: string): string {
  const trimmed = (name ?? '').trim();
  return trimmed ? `Hello ${trimmed},` : 'Hello,';
}

/**
 * Escape text before it goes into an HTML body.
 *
 * A name comes from a signup form, and a signup form is the internet. Without
 * this, "Pilot<script>" is an email that renders whatever the sender liked in
 * a webmail client that trusts us.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout(appName: string, lines: string[]): string {
  const body = lines.map((line) => `    <p>${line}</p>`).join('\n');
  return [
    '<!doctype html>',
    '<html><body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.5;color:#111">',
    '  <div style="max-width:32rem;margin:0 auto;padding:2rem 1rem">',
    body,
    `    <p style="color:#666;font-size:.875rem">— ${escapeHtml(appName)}</p>`,
    '  </div>',
    '</body></html>',
  ].join('\n');
}

/**
 * "Confirm your email address."
 *
 * The link is the whole message. It appears in both bodies, unshortened and
 * unwrapped, because a user whose client refuses HTML still has to be able to
 * copy it out of the plain text.
 *
 * @param confirmUrl the fully-qualified URL carrying the confirmation token.
 */
export function confirmationEmail(context: EmailContext & { confirmUrl: string }): MailMessage {
  const appName = context.appName ?? DEFAULT_APP_NAME;
  const { confirmUrl } = context;
  return {
    to: context.to,
    subject: `Confirm your email for ${appName}`,
    text: [
      greeting(context.name),
      '',
      `Confirm your email address to finish setting up your ${appName} account:`,
      '',
      confirmUrl,
      '',
      'The link works once and expires in 24 hours.',
      '',
      'If you did not create this account, you can ignore this message — nothing',
      'will happen until the link is used.',
      '',
      `— ${appName}`,
    ].join('\n'),
    html: layout(appName, [
      escapeHtml(greeting(context.name)),
      `Confirm your email address to finish setting up your ${escapeHtml(appName)} account:`,
      `<a href="${escapeHtml(confirmUrl)}">${escapeHtml(confirmUrl)}</a>`,
      'The link works once and expires in 24 hours.',
      'If you did not create this account, you can ignore this message — nothing will happen until the link is used.',
    ]),
  };
}

/**
 * "Someone tried to sign up with your address, and you already have an account."
 *
 * This is the message that makes the signup form safe to expose. When an
 * address is already registered, signup answers exactly as it does for a new
 * one and sends this instead of a confirmation link — so the response cannot
 * be used to test whether somebody has an account, while the person who
 * actually owns the address still finds out that something happened.
 */
export function accountAlreadyExistsEmail(context: EmailContext & { signInUrl: string }): MailMessage {
  const appName = context.appName ?? DEFAULT_APP_NAME;
  const { signInUrl } = context;
  return {
    to: context.to,
    subject: `About your ${appName} account`,
    text: [
      greeting(context.name),
      '',
      `Someone just tried to create a ${appName} account with this email address,`,
      'but you already have one. No new account was created and nothing has changed.',
      '',
      `If it was you, sign in instead: ${signInUrl}`,
      '',
      'If you have forgotten your password, you can reset it from that page.',
      '',
      'If it was not you, you can safely ignore this message.',
      '',
      `— ${appName}`,
    ].join('\n'),
    html: layout(appName, [
      escapeHtml(greeting(context.name)),
      `Someone just tried to create a ${escapeHtml(appName)} account with this email address, but you already have one. No new account was created and nothing has changed.`,
      `If it was you, <a href="${escapeHtml(signInUrl)}">sign in instead</a>.`,
      'If it was not you, you can safely ignore this message.',
    ]),
  };
}

/**
 * "Someone asked us to resend a confirmation link for an address with no account."
 *
 * The mirror image of the one above, for the resend endpoint: an unknown
 * address still receives a message, so the response and the resulting inbox
 * activity are both indistinguishable from the registered case.
 */
export function noAccountEmail(context: EmailContext & { signUpUrl: string }): MailMessage {
  const appName = context.appName ?? DEFAULT_APP_NAME;
  const { signUpUrl } = context;
  return {
    to: context.to,
    subject: `About your ${appName} account`,
    text: [
      greeting(context.name),
      '',
      `Someone asked us to resend a confirmation email for this address, but there is`,
      `no ${appName} account attached to it.`,
      '',
      `If you meant to create one: ${signUpUrl}`,
      '',
      'If it was not you, you can safely ignore this message.',
      '',
      `— ${appName}`,
    ].join('\n'),
    html: layout(appName, [
      escapeHtml(greeting(context.name)),
      `Someone asked us to resend a confirmation email for this address, but there is no ${escapeHtml(appName)} account attached to it.`,
      `If you meant to create one, <a href="${escapeHtml(signUpUrl)}">sign up here</a>.`,
      'If it was not you, you can safely ignore this message.',
    ]),
  };
}
