/* WeBWorK Spoiler Guard - popup. */

const DEFAULTS = {
  enabled: true,
  answers: true,
  results: true,
  scores: true,
  solutions: true,
  clearAnswers: true,
  forceParams: true,
  showPanel: true,
  mode: 'hide',
  extraSelectors: '',
  disabledHosts: [],
  extraPatterns: []
};

const siteLine = document.getElementById('site-line');
const toggleSiteButton = document.getElementById('toggle-site');
const grantSiteButton = document.getElementById('grant-site');
const modeGroup = document.getElementById('mode');
const extraSelectors = document.getElementById('extraSelectors');
const enabledBox = document.getElementById('enabled');

let settings = { ...DEFAULTS };
let tab = null;
let host = '';
let hasContentScript = false;

async function init() {
  settings = { ...DEFAULTS, ...(await chrome.storage.sync.get(DEFAULTS)) };

  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    host = tab?.url ? new URL(tab.url).hostname : '';
  } catch {
    host = '';
  }

  // A reply means the content script is running on this tab.
  if (tab?.id) {
    try {
      const reply = await chrome.tabs.sendMessage(tab.id, { type: 'wwh-rescan' });
      hasContentScript = Boolean(reply?.ok);
    } catch {
      hasContentScript = false;
    }
  }

  render();
  bind();
}

function render() {
  enabledBox.checked = settings.enabled;

  for (const box of document.querySelectorAll('[data-setting]')) {
    box.checked = Boolean(settings[box.dataset.setting]);
  }

  for (const button of modeGroup.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.dataset.mode === settings.mode));
  }

  extraSelectors.value = settings.extraSelectors;

  const siteOff = settings.disabledHosts.includes(host);

  if (!host) {
    siteLine.textContent = 'Open a WeBWorK page to use the controls.';
    toggleSiteButton.hidden = true;
  } else if (hasContentScript) {
    siteLine.innerHTML = siteOff
      ? `Paused on <strong>${escapeHtml(host)}</strong> — spoilers are visible.`
      : `Guarding <strong>${escapeHtml(host)}</strong>.`;
    toggleSiteButton.hidden = false;
    toggleSiteButton.textContent = siteOff ? 'Turn back on for this site' : 'Turn off for this site';
  } else {
    siteLine.innerHTML = `Not running on <strong>${escapeHtml(host)}</strong>.`;
    toggleSiteButton.hidden = true;
  }

  // Offer a one-click permission grant for installs outside /webwork2/.
  grantSiteButton.hidden = !host || hasContentScript;
}

function bind() {
  enabledBox.addEventListener('change', () => save({ enabled: enabledBox.checked }));

  for (const box of document.querySelectorAll('[data-setting]')) {
    box.addEventListener('change', () => save({ [box.dataset.setting]: box.checked }));
  }

  modeGroup.addEventListener('click', (event) => {
    const mode = event.target.closest('button')?.dataset.mode;
    if (mode) save({ mode });
  });

  let debounce;
  extraSelectors.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => save({ extraSelectors: extraSelectors.value }), 350);
  });

  toggleSiteButton.addEventListener('click', async () => {
    const hosts = new Set(settings.disabledHosts);
    if (hosts.has(host)) hosts.delete(host);
    else hosts.add(host);
    await save({ disabledHosts: [...hosts] });
    render();
  });

  grantSiteButton.addEventListener('click', grantCurrentSite);
}

async function grantCurrentSite() {
  if (!host) return;
  const pattern = `*://${host}/*`;

  const granted = await chrome.permissions.request({ origins: [pattern] });
  if (!granted) return;

  const patterns = new Set(settings.extraPatterns);
  patterns.add(pattern);
  await save({ extraPatterns: [...patterns] });

  await chrome.runtime.sendMessage({ type: 'wwh-sync-sites' });
  if (tab?.id) await chrome.tabs.reload(tab.id);
  window.close();
}

async function save(patch) {
  settings = { ...settings, ...patch };
  await chrome.storage.sync.set(patch);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
  );
}

init();
