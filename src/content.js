/*
 * WeBWorK Spoiler Guard - content script.
 *
 * Runs at document_start. hide.css has already hidden the known spoiler
 * markup by the time this executes; this script does the version-independent
 * work that CSS can't:
 *
 *   - marks elements whose *text* gives an answer away ("The correct answer
 *     is ...", "Your overall recorded score is 100%")
 *   - finds "Correct Answer" / "Result" / "Score" table columns by their
 *     header text and hides the whole column
 *   - empties answer boxes WeBWorK pre-fills with your old submission
 *   - keeps the "show correct answers" checkbox and URL parameters off
 */
(() => {
  'use strict';

  const DEFAULTS = {
    enabled: true,
    answers: true,       // the revealed correct answer
    results: true,       // correct/incorrect marks and feedback tables
    scores: true,        // scores, status columns, progress bars
    solutions: true,     // solutions and hints
    clearAnswers: true,  // empty pre-filled answer boxes
    forceParams: true,   // strip showCorrectAnswers/showSolutions requests
    showPanel: true,     // on-page peek button
    mode: 'hide',        // 'hide' | 'blur'
    extraSelectors: '',  // newline/comma separated, for your own install
    disabledHosts: []
  };

  const CATEGORIES = ['answers', 'results', 'scores', 'solutions'];

  // Phrases WeBWorK uses when it gives something away. Matched against text
  // nodes, so they survive markup changes between WeBWorK versions.
  const TEXT_PATTERNS = {
    answers: [
      /\bthe\s+correct\s+answers?\s+(is|are|was|were)\b/i,
      /\bcorrect\s+answers?\s*:/i,
      /\banswers?\s+to\s+this\s+(question|problem)\s+(is|are)\b/i
    ],
    results: [
      /\byour\s+answers?\s+(above\s+)?(is|are)\s+(not\s+)?correct\b/i,
      /\ball\s+of\s+your\s+answers\s+are\s+correct\b/i,
      /\bat\s+least\s+one\s+of\s+the\s+answers\s+above\s+is\s+not\s+correct\b/i,
      /\byou\s+have\s+attempted\s+this\s+problem\b/i,
      /\byour\s+(answer|score)\s+(was|is)\s+recorded\b/i,
      /\b(answer|answers)\s+(is|are)\s+(correct|incorrect)\b/i
    ],
    scores: [
      /\byour\s+overall\s+recorded\s+score\s+is\b/i,
      /\bgrade\s+for\s+this\s+(set|problem)\b/i
    ],
    solutions: [
      /\bsolution\s*:/i,
      /\bshow\s+(the\s+)?solution\b/i
    ]
  };

  // Table headers whose entire column is a spoiler.
  const COLUMN_PATTERNS = {
    answers: [/correct\s*answer/i, /answer\s*preview/i],
    results: [/^\s*results?\s*$/i, /^\s*messages?\s*$/i, /^\s*correct\??\s*$/i],
    scores: [/^\s*(score|status|percent|%|grade)\b/i, /\battempts?\b/i, /\bremaining\b/i]
  };

  const ANSWER_INPUTS = [
    'input[name^="AnSwEr"]',
    'textarea[name^="AnSwEr"]',
    'select[name^="AnSwEr"]',
    'input[id^="AnSwEr"]',
    'input[name^="MaTrIx"]',
    'input.codeshard',
    'input[name^="previous_AnSwEr"]'
  ].join(',');

  const root = document.documentElement;
  const originalValues = new WeakMap();

  let settings = { ...DEFAULTS };
  let peeking = false;
  let panel = null;

  /* ---------------------------------------------------------------- *
   * State
   * ---------------------------------------------------------------- */

  const siteDisabled = () => settings.disabledHosts.includes(location.hostname);
  const hidingActive = () => settings.enabled && !siteDisabled() && !peeking;

  function apply() {
    const active = hidingActive();

    for (const cat of CATEGORIES) {
      root.setAttribute(`data-wwh-${cat}`, active && settings[cat] ? 'on' : 'off');
    }

    if (active && settings.mode === 'blur') root.setAttribute('data-wwh-mode', 'blur');
    else root.removeAttribute('data-wwh-mode');

    if (document.body) {
      if (active && settings.clearAnswers) clearAnswerInputs();
      else restoreAnswerInputs();
      updatePanel();
    }
  }

  /* ---------------------------------------------------------------- *
   * Marking passes
   * ---------------------------------------------------------------- */

  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION']);

  function markTextSpoilers(scope) {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
        if (parent.closest('#wwh-panel, .wwh-marked')) return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue || node.nodeValue.trim().length < 4) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const hits = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.nodeValue;
      for (const cat of CATEGORIES) {
        if (!TEXT_PATTERNS[cat].some((re) => re.test(text))) continue;
        hits.push([node, cat]);
        break;
      }
    }
    // Collected first, then mutated, so the walker isn't invalidated mid-walk.
    for (const [node, cat] of hits) markNode(node, cat);
  }

  function markNode(textNode, category) {
    const cls = `wwh-mark-${category}`;
    const parent = textNode.parentElement;
    if (!parent || parent.classList.contains('wwh-marked')) return;

    // Prefer tagging the element that holds the phrase. If that element is a
    // big container (hiding it would blank out half the page), wrap just the
    // offending text node instead.
    const contained = parent.textContent.trim().length;
    const isBigContainer =
      contained > 400 ||
      parent === document.body ||
      ['BODY', 'HTML', 'MAIN', 'FORM', 'SECTION', 'ARTICLE'].includes(parent.tagName);

    if (!isBigContainer) {
      parent.classList.add(cls, 'wwh-marked');
      return;
    }

    const span = document.createElement('span');
    span.className = `${cls} wwh-marked`;
    textNode.after(span);
    span.appendChild(textNode);
  }

  function markTableColumns(scope) {
    for (const table of scope.querySelectorAll('table')) {
      if (table.dataset.wwhCols === 'done' || table.closest('#wwh-panel')) continue;
      table.dataset.wwhCols = 'done';

      const headerRow =
        table.querySelector('thead tr') ||
        table.querySelector('tr:has(th)') ||
        table.querySelector('tr');
      if (!headerRow) continue;

      const headers = [...headerRow.cells];
      const columns = new Map(); // index -> category
      headers.forEach((cell, index) => {
        const label = cell.textContent.trim();
        if (!label) return;
        for (const cat of Object.keys(COLUMN_PATTERNS)) {
          if (COLUMN_PATTERNS[cat].some((re) => re.test(label))) {
            columns.set(index, cat);
            return;
          }
        }
      });
      if (!columns.size) continue;

      for (const row of table.rows) {
        for (const [index, cat] of columns) {
          const cell = row.cells[index];
          if (cell && !cell.classList.contains('wwh-marked')) {
            cell.classList.add(`wwh-mark-${cat}`, 'wwh-marked');
          }
        }
      }
    }
  }

  function markExtraSelectors(scope) {
    const selectors = settings.extraSelectors
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!selectors.length) return;

    for (const selector of selectors) {
      let matches;
      try {
        matches = scope.querySelectorAll(selector);
      } catch {
        continue; // user typo in the advanced box - ignore it
      }
      for (const el of matches) {
        if (el.closest('#wwh-panel')) continue;
        el.classList.add('wwh-mark-answers', 'wwh-marked');
      }
    }
  }

  /* ---------------------------------------------------------------- *
   * Answer boxes
   * ---------------------------------------------------------------- */

  function clearAnswerInputs() {
    for (const el of document.querySelectorAll(ANSWER_INPUTS)) {
      if (!originalValues.has(el)) originalValues.set(el, el.value);
      if (el.dataset.wwhCleared === 'yes') continue;

      // Only wipe what WeBWorK pre-filled from the last submission. Anything
      // the student has typed since (e.g. after a peek) is left alone.
      if (el.value && el.value !== originalValues.get(el)) continue;

      el.dataset.wwhCleared = 'yes';
      if (!el.value) continue;

      el.value = '';
      clearMathQuill(el);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function restoreAnswerInputs() {
    for (const el of document.querySelectorAll(ANSWER_INPUTS)) {
      if (el.dataset.wwhCleared !== 'yes') continue;
      delete el.dataset.wwhCleared;
      const original = originalValues.get(el);
      if (original === undefined || el.value) continue;
      el.value = original;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  // WeBWorK's math editor mirrors the input into a MathQuill span; the hidden
  // input alone isn't what you see on screen.
  function clearMathQuill(input) {
    if (!input.id) return;
    const quill = document.getElementById(`MaThQuIlL_${input.id}`);
    const block = quill && quill.querySelector('.mq-root-block');
    if (block) block.textContent = '';
  }

  /* ---------------------------------------------------------------- *
   * Stop WeBWorK from being asked for answers in the first place
   * ---------------------------------------------------------------- */

  const REVEAL_PARAMS = ['showCorrectAnswers', 'showSolutions', 'showHints'];

  function suppressRevealRequests() {
    if (!settings.forceParams || !hidingActive()) return;

    const boxes = document.querySelectorAll(
      'input[type="checkbox"][name="showCorrectAnswers"], input[type="checkbox"][name="showSolutions"], input[type="checkbox"][name="showHints"], #showCorrectAnswers_id, #showSolutions_id, #showHints_id'
    );
    for (const box of boxes) {
      if (box.type === 'checkbox' && box.checked) box.checked = false;
    }

    for (const link of document.querySelectorAll('a[href*="show"]')) {
      let url;
      try {
        url = new URL(link.href, location.href);
      } catch {
        continue;
      }
      let touched = false;
      for (const param of REVEAL_PARAMS) {
        if (url.searchParams.has(param)) {
          url.searchParams.delete(param);
          touched = true;
        }
      }
      if (touched) link.href = url.toString();
    }
  }

  function guardForms() {
    document.addEventListener(
      'submit',
      () => {
        if (!settings.forceParams || !hidingActive()) return;
        suppressRevealRequests();
      },
      true
    );
  }

  /* ---------------------------------------------------------------- *
   * On-page panel
   * ---------------------------------------------------------------- */

  function buildPanel() {
    if (panel || !document.body) return;
    panel = document.createElement('div');
    panel.id = 'wwh-panel';
    panel.innerHTML =
      '<span class="wwh-dot"></span>' +
      '<button type="button" data-action="peek"></button>' +
      '<button type="button" data-action="site">Off here</button>';

    panel.addEventListener('click', (event) => {
      const action = event.target.closest('button')?.dataset.action;
      if (action === 'peek') togglePeek();
      if (action === 'site') toggleSite();
    });

    document.body.appendChild(panel);
    updatePanel();
  }

  function updatePanel() {
    if (!settings.showPanel) {
      panel?.remove();
      panel = null;
      return;
    }
    if (!panel) {
      buildPanel();
      return;
    }

    const peekButton = panel.querySelector('[data-action="peek"]');
    const siteButton = panel.querySelector('[data-action="site"]');

    if (siteDisabled() || !settings.enabled) {
      panel.dataset.state = 'off';
      peekButton.textContent = 'Spoilers shown';
      peekButton.dataset.active = 'false';
    } else if (peeking) {
      panel.dataset.state = 'revealed';
      peekButton.textContent = 'Hide again';
      peekButton.dataset.active = 'true';
    } else {
      panel.dataset.state = 'hidden';
      peekButton.textContent = 'Peek';
      peekButton.dataset.active = 'false';
    }

    siteButton.textContent = siteDisabled() ? 'On here' : 'Off here';
  }

  function togglePeek() {
    peeking = !peeking;
    apply();
  }

  async function toggleSite() {
    const hosts = new Set(settings.disabledHosts);
    if (hosts.has(location.hostname)) hosts.delete(location.hostname);
    else hosts.add(location.hostname);
    settings.disabledHosts = [...hosts];
    await chrome.storage.sync.set({ disabledHosts: settings.disabledHosts });
    apply();
  }

  /* ---------------------------------------------------------------- *
   * Scanning loop
   * ---------------------------------------------------------------- */

  let scanQueued = false;

  function scan() {
    if (!document.body) return;
    markTextSpoilers(document.body);
    markTableColumns(document.body);
    markExtraSelectors(document.body);
    suppressRevealRequests();
    if (hidingActive() && settings.clearAnswers) clearAnswerInputs();
    updatePanel();
  }

  function queueScan() {
    if (scanQueued) return;
    scanQueued = true;
    requestAnimationFrame(() => {
      scanQueued = false;
      scan();
    });
  }

  function observe() {
    new MutationObserver((records) => {
      // Ignore the mutations we cause ourselves.
      const external = records.some((record) => {
        const target = record.target;
        const el = target.nodeType === 1 ? target : target.parentElement;
        return !el || !el.closest('#wwh-panel');
      });
      if (external) queueScan();
    }).observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  /* ---------------------------------------------------------------- *
   * Boot
   * ---------------------------------------------------------------- */

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (key in DEFAULTS) settings[key] = newValue ?? DEFAULTS[key];
    }
    apply();
    queueScan();
  });

  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message?.type === 'wwh-peek') togglePeek();
    if (message?.type === 'wwh-toggle-site') toggleSite();
    if (message?.type === 'wwh-rescan') queueScan();
    respond?.({ ok: true, peeking, host: location.hostname });
    return false;
  });

  async function init() {
    try {
      const stored = await chrome.storage.sync.get(DEFAULTS);
      settings = { ...DEFAULTS, ...stored };
    } catch {
      // Keep the safe defaults if storage is unavailable.
    }
    apply();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        guardForms();
        buildPanel();
        scan();
      });
    } else {
      guardForms();
      buildPanel();
      scan();
    }
    observe();
  }

  init();
})();
