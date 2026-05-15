import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const ORIGINAL_SECRET = process.env.SESSION_SECRET;

beforeEach(() => {
  process.env.SESSION_SECRET = 'a'.repeat(64);
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = ORIGINAL_SECRET;
});

function makeEvent(pathname: string, sessionCookie?: string) {
  const cookies = new Map<string, string>();
  if (sessionCookie !== undefined) cookies.set('session', sessionCookie);
  return {
    url: new URL(`http://localhost${pathname}`),
    cookies: {
      get: (name: string) => cookies.get(name)
    },
    locals: {} as App.Locals
  } as any;
}

describe('handle', () => {
  it('redirects unauthenticated request for /', async () => {
    const { handle } = await import('./hooks.server');
    const event = makeEvent('/');
    let thrown: any;
    try {
      await handle({ event, resolve: async () => new Response('ok') });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeDefined();
    expect(thrown.status).toBe(303);
    expect(thrown.location).toBe('/login?returnTo=%2F');
  });

  it('preserves query string in returnTo', async () => {
    const { handle } = await import('./hooks.server');
    const event = makeEvent('/thread/abc?focus=1');
    let thrown: any;
    try {
      await handle({ event, resolve: async () => new Response('ok') });
    } catch (e) {
      thrown = e;
    }
    expect(thrown.location).toBe('/login?returnTo=%2Fthread%2Fabc%3Ffocus%3D1');
  });

  it('does NOT redirect /login', async () => {
    const { handle } = await import('./hooks.server');
    const event = makeEvent('/login');
    const response = await handle({ event, resolve: async () => new Response('ok') });
    expect(response).toBeInstanceOf(Response);
    expect(event.locals.authenticated).toBe(false);
  });

  it('does NOT redirect /logout', async () => {
    const { handle } = await import('./hooks.server');
    const event = makeEvent('/logout');
    const response = await handle({ event, resolve: async () => new Response('ok') });
    expect(response).toBeInstanceOf(Response);
  });

  it('passes through when cookie is valid', async () => {
    const { handle } = await import('./hooks.server');
    const { createSession } = await import('./lib/server/session');
    const event = makeEvent('/', createSession());
    const response = await handle({ event, resolve: async () => new Response('ok') });
    expect(response).toBeInstanceOf(Response);
    expect(event.locals.authenticated).toBe(true);
  });

  it('redirects when cookie is present but invalid', async () => {
    const { handle } = await import('./hooks.server');
    const event = makeEvent('/', 'not.valid');
    let thrown: any;
    try {
      await handle({ event, resolve: async () => new Response('ok') });
    } catch (e) {
      thrown = e;
    }
    expect(thrown.status).toBe(303);
    expect(event.locals.authenticated).toBe(false);
  });
});
