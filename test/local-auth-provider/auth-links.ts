/**
 * The URLs that go into emails.
 *
 * A provider that built these itself would need to know where it is deployed,
 * which is the sort of thing that ends up hard-coded to localhost. They are
 * passed in instead.
 */
export type AuthLinks = {
  /** the fully-qualified URL a confirmation token is delivered on. */
  confirmUrl(token: string): string;
  /** where to send somebody who already has an account. */
  signInUrl: string;
  /** where to send somebody who does not. */
  signUpUrl: string;
};

/** the environment variable carrying the public base URL of the app. */
export const PUBLIC_URL_ENV = 'SKYLINE_PUBLIC_URL';

/**
 * Build the links from one base URL.
 *
 * @param baseUrl e.g. `https://skyline.example`. A trailing slash is fine.
 * @example
 * authLinksFrom(process.env.SKYLINE_PUBLIC_URL ?? 'http://localhost:3000')
 */
export function authLinksFrom(baseUrl: string): AuthLinks {
  const base = baseUrl.replace(/\/+$/, '');
  return {
    confirmUrl: (token: string) => `${base}/auth/confirm?token=${encodeURIComponent(token)}`,
    signInUrl: `${base}/`,
    signUpUrl: `${base}/`,
  };
}
