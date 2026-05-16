<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';

  function home() {
    goto('/');
  }
</script>

<svelte:head>
  <title>Sync — not found</title>
  <meta name="theme-color" content="#1c5cff" />
</svelte:head>

<main>
  <section class="card">
    <p class="eyebrow"><span class="ord">{page.status}</span></p>
    <h1 class="message">
      {#if page.status === 404}
        this thread isn't here.
      {:else}
        something went sideways.
      {/if}
    </h1>
    <button type="button" class="primary" onclick={home}>back home</button>
  </section>
</main>

<style>
  main {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: max(16px, env(safe-area-inset-top)) 12px max(16px, env(safe-area-inset-bottom));
  }
  .card {
    background: var(--surface);
    border-radius: var(--r-card-lg);
    width: 100%;
    max-width: 460px;
    padding: 28px 26px;
    box-shadow: var(--card-shadow);
    text-align: center;
  }
  .eyebrow {
    margin: 0 0 14px;
    font-family: var(--font-mono);
    font-size: 11.5px;
    color: var(--ink-meta);
    letter-spacing: 0.04em;
  }
  .eyebrow .ord { color: var(--accent); font-weight: 600; }
  .message {
    margin: 0 0 22px;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: clamp(28px, 6vw, 38px);
    line-height: 1.06;
    letter-spacing: -0.03em;
    color: var(--ink);
  }
  .primary {
    appearance: none;
    border: 0;
    background: var(--accent);
    color: var(--accent-ink);
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 16px;
    letter-spacing: -0.01em;
    padding: 14px 28px;
    border-radius: var(--r-pill);
    cursor: pointer;
    min-height: 48px;
    transition: transform 200ms var(--ease-spring), background-color 180ms var(--ease-out-expo);
  }
  .primary:hover { background: var(--accent-deep); }
  .primary:active { transform: scale(0.96); }
  .primary:focus-visible {
    outline: 2.5px solid var(--accent);
    outline-offset: 3px;
  }
</style>
