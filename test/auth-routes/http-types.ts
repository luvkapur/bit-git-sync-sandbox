import type { AuthedRequest, AuthedResponse, NextFunction } from '@luvktest/test.auth-middleware';

/**
 * The request fields these routes read.
 *
 * Structural rather than `express.Request`, for the same reason the middleware
 * is: the routes can then be driven by an object literal in a test, and the
 * component carries no framework dependency it does not need.
 */
export type RouteRequest = AuthedRequest & {
  /** whatever `express.json()` parsed. Unknown until it has been checked. */
  body?: unknown;
  params?: Record<string, string | undefined>;
  /** the parsed query string — a confirmation link carries its token here. */
  query?: Record<string, unknown>;
};

/** the response fields these routes write. Structurally an Express response. */
export type RouteResponse = AuthedResponse;

/** an Express-shaped handler, without importing Express. */
export type RouteHandler = (
  req: RouteRequest,
  res: RouteResponse,
  next: NextFunction
) => void | Promise<void>;

/** the two methods these routes register. Structurally an Express app or router. */
export type AppLike = {
  get(path: string, ...handlers: RouteHandler[]): unknown;
  post(path: string, ...handlers: RouteHandler[]): unknown;
};

/** read a string field out of an unknown JSON body, without trusting it. */
export function stringField(body: unknown, field: string): string {
  if (typeof body !== 'object' || body === null) return '';
  const value = (body as Record<string, unknown>)[field];
  return typeof value === 'string' ? value : '';
}
