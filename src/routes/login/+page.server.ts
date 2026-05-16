import { fail, redirect, type Actions } from '@sveltejs/kit';
import { verifyPassword } from '$lib/server/password';
import { createSession, cookieOptions, SESSION_COOKIE } from '$lib/server/session';

export const actions: Actions = {
  default: async ({ request, cookies, url }) => {
    const data = await request.formData();
    const password = String(data.get('password') ?? '');

    const hash = process.env.ADMIN_PASSWORD_HASH;
    if (!hash) throw new Error('ADMIN_PASSWORD_HASH not set');

    const ok = await verifyPassword(password, hash);
    if (!ok) return fail(401, { error: 'Incorrect password' });

    cookies.set(SESSION_COOKIE, createSession(), cookieOptions);

    const returnTo = url.searchParams.get('returnTo') ?? '/';
    // Only allow same-origin relative paths (block open-redirect)
    const target = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
    throw redirect(303, target);
  }
};
