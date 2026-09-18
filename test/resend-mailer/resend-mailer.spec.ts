import type { MailMessage } from '@luvktest/test.mailer';
import {
  MAIL_FROM_ENV,
  RESEND_API_KEY_ENV,
  ResendMailer,
  resendMailerFromEnv,
} from './resend-mailer.js';

const message: MailMessage = {
  to: 'pilot@skyline.test',
  subject: 'Confirm your email',
  text: 'link: https://skyline.test/auth/confirm?token=abc',
  html: '<p>link</p>',
};

function fakeFetch(status = 200, body = '') {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = (async (url: unknown, init: unknown) => {
    calls.push({ url: String(url), init: (init ?? {}) as RequestInit });
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => body,
    };
  }) as unknown as typeof fetch;
  return { calls, impl };
}

function parsedBody(init: RequestInit): Record<string, unknown> {
  return JSON.parse(String(init.body)) as Record<string, unknown>;
}

describe('sending', () => {
  it('posts the message to the provider with the key in the header', async () => {
    const { calls, impl } = fakeFetch();
    await new ResendMailer({ apiKey: 'key_123', from: 'Skyline <a@b.test>', fetchImpl: impl }).send(message);

    expect(calls.length).toEqual(1);
    expect(calls[0]?.url).toContain('api.resend.com');
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers.Authorization).toEqual('Bearer key_123');
  });

  it('sends both bodies and the configured sender', async () => {
    const { calls, impl } = fakeFetch();
    await new ResendMailer({ apiKey: 'k', from: 'Skyline <a@b.test>', fetchImpl: impl }).send(message);

    const body = parsedBody(calls[0]!.init);
    expect(body.from).toEqual('Skyline <a@b.test>');
    expect(body.to).toEqual(['pilot@skyline.test']);
    expect(body.text).toEqual(message.text);
    expect(body.html).toEqual(message.html);
  });

  it('throws with the provider’s explanation when it refuses', async () => {
    const { impl } = fakeFetch(403, 'domain is not verified');
    const mailer = new ResendMailer({ apiKey: 'k', from: 'a@b.test', fetchImpl: impl });
    await expect(mailer.send(message)).rejects.toThrow('domain is not verified');
  });

  it('never puts the api key in the error it throws', async () => {
    const { impl } = fakeFetch(403, 'nope');
    const mailer = new ResendMailer({ apiKey: 'super-secret-key', from: 'a@b.test', fetchImpl: impl });
    await expect(mailer.send(message)).rejects.not.toThrow('super-secret-key');
  });

  it('refuses to pretend when it has no key', async () => {
    const { calls, impl } = fakeFetch();
    const mailer = new ResendMailer({ apiKey: '', from: 'a@b.test', fetchImpl: impl });
    await expect(mailer.send(message)).rejects.toThrow(RESEND_API_KEY_ENV);
    expect(calls.length).toEqual(0);
  });
});

describe('reading the environment', () => {
  it('is absent when nothing is configured, so the caller can fall back', () => {
    expect(resendMailerFromEnv({})).toEqual(undefined);
  });

  it('builds a configured mailer when both variables are set', () => {
    const mailer = resendMailerFromEnv({ [RESEND_API_KEY_ENV]: 'k', [MAIL_FROM_ENV]: 'a@b.test' });
    expect(mailer?.isConfigured()).toEqual(true);
    expect(mailer?.name).toEqual('resend');
  });

  it('refuses a half-configured provider rather than silently printing emails', () => {
    expect(() => resendMailerFromEnv({ [RESEND_API_KEY_ENV]: 'k' })).toThrow(MAIL_FROM_ENV);
    expect(() => resendMailerFromEnv({ [MAIL_FROM_ENV]: 'a@b.test' })).toThrow(RESEND_API_KEY_ENV);
  });

  it('treats whitespace as unset', () => {
    expect(resendMailerFromEnv({ [RESEND_API_KEY_ENV]: '  ', [MAIL_FROM_ENV]: '  ' })).toEqual(undefined);
  });
});
