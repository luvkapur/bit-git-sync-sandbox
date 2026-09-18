/**
 * One message, ready to send.
 *
 * Both a text and an HTML body, always. Text-only looks broken in a modern
 * client and HTML-only is unreadable in the ones that refuse to render it —
 * and a confirmation link the user cannot reach is a dead account.
 */
export type MailMessage = {
  /** the recipient address. */
  to: string;
  subject: string;
  /** the plain-text body. Must contain every link the HTML body contains. */
  text: string;
  /** the HTML body. */
  html: string;
};

/**
 * Anything that can deliver a message.
 *
 * Deliberately one method. A transport should not know what a confirmation
 * email is, and the flow should not know which company delivers it — the
 * templates live in their own component and mention no vendor at all.
 *
 * Implementations should resolve when the message has been handed over, and
 * reject with a readable error when it has not. They must never throw for a
 * reason the caller could have prevented, such as a missing API key —
 * see `isConfigured`.
 */
export interface Mailer {
  /** a stable name for logs and the health endpoint: `'console'`, `'resend'`. */
  readonly name: string;

  /**
   * Whether this mailer can actually deliver.
   *
   * False means the transport is present but unconfigured — a missing API key,
   * usually. Callers check this at boot so a misconfiguration is a loud line
   * in the log rather than a signup that silently never arrives.
   */
  isConfigured(): boolean;

  /**
   * Deliver a message.
   *
   * @throws when delivery failed and the caller should know. Signup treats a
   *         throw as a 500 rather than pretending the mail was sent.
   */
  send(message: MailMessage): Promise<void>;
}
