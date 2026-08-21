const pendingNewTabs = new Map();
const allowedDuplicateCreates = new Map();
const ALLOW_DUPLICATE_TTL_MS = 10_000;

async function enableActionClick() {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

function comparableUrl(tab) {
  return tab.pendingUrl || tab.url || '';
}

function isReusableUrl(url) {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isBlankStartUrl(url) {
  return !url
    || url === 'about:blank'
    || url === 'chrome://newtab/'
    || url === 'chrome://new-tab-page/';
}

function duplicateAllowanceKey(windowId, url) {
  return `${windowId}:${url}`;
}

function cleanExpiredAllowances() {
  const now = Date.now();
  for (const [key, allowance] of allowedDuplicateCreates) {
    if (allowance.expiresAt <= now || allowance.count <= 0) allowedDuplicateCreates.delete(key);
  }
}

function allowDuplicateOnce(windowId, url) {
  cleanExpiredAllowances();
  const key = duplicateAllowanceKey(windowId, url);
  const allowance = allowedDuplicateCreates.get(key) || { count: 0, expiresAt: 0 };
  allowance.count += 1;
  allowance.expiresAt = Date.now() + ALLOW_DUPLICATE_TTL_MS;
  allowedDuplicateCreates.set(key, allowance);
}

function consumeDuplicateAllowance(windowId, url) {
  cleanExpiredAllowances();
  const key = duplicateAllowanceKey(windowId, url);
  const allowance = allowedDuplicateCreates.get(key);
  if (!allowance) return false;

  allowance.count -= 1;
  if (allowance.count <= 0) {
    allowedDuplicateCreates.delete(key);
  } else {
    allowedDuplicateCreates.set(key, allowance);
  }
  return true;
}

function preferredExistingTab(candidates) {
  return [...candidates].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.index !== b.index) return a.index - b.index;
    return a.id - b.id;
  })[0];
}

function findReuseTarget(matchingTabs, newTabId) {
  const establishedTabs = matchingTabs.filter((tab) => (
    tab.id !== newTabId && !pendingNewTabs.has(tab.id)
  ));
  if (establishedTabs.length > 0) return preferredExistingTab(establishedTabs);

  const simultaneouslyOpenedTabs = matchingTabs
    .filter((tab) => pendingNewTabs.has(tab.id))
    .sort((a, b) => a.id - b.id);
  const oldestNewTab = simultaneouslyOpenedTabs[0];
  return oldestNewTab?.id === newTabId ? undefined : oldestNewTab;
}

async function reuseExistingTabIfNeeded(tab) {
  const state = pendingNewTabs.get(tab.id);
  if (!state || tab.incognito) {
    pendingNewTabs.delete(tab.id);
    return;
  }

  const url = comparableUrl(tab);
  if (!isReusableUrl(url)) {
    if (tab.status === 'complete' && !isBlankStartUrl(url)) pendingNewTabs.delete(tab.id);
    return;
  }

  if (consumeDuplicateAllowance(tab.windowId, url)) {
    pendingNewTabs.delete(tab.id);
    return;
  }

  const windowTabs = await chrome.tabs.query({ windowId: tab.windowId });
  const matchingTabs = windowTabs.filter((candidate) => comparableUrl(candidate) === url);
  const reuseTarget = findReuseTarget(matchingTabs, tab.id);

  if (!reuseTarget) {
    if (tab.status === 'complete') pendingNewTabs.delete(tab.id);
    return;
  }

  await chrome.tabs.update(reuseTarget.id, { active: true });
  await chrome.tabs.remove(tab.id);
  pendingNewTabs.delete(tab.id);
  chrome.runtime.sendMessage({ type: 'duplicate-reused' }).catch(() => {});
}

function queueDuplicateCheck(tab) {
  const state = pendingNewTabs.get(tab.id);
  if (!state) return;

  state.latestTab = tab;
  if (state.checking) {
    state.needsCheck = true;
    return;
  }

  state.checking = true;
  Promise.resolve().then(async () => {
    do {
      state.needsCheck = false;
      await reuseExistingTabIfNeeded(state.latestTab);
    } while (pendingNewTabs.has(tab.id) && state.needsCheck);
  }).catch(console.error).finally(() => {
    state.checking = false;
  });
}

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.incognito) return;
  pendingNewTabs.set(tab.id, {
    latestTab: tab,
    checking: false,
    needsCheck: false
  });
  queueDuplicateCheck(tab);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!pendingNewTabs.has(tabId)) return;
  if (!changeInfo.url && !changeInfo.status) return;
  queueDuplicateCheck(tab);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  pendingNewTabs.delete(tabId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'allow-duplicate-once') return false;
  if (!Number.isInteger(message.windowId) || !isReusableUrl(message.url)) {
    sendResponse({ ok: false });
    return false;
  }
  allowDuplicateOnce(message.windowId, message.url);
  sendResponse({ ok: true });
  return false;
});

chrome.runtime.onInstalled.addListener(() => {
  enableActionClick().catch(console.error);
});

chrome.runtime.onStartup.addListener(() => {
  enableActionClick().catch(console.error);
});

enableActionClick().catch(console.error);
