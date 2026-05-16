import { redirect } from '@sveltejs/kit';
import { SESSION_COOKIE, cookieOptions } from '$lib/server/session';

export const POST = async ({ cookies }) => {
  cookies.set(SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 });
  throw redirect(303, '/login');
};
