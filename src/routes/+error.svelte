<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';

  function home() {
    goto('/galaxy');
  }
</script>

<svelte:head><title>Sync — not found</title></svelte:head>

<main>
  <span class="code" aria-hidden="true">{page.status}</span>
  <p class="message">
    {#if page.status === 404}
      this thread is not in your galaxy.
    {:else}
      something fell out of orbit.
    {/if}
  </p>
  <button type="button" class="link" onclick={home}>
    <span class="arrow">←</span> back to galaxy
  </button>
</main>

<style>
  main {
    min-height: 100dvh;
    display: grid;
    place-items: center;
    grid-auto-rows: auto;
    gap: 1.5rem;
    padding: 8vh 24px;
    text-align: center;
  }

  .code {
    font-size: 11px;
    letter-spacing: 0.16em;
    color: var(--back-glyph);
    font-variant-numeric: tabular-nums;
    font-weight: 500;
  }

  .message {
    margin: 0;
    font-size: 22px;
    line-height: 1.4;
    color: var(--thread-warm);
    font-weight: 500;
    letter-spacing: -0.025em;
    max-width: 28ch;
  }

  .link {
    appearance: none;
    border: 0;
    background: transparent;
    color: var(--back-glyph);
    font: inherit;
    font-size: 14px;
    cursor: pointer;
    padding: 12px 16px;
    border-radius: 999px;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: color 220ms var(--ease-out-expo), background-color 220ms var(--ease-out-expo);
  }
  .link:hover {
    color: var(--thought-fg);
    background: color-mix(in srgb, var(--thread-warm) 5%, transparent);
  }
  .link:focus-visible {
    outline: 1px solid var(--thought-fg);
    outline-offset: 3px;
  }
  .link:active { transform: scale(0.97); }

  .arrow {
    display: inline-block;
    transition: transform 220ms var(--ease-out-expo);
  }
  .link:hover .arrow { transform: translateX(-3px); }
</style>
