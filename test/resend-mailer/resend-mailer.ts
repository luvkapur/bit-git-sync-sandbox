import type { Mailer, MailMessage } from '@luvktest/test.mailer';

/** the API key. Never committed, never defaulted. */
export const RESEND_API_KEY_ENV = 'RESEND_API_KEY';

/** the From address, e.g. `Skyline <hello@skyline.example>`. */
export const MAIL_FROM_ENV = 'SKYLINE_MAIL_FROM';

const ENDPOINT = 'https://api.resend.com/emails';

/** how long to wait for the API before giving up on a send. */
const TIMEOUT_MS = 10_000;

/** everything this transport needs. */
export type ResendMailerOptions = {
  apiKey: string;
  /** the From address, as the provider wants it. */
  from: string;
  /** injectable for tests. Defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
  /** overridable for a proxy or a mock server. */
  endpoint?: string;
};

/**
 * The whole vendor integration: one POST.
 *
 * It is this small on purpose. Swapping providers means editing this one file
 * — the templates know nothing about who delivers them, and the flow knows
 * nothing about email at all beyond `Mailer.send`.
 *
 * @example
 * const mailer = resendMailerFromEnv() ?? new ConsoleMailer();
 */
export class ResendMailer implements Mailer {
  readonly name = 'resend';

  private readonly fetchImpl: typeof fetch;
  private readonly endpoint: string;

  constructor(private readonly options: ResendMailerOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.endpoint = options.endpoint ?? ENDPOINT;
  }

  /** whether both the key and the sender are present. */
  isConfigured(): boolean {
    return Boolean(this.options.apiKey && this.options.from);
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error(
        `${this.name} mailer is not configured: set ${RESEND_API_KEY_ENV} and ${MAIL_FROM_ENV}.`
      );
    }

    const res = await this.fetchImpl(this.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.options.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      // The body usually explains the refusal — an unverified sending domain,
      // most often. Read it, but never echo the key that went with it.
      const detail = await res.text().catch(() => '');
      throw new Error(`mail provider refused the message (${res.status}) ${detail}`.trim());
    }
  }
}

/**
 * Build the mailer from the environment, or answer that it is not configured.
 *
 * Returns undefined rather than throwing, because "no provider configured" is
 * a normal state for a developer running the app locally — the caller falls
 * back to the dev mailer, which prints. A *partly* configured provider is a
 * different thing and does throw: a key with no sender is a typo, and silently
 * printing emails to stdout on a production box because of a typo is exactly
 * the failure this whole arrangement exists to avoid.
 *
 * @throws Error when one of the two variables is set and the other is not.
 */
export function resendMailerFromEnv(
  env: Record<string, string | undefined> = process.env,
  fetchImpl?: typeof fetch
): ResendMailer | undefined {
  const apiKey = (env[RESEND_API_KEY_ENV] ?? '').trim();
  const from = (env[MAIL_FROM_ENV] ?? '').trim();

  if (!apiKey && !from) return undefined;
  if (!apiKey || !from) {
    throw new Error(
      `mail provider is half-configured: ${RESEND_API_KEY_ENV} is ${apiKey ? 'set' : 'missing'} ` +
        `and ${MAIL_FROM_ENV} is ${from ? 'set' : 'missing'}. Set both, or neither.`
    );
  }

  const options: ResendMailerOptions = { apiKey, from };
  if (fetchImpl) options.fetchImpl = fetchImpl;
  return new ResendMailer(options);
}
