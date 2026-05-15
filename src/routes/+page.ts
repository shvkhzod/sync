import { getFeed } from '$lib/mock/store';

export const ssr = false;

export const load = () => {
  return { threads: getFeed() };
};
