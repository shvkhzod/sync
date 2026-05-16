<script lang="ts">
  let { form } = $props();
</script>

<svelte:head>
  <title>Sign in — Sync</title>
</svelte:head>

<main>
  <form method="POST" autocomplete="on">
    <label>
      <span class="sr">Password</span>
      <input
        name="password"
        type="password"
        autocomplete="current-password"
        autofocus
        required
        placeholder="password"
      />
    </label>

    {#if form?.error}
      <p class="error" role="alert">{form.error}</p>
    {/if}

    <button type="submit">Sign in</button>
  </form>
</main>

<style>
  main {
    min-height: 100vh;
    display: grid;
    place-items: center;
    background: #000;
    color: #f0e9dd;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: min(22rem, 90vw);
  }
  input {
    padding: 0.7rem 0.9rem;
    background: transparent;
    border: 1px solid rgba(240, 233, 221, 0.25);
    border-radius: 6px;
    color: inherit;
    font: inherit;
    text-align: center;
  }
  input:focus {
    outline: none;
    border-color: rgba(240, 233, 221, 0.6);
  }
  button {
    padding: 0.7rem;
    background: rgba(240, 233, 221, 0.1);
    border: 1px solid rgba(240, 233, 221, 0.25);
    border-radius: 6px;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
  button:hover {
    background: rgba(240, 233, 221, 0.18);
  }
  .error {
    color: #ff7878;
    font-size: 0.85rem;
    margin: 0;
    text-align: center;
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
</style>
