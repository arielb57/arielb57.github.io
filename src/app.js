/**
 * The page is fully rendered at build time. This adds the two things that need
 * a client: theme choice and project filtering. Everything degrades to a
 * working page if it never runs.
 */

(() => {
  'use strict';

  /* --- theme --------------------------------------------------------------
     Three states: 'light', 'dark', and unset (follow the OS). The toggle
     cycles through all three so a visitor can always get back to automatic.
     Storage can throw in a private window, so every access is guarded.
     ---------------------------------------------------------------------- */

  const KEY = 'theme';
  const root = document.documentElement;

  const readStored = () => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  };

  const writeStored = (value) => {
    try {
      if (value) localStorage.setItem(KEY, value);
      else localStorage.removeItem(KEY);
    } catch {
      /* the toggle still works for this page view */
    }
  };

  const apply = (theme) => {
    root.setAttribute('data-theme', theme || '');
  };

  apply(readStored());

  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    const CYCLE = ['light', 'dark', ''];
    const LABEL = { light: 'Light theme', dark: 'Dark theme', '': 'System theme' };

    const describe = () => {
      const current = root.getAttribute('data-theme') || '';
      toggle.setAttribute('title', LABEL[current]);
      toggle.setAttribute('aria-label', `${LABEL[current]} — click to change`);
    };

    describe();
    toggle.addEventListener('click', () => {
      const current = root.getAttribute('data-theme') || '';
      const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
      apply(next);
      writeStored(next);
      describe();
    });
  }

  /* --- project filtering -------------------------------------------------- */

  const chips = Array.from(document.querySelectorAll('.chip[data-filter]'));
  const cards = Array.from(document.querySelectorAll('#project-grid .card'));

  if (chips.length > 0 && cards.length > 0) {
    const select = (filter) => {
      for (const chip of chips) {
        chip.setAttribute('aria-pressed', String(chip.dataset.filter === filter));
      }
      let shown = 0;
      for (const card of cards) {
        const match = filter === 'all' || card.dataset.language === filter;
        // `hidden` rather than display:none — the stylesheet enforces it and
        // it keeps the cards out of the accessibility tree too.
        card.hidden = !match;
        if (match) shown += 1;
      }
      announce(`${shown} project${shown === 1 ? '' : 's'} shown`);
    };

    for (const chip of chips) {
      chip.addEventListener('click', () => select(chip.dataset.filter));
    }
  }

  /* --- screen reader announcements ---------------------------------------- */

  let liveRegion = null;
  function announce(message) {
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.className = 'visually-hidden';
      document.body.appendChild(liveRegion);
    }
    liveRegion.textContent = message;
  }
})();
