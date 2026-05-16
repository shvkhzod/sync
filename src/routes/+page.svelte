<script lang="ts">
  import { goto } from '$app/navigation';
  import { tick } from 'svelte';
  import { deserialize } from '$app/forms';
  import type { ActionResult } from '@sveltejs/kit';
  import type { FeedThread } from '$lib/types';

  let { data } = $props();

  let composeOpen = $state(false);
  let composeText = $state('');
  let composeTextarea: HTMLTextAreaElement | null = $state(null);
  let submitting = $state(false);

  function relTime(ms: number, now: number = Date.now()): string {
    const seconds = Math.max(0, (now - ms) / 1000);
    if (seconds < 45) return 'now';
    const m = seconds / 60;
    if (m < 60) return `${Math.floor(m)}m`;
    const h = m / 60;
    if (h < 24) return `${Math.floor(h)}h`;
    const d = h / 24;
    if (d < 7) return `${Math.floor(d)}d`;
    const w = d / 7;
    if (w < 4.5) return `${Math.floor(w)}w`;
    const mo = d / 30.5;
    if (mo < 12) return `${Math.floor(mo)}mo`;
    return `${Math.floor(d / 365.25)}y`;
  }

  function shortDate(ms: number): string {
    return new Date(ms).toLocaleDateString(undefined, {
      day: '2-digit', month: '2-digit'
    });
  }

  function weekdayOf(ms: number): string {
    return new Date(ms).toLocaleDateString(undefined, { weekday: 'long' }).toLowerCase();
  }

  type Bucket = { label: string; threads: FeedThread[] };
  const buckets = $derived.by<Bucket[]>(() => {
    const now = Date.now();
    const day = 86400000;
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = todayStart.getTime() - day;
    const weekStart = todayStart.getTime() - 7 * day;
    const monthStart = todayStart.getTime() - 30 * day;

    const groups: Record<string, FeedThread[]> = {
      'today': [], 'yesterday': [], 'this week': [], 'this month': [], 'earlier': []
    };
    for (const t of data.threads) {
      if (t.updatedAt >= todayStart.getTime())      groups['today'].push(t);
      else if (t.updatedAt >= yesterdayStart)        groups['yesterday'].push(t);
      else if (t.updatedAt >= weekStart)             groups['this week'].push(t);
      else if (t.updatedAt >= monthStart)            groups['this month'].push(t);
      else                                            groups['earlier'].push(t);
    }
    const order = ['today', 'yesterday', 'this week', 'this month', 'earlier'];
    return order.map(label => ({ label, threads: groups[label] })).filter(b => b.threads.length > 0);
  });

  async function openCompose() {
    composeText = '';
    composeOpen = true;
    await tick();
    composeTextarea?.focus();
  }
  function closeCompose() { composeOpen = false; composeText = ''; }

  async function submitCompose() {
    const content = composeText.trim();
    if (!content || submitting) return;
    submitting = true;

    const fd = new FormData();
    fd.set('content', content);

    const res = await fetch('?/create', { method: 'POST', body: fd });
    const result: ActionResult = deserialize(await res.text());

    submitting = false;
    if (result.type === 'redirect') {
      closeCompose();
      await goto(result.location);
    }
    // On failure the modal stays open with the text intact — user can retry.
  }
  function onComposeKey(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); closeCompose(); }
    else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitCompose(); }
  }
  function onKey(e: KeyboardEvent) {
    if (composeOpen) return;
    const target = e.target as HTMLElement | null;
    if (target && /^(INPUT|TEXTAREA)$/i.test(target.tagName)) return;
    if ((e.key === 'n' || e.key === 'N') && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      openCompose();
    }
  }
</script>

<svelte:window onkeydown={onKey} />
<svelte:head>
  <title>Sync</title>
  <meta name="theme-color" content="#1c5cff" />
</svelte:head>

<main>
  <header class="top">
    <h1 class="brand">Sync</h1>
    <p class="kicker">thoughts that lead somewhere</p>
  </header>

  {#if buckets.length === 0}
    <div class="card empty">
      <p class="empty-title">no threads yet</p>
      <p class="empty-hint">tap <span class="kbd">+</span> to start one</p>
    </div>
  {/if}

  {#each buckets as group (group.label)}
    <section class="bucket">
      <span class="chip">{group.label}</span>
      <ul class="cards">
        {#each group.threads as t, i (t.threadId)}
          <li>
            <a class="card row" href={`/thread/${t.threadId}`}>
              <span class="card-ord" aria-hidden="true">#{String(i + 1).padStart(2, '0')}</span>
              <p class="preview">{t.preview}</p>
              <p class="meta">
                <span class="count">{t.thoughtCount} {t.thoughtCount === 1 ? 'thought' : 'thoughts'}</span>
                <span class="bullet" aria-hidden="true">·</span>
                <time datetime={new Date(t.updatedAt).toISOString()}>{weekdayOf(t.updatedAt)}, {shortDate(t.updatedAt)}</time>
                <span class="bullet" aria-hidden="true">·</span>
                <span class="rel">{relTime(t.updatedAt)}</span>
              </p>
            </a>
          </li>
        {/each}
      </ul>
    </section>
  {/each}
</main>

<button
  type="button"
  class="fab"
  aria-label="New thread (press N)"
  onclick={openCompose}
>
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" />
  </svg>
</button>

{#if composeOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <div class="compose" role="dialog" aria-label="New thread" aria-modal="true" tabindex="-1">
    <div class="compose-card">
      <header class="compose-top">
        <button class="circle-btn" type="button" aria-label="Close" onclick={closeCompose}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          </svg>
        </button>
        <span class="peach-pill">new thread</span>
      </header>

      <div class="compose-body">
        <textarea
          bind:this={composeTextarea}
          bind:value={composeText}
          placeholder="what are you thinking?"
          rows="1"
          spellcheck="true"
          onkeydown={onComposeKey}
          aria-label="Thought"
        ></textarea>
        <p class="compose-hint">↵ to start · esc to cancel</p>
      </div>

      <footer class="compose-foot">
        <button class="primary" type="button" disabled={!composeText.trim() || submitting} onclick={submitCompose}>
          {submitting ? 'saving…' : 'Done!'}
        </button>
      </footer>
    </div>
  </div>
{/if}

<style>
  main {
    max-width: 720px;
    margin: 0 auto;
    padding: max(28px, env(safe-area-inset-top)) 16px 140px 16px;
  }

  .top {
    padding: 8px 8px 24px;
  }
  .brand {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: clamp(46px, 11vw, 64px);
    line-height: 0.92;
    letter-spacing: -0.045em;
    color: var(--ink-on-blue);
  }
  .kicker {
    margin: 10px 0 0;
    font-family: var(--font-mono);
    font-size: 12px;
    color: color-mix(in srgb, var(--ink-on-blue) 78%, transparent);
    letter-spacing: 0.02em;
  }

  /* Section chip — small white pill on blue, monospace lowercase. */
  .chip {
    display: inline-block;
    padding: 7px 14px;
    margin: 0 0 12px 4px;
    background: var(--surface);
    color: var(--accent);
    border-radius: var(--r-pill);
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.02em;
  }

  .bucket {
    margin: 0 0 24px;
  }

  /* Numo card: white rounded sheet on blue, generous radius. */
  .card {
    background: var(--surface);
    border-radius: var(--r-card);
    box-shadow: var(--card-shadow);
  }

  .cards {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .row {
    position: relative;
    display: block;
    padding: 20px 22px 18px;
    color: inherit;
    text-decoration: none;
    transition: transform 180ms var(--ease-spring);
  }
  .row:active { transform: scale(0.99); }
  .row:focus-visible {
    outline: 2.5px solid var(--ink-on-blue);
    outline-offset: 2px;
  }

  .card-ord {
    position: absolute;
    top: 18px;
    right: 22px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--accent);
    letter-spacing: 0.04em;
  }

  .preview {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 24px;
    line-height: 1.12;
    letter-spacing: -0.028em;
    color: var(--ink);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    padding-right: 50px;
  }

  .meta {
    margin: 12px 0 0;
    font-family: var(--font-mono);
    font-size: 11.5px;
    line-height: 1.4;
    color: var(--ink-meta);
    letter-spacing: 0.01em;
  }
  .meta .count { color: var(--ink-body); font-weight: 500; }
  .meta .bullet { margin: 0 0.45em; opacity: 0.7; }

  .empty {
    padding: 36px 24px;
    text-align: center;
  }
  .empty-title {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 28px;
    letter-spacing: -0.03em;
    color: var(--ink);
  }
  .empty-hint {
    margin: 10px 0 0;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--ink-meta);
  }
  .kbd {
    display: inline-block;
    background: var(--accent);
    color: var(--accent-ink);
    border-radius: 6px;
    padding: 1px 7px;
    margin: 0 2px;
    font-family: var(--font-display);
    font-weight: 800;
  }

  /* FAB — round, blue, white plus, on white card surfaces or floating on blue. */
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
    transition: transform 200ms var(--ease-spring), background-color 180ms var(--ease-out-expo);
    z-index: 5;
  }
  .fab svg { width: 26px; height: 26px; }
  .fab:hover { background: var(--accent-deep); }
  .fab:active { transform: scale(0.94); }
  .fab:focus-visible {
    outline: 2.5px solid var(--surface);
    outline-offset: 4px;
  }

  /* Compose — single white card on blue, full screen on mobile. */
  .compose {
    position: fixed;
    inset: 0;
    background: var(--bg);
    z-index: 30;
    padding: max(16px, env(safe-area-inset-top)) 12px max(16px, env(safe-area-inset-bottom)) 12px;
    display: flex;
    align-items: stretch;
    justify-content: center;
    animation: compose-in 280ms var(--ease-out-expo) both;
  }
  .compose-card {
    background: var(--surface);
    border-radius: var(--r-card-lg);
    width: 100%;
    max-width: 720px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .compose-top {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 18px 0;
  }
  .circle-btn {
    appearance: none;
    border: 0;
    background: var(--bg-soft);
    color: var(--ink);
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: background-color 180ms var(--ease-out-expo);
  }
  .circle-btn:hover { background: var(--hairline); }
  .circle-btn:active { transform: scale(0.94); }
  .circle-btn svg { width: 20px; height: 20px; }
  .circle-btn:focus-visible {
    outline: 2.5px solid var(--accent);
    outline-offset: 3px;
  }

  /* Peach pill — Numo's signature accent label. */
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

  .compose-body {
    flex: 1;
    padding: 24px 22px 8px;
  }
  .compose-body textarea {
    display: block;
    width: 100%;
    background: transparent;
    border: 0;
    resize: none;
    outline: none;
    padding: 0;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: clamp(30px, 6.5vw, 44px);
    line-height: 1.08;
    letter-spacing: -0.035em;
    color: var(--ink);
    caret-color: var(--accent);
    field-sizing: content;
    min-height: 2em;
  }
  .compose-body textarea::placeholder { color: var(--ink-muted); }
  .compose-hint {
    margin: 20px 0 0;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.04em;
    color: var(--ink-meta);
  }

  .compose-foot {
    padding: 16px 18px 18px;
    display: flex;
    justify-content: flex-end;
  }

  /* Primary CTA — solid blue rounded pill, white display-bold text. */
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
    transition: transform 200ms var(--ease-spring), background-color 180ms var(--ease-out-expo), opacity 180ms var(--ease-out-expo);
  }
  .primary:hover { background: var(--accent-deep); }
  .primary:active { transform: scale(0.96); }
  .primary:disabled { opacity: 0.35; cursor: not-allowed; }
  .primary:focus-visible {
    outline: 2.5px solid var(--accent);
    outline-offset: 3px;
  }

  @keyframes compose-in {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .compose { animation: none; }
  }

  @media (max-width: 560px) {
    .preview { font-size: 22px; }
    .brand { font-size: 50px; }
  }
</style>
