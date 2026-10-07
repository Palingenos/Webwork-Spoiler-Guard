/*
 * WeBWorK Spoiler Guard - service worker.
 *
 * Two jobs: route the keyboard shortcuts to the page, and inject the content
 * script on WeBWorK installs that don't live under /webwork2/ (the popup can
 * grant one site at a time).
 */

const SCRIPT_ID = 'wwh-extra-sites';

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

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get(DEFAULTS);
  await chrome.storage.sync.set({ ...DEFAULTS, ...stored });
  await syncExtraSites();
});

chrome.runtime.onStartup.addListener(syncExtraSites);

/* Keyboard shortcuts ------------------------------------------------ */

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  const type =
    command === 'toggle-peek' ? 'wwh-peek' :
    command === 'toggle-enabled' ? 'wwh-toggle-site' : null;
  if (!type) return;

  try {
    await chrome.tabs.sendMessage(tab.id, { type });
  } catch {
    // No content script on this page - nothing to toggle.
  }
});

/* Extra sites ------------------------------------------------------- */

async function syncExtraSites() {
  const { extraPatterns = [] } = await chrome.storage.sync.get('extraPatterns');

  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });
  if (existing.length) {
    await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
  }
  if (!extraPatterns.length) return;

  // Only register patterns we actually hold permission for, otherwise the
  // whole call is rejected and none of them work.
  const permitted = [];
  for (const pattern of extraPatterns) {
    try {
      if (await chrome.permissions.contains({ origins: [pattern] })) permitted.push(pattern);
    } catch {
      // Malformed pattern - skip it.
    }
  }
  if (!permitted.length) return;

  try {
    await chrome.scripting.registerContentScripts([
      {
        id: SCRIPT_ID,
        matches: permitted,
        css: ['src/hide.css'],
        js: ['src/content.js'],
        runAt: 'document_start',
        allFrames: true,
        persistAcrossSessions: true
      }
    ]);
  } catch (error) {
    console.warn('WeBWorK Spoiler Guard: could not register extra sites', error);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message?.type === 'wwh-sync-sites') {
    syncExtraSites().then(
      () => respond({ ok: true }),
      (error) => respond({ ok: false, error: String(error) })
    );
    return true; // async response
  }
  return false;
});

chrome.permissions.onRemoved.addListener(syncExtraSites);
chrome.permissions.onAdded.addListener(syncExtraSites);
