import { ConsoleMailer } from './console-mailer.js';
import type { MailMessage } from './mailer.js';

const message: MailMessage = {
  to: 'pilot@skyline.test',
  subject: 'Confirm your email',
  text: 'Hello Pilot\n\nConfirm: https://skyline.test/auth/confirm?token=abc\n',
  html: '<p>Confirm: <a href="https://skyline.test/auth/confirm?token=abc">here</a></p>',
};

function recordingConsole() {
  const logs: string[] = [];
  const warns: string[] = [];
  return {
    logs,
    warns,
    out: {
      log: (...args: unknown[]) => logs.push(args.join(' ')),
      warn: (...args: unknown[]) => warns.push(args.join(' ')),
    },
  };
}

describe('ConsoleMailer', () => {
  it('prints the whole message, so the flow is demoable with no credentials', async () => {
    const { logs, out } = recordingConsole();
    await new ConsoleMailer(out).send(message);

    const printed = logs.join('\n');
    expect(printed).toContain('pilot@skyline.test');
    expect(printed).toContain('Confirm your email');
    expect(printed).toContain('https://skyline.test/auth/confirm?token=abc');
  });

  it('warns, every time, that nothing was actually sent', async () => {
    const { warns, out } = recordingConsole();
    await new ConsoleMailer(out).send(message);
    await new ConsoleMailer(out).send(message);

    expect(warns.length).toEqual(2);
    expect(warns[0]).toContain('DEV MAILER');
    expect(warns[0]).toContain('nothing was sent');
  });

  it('identifies itself, so a health endpoint can say which mailer is live', () => {
    expect(new ConsoleMailer().name).toEqual('console');
  });

  it('never claims it cannot run — it is the fallback', () => {
    expect(new ConsoleMailer().isConfigured()).toEqual(true);
  });

  it('does not reject, so a printed email cannot fail a signup', async () => {
    const { out } = recordingConsole();
    await expect(new ConsoleMailer(out).send(message)).resolves.toEqual(undefined);
  });
});
