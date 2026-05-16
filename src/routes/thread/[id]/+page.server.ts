import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { ThreadDetail } from '$lib/types';

function apiBase(): string {
  const url = process.env.API_URL;
  if (!url) throw new Error('API_URL not set');
  return url.replace(/\/$/, '');
}

type ApiThread = { id: string; createdAt: string; updatedAt: string };
type ApiThought = { id: string; threadId: string; ordinal: number; content: string; createdAt: string };

export const load: PageServerLoad = async ({ params, fetch }) => {
  const res = await fetch(`${apiBase()}/threads/${params.id}`);
  if (res.status === 404) throw error(404, 'thread not found');
  if (!res.ok) throw error(500, `api /threads/:id returned ${res.status}`);

  const { thread, thoughts } = (await res.json()) as { thread: ApiThread; thoughts: ApiThought[] };

  const detail: ThreadDetail = {
    id: thread.id,
    thoughts: thoughts.map((t) => ({
      id: t.id,
      ordinal: t.ordinal,
      content: t.content,
      createdAt: new Date(t.createdAt).getTime()
    }))
  };

  return { thread: detail };
};

export const actions: Actions = {
  append: async ({ request, params, fetch }) => {
    const data = await request.formData();
    const content = String(data.get('content') ?? '').trim();
    if (!content) return fail(400, { error: 'content is required' });

    const res = await fetch(`${apiBase()}/threads/${params.id}/thoughts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content })
    });
    if (res.status === 404) return fail(404, { error: 'thread not found' });
    if (!res.ok) return fail(502, { error: 'failed to append thought' });

    return { success: true };
  }
};
