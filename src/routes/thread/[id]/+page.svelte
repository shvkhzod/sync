<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { tick } from 'svelte';
  import { appendToThread } from '$lib/mock/store';

  let { data } = $props();

  let continueText = $state('');
  let continueSubmitting = $state(false);
  let continueTextarea: HTMLTextAreaElement | null = $state(null);

  function back() {
    if (history.length > 1) history.back();
    else goto('/');
  }

  function shortDate(ms: number): string {
    return new Date(ms).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' });
  }
  function weekdayOf(ms: number): string {
    return new Date(ms).toLocaleDateString(undefined, { weekday: 'long' }).toLowerCase();
  }
  function timeOf(ms: number): string {
    return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }).toLowerCase();
  }

  async function submitContinue() {
    const text = continueText.trim();
    if (!text || continueSubmitting) return;
    continueSubmitting = true;
    const ok = appendToThread(data.thread.id, text);
    if (ok) {
      continueText = '';
      await invalidateAll();
      await tick();
      continueTextarea?.focus();
    }
    continueSubmitting = false;
  }

  function onContinueKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitContinue(); }
  }

  const lead = $derived(data.thread.thoughts[0]);
  const tail = $derived(data.thread.thoughts.slice(1));
  const total = $derived(data.thread.thoughts.length);
  const canSubmit = $derived(continueText.trim().length > 0 && !continueSubmitting);
</script>

<svelte:head>
  <title>Sync — thread</title>
  <meta name="theme-color" content="#1c5cff" />
</svelte:head>

<header class="bar">
  <button type="button" class="circle-btn" aria-label="Back" onclick={back}>
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    </svg>
  </button>
  {#if lead}
    <span class="peach-pill">
      <span class="peach-dot" aria-hidden="true"></span>
      {weekdayOf(lead.createdAt)}, {shortDate(lead.createdAt)}
    </span>
  {/if}
  <span class="count" aria-label="{total} thoughts">
    {String(total).padStart(2, '0')}
  </span>
</header>

<main>
  {#if lead}
    <section class="card lead-card">
      <p class="ord-row">
        <span class="ord">#01</span>
        <span class="bullet" aria-hidden="true">·</span>
        <time datetime={new Date(lead.createdAt).toISOString()}>{timeOf(lead.createdAt)}</time>
      </p>
      <h1 class="lead">{lead.content}</h1>
    </section>
  {/if}

  {#each tail as t, i (t.id)}
    <section class="card thought-card">
      <p class="ord-row">
        <span class="ord">#{String(i + 2).padStart(2, '0')}</span>
        <span class="bullet" aria-hidden="true">·</span>
        <time datetime={new Date(t.createdAt).toISOString()}>{timeOf(t.createdAt)}</time>
      </p>
      <p class="thought">{t.content}</p>
    </section>
  {/each}

  <section class="card continue-card" class:has-text={continueText.trim().length > 0}>
    <p class="ord-row ord-row--continue">
      <span class="ord">#{String(total + 1).padStart(2, '0')}</span>
      <span class="bullet" aria-hidden="true">·</span>
      <span>now</span>
    </p>
    <textarea
      bind:this={continueTextarea}
      bind:value={continueText}
      class="thought continue-text"
      placeholder="continue the thread"
      rows="1"
      spellcheck="true"
      aria-label="Continue this thread"
      onkeydown={onContinueKey}
    ></textarea>
  </section>
</main>

<button
  type="button"
  class="fab"
  class:active={canSubmit}
  aria-label="Add thought"
  disabled={!canSubmit}
  onclick={submitContinue}
>
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  </svg>
</button>

<style>
  .bar {
    position: sticky;
    top: 0;
    z-index: 4;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: max(14px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) 14px max(16px, env(safe-area-inset-left));
    background: var(--bg);
  }
  .circle-btn {
    appearance: none;
    border: 0;
    background: rgba(255, 255, 255, 0.16);
    color: var(--ink-on-blue);
    width: 42px;
    height: 42px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: background-color 180ms var(--ease-out-expo);
  }
  .circle-btn:hover { background: rgba(255, 255, 255, 0.26); }
  .circle-btn:active { transform: scale(0.94); }
  .circle-btn svg { width: 20px; height: 20px; }
  .circle-btn:focus-visible {
    outline: 2.5px solid var(--surface);
    outline-offset: 3px;
  }

  /* Peach pill date chip — Numo signature. */
  .peach-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--surface-peach);
    color: var(--accent);
    border-radius: var(--r-pill);
    padding: 8px 14px;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 13px;
    letter-spacing: -0.005em;
    flex: 1;
    justify-content: center;
    max-width: max-content;
    margin: 0 auto;
  }
  .peach-dot {
    width: 7px;
    height: 7px;
    background: var(--accent);
    border-radius: 50%;
  }

  .count {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--ink-on-blue);
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.18);
    border-radius: var(--r-pill);
    letter-spacing: 0.04em;
    min-width: 44px;
    text-align: center;
  }

  main {
    max-width: 720px;
    margin: 0 auto;
    padding: 8px 16px 140px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .card {
    background: var(--surface);
    border-radius: var(--r-card);
    box-shadow: var(--card-shadow);
    padding: 22px 22px 24px;
  }

  /* Each thought card has a monospace ordinal+time row at the top — like the
     "Tiny | House, Self-care" eyebrow in the Numo task screen. */
  .ord-row {
    margin: 0 0 12px;
    font-family: var(--font-mono);
    font-size: 11.5px;
    color: var(--ink-meta);
    letter-spacing: 0.04em;
  }
  .ord-row .ord { color: var(--accent); font-weight: 600; }
  .ord-row .bullet { margin: 0 0.45em; opacity: 0.7; }

  /* Lead thought — the big chunky black display title, just like the Numo
     "Make breakfast" headline. */
  .lead-card { padding-bottom: 28px; }
  .lead {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: clamp(34px, 7vw, 50px);
    line-height: 1.04;
    letter-spacing: -0.038em;
    color: var(--ink);
  }

  /* Body thoughts — medium weight sans, readable. */
  .thought {
    margin: 0;
    font-family: var(--font);
    font-size: 18px;
    line-height: 1.55;
    font-weight: 500;
    color: var(--ink-body);
    letter-spacing: -0.011em;
  }

  .continue-card { padding-bottom: 28px; }
  .ord-row--continue { opacity: 0.55; transition: opacity 220ms var(--ease-out-expo); }
  .continue-card.has-text .ord-row--continue { opacity: 1; }

  .continue-text {
    display: block;
    width: 100%;
    background: transparent;
    border: 0;
    resize: none;
    outline: none;
    padding: 0;
    field-sizing: content;
    min-height: 1.55em;
    caret-color: var(--accent);
  }
  .continue-text::placeholder {
    color: var(--ink-muted);
    font-weight: 500;
  }

  .fab {
    position: fixed;
    right: max(20px, env(safe-area-inset-right));
    bottom: max(28px, env(safe-area-inset-bottom));
    width: 62px;
    height: 62px;
    border-radius: 50%;
    border: 3px solid var(--surface);
    background: var(--accent);
    color: var(--accent-ink);
    display: grid;
    place-items: center;
    cursor: pointer;
    box-shadow: 0 10px 26px rgba(8, 30, 90, 0.30), 0 2px 6px rgba(8, 30, 90, 0.20);
    transition: transform 220ms var(--ease-spring), opacity 220ms var(--ease-out-expo);
    z-index: 5;
    opacity: 0.35;
    pointer-events: none;
  }
  .fab.active { opacity: 1; pointer-events: auto; }
  .fab svg { width: 24px; height: 24px; }
  .fab:hover { background: var(--accent-deep); }
  .fab:active { transform: scale(0.94); }
  .fab:focus-visible {
    outline: 2.5px solid var(--surface);
    outline-offset: 4px;
  }
  .fab:disabled { cursor: not-allowed; }

  @media (max-width: 560px) {
    .thought, .continue-text { font-size: 17px; }
  }
</style>
