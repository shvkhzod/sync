<script lang="ts">
  let { form } = $props();

  let inputEl: HTMLInputElement | null = $state(null);

  $effect(() => {
    inputEl?.focus();
  });
</script>

<svelte:head>
  <title>Sign in — Sync</title>
  <meta name="theme-color" content="#1c5cff" />
</svelte:head>

<main>
  <form method="POST" class="card" autocomplete="on">
    <header class="top">
      <span class="peach-pill">sign in</span>
    </header>

    <div class="body">
      <p class="eyebrow"><span class="ord">password</span></p>

      <label class="block">
        <span class="sr-only">Password</span>
        <input
          bind:this={inputEl}
          name="password"
          type="password"
          autocomplete="current-password"
          required
          class:has-error={form?.error}
        />
      </label>

      <p class="hint" class:hint--error={form?.error} role={form?.error ? 'alert' : undefined}>
        {#if form?.error}{form.error}{:else}↵ to enter{/if}
      </p>
    </div>

    <footer class="foot">
      <button class="primary" type="submit">Enter</button>
    </footer>
  </form>
</main>

<style>
  main {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: max(16px, env(safe-area-inset-top)) 12px max(16px, env(safe-area-inset-bottom));
  }

  /* White card on blue, large radius — matches compose-card. */
  .card {
    background: var(--surface);
    border-radius: var(--r-card-lg);
    width: 100%;
    max-width: 460px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: var(--card-shadow);
  }

  .top { padding: 16px 18px 0; }

  .peach-pill {
    display: inline-flex;
    align-items: center;
    background: var(--surface-peach);
    color: var(--accent);
    border-radius: var(--r-pill);
    padding: 8px 14px;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 14px;
    letter-spacing: -0.01em;
  }

  .body { padding: 28px 22px 8px; }

  /* Mono eyebrow with accent-colored leading word — matches the .ord-row
     pattern on thought cards (#01 · 8:42pm). */
  .eyebrow {
    margin: 0 0 14px;
    font-family: var(--font-mono);
    font-size: 11.5px;
    color: var(--ink-meta);
    letter-spacing: 0.04em;
  }
  .eyebrow .ord { color: var(--accent); font-weight: 600; }

  .block { display: block; }

  /* The masked dots inherit the display font weight, so they read as chunky
     black bullets — the same visual register as the lead thought headline. */
  input {
    display: block;
    width: 100%;
    background: transparent;
    border: 0;
    outline: none;
    padding: 0;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: clamp(34px, 7vw, 50px);
    line-height: 1.04;
    letter-spacing: -0.018em;
    color: var(--ink);
    caret-color: var(--accent);
  }
  input.has-error { color: #b94a3b; caret-color: #b94a3b; }

  .hint {
    margin: 18px 0 0;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.04em;
    color: var(--ink-meta);
    transition: color 180ms var(--ease-out-expo);
  }
  .hint--error { color: #b94a3b; }

  .foot {
    padding: 16px 18px 18px;
    display: flex;
    justify-content: flex-end;
  }

  /* Primary CTA — solid blue rounded pill, white display-bold text.
     Same component as compose's "Done!" button. */
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
