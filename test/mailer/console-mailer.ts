import type { Mailer, MailMessage } from './mailer.js';

/** where a `ConsoleMailer` writes. `console` in production of this class. */
export type ConsoleLike = {
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
};

/**
 * The mailer that writes the email to stdout instead of sending it.
 *
 * This is the default when no provider is configured, and it is what makes the
 * whole confirmation flow demoable with zero credentials and no network: run
 * the app, sign up, and the confirmation URL is in your terminal.
 *
 * It says so loudly, every single time. A dev mailer that looks like a real
 * one is how a production deployment ends up silently dropping every
 * confirmation email — the account is created, the user waits, and nothing in
 * the logs suggests anything went wrong.
 *
 * @example
 * const mailer = resendMailerFromEnv() ?? new ConsoleMailer();
 */
export class ConsoleMailer implements Mailer {
  readonly name = 'console';

  constructor(private readonly out: ConsoleLike = console) {}

  /**
   * Always true — it can always write to a terminal.
   *
   * That is not the same as being able to deliver mail, which is why the
   * banner below is as loud as it is.
   */
  isConfigured(): boolean {
    return true;
  }

  async send(message: MailMessage): Promise<void> {
    this.out.warn(
      '[mailer] DEV MAILER — nothing was sent. This message was printed, not delivered. ' +
        'Configure a real mail provider before anyone but you uses this.'
    );
    this.out.log(
      [
        '',
        '  ┌─────────────────────────────────────────────────────────',
        `  │ to:      ${message.to}`,
        `  │ subject: ${message.subject}`,
        '  ├─────────────────────────────────────────────────────────',
        ...message.text.split('\n').map((line) => `  │ ${line}`),
        '  └─────────────────────────────────────────────────────────',
        '',
      ].join('\n')
    );
  }
}
