import { redirect, type Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, verifySession } from '$lib/server/session';

const PUBLIC_PATHS = new Set(['/login', '/logout']);

export const handle: Handle = async ({ event, resolve }) => {
  const cookie = event.cookies.get(SESSION_COOKIE);
  event.locals.authenticated = verifySession(cookie);

  if (!event.locals.authenticated && !PUBLIC_PATHS.has(event.url.pathname)) {
    const returnTo = event.url.pathname + event.url.search;
    throw redirect(303, `/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return resolve(event);
};
