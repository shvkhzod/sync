import { error } from '@sveltejs/kit';
import { getThread } from '$lib/mock/store';

export const ssr = false;

export const load = ({ params }) => {
  const thread = getThread(params.id);
  if (!thread) throw error(404, 'thread not found');
  return { thread };
};
