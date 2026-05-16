import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { FeedThread } from '$lib/types';

function apiBase(): string {
  const url = process.env.API_URL;
  if (!url) throw new Error('API_URL not set');
  return url.replace(/\/$/, '');
}

type ApiThreadRow = {
  id: string;
  createdAt: string;
  updatedAt: string;
  thoughtCount: number;
  preview: string | null;
};

export const load: PageServerLoad = async ({ fetch }) => {
  const res = await fetch(`${apiBase()}/threads`);
  if (!res.ok) throw new Error(`api /threads returned ${res.status}`);
  const { threads } = (await res.json()) as { threads: ApiThreadRow[] };

  const feed: FeedThread[] = threads.map((t) => ({
    threadId: t.id,
    preview: t.preview ?? '',
    thoughtCount: t.thoughtCount,
    updatedAt: new Date(t.updatedAt).getTime()
  }));

  return { threads: feed };
};

export const actions: Actions = {
  create: async ({ request, fetch }) => {
    const data = await request.formData();
    const content = String(data.get('content') ?? '').trim();
    if (!content) return fail(400, { error: 'content is required' });

    const res = await fetch(`${apiBase()}/threads`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content })
    });
    if (!res.ok) return fail(502, { error: 'failed to create thread' });

    const { thread } = (await res.json()) as { thread: { id: string } };
    throw redirect(303, `/thread/${thread.id}`);
  }
};
