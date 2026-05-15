<script lang="ts">
  import '@fontsource-variable/inter';
  import '@fontsource-variable/funnel-display';
  import '@fontsource-variable/jetbrains-mono';
  import '$lib/design/tokens.css';
  import { onNavigate } from '$app/navigation';

  let { children } = $props();

  onNavigate((nav) => {
    // Crossfade between home feed (/) and the thread reader.
    const from = nav.from?.url.pathname ?? '';
    const to = nav.to?.url.pathname ?? '';
    const involvesThread = from.startsWith('/thread/') || to.startsWith('/thread/');
    const involvesHome = from === '/' || to === '/';
    if (!involvesThread || !involvesHome) return;

    if (typeof document.startViewTransition !== 'function') return;

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await nav.complete;
      });
    });
  });
</script>

<style>
  :global(::view-transition-old(root)),
  :global(::view-transition-new(root)) {
    animation-duration: 300ms;
    animation-timing-function: var(--ease-out-expo);
  }
  @media (prefers-reduced-motion: reduce) {
    :global(::view-transition-old(root)),
    :global(::view-transition-new(root)) {
      animation-duration: 1ms;
    }
  }
</style>

{@render children()}
