const NO_GROUP = -1;

const listElement = document.querySelector('#tab-list');
const newTabSlot = document.querySelector('#new-tab-slot');
const newTabButton = document.querySelector('#new-tab-button');
const utilityBar = document.querySelector('.utility-bar');
const countElement = document.querySelector('#tab-count');
const duplicateCountElement = document.querySelector('#duplicate-count');
const duplicateButton = document.querySelector('#close-duplicates');
const searchInput = document.querySelector('#search-input');
const searchToggle = document.querySelector('#search-toggle');
const searchPanel = document.querySelector('#search-panel');
const searchCloseButton = document.querySelector('#search-close');
const helpToggle = document.querySelector('#help-toggle');
const helpPanel = document.querySelector('#help-panel');
const themeToggle = document.querySelector('#theme-toggle');
const themeMenu = document.querySelector('#theme-menu');
const themeOptions = [...themeMenu.querySelectorAll('[data-theme-value]')];
const statusElement = document.querySelector('#status');
const statusTextElement = document.querySelector('#status-text');
const undoButton = document.querySelector('#undo-close');
const pinnedStrip = document.querySelector('#pinned-strip');
const pinnedTemplate = document.querySelector('#pinned-template');
const rowTemplate = document.querySelector('#tab-template');
const contextMenu = document.querySelector('#tab-context-menu');
const contextDuplicateButton = document.querySelector('#context-duplicate');
const contextAddFolderButton = document.querySelector('#context-add-folder');
const contextPinButton = document.querySelector('#context-pin');
const contextMuteButton = document.querySelector('#context-mute');
const contextCloseButton = document.querySelector('#context-close');
const nativeGroupContextMenu = document.querySelector('#native-group-context-menu');
const nativeGroupToggleButton = document.querySelector('#native-group-toggle');
const nativeGroupNewTabButton = document.querySelector('#native-group-new-tab');
const nativeGroupSaveCustomButton = document.querySelector('#native-group-save-custom');
const folderContextMenu = document.querySelector('#folder-context-menu');
const folderNewTabButton = document.querySelector('#folder-new-tab');
const folderOpenAllButton = document.querySelector('#folder-open-all');
const folderRenameButton = document.querySelector('#folder-rename');
const folderDeleteButton = document.querySelector('#folder-delete');
const savedContextMenu = document.querySelector('#saved-context-menu');
const savedOpenButton = document.querySelector('#saved-open');
const savedDuplicateButton = document.querySelector('#saved-duplicate');
const savedPinButton = document.querySelector('#saved-pin');
const savedMuteButton = document.querySelector('#saved-mute');
const savedCloseButton = document.querySelector('#saved-close');
const savedRemoveButton = document.querySelector('#saved-remove');
const pinContextMenu = document.querySelector('#pin-context-menu');
const pinOpenButton = document.querySelector('#pin-open');
const pinCloseTabButton = document.querySelector('#pin-close-tab');
const pinRemoveButton = document.querySelector('#pin-remove');
const folderPicker = document.querySelector('#folder-picker');
const folderOptions = document.querySelector('#folder-options');
const folderCreateOption = document.querySelector('#folder-create-option');
const folderPickerCancel = document.querySelector('#folder-picker-cancel');
const fixedArea = document.querySelector('#fixed-area');
const fixedAreaToggle = document.querySelector('#fixed-area-toggle');
const fixedAreaChevron = document.querySelector('#fixed-area-chevron');
const fixedAreaAdd = document.querySelector('#fixed-area-add');
const fixedFolderCount = document.querySelector('#fixed-folder-count');
const fixedFolderList = document.querySelector('#fixed-folder-list');

const FIXED_FOLDERS_KEY = 'fixedFoldersV1';
const PERSISTENT_PINS_KEY = 'persistentPinsV1';
const MANUAL_STANDALONE_TABS_KEY = 'manualStandaloneTabIdsV1';
const FIXED_ITEM_TAB_BINDINGS_KEY = 'fixedItemTabBindingsV1';
const THEME_PREFERENCE_KEY = 'themePreferenceModeV2';
const SYSTEM_THEME_QUERY = window.matchMedia('(prefers-color-scheme: dark)');
const SPLIT_VIEW_ID_NONE = globalThis.chrome?.tabs?.SPLIT_VIEW_ID_NONE ?? -1;

let tabs = [];
let tabGroups = [];
let duplicateCountsByUrl = new Map();
let currentWindowId;
let lastClosedTabs = [];
let ungroupedCollapsed = false;
const collapsedSiteGroups = new Set();
let refreshTimer;
let draggedTab;
let draggedSectionId;
let statusTimer;
let contextMenuTab;
let contextMenuFolder;
let contextMenuSavedItem;
let contextMenuPin;
let contextMenuNativeGroup;
let folderPickerTab;
let fixedFolders = [];
let persistentPins = [];
let fixedAreaCollapsed = false;
let draggedPersistentPin;
let draggedFixedEntry;
let newTabPlacementFrame;
let layoutObserver;
let newTabIsFloating = false;
let currentThemePreference = normalizeThemePreference(document.documentElement.dataset.themePreference);
let currentTheme = resolveTheme(currentThemePreference);
const manualStandaloneTabIds = new Set();
const fixedItemTabBindings = new Map();

const colorLabels = {
  grey: '灰色',
  blue: '蓝色',
  red: '红色',
  yellow: '黄色',
  green: '绿色',
  pink: '粉色',
  purple: '紫色',
  cyan: '青色',
  orange: '橙色'
};

const commonCountrySecondLevelDomains = new Set([
  'ac', 'co', 'com', 'edu', 'gov', 'net', 'org'
]);

const hostedPublicSuffixes = new Set([
  'blogspot.com',
  'firebaseapp.com',
  'github.io',
  'netlify.app',
  'notion.site',
  'pages.dev',
  'surge.sh',
  'vercel.app',
  'web.app',
  'wordpress.com'
]);

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

function createStrokeIcon(className, paths) {
  const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  svg.classList.add(className);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.7');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  for (const pathData of paths) {
    const path = document.createElementNS(SVG_NAMESPACE, 'path');
    path.setAttribute('d', pathData);
    svg.append(path);
  }
  return svg;
}

function createFolderStateIcon(open) {
  const paths = open
    ? [
      'M3.5 9V6.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2V9',
      'M3 9.5h18l-2.1 9.5H5.1L3 9.5Z'
    ]
    : ['M3.5 7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7Z'];
  const icon = createStrokeIcon('folder-state-icon', paths);
  icon.classList.toggle('is-open', open);
  return icon;
}

function createChevronIcon(expanded) {
  const icon = createStrokeIcon('chevron', ['m9 6 6 6-6 6']);
  icon.classList.toggle('is-expanded', expanded);
  return icon;
}

function duplicateUrlCounts() {
  const counts = new Map();
  for (const tab of tabs) {
    if (!tab.url) continue;
    counts.set(tab.url, (counts.get(tab.url) || 0) + 1);
  }
  return counts;
}

function duplicateGroups() {
  const groups = new Map();

  for (const tab of tabs) {
    if (!tab.url) continue;
    const group = groups.get(tab.url) || [];
    group.push(tab);
    groups.set(tab.url, group);
  }

  return [...groups.values()].filter((group) => group.length > 1);
}

function splitViewIdForTab(tab) {
  return Number.isInteger(tab?.splitViewId) && tab.splitViewId !== SPLIT_VIEW_ID_NONE
    ? tab.splitViewId
    : undefined;
}

function splitPartnersForTab(tab) {
  const splitViewId = splitViewIdForTab(tab);
  if (splitViewId === undefined) return [];
  return tabs.filter((candidate) => (
    candidate.id !== tab.id && splitViewIdForTab(candidate) === splitViewId
  ));
}

function activeSplitViewId() {
  return splitViewIdForTab(tabs.find((tab) => tab.active));
}

function isCurrentSplitCompanion(tab) {
  if (!tab) return false;
  const splitViewId = splitViewIdForTab(tab);
  const currentSplitViewId = activeSplitViewId();
  return !tab.active
    && splitViewId !== undefined
    && currentSplitViewId !== undefined
    && splitViewId === currentSplitViewId;
}

function splitViewDescription(tab) {
  const partnerTitles = splitPartnersForTab(tab)
    .map((partner) => partner.title || '无标题标签页');
  return partnerTitles.length > 0
    ? `与“${partnerTitles.join('、')}”拆分显示`
    : '正在拆分视图中显示';
}

function createSplitViewIndicator(tab, { interactive = true } = {}) {
  const indicator = document.createElement(interactive ? 'button' : 'span');
  indicator.className = 'split-view-indicator';
  if (interactive) indicator.type = 'button';

  const glyph = document.createElement('span');
  glyph.className = 'split-view-glyph';
  glyph.setAttribute('aria-hidden', 'true');
  indicator.append(glyph);

  const description = splitViewDescription(tab);
  indicator.title = interactive ? `${description}；点击定位另一侧` : description;
  if (interactive) {
    indicator.setAttribute('aria-label', indicator.title);
    indicator.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      focusSplitPartner(tab).catch(handleError);
    });
  }
  return indicator;
}

function fixedEntryForTabId(tabId) {
  for (const folder of fixedFolders) {
    for (const item of folder.items) {
      if (item.pendingTabId === tabId || fixedItemTabBindings.get(item.id) === tabId) {
        return { folder, item };
      }
    }
  }
  return undefined;
}

function temporarySectionForTab(tab) {
  if (tab.groupId !== NO_GROUP) return { kind: 'native', groupId: tab.groupId };

  const pendingFolderTabIds = fixedFolderPendingTabIdSet();
  const boundFolderTabIds = fixedItemBoundTabIdSet();
  const ungroupedTabs = tabs.filter((candidate) => (
    !candidate.pinned
    && candidate.groupId === NO_GROUP
    && !pendingFolderTabIds.has(candidate.id)
    && !boundFolderTabIds.has(candidate.id)
  ));
  const { websiteGroups } = collectWebsiteGroups(ungroupedTabs);
  const websiteGroup = websiteGroups.find((group) => (
    group.tabs.some((candidate) => candidate.id === tab.id)
  ));
  return websiteGroup
    ? { kind: 'site', siteKey: websiteGroup.key }
    : { kind: 'ungrouped' };
}

async function focusSplitPartner(tab) {
  const partner = splitPartnersForTab(tab)[0];
  if (!partner) {
    setStatus('没有找到拆分视图的另一侧');
    return;
  }

  closeContextMenu();
  closeFolderPicker();
  if (!searchPanel.hidden) {
    searchPanel.hidden = true;
    searchToggle.classList.remove('is-on');
    searchInput.value = '';
  }

  const fixedEntry = fixedEntryForTabId(partner.id);
  if (fixedEntry) {
    fixedAreaCollapsed = false;
    if (fixedEntry.folder.collapsed) {
      fixedEntry.folder.collapsed = false;
      await saveFixedFolders({ renderAfter: false });
    }
  } else if (!partner.pinned) {
    const section = temporarySectionForTab(partner);
    if (section.kind === 'native') {
      const group = tabGroups.find((candidate) => candidate.id === section.groupId);
      if (group?.collapsed) {
        group.collapsed = false;
        await chrome.tabGroups.update(group.id, { collapsed: false });
      }
    } else if (section.kind === 'site') {
      collapsedSiteGroups.delete(section.siteKey);
    } else {
      ungroupedCollapsed = false;
    }
  }

  await chrome.tabs.update(partner.id, { active: true });
  for (const currentTab of tabs) currentTab.active = currentTab.id === partner.id;
  render({ preserveViewport: true });
  requestAnimationFrame(() => {
    document.querySelector(`[data-tab-id="${partner.id}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}

function removableDuplicates() {
  return duplicateGroups().flatMap((group) => {
    const keeper = group.find((tab) => tab.active) || group.find((tab) => tab.pinned) || group[0];
    return group.filter((tab) => tab.id !== keeper.id && !tab.pinned);
  });
}

function matchesQuery(tab, query) {
  return `${tab.title || ''} ${tab.url || ''}`.toLocaleLowerCase().includes(query);
}

function primaryDomain(hostname) {
  const labels = hostname.split('.').filter(Boolean);
  if (labels.length <= 2) return hostname;

  const lastTwoLabels = labels.slice(-2).join('.');
  if (hostedPublicSuffixes.has(lastTwoLabels)) {
    return labels.slice(-3).join('.');
  }

  const topLevelDomain = labels.at(-1);
  const secondLevelDomain = labels.at(-2);
  if (topLevelDomain.length === 2 && commonCountrySecondLevelDomains.has(secondLevelDomain)) {
    return labels.slice(-3).join('.');
  }

  return lastTwoLabels;
}

function siteIdentity(tab) {
  if (!tab.url) return null;

  try {
    const url = new URL(tab.url);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

    const hostname = url.hostname.toLocaleLowerCase().replace(/^www\./, '').replace(/\.$/, '');
    if (!hostname) return null;

    const isLocalhost = hostname === 'localhost' || hostname.endsWith('.localhost');
    const isIpAddress = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':');
    const host = isLocalhost || isIpAddress
      ? (url.port ? `${hostname}:${url.port}` : hostname)
      : primaryDomain(hostname);

    return {
      key: host,
      label: host
    };
  } catch {
    return null;
  }
}

function collectWebsiteGroups(ungroupedTabs) {
  const buckets = new Map();
  const standaloneTabs = [];

  for (const tab of ungroupedTabs) {
    if (manualStandaloneTabIds.has(tab.id)) {
      standaloneTabs.push(tab);
      continue;
    }
    const site = siteIdentity(tab);
    if (!site) {
      standaloneTabs.push(tab);
      continue;
    }

    const bucket = buckets.get(site.key) || { ...site, tabs: [] };
    bucket.tabs.push(tab);
    buckets.set(site.key, bucket);
  }

  const websiteGroups = [];
  for (const bucket of buckets.values()) {
    if (bucket.tabs.length >= 2) {
      websiteGroups.push(bucket);
    } else {
      standaloneTabs.push(bucket.tabs[0]);
    }
  }

  websiteGroups.sort((a, b) => a.tabs[0].index - b.tabs[0].index);
  standaloneTabs.sort((a, b) => a.index - b.index);
  return { websiteGroups, standaloneTabs };
}

function currentDraggedUrl() {
  return draggedTab?.url || draggedFixedEntry?.item.url || draggedPersistentPin?.url || '';
}

function setPinnedDropZoneVisible(visible) {
  pinnedStrip.classList.toggle('is-drop-ready', visible);
  if (visible) {
    pinnedStrip.hidden = false;
  } else if (persistentPins.length === 0) {
    pinnedStrip.hidden = true;
  }
}

function clearDragState() {
  draggedTab = undefined;
  draggedSectionId = undefined;
  draggedPersistentPin = undefined;
  draggedFixedEntry = undefined;
  setPinnedDropZoneVisible(false);
  document.querySelectorAll('.is-drop-target, .is-drop-before, .is-drop-after').forEach((element) => {
    element.classList.remove('is-drop-target', 'is-drop-before', 'is-drop-after');
  });
}

function canDropIntoTemporarySection(kind, siteKey, url) {
  if (kind === 'ungrouped') return true;
  if (kind !== 'site') return false;
  return siteIdentity({ url })?.key === siteKey;
}

async function loadManualStandaloneTabIds() {
  const storage = globalThis.chrome?.storage?.session;
  if (!storage) return;
  try {
    const stored = await storage.get(MANUAL_STANDALONE_TABS_KEY);
    const values = stored[MANUAL_STANDALONE_TABS_KEY];
    if (!Array.isArray(values)) return;
    for (const tabId of values) {
      if (Number.isInteger(tabId)) manualStandaloneTabIds.add(tabId);
    }
  } catch {
    // Session persistence is optional; drag behavior remains available in-memory.
  }
}

async function saveManualStandaloneTabIds() {
  const storage = globalThis.chrome?.storage?.session;
  if (!storage) return;
  try {
    await storage.set({ [MANUAL_STANDALONE_TABS_KEY]: [...manualStandaloneTabIds] });
  } catch {
    // Keep the current panel session usable if session storage is unavailable.
  }
}

async function loadFixedItemTabBindings() {
  const storage = globalThis.chrome?.storage?.session;
  if (!storage) return;
  try {
    const stored = await storage.get(FIXED_ITEM_TAB_BINDINGS_KEY);
    const entries = stored[FIXED_ITEM_TAB_BINDINGS_KEY];
    if (!Array.isArray(entries)) return;
    for (const entry of entries) {
      if (Array.isArray(entry) && typeof entry[0] === 'string' && Number.isInteger(entry[1])) {
        fixedItemTabBindings.set(entry[0], entry[1]);
      }
    }
  } catch {
    // Binding persistence is optional; exact-URL matching remains as fallback.
  }
}

async function saveFixedItemTabBindings() {
  const storage = globalThis.chrome?.storage?.session;
  if (!storage) return;
  try {
    await storage.set({ [FIXED_ITEM_TAB_BINDINGS_KEY]: [...fixedItemTabBindings.entries()] });
  } catch {
    // Keep the current side panel usable if session storage is unavailable.
  }
}

function boundTabForFixedItem(item, availableTabs = tabs) {
  const tabId = fixedItemTabBindings.get(item.id);
  return Number.isInteger(tabId) ? availableTabs.find((tab) => tab.id === tabId) : undefined;
}

function fixedItemBoundTabIdSet() {
  return new Set(fixedItemTabBindings.values());
}

async function removeFixedItemBinding(itemId) {
  if (!fixedItemTabBindings.delete(itemId)) return;
  await saveFixedItemTabBindings();
}

async function reconcileFixedItemTabBindings() {
  const validItems = fixedFolders.flatMap((folder) => folder.items);
  const validItemIds = new Set(validItems.map((item) => item.id));
  const availableTabIds = new Set(tabs.map((tab) => tab.id));
  let changed = false;

  for (const [itemId, tabId] of fixedItemTabBindings) {
    if (!validItemIds.has(itemId) || !availableTabIds.has(tabId)) {
      fixedItemTabBindings.delete(itemId);
      changed = true;
    }
  }

  const claimedTabIds = new Set(fixedItemTabBindings.values());
  for (const item of validItems) {
    if (fixedItemTabBindings.has(item.id) || !isSavableUrl(item.url)) continue;
    const exactTab = tabs.find((tab) => tab.url === item.url && !claimedTabIds.has(tab.id));
    if (!exactTab) continue;
    fixedItemTabBindings.set(item.id, exactTab.id);
    claimedTabIds.add(exactTab.id);
    changed = true;
  }

  if (changed) await saveFixedItemTabBindings();
}

function setStatus(message, canUndo = false) {
  clearTimeout(statusTimer);
  statusTextElement.textContent = message;
  undoButton.hidden = !canUndo;
  statusElement.hidden = !message;
  statusTimer = setTimeout(() => {
    statusElement.hidden = true;
  }, canUndo ? 7000 : 2800);
}

function normalizeThemePreference(value) {
  return ['system', 'light', 'dark'].includes(value) ? value : 'system';
}

function resolveTheme(preference) {
  if (preference === 'system') return SYSTEM_THEME_QUERY.matches ? 'dark' : 'light';
  return preference;
}

function updateThemeControls() {
  for (const option of themeOptions) {
    const selected = option.dataset.themeValue === currentThemePreference;
    option.classList.toggle('is-selected', selected);
    option.setAttribute('aria-checked', String(selected));
  }
  const resolvedLabel = currentTheme === 'dark' ? '深色' : '浅色';
  const label = currentThemePreference === 'system' ? `跟随系统（当前${resolvedLabel}）` : resolvedLabel;
  themeToggle.title = `主题：${label}`;
  themeToggle.setAttribute('aria-label', `选择主题，当前为${label}`);
}

function applyThemePreference(value) {
  currentThemePreference = normalizeThemePreference(value);
  currentTheme = resolveTheme(currentThemePreference);
  document.documentElement.dataset.themePreference = currentThemePreference;
  document.documentElement.dataset.theme = currentTheme;
  try {
    window.localStorage.setItem(THEME_PREFERENCE_KEY, currentThemePreference);
  } catch {
    // The visual theme still works for this panel session.
  }
  updateThemeControls();
}

async function loadThemePreference() {
  const fallback = (() => {
    try {
      return window.localStorage.getItem(THEME_PREFERENCE_KEY);
    } catch {
      return null;
    }
  })();
  const storage = globalThis.chrome?.storage?.local;
  if (storage) {
    try {
      const stored = await storage.get(THEME_PREFERENCE_KEY);
      applyThemePreference(stored[THEME_PREFERENCE_KEY] ?? fallback);
      return;
    } catch {
      // Fall back to page-local persistence.
    }
  }
  applyThemePreference(fallback);
}

async function saveThemePreference(value) {
  applyThemePreference(value);
  const storage = globalThis.chrome?.storage?.local;
  if (!storage) return;
  try {
    await storage.set({ [THEME_PREFERENCE_KEY]: currentThemePreference });
  } catch {
    // The localStorage fallback already preserves the user's choice.
  }
}

function closeThemeMenu() {
  themeMenu.hidden = true;
  themeToggle.classList.remove('is-on');
  themeToggle.setAttribute('aria-expanded', 'false');
}

function setThemeMenuOpen(open) {
  closeContextMenu();
  closeFolderPicker();
  if (open) {
    if (!searchPanel.hidden) setSearchOpen(false);
    helpPanel.hidden = true;
    helpToggle.classList.remove('is-on');
  }
  themeMenu.hidden = !open;
  themeToggle.classList.toggle('is-on', open);
  themeToggle.setAttribute('aria-expanded', String(open));
  if (open) requestAnimationFrame(() => themeOptions.find((option) => option.classList.contains('is-selected'))?.focus());
}

function setSearchOpen(open) {
  closeContextMenu();
  closeFolderPicker();
  if (open) closeThemeMenu();
  searchPanel.hidden = !open;
  searchToggle.classList.toggle('is-on', open);
  if (open) {
    helpPanel.hidden = true;
    helpToggle.classList.remove('is-on');
    requestAnimationFrame(() => searchInput.focus());
    return;
  }
  searchInput.value = '';
  render();
}

function closeContextMenu() {
  contextMenu.hidden = true;
  folderContextMenu.hidden = true;
  savedContextMenu.hidden = true;
  pinContextMenu.hidden = true;
  nativeGroupContextMenu.hidden = true;
  contextMenuTab = undefined;
  contextMenuFolder = undefined;
  contextMenuSavedItem = undefined;
  contextMenuPin = undefined;
  contextMenuNativeGroup = undefined;
}

function positionContextMenu(menu, x, y, focusTarget) {
  menu.hidden = false;
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  requestAnimationFrame(() => {
    if (menu.hidden) return;
    const rect = menu.getBoundingClientRect();
    const left = Math.max(6, Math.min(x, window.innerWidth - rect.width - 6));
    const top = Math.max(6, Math.min(y, window.innerHeight - rect.height - 6));
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    focusTarget?.focus();
  });
}

function openContextMenu(tab, x, y) {
  closeContextMenu();
  contextMenuTab = tab;
  contextPinButton.querySelector('.context-label').textContent = isPersistentlyPinned(tab.url) ? '取消永久固定' : '永久固定';
  contextMuteButton.querySelector('.context-label').textContent = tab.mutedInfo?.muted ? '取消静音' : '静音';
  contextAddFolderButton.disabled = !isSavableUrl(tab.url);
  positionContextMenu(contextMenu, x, y, contextDuplicateButton);
}

function openFolderContextMenu(folder, x, y) {
  closeContextMenu();
  contextMenuFolder = folder;
  folderOpenAllButton.disabled = folder.items.length === 0;
  positionContextMenu(folderContextMenu, x, y, folderNewTabButton);
}

function openSavedContextMenu(folder, item, tab, x, y) {
  closeContextMenu();
  contextMenuSavedItem = { folder, item, tab };
  savedOpenButton.querySelector('.context-label').textContent = tab ? '切换到页面' : '打开页面';
  savedDuplicateButton.disabled = !tab;
  savedPinButton.disabled = !isSavableUrl(tab?.url || item.url);
  savedPinButton.querySelector('.context-label').textContent = isPersistentlyPinned(tab?.url || item.url)
    ? '取消永久固定'
    : '永久固定';
  savedMuteButton.disabled = !tab;
  savedMuteButton.querySelector('.context-label').textContent = tab?.mutedInfo?.muted ? '取消静音' : '静音';
  savedCloseButton.disabled = !tab;
  positionContextMenu(savedContextMenu, x, y, savedOpenButton);
}

function openPinContextMenu(pin, openTab, x, y) {
  closeContextMenu();
  contextMenuPin = { pin, openTab };
  pinOpenButton.querySelector('.context-label').textContent = openTab ? '切换到页面' : '打开页面';
  pinCloseTabButton.disabled = !openTab;
  positionContextMenu(pinContextMenu, x, y, pinOpenButton);
}

function openNativeGroupContextMenu(group, groupTabs, x, y) {
  closeContextMenu();
  contextMenuNativeGroup = { group, groupTabs };
  nativeGroupToggleButton.querySelector('.context-label').textContent = group.collapsed ? '展开分组' : '收起分组';
  nativeGroupToggleButton.firstElementChild.textContent = group.collapsed ? '›' : '⌄';
  nativeGroupSaveCustomButton.disabled = !groupTabs.some((tab) => isSavableUrl(tab.url));
  positionContextMenu(nativeGroupContextMenu, x, y, nativeGroupToggleButton);
}

function isSavableUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeFixedFolders(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((folder) => folder && typeof folder.name === 'string').map((folder) => ({
    id: typeof folder.id === 'string' ? folder.id : crypto.randomUUID(),
    name: folder.name.trim() || '未命名文件夹',
    collapsed: Boolean(folder.collapsed),
    items: Array.isArray(folder.items)
      ? folder.items
        .filter((item) => item && (isSavableUrl(item.url) || Number.isInteger(item.pendingTabId)))
        .map((item) => ({
          id: typeof item.id === 'string' ? item.id : crypto.randomUUID(),
          url: isSavableUrl(item.url) ? item.url : '',
          title: item.title || (Number.isInteger(item.pendingTabId) ? '新标签页' : item.url),
          favIconUrl: item.favIconUrl || '',
          ...(Number.isInteger(item.pendingTabId) ? { pendingTabId: item.pendingTabId } : {})
        }))
      : []
  }));
}

function normalizePersistentPins(value) {
  if (!Array.isArray(value)) return [];
  const seenIdentities = new Set();
  const normalized = [];

  for (const pin of value) {
    if (!pin || !isSavableUrl(pin.url)) continue;
    const identity = persistentPinIdentity(pin.url);
    if (seenIdentities.has(identity)) continue;
    seenIdentities.add(identity);
    normalized.push({
      id: typeof pin.id === 'string' ? pin.id : crypto.randomUUID(),
      url: pin.url,
      title: pin.title || pin.url,
      favIconUrl: pin.favIconUrl || ''
    });
  }

  return normalized;
}

function readFallbackPersistentPins() {
  try {
    return JSON.parse(window.localStorage.getItem(PERSISTENT_PINS_KEY) || 'null');
  } catch {
    return null;
  }
}

function writeFallbackPersistentPins(value) {
  window.localStorage.setItem(PERSISTENT_PINS_KEY, JSON.stringify(value));
}

async function loadPersistentPins() {
  const storage = globalThis.chrome?.storage?.local;
  if (storage) {
    try {
      const stored = await storage.get(PERSISTENT_PINS_KEY);
      const fallbackValue = readFallbackPersistentPins();
      const value = stored[PERSISTENT_PINS_KEY] ?? fallbackValue;
      persistentPins = normalizePersistentPins(value);
      const needsMigration = stored[PERSISTENT_PINS_KEY] === undefined && fallbackValue !== null;
      const needsDeduplication = Array.isArray(value) && value.length !== persistentPins.length;
      if (needsMigration || needsDeduplication) {
        await storage.set({ [PERSISTENT_PINS_KEY]: persistentPins });
      }
      return;
    } catch {
      // Keep the panel usable before Chrome exposes extension storage.
    }
  }

  persistentPins = normalizePersistentPins(readFallbackPersistentPins());
}

async function savePersistentPins({ renderAfter = true } = {}) {
  const storage = globalThis.chrome?.storage?.local;
  if (storage) {
    try {
      await storage.set({ [PERSISTENT_PINS_KEY]: persistentPins });
      if (renderAfter) render();
      return;
    } catch {
      // Fall through to page-local persistence.
    }
  }

  writeFallbackPersistentPins(persistentPins);
  if (renderAfter) render();
}

function persistentPinIdentity(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLocaleLowerCase().replace(/^www\./, '').replace(/\.$/, '');
    return parsed.port ? `${hostname}:${parsed.port}` : hostname;
  } catch {
    return url;
  }
}

function persistentPinForUrl(url) {
  const identity = persistentPinIdentity(url);
  return persistentPins.find((pin) => persistentPinIdentity(pin.url) === identity);
}

function isPersistentlyPinned(url) {
  return Boolean(url && persistentPinForUrl(url));
}

function openTabForPin(pin, availableTabs = tabs) {
  const identity = persistentPinIdentity(pin.url);
  const matches = availableTabs.filter((tab) => persistentPinIdentity(tab.url) === identity);
  return matches.find((tab) => tab.active)
    || matches.find((tab) => tab.pinned)
    || matches[0];
}

function mergeChromePinnedTabs() {
  let changed = false;
  for (const tab of tabs.filter((candidate) => candidate.pinned && isSavableUrl(candidate.url))) {
    const existing = persistentPinForUrl(tab.url);
    if (!existing) {
      persistentPins.push({
        id: crypto.randomUUID(),
        url: tab.url,
        title: tab.title || tab.url,
        favIconUrl: tab.favIconUrl || ''
      });
      changed = true;
      continue;
    }

    const nextUrl = tab.url;
    const nextTitle = tab.title || existing.title;
    const nextIcon = tab.favIconUrl || existing.favIconUrl;
    if (nextUrl !== existing.url || nextTitle !== existing.title || nextIcon !== existing.favIconUrl) {
      existing.url = nextUrl;
      existing.title = nextTitle;
      existing.favIconUrl = nextIcon;
      changed = true;
    }
  }
  return changed;
}

async function openPersistentPin(pin, active = true) {
  if (currentWindowId === undefined) return undefined;
  const currentTabs = await chrome.tabs.query({ windowId: currentWindowId });
  const existing = openTabForPin(pin, currentTabs);
  if (existing) {
    await chrome.tabs.update(existing.id, { active, pinned: true });
    return existing;
  }
  return chrome.tabs.create({ windowId: currentWindowId, url: pin.url, active, pinned: true });
}

async function addPersistentPin(tab) {
  if (!isSavableUrl(tab.url)) return;
  const existing = persistentPinForUrl(tab.url);
  if (!existing) {
    persistentPins.push({
      id: crypto.randomUUID(),
      url: tab.url,
      title: tab.title || tab.url,
      favIconUrl: tab.favIconUrl || ''
    });
  } else {
    existing.url = tab.url;
    existing.title = tab.title || existing.title;
    existing.favIconUrl = tab.favIconUrl || existing.favIconUrl;
  }
  await savePersistentPins({ renderAfter: false });
  if (!tab.pinned) {
    const updatedTab = await chrome.tabs.update(tab.id, { pinned: true });
    Object.assign(tab, updatedTab);
  }
  render();
}

async function removePersistentPin(pin, { renderAfter = true } = {}) {
  persistentPins = persistentPins.filter((candidate) => candidate.id !== pin.id);
  await savePersistentPins({ renderAfter: false });
  const currentTabs = currentWindowId === undefined
    ? []
    : await chrome.tabs.query({ windowId: currentWindowId });
  const identity = persistentPinIdentity(pin.url);
  const pinnedMatches = currentTabs.filter((tab) => (
    tab.pinned && persistentPinIdentity(tab.url) === identity
  ));
  const updatedTabs = await Promise.all(pinnedMatches.map((tab) => chrome.tabs.update(tab.id, { pinned: false })));
  for (const updatedTab of updatedTabs) {
    const localTab = tabs.find((tab) => tab.id === updatedTab.id);
    if (localTab) Object.assign(localTab, updatedTab);
  }
  if (renderAfter) render();
}

async function togglePersistentPin(tab) {
  const existing = persistentPinForUrl(tab.url);
  if (existing) {
    await removePersistentPin(existing);
  } else {
    await addPersistentPin(tab);
  }
}

async function togglePersistentPinForSavedItem(item, tab) {
  const url = tab?.url || item?.url;
  if (!isSavableUrl(url)) return;
  const existing = persistentPinForUrl(url);
  if (existing) {
    await removePersistentPin(existing);
    return;
  }
  if (tab) {
    await addPersistentPin(tab);
    return;
  }
  persistentPins.push({
    id: crypto.randomUUID(),
    url,
    title: item.title || url,
    favIconUrl: item.favIconUrl || ''
  });
  await savePersistentPins();
}

async function movePersistentPin(sourceId, targetId) {
  const sourceIndex = persistentPins.findIndex((pin) => pin.id === sourceId);
  const targetIndex = persistentPins.findIndex((pin) => pin.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
  const [source] = persistentPins.splice(sourceIndex, 1);
  persistentPins.splice(targetIndex, 0, source);
  await savePersistentPins();
}

function readFallbackFixedFolders() {
  try {
    return JSON.parse(window.localStorage.getItem(FIXED_FOLDERS_KEY) || 'null');
  } catch {
    return null;
  }
}

function writeFallbackFixedFolders(value) {
  window.localStorage.setItem(FIXED_FOLDERS_KEY, JSON.stringify(value));
}

async function loadFixedFolders() {
  const storage = globalThis.chrome?.storage?.local;
  if (storage) {
    try {
      const stored = await storage.get(FIXED_FOLDERS_KEY);
      const fallbackValue = readFallbackFixedFolders();
      const value = stored[FIXED_FOLDERS_KEY] ?? fallbackValue;
      fixedFolders = normalizeFixedFolders(value);

      // Migrate folders created while the storage permission was unavailable.
      if (stored[FIXED_FOLDERS_KEY] === undefined && fallbackValue !== null) {
        await storage.set({ [FIXED_FOLDERS_KEY]: fixedFolders });
      }
      return;
    } catch {
      // Keep the panel usable if Chrome has not exposed the permission yet.
    }
  }

  fixedFolders = normalizeFixedFolders(readFallbackFixedFolders());
}

async function saveFixedFolders({ renderAfter = true } = {}) {
  const storage = globalThis.chrome?.storage?.local;
  if (storage) {
    try {
      await storage.set({ [FIXED_FOLDERS_KEY]: fixedFolders });
      if (renderAfter) render();
      return;
    } catch {
      // Fall through to page-local persistence.
    }
  }

  writeFallbackFixedFolders(fixedFolders);
  if (renderAfter) render();
}

function fixedFolderPendingTabIdSet() {
  return new Set(fixedFolders.flatMap((folder) => (
    folder.items.flatMap((item) => Number.isInteger(item.pendingTabId) ? [item.pendingTabId] : [])
  )));
}

function folderContainingUrl(url) {
  return fixedFolders.find((folder) => folder.items.some((item) => item.url === url));
}

function askForFolderName(initialValue = '') {
  const result = window.prompt(initialValue ? '重命名固定文件夹' : '新建固定文件夹', initialValue);
  return result?.trim() || '';
}

async function createFixedFolder(name) {
  const folder = {
    id: crypto.randomUUID(),
    name,
    collapsed: false,
    items: []
  };
  fixedFolders.push(folder);
  await saveFixedFolders();
  return folder;
}

async function createNewTabInFixedFolder(folder) {
  if (currentWindowId === undefined) return;
  const newTab = await chrome.tabs.create({ windowId: currentWindowId, active: true });
  folder.collapsed = false;
  folder.items.push({
    id: crypto.randomUUID(),
    url: '',
    title: '新标签页',
    favIconUrl: '',
    pendingTabId: newTab.id
  });
  tabs = [...tabs.filter((tab) => tab.id !== newTab.id), newTab].sort((a, b) => a.index - b.index);
  await saveFixedFolders();
  setStatus(`已在“${folder.name}”中新建标签，打开页面后会自动保存`);
}

function reconcilePendingFolderItems() {
  let changed = false;
  const convertedItems = [];

  for (const folder of fixedFolders) {
    const nextItems = [];
    for (const item of folder.items) {
      if (!Number.isInteger(item.pendingTabId)) {
        nextItems.push(item);
        continue;
      }

      const pendingTab = tabs.find((tab) => tab.id === item.pendingTabId);
      if (!pendingTab) {
        changed = true;
        continue;
      }

      const nextTitle = pendingTab.title || item.title || '新标签页';
      const nextIcon = pendingTab.favIconUrl || item.favIconUrl || '';
      if (isSavableUrl(pendingTab.url)) {
        item.url = pendingTab.url;
        item.title = nextTitle;
        item.favIconUrl = nextIcon;
        delete item.pendingTabId;
        convertedItems.push(item);
        changed = true;
      } else if (item.title !== nextTitle || item.favIconUrl !== nextIcon) {
        item.title = nextTitle;
        item.favIconUrl = nextIcon;
        changed = true;
      }
      nextItems.push(item);
    }
    folder.items = nextItems;
  }

  for (const convertedItem of convertedItems) {
    const convertedItemStillExists = fixedFolders.some((folder) => folder.items.includes(convertedItem));
    if (!convertedItemStillExists) continue;
    for (const folder of fixedFolders) {
      const itemCount = folder.items.length;
      folder.items = folder.items.filter((item) => item === convertedItem || item.url !== convertedItem.url);
      if (folder.items.length !== itemCount) changed = true;
    }
  }

  return changed;
}

function uniqueFixedFolderName(preferredName) {
  const baseName = preferredName.trim() || '未命名标签组';
  const existingNames = new Set(fixedFolders.map((folder) => folder.name));
  if (!existingNames.has(baseName)) return baseName;

  const chromeGroupName = `${baseName}（Chrome 分组）`;
  if (!existingNames.has(chromeGroupName)) return chromeGroupName;
  let suffix = 2;
  while (existingNames.has(`${chromeGroupName} ${suffix}`)) suffix += 1;
  return `${chromeGroupName} ${suffix}`;
}

async function saveNativeGroupAsFixedFolder(group, groupTabs) {
  const seenUrls = new Set();
  const items = [];
  for (const tab of groupTabs) {
    if (!isSavableUrl(tab.url) || seenUrls.has(tab.url)) continue;
    seenUrls.add(tab.url);
    const item = {
      id: crypto.randomUUID(),
      url: tab.url,
      title: tab.title || tab.url,
      favIconUrl: tab.favIconUrl || ''
    };
    items.push(item);
    fixedItemTabBindings.set(item.id, tab.id);
  }
  if (items.length === 0) return;

  const folder = {
    id: crypto.randomUUID(),
    name: uniqueFixedFolderName(group.title || '未命名标签组'),
    collapsed: false,
    items
  };
  fixedFolders.push(folder);
  await Promise.all([saveFixedFolders(), saveFixedItemTabBindings()]);
  setStatus(`已保存“${folder.name}”，Chrome 原生分组保持不变`);
}

async function createTabInNativeGroup(group) {
  const tab = await chrome.tabs.create({ windowId: group.windowId, active: true });
  await chrome.tabs.group({ tabIds: tab.id, groupId: group.id });
  if (group.collapsed) await chrome.tabGroups.update(group.id, { collapsed: false });
}

function closeFolderPicker() {
  folderPicker.hidden = true;
  folderPickerTab = undefined;
}

function openFolderPicker(tab) {
  closeContextMenu();
  folderPickerTab = tab;
  folderOptions.replaceChildren();
  const currentFolder = folderContainingUrl(tab.url);

  for (const folder of fixedFolders) {
    const option = document.createElement('button');
    option.type = 'button';
    option.textContent = folder.id === currentFolder?.id ? `${folder.name} · 已加入` : folder.name;
    option.disabled = folder.id === currentFolder?.id;
    option.addEventListener('click', () => addTabToFolder(tab, folder.id).catch(handleError));
    folderOptions.append(option);
  }

  folderPicker.hidden = false;
  requestAnimationFrame(() => {
    const firstAvailableOption = folderOptions.querySelector('button:not(:disabled)');
    (firstAvailableOption || folderCreateOption).focus();
  });
}

async function addTabToFolder(tab, folderId) {
  const targetFolder = fixedFolders.find((folder) => folder.id === folderId);
  if (!targetFolder || !isSavableUrl(tab.url)) return;

  const removedItemIds = [];
  for (const folder of fixedFolders) {
    folder.items = folder.items.filter((item) => {
      if (item.url !== tab.url) return true;
      removedItemIds.push(item.id);
      return false;
    });
  }
  for (const itemId of removedItemIds) fixedItemTabBindings.delete(itemId);
  const item = {
    id: crypto.randomUUID(),
    url: tab.url,
    title: tab.title || tab.url,
    favIconUrl: tab.favIconUrl || ''
  };
  targetFolder.items.push(item);
  fixedItemTabBindings.set(item.id, tab.id);
  closeFolderPicker();
  await Promise.all([saveFixedFolders(), saveFixedItemTabBindings()]);
  setStatus(`已加入“${targetFolder.name}”`);
}

async function openSavedItem(item, active = true) {
  if (currentWindowId === undefined) return undefined;
  const currentTabs = await chrome.tabs.query({ windowId: currentWindowId });
  const boundTab = boundTabForFixedItem(item, currentTabs);
  if (boundTab) {
    if (active) await chrome.tabs.update(boundTab.id, { active: true });
    return boundTab;
  }
  if (fixedItemTabBindings.delete(item.id)) await saveFixedItemTabBindings();
  const pendingTab = Number.isInteger(item.pendingTabId)
    ? currentTabs.find((tab) => tab.id === item.pendingTabId)
    : undefined;
  if (pendingTab) {
    fixedItemTabBindings.set(item.id, pendingTab.id);
    await saveFixedItemTabBindings();
    if (active) await chrome.tabs.update(pendingTab.id, { active: true });
    return pendingTab;
  }
  if (!isSavableUrl(item.url)) return undefined;

  const existingTabs = currentTabs.filter((tab) => tab.url === item.url);
  const existing = existingTabs.find((tab) => tab.active)
    || existingTabs.find((tab) => tab.pinned)
    || existingTabs[0];

  if (existing) {
    fixedItemTabBindings.set(item.id, existing.id);
    await saveFixedItemTabBindings();
    if (active) await chrome.tabs.update(existing.id, { active: true });
    return existing;
  }
  const createdTab = await chrome.tabs.create({ windowId: currentWindowId, url: item.url, active });
  fixedItemTabBindings.set(item.id, createdTab.id);
  await saveFixedItemTabBindings();
  return createdTab;
}

async function openAllFolder(folder) {
  let firstTab;
  for (const item of folder.items) {
    const opened = await openSavedItem(item, false);
    firstTab ||= opened;
  }
  if (firstTab?.id) await chrome.tabs.update(firstTab.id, { active: true });
  setStatus(`已打开“${folder.name}”中的 ${folder.items.length} 个页面`);
}

async function removeSavedItem(folderId, itemId) {
  const folder = fixedFolders.find((candidate) => candidate.id === folderId);
  if (!folder) return;
  folder.items = folder.items.filter((item) => item.id !== itemId);
  fixedItemTabBindings.delete(itemId);
  await Promise.all([saveFixedFolders(), saveFixedItemTabBindings()]);
  setStatus('已移出固定文件夹，当前标签不会关闭');
}

async function closeAndRemoveFixedItem(folder, item, tab) {
  if (!folder || !item || !tab) return;
  await closeTabs([tab]);
  folder.items = folder.items.filter((candidate) => candidate.id !== item.id);
  fixedItemTabBindings.delete(item.id);
  await Promise.all([saveFixedFolders(), saveFixedItemTabBindings()]);
  setStatus('已关闭标签并从固定文件夹移除', true);
}

async function moveFixedEntryToFolder(entry, targetFolder) {
  if (!entry || !targetFolder || entry.folder.id === targetFolder.id) return;
  entry.folder.items = entry.folder.items.filter((item) => item.id !== entry.item.id);
  for (const folder of fixedFolders) {
    folder.items = folder.items.filter((item) => {
      const keep = item.id === entry.item.id || item.url !== entry.item.url;
      if (!keep) fixedItemTabBindings.delete(item.id);
      return keep;
    });
  }
  targetFolder.items.push(entry.item);
  targetFolder.collapsed = false;
  await Promise.all([saveFixedFolders(), saveFixedItemTabBindings()]);
  setStatus(`已移动到“${targetFolder.name}”`);
}

async function reorderFixedEntry(folder, sourceItemId, targetItemId, placeAfter) {
  if (!folder || sourceItemId === targetItemId) return;
  const sourceIndex = folder.items.findIndex((item) => item.id === sourceItemId);
  if (sourceIndex < 0 || !folder.items.some((item) => item.id === targetItemId)) return;

  const [sourceItem] = folder.items.splice(sourceIndex, 1);
  const targetIndex = folder.items.findIndex((item) => item.id === targetItemId);
  folder.items.splice(targetIndex + (placeAfter ? 1 : 0), 0, sourceItem);
  await saveFixedFolders();
  setStatus('已调整固定文件夹中的标签顺序');
}

async function placeTabInTemporarySection(tab, kind) {
  if (!tab?.id) return;
  if (tab.pinned) await chrome.tabs.update(tab.id, { pinned: false });
  if (tab.groupId !== NO_GROUP) {
    try {
      await chrome.tabs.ungroup(tab.id);
    } catch {
      // The source Chrome group may have changed during the drag.
    }
  }
  if (kind === 'ungrouped') manualStandaloneTabIds.add(tab.id);
  else manualStandaloneTabIds.delete(tab.id);
  await saveManualStandaloneTabIds();
}

async function moveTabToTemporarySection(tab, kind) {
  await placeTabInTemporarySection(tab, kind);
  await refreshTabs({ preserveViewport: true });
  setStatus(kind === 'ungrouped' ? '已移到未分组标签' : '已移到对应网站分组');
}

async function restoreFixedEntryToTemporary(entry, kind) {
  if (!entry) return;
  const openedTab = await openSavedItem(entry.item, false);
  entry.folder.items = entry.folder.items.filter((item) => item.id !== entry.item.id);
  fixedItemTabBindings.delete(entry.item.id);
  await placeTabInTemporarySection(openedTab, kind);
  await Promise.all([
    saveFixedFolders({ renderAfter: false }),
    saveFixedItemTabBindings()
  ]);
  await refreshTabs({ preserveViewport: true });
  setStatus(kind === 'ungrouped' ? '已移回未分组标签' : '已移回对应网站分组');
}

async function restorePersistentPinToTemporary(pin, kind) {
  if (!pin || currentWindowId === undefined) return;
  let openTab = openTabForPin(pin);
  if (!openTab) {
    openTab = await chrome.tabs.create({ windowId: currentWindowId, url: pin.url, active: false });
  }
  await removePersistentPin(pin, { renderAfter: false });
  await placeTabInTemporarySection(openTab, kind);
  await refreshTabs({ preserveViewport: true });
  setStatus('已取消顶部固定并移回临时区域');
}

async function pinFixedEntry(entry) {
  if (!entry) return;
  const tab = await openSavedItem(entry.item, false);
  if (!tab) return;
  await addPersistentPin(tab);
  setStatus('已固定到顶部图标区');
}

async function dropCurrentDragIntoTemporary(kind) {
  const tab = draggedTab;
  const fixedEntry = draggedFixedEntry;
  const persistentPin = draggedPersistentPin;
  if (fixedEntry) {
    await restoreFixedEntryToTemporary(fixedEntry, kind);
  } else if (persistentPin) {
    await restorePersistentPinToTemporary(persistentPin, kind);
  } else if (tab) {
    await moveTabToTemporarySection(tab, kind);
  }
}

async function movePersistentPinToFolder(pin, targetFolder) {
  if (!pin || !targetFolder || !isSavableUrl(pin.url)) return;
  const openTab = openTabForPin(pin);
  for (const folder of fixedFolders) {
    folder.items = folder.items.filter((item) => {
      const keep = item.url !== pin.url;
      if (!keep) fixedItemTabBindings.delete(item.id);
      return keep;
    });
  }
  const item = {
    id: crypto.randomUUID(),
    url: pin.url,
    title: pin.title || pin.url,
    favIconUrl: pin.favIconUrl || ''
  };
  targetFolder.items.push(item);
  if (openTab?.id) fixedItemTabBindings.set(item.id, openTab.id);
  targetFolder.collapsed = false;
  await Promise.all([
    saveFixedFolders({ renderAfter: false }),
    saveFixedItemTabBindings()
  ]);
  await removePersistentPin(pin, { renderAfter: false });
  render();
  setStatus(`已取消顶部固定并移入“${targetFolder.name}”`);
}

async function duplicateTab(tab) {
  await chrome.runtime.sendMessage({
    type: 'allow-duplicate-once',
    windowId: tab.windowId,
    url: tab.url
  });
  const duplicatedTab = await chrome.tabs.duplicate(tab.id);
  if (duplicatedTab?.id) await chrome.tabs.update(duplicatedTab.id, { active: true });
  setStatus('已复制标签并保留副本');
}

function createFixedItemRow(folder, item) {
  const pendingTab = Number.isInteger(item.pendingTabId)
    ? tabs.find((tab) => tab.id === item.pendingTabId)
    : undefined;
  const boundTab = boundTabForFixedItem(item);
  const exactOpenTabs = isSavableUrl(item.url)
    ? tabs.filter((tab) => tab.url === item.url)
    : [];
  const openTabs = pendingTab
    ? [pendingTab]
    : boundTab
      ? [boundTab, ...exactOpenTabs.filter((tab) => tab.id !== boundTab.id)]
      : exactOpenTabs;
  const active = openTabs.some((tab) => tab.active);
  const representedTab = pendingTab
    || boundTab
    || openTabs.find((tab) => tab.active)
    || openTabs[0];
  const displayTitle = pendingTab?.title || boundTab?.title || item.title || '新标签页';
  const displayIcon = pendingTab?.favIconUrl || boundTab?.favIconUrl || item.favIconUrl;
  const row = document.createElement('article');
  row.className = 'fixed-item';
  row.draggable = true;
  row.classList.toggle('is-open', openTabs.length > 0);
  row.classList.toggle('is-active', active);
  row.classList.toggle('is-split-companion', isCurrentSplitCompanion(representedTab));
  row.classList.toggle('is-discarded', openTabs.length > 0 && openTabs.every((tab) => tab.discarded));
  row.classList.toggle('is-pending', Boolean(pendingTab));
  if (representedTab?.id) row.dataset.tabId = String(representedTab.id);

  const mainButton = document.createElement('button');
  mainButton.className = 'fixed-item-main';
  mainButton.type = 'button';
  mainButton.title = pendingTab
    ? '等待输入网址，打开页面后会自动保存到此文件夹'
    : openTabs.length > 0
      ? `切换到：${displayTitle}`
      : `重新打开：${displayTitle}`;

  const iconWrap = document.createElement('span');
  iconWrap.className = 'fixed-item-icon-wrap';
  if (displayIcon) {
    const icon = document.createElement('img');
    icon.className = 'fixed-item-icon';
    icon.src = displayIcon;
    icon.alt = '';
    icon.addEventListener('error', () => { icon.hidden = true; }, { once: true });
    iconWrap.append(icon);
  }

  const title = document.createElement('span');
  title.className = 'fixed-item-title';
  title.textContent = displayTitle;

  mainButton.append(iconWrap, title);
  if (openTabs.length > 1) {
    const duplicateState = document.createElement('span');
    duplicateState.className = 'fixed-item-state';
    duplicateState.textContent = `${openTabs.length}×`;
    duplicateState.title = `当前窗口已打开 ${openTabs.length} 份相同页面`;
    mainButton.append(duplicateState);
  }
  mainButton.addEventListener('click', () => openSavedItem(item).catch(handleError));
  mainButton.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    openSavedContextMenu(folder, item, representedTab, event.clientX, event.clientY);
  });
  row.addEventListener('dragstart', (event) => {
    draggedTab = undefined;
    draggedPersistentPin = undefined;
    draggedFixedEntry = { folder, item };
    draggedSectionId = `fixed-folder-${folder.id}`;
    row.classList.add('is-dragging');
    setPinnedDropZoneVisible(true);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', item.id);
  });
  row.addEventListener('dragend', () => {
    row.classList.remove('is-dragging');
    clearDragState();
  });
  row.addEventListener('dragover', (event) => {
    const source = draggedFixedEntry;
    if (!source || source.folder.id !== folder.id || source.item.id === item.id) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    const placeAfter = event.clientY >= row.getBoundingClientRect().top + row.offsetHeight / 2;
    row.classList.toggle('is-drop-before', !placeAfter);
    row.classList.toggle('is-drop-after', placeAfter);
  });
  row.addEventListener('dragleave', (event) => {
    if (!row.contains(event.relatedTarget)) row.classList.remove('is-drop-before', 'is-drop-after');
  });
  row.addEventListener('drop', (event) => {
    const source = draggedFixedEntry;
    if (!source || source.folder.id !== folder.id || source.item.id === item.id) return;
    event.preventDefault();
    event.stopPropagation();
    const placeAfter = row.classList.contains('is-drop-after');
    row.classList.remove('is-drop-before', 'is-drop-after');
    reorderFixedEntry(folder, source.item.id, item.id, placeAfter).catch(handleError);
  });
  row.append(mainButton);
  if (splitViewIdForTab(representedTab) !== undefined) {
    row.classList.add('has-split-view');
    row.append(createSplitViewIndicator(representedTab));
  }
  const closeTarget = openTabs.find((tab) => tab.active) || openTabs[0];
  if (closeTarget) {
    const closeButton = document.createElement('button');
    closeButton.className = 'fixed-item-close';
    closeButton.type = 'button';
    closeButton.textContent = '×';
    closeButton.title = `关闭并移出固定文件夹：${displayTitle}`;
    closeButton.setAttribute('aria-label', closeButton.title);
    closeButton.addEventListener('click', (event) => {
      event.stopPropagation();
      closeAndRemoveFixedItem(folder, item, closeTarget).catch(handleError);
    });
    row.append(closeButton);
  }
  return row;
}

function createFixedFolderElement(folder) {
  const section = document.createElement('section');
  section.className = 'fixed-folder';

  const headerRow = document.createElement('div');
  headerRow.className = 'fixed-folder-header-row';

  const header = document.createElement('button');
  header.className = 'fixed-folder-header';
  header.type = 'button';
  header.setAttribute('aria-expanded', String(!folder.collapsed));

  const chevron = createChevronIcon(!folder.collapsed);
  const icon = createFolderStateIcon(!folder.collapsed);

  const title = document.createElement('span');
  title.className = 'fixed-folder-title';
  title.textContent = folder.name;

  const count = document.createElement('span');
  count.className = 'section-count';
  count.textContent = String(folder.items.length);

  const currentSplitViewId = activeSplitViewId();
  const collapsedSplitTab = folder.collapsed && currentSplitViewId !== undefined
    ? folder.items
      .map((item) => (
        Number.isInteger(item.pendingTabId)
          ? tabs.find((tab) => tab.id === item.pendingTabId)
          : boundTabForFixedItem(item)
      ))
      .find((tab) => splitViewIdForTab(tab) === currentSplitViewId)
    : undefined;

  header.append(chevron, icon, title);
  if (collapsedSplitTab) {
    header.classList.add('has-split-state');
    header.append(createSplitViewIndicator(collapsedSplitTab, { interactive: false }));
  }
  header.append(count);
  header.addEventListener('click', () => {
    folder.collapsed = !folder.collapsed;
    saveFixedFolders().catch(handleError);
  });
  header.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    openFolderContextMenu(folder, event.clientX, event.clientY);
  });
  headerRow.append(header);
  section.append(headerRow);

  section.addEventListener('dragover', (event) => {
    const acceptsTab = draggedTab && isSavableUrl(draggedTab.url);
    const acceptsFixedEntry = draggedFixedEntry && draggedFixedEntry.folder.id !== folder.id;
    const acceptsPersistentPin = draggedPersistentPin && isSavableUrl(draggedPersistentPin.url);
    if (!acceptsTab && !acceptsFixedEntry && !acceptsPersistentPin) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    section.classList.add('is-drop-target');
  });
  section.addEventListener('dragleave', (event) => {
    if (!section.contains(event.relatedTarget)) section.classList.remove('is-drop-target');
  });
  section.addEventListener('drop', (event) => {
    event.preventDefault();
    event.stopPropagation();
    section.classList.remove('is-drop-target');
    const tab = draggedTab;
    const fixedEntry = draggedFixedEntry;
    const persistentPin = draggedPersistentPin;
    if (tab && isSavableUrl(tab.url)) {
      addTabToFolder(tab, folder.id).catch(handleError);
    } else if (fixedEntry && fixedEntry.folder.id !== folder.id) {
      moveFixedEntryToFolder(fixedEntry, folder).catch(handleError);
    } else if (persistentPin) {
      movePersistentPinToFolder(persistentPin, folder).catch(handleError);
    }
  });

  if (!folder.collapsed) {
    const items = document.createElement('div');
    items.className = 'fixed-folder-items';
    if (folder.items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'fixed-folder-empty';
      empty.textContent = '右键文件夹可在组内新建标签页';
      items.append(empty);
    } else {
      for (const item of folder.items) items.append(createFixedItemRow(folder, item));
    }
    section.append(items);
  }

  return section;
}

function renderFixedFolders() {
  fixedFolderCount.textContent = String(fixedFolders.length);
  fixedAreaToggle.setAttribute('aria-expanded', String(!fixedAreaCollapsed));
  fixedAreaChevron.replaceChildren(createChevronIcon(!fixedAreaCollapsed));
  fixedFolderList.hidden = fixedAreaCollapsed;
  fixedFolderList.replaceChildren();
  if (fixedAreaCollapsed) return;

  if (fixedFolders.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'fixed-area-empty';
    empty.textContent = '点击右侧 ＋ 创建第一个固定文件夹';
    fixedFolderList.append(empty);
    return;
  }

  for (const folder of fixedFolders) fixedFolderList.append(createFixedFolderElement(folder));
}

function createPinnedTab(pin) {
  const tile = pinnedTemplate.content.firstElementChild.cloneNode(true);
  const mainButton = tile.querySelector('.pinned-main');
  const favicon = tile.querySelector('.pinned-favicon');
  const fallback = tile.querySelector('.pinned-fallback');
  const openTab = openTabForPin(pin);
  const displayTitle = openTab?.title || pin.title || pin.url;
  const displayIcon = openTab?.favIconUrl || pin.favIconUrl;

  tile.dataset.pinId = pin.id;
  if (openTab?.id) tile.dataset.tabId = String(openTab.id);
  tile.classList.toggle('is-active', Boolean(openTab?.active));
  tile.classList.toggle('is-split-companion', isCurrentSplitCompanion(openTab));
  tile.classList.toggle('is-audible', Boolean(openTab?.audible && !openTab.mutedInfo?.muted));
  tile.classList.toggle('is-closed', !openTab);
  tile.classList.toggle('is-discarded', Boolean(openTab?.discarded));
  fallback.textContent = displayTitle.trim().charAt(0).toLocaleUpperCase();

  if (displayIcon) {
    favicon.addEventListener('load', () => { fallback.hidden = true; }, { once: true });
    favicon.addEventListener('error', () => { favicon.hidden = true; }, { once: true });
    favicon.src = displayIcon;
  } else {
    favicon.hidden = true;
  }

  mainButton.title = openTab ? displayTitle : `${displayTitle}（点击打开）`;
  mainButton.setAttribute('aria-label', openTab ? `切换到：${displayTitle}` : `打开：${displayTitle}`);
  mainButton.addEventListener('click', () => openPersistentPin(pin).catch(handleError));
  mainButton.addEventListener('auxclick', (event) => {
    if (event.button !== 1) return;
    event.preventDefault();
    if (openTab) closeTabs([openTab]).catch(handleError);
  });

  tile.addEventListener('dragstart', (event) => {
    draggedTab = undefined;
    draggedFixedEntry = undefined;
    draggedPersistentPin = pin;
    draggedSectionId = 'persistent-pins';
    tile.classList.add('is-dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', pin.id);
  });
  tile.addEventListener('dragend', () => {
    tile.classList.remove('is-dragging');
    clearDragState();
  });
  tile.addEventListener('dragover', (event) => {
    if (!draggedPersistentPin) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    tile.classList.add('is-drop-target');
  });
  tile.addEventListener('dragleave', () => tile.classList.remove('is-drop-target'));
  tile.addEventListener('drop', (event) => {
    if (!draggedPersistentPin) return;
    event.preventDefault();
    event.stopPropagation();
    tile.classList.remove('is-drop-target');
    if (draggedPersistentPin.id === pin.id) return;
    movePersistentPin(draggedPersistentPin.id, pin.id).catch(handleError);
  });
  tile.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    openPinContextMenu(pin, openTab, event.clientX, event.clientY);
  });

  if (splitViewIdForTab(openTab) !== undefined) {
    tile.append(createSplitViewIndicator(openTab));
  }

  return tile;
}

function renderPinnedTabs(pins) {
  pinnedStrip.replaceChildren();
  const acceptingDrag = Boolean(draggedTab || draggedFixedEntry);
  pinnedStrip.hidden = pins.length === 0 && !acceptingDrag;
  pinnedStrip.classList.toggle('is-drop-ready', acceptingDrag);
  for (const pin of pins) pinnedStrip.append(createPinnedTab(pin));
}

function createSection({ title, sectionId, sectionTabs, collapsed, color, markerUrl, kind, siteKey, onToggle, onContextMenu }) {
  const section = document.createElement('section');
  section.className = `tab-section${kind ? ` ${kind}-section` : ''}`;
  section.dataset.sectionId = sectionId;

  const headerRow = document.createElement('div');
  headerRow.className = 'section-header-row';

  const header = document.createElement('button');
  header.className = 'section-header';
  header.type = 'button';
  header.setAttribute('aria-expanded', String(!collapsed));
  header.classList.toggle('is-static', !onToggle);
  header.disabled = !onToggle;

  const chevron = createChevronIcon(!collapsed);

  const marker = document.createElement('span');
  marker.className = `section-marker${color ? ` group-${color}` : ''}`;
  marker.title = color ? `${colorLabels[color] || color}标签组` : '';
  if (markerUrl) {
    const markerImage = document.createElement('img');
    markerImage.src = markerUrl;
    markerImage.alt = '';
    markerImage.addEventListener('error', () => { markerImage.hidden = true; }, { once: true });
    marker.append(markerImage);
  }

  const label = document.createElement('span');
  label.className = 'section-title';
  label.textContent = title;

  const sectionCount = document.createElement('span');
  sectionCount.className = 'section-count';
  sectionCount.textContent = String(sectionTabs.length);

  const currentSplitViewId = activeSplitViewId();
  const collapsedSplitTab = collapsed && currentSplitViewId !== undefined
    ? sectionTabs.find((tab) => splitViewIdForTab(tab) === currentSplitViewId)
    : undefined;

  header.append(chevron, marker, label);
  if (collapsedSplitTab) {
    header.classList.add('has-split-state');
    header.append(createSplitViewIndicator(collapsedSplitTab, { interactive: false }));
  }
  header.append(sectionCount);
  if (onToggle) header.addEventListener('click', onToggle);
  if (onContextMenu) {
    header.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      onContextMenu(event);
    });
  }
  headerRow.append(header);
  if (kind === 'site') {
    const closeGroupButton = document.createElement('button');
    closeGroupButton.className = 'site-group-close';
    closeGroupButton.type = 'button';
    closeGroupButton.textContent = '×';
    closeGroupButton.title = `关闭 ${title} 的全部 ${sectionTabs.length} 个临时标签`;
    closeGroupButton.setAttribute('aria-label', closeGroupButton.title);
    closeGroupButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeTabs(sectionTabs).catch(handleError);
    });
    headerRow.append(closeGroupButton);
  }
  section.append(headerRow);

  if (kind === 'site' || kind === 'ungrouped') {
    section.addEventListener('dragover', (event) => {
      const url = currentDraggedUrl();
      if (!url || !canDropIntoTemporarySection(kind, siteKey, url)) return;
      if (!draggedTab && !draggedFixedEntry && !draggedPersistentPin) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      section.classList.add('is-drop-target');
    });
    section.addEventListener('dragleave', (event) => {
      if (!section.contains(event.relatedTarget)) section.classList.remove('is-drop-target');
    });
    section.addEventListener('drop', (event) => {
      const url = currentDraggedUrl();
      if (!url || !canDropIntoTemporarySection(kind, siteKey, url)) return;
      event.preventDefault();
      event.stopPropagation();
      section.classList.remove('is-drop-target');
      const tab = draggedTab;
      const fixedEntry = draggedFixedEntry;
      const persistentPin = draggedPersistentPin;
      if (fixedEntry) {
        restoreFixedEntryToTemporary(fixedEntry, kind).catch(handleError);
      } else if (persistentPin) {
        restorePersistentPinToTemporary(persistentPin, kind).catch(handleError);
      } else if (tab) {
        moveTabToTemporarySection(tab, kind).catch(handleError);
      }
    });
  }

  if (!collapsed) {
    const rows = document.createElement('div');
    rows.className = 'section-rows';
    for (const tab of sectionTabs) rows.append(createTabRow(tab, sectionId));
    section.append(rows);
  }

  return section;
}

function createBadge(text, className, title) {
  const badge = document.createElement('span');
  badge.className = `state-badge ${className}`;
  badge.textContent = text;
  badge.title = title;
  return badge;
}

function createTabRow(tab, sectionId) {
  const row = rowTemplate.content.firstElementChild.cloneNode(true);
  const mainButton = row.querySelector('.tab-main');
  const closeButton = row.querySelector('.close-button');
  const pinButton = row.querySelector('.pin-button');
  const audioButton = row.querySelector('.audio-button');
  const favicon = row.querySelector('.favicon');
  const badges = row.querySelector('.state-badges');

  row.dataset.tabId = String(tab.id);
  row.dataset.sectionId = sectionId;
  row.classList.toggle('is-active', Boolean(tab.active));
  row.classList.toggle('is-split-companion', isCurrentSplitCompanion(tab));
  row.classList.toggle('is-discarded', Boolean(tab.discarded));
  row.querySelector('.tab-title').textContent = tab.title || '无标题标签页';

  if (tab.favIconUrl) {
    favicon.src = tab.favIconUrl;
    favicon.addEventListener('error', () => { favicon.hidden = true; }, { once: true });
  } else {
    favicon.hidden = true;
  }

  const duplicateCopies = duplicateCountsByUrl.get(tab.url) || 0;
  if (duplicateCopies > 1) {
    badges.append(createBadge(
      `${duplicateCopies}×`,
      'duplicate-badge',
      `这个完整网址在当前窗口共有 ${duplicateCopies} 份`
    ));
  }
  if (tab.mutedInfo?.muted) badges.append(createBadge('静', 'muted-badge', '已静音'));
  if (splitViewIdForTab(tab) !== undefined) {
    badges.append(createSplitViewIndicator(tab));
  }

  mainButton.title = `切换到：${tab.title || '无标题标签页'}`;
  mainButton.addEventListener('click', () => {
    chrome.tabs.update(tab.id, { active: true }).catch(handleError);
  });
  mainButton.addEventListener('auxclick', async (event) => {
    if (event.button !== 1) return;
    event.preventDefault();
    await closeTabs([tab]).catch(handleError);
  });

  const persistentlyPinned = isPersistentlyPinned(tab.url);
  pinButton.textContent = '⌖';
  pinButton.classList.toggle('is-on', persistentlyPinned);
  pinButton.title = persistentlyPinned ? '取消永久固定' : '永久固定';
  pinButton.setAttribute('aria-label', pinButton.title);
  pinButton.addEventListener('click', () => togglePersistentPin(tab).catch(handleError));

  if (tab.audible || tab.mutedInfo?.muted) {
    audioButton.hidden = false;
    audioButton.textContent = tab.mutedInfo?.muted ? '×♪' : '♪';
    audioButton.title = tab.mutedInfo?.muted ? '取消静音' : '静音';
    audioButton.setAttribute('aria-label', audioButton.title);
    audioButton.addEventListener('click', () => {
      chrome.tabs.update(tab.id, { muted: !tab.mutedInfo?.muted }).catch(handleError);
    });
  }

  closeButton.setAttribute('aria-label', `关闭：${tab.title || '无标题标签页'}`);
  closeButton.addEventListener('click', () => closeTabs([tab]).catch(handleError));

  row.addEventListener('dragstart', (event) => {
    draggedFixedEntry = undefined;
    draggedPersistentPin = undefined;
    draggedTab = tab;
    draggedSectionId = sectionId;
    row.classList.add('is-dragging');
    setPinnedDropZoneVisible(true);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(tab.id));
  });
  row.addEventListener('dragend', () => {
    row.classList.remove('is-dragging');
    clearDragState();
  });
  row.addEventListener('dragover', (event) => {
    if (!draggedTab || draggedSectionId !== sectionId || draggedTab.groupId !== tab.groupId || draggedTab.pinned !== tab.pinned) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    row.classList.add('is-drop-target');
  });
  row.addEventListener('dragleave', () => row.classList.remove('is-drop-target'));
  row.addEventListener('drop', async (event) => {
    const canReorder = draggedTab
      && draggedTab.id !== tab.id
      && draggedSectionId === sectionId
      && draggedTab.groupId === tab.groupId
      && draggedTab.pinned === tab.pinned;
    if (!canReorder) return;
    event.preventDefault();
    event.stopPropagation();
    row.classList.remove('is-drop-target');
    await chrome.tabs.move(draggedTab.id, { index: tab.index }).catch(handleError);
  });
  row.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    openContextMenu(tab, event.clientX, event.clientY);
  });

  return row;
}

function renderSearchResults(query) {
  const results = tabs.filter((tab) => matchesQuery(tab, query));
  if (results.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<strong>没有匹配的标签</strong><span>试试网页标题或网站名称</span>';
    listElement.append(empty);
    return;
  }

  listElement.append(createSection({
    title: '搜索结果',
    sectionId: 'search',
    sectionTabs: results,
    collapsed: false,
    onToggle: null
  }));
}

function settleViewport({ preserveViewport, revealActive, scrollTop }) {
  requestAnimationFrame(() => {
    if (preserveViewport) {
      window.scrollTo({ top: scrollTop, left: 0, behavior: 'auto' });
    } else if (revealActive) {
      document.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' });
    }
    scheduleNewTabPlacement();
  });
}

function updateNewTabPlacement() {
  newTabPlacementFrame = undefined;
  if (newTabSlot.hidden || newTabButton.hidden) {
    newTabIsFloating = false;
    newTabButton.classList.remove('is-floating');
    return;
  }

  // Judge from the slot's stable document position. The fixed button itself
  // must not alter the measurement that decides whether it should float.
  const slotRect = newTabSlot.getBoundingClientRect();
  const naturalSlotBottom = slotRect.top + window.scrollY + slotRect.height;
  const availableBottom = utilityBar.getBoundingClientRect().top;
  const enterThreshold = availableBottom - 4;
  const exitThreshold = availableBottom - 18;

  if (newTabIsFloating) {
    newTabIsFloating = naturalSlotBottom > exitThreshold;
  } else {
    newTabIsFloating = naturalSlotBottom > enterThreshold;
  }
  newTabButton.classList.toggle('is-floating', newTabIsFloating);
}

function scheduleNewTabPlacement() {
  if (newTabPlacementFrame !== undefined) cancelAnimationFrame(newTabPlacementFrame);
  newTabPlacementFrame = requestAnimationFrame(updateNewTabPlacement);
}

function render({ preserveViewport = false, revealActive = false } = {}) {
  const scrollTop = window.scrollY;
  closeContextMenu();
  const query = searchInput.value.trim().toLocaleLowerCase();
  listElement.replaceChildren();
  countElement.textContent = String(tabs.length);
  countElement.closest('.tab-summary')
    ?.setAttribute('aria-label', `当前共打开 ${tabs.length} 个标签页`);
  duplicateCountsByUrl = duplicateUrlCounts();

  const duplicateCount = removableDuplicates().length;
  duplicateCountElement.textContent = String(duplicateCount);
  duplicateCountElement.hidden = duplicateCount === 0;
  duplicateButton.title = duplicateCount === 0
    ? '暂无可清理的重复标签'
    : `清理 ${duplicateCount} 个重复标签；保留当前、固定或最早打开的标签`;
  duplicateButton.setAttribute('aria-label', duplicateButton.title);
  duplicateButton.disabled = duplicateCount === 0;

  fixedArea.hidden = Boolean(query);
  newTabSlot.hidden = Boolean(query);
  newTabButton.hidden = Boolean(query);

  if (query) {
    pinnedStrip.hidden = true;
    renderSearchResults(query);
    settleViewport({ preserveViewport, revealActive, scrollTop });
    return;
  }

  renderFixedFolders();
  const pendingFolderTabIds = fixedFolderPendingTabIdSet();
  const boundFolderTabIds = fixedItemBoundTabIdSet();

  // Persistent pins and saved folder entries are independent views. A URL may
  // intentionally appear in both places, including while its real tab is closed.
  renderPinnedTabs(persistentPins);

  const groupsByFirstTab = tabGroups
    .map((group) => {
      const allGroupTabs = tabs.filter((tab) => !tab.pinned && tab.groupId === group.id);
      return {
        group,
        allGroupTabs,
        // Native Chrome groups remain fully visible even when the same pages
        // are also saved in an extension-owned fixed folder.
        groupTabs: allGroupTabs.filter((tab) => !boundFolderTabIds.has(tab.id))
      };
    })
    .filter(({ groupTabs }) => groupTabs.length > 0)
    .sort((a, b) => a.groupTabs[0].index - b.groupTabs[0].index);

  for (const { group, groupTabs, allGroupTabs } of groupsByFirstTab) {
    listElement.append(createSection({
      title: group.title || '未命名标签组',
      sectionId: `group-${group.id}`,
      sectionTabs: groupTabs,
      collapsed: group.collapsed,
      color: group.color,
      kind: 'native',
      onToggle: () => {
        chrome.tabGroups.update(group.id, { collapsed: !group.collapsed }).catch(handleError);
      },
      onContextMenu: (event) => {
        openNativeGroupContextMenu(group, allGroupTabs, event.clientX, event.clientY);
      }
    }));
  }

  const ungroupedTabs = tabs.filter((tab) => (
    !tab.pinned
    && tab.groupId === NO_GROUP
    && !pendingFolderTabIds.has(tab.id)
    && !boundFolderTabIds.has(tab.id)
  ));
  const { websiteGroups, standaloneTabs } = collectWebsiteGroups(ungroupedTabs);

  for (const websiteGroup of websiteGroups) {
    const sectionId = `site-${websiteGroup.key}`;
    listElement.append(createSection({
      title: websiteGroup.label,
      sectionId,
      sectionTabs: websiteGroup.tabs,
      collapsed: collapsedSiteGroups.has(websiteGroup.key),
      markerUrl: websiteGroup.tabs.find((tab) => tab.favIconUrl)?.favIconUrl,
      kind: 'site',
      siteKey: websiteGroup.key,
      onToggle: () => {
        if (collapsedSiteGroups.has(websiteGroup.key)) {
          collapsedSiteGroups.delete(websiteGroup.key);
        } else {
          collapsedSiteGroups.add(websiteGroup.key);
        }
        render();
      }
    }));
  }

  if (standaloneTabs.length > 0) {
    listElement.append(createSection({
      title: '未分组',
      sectionId: 'ungrouped',
      sectionTabs: standaloneTabs,
      collapsed: ungroupedCollapsed,
      kind: 'ungrouped',
      onToggle: () => {
        ungroupedCollapsed = !ungroupedCollapsed;
        render();
      }
    }));
  }

  if (tabs.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<strong>这个窗口还没有标签</strong><span>新建标签后会自动显示在这里</span>';
    listElement.append(empty);
  }

  settleViewport({ preserveViewport, revealActive, scrollTop });
}

async function refreshTabs(renderOptions) {
  const queriedTabs = await chrome.tabs.query({ currentWindow: true });
  queriedTabs.sort((a, b) => a.index - b.index);
  tabs = queriedTabs;
  const currentTabIds = new Set(tabs.map((tab) => tab.id));
  let manualStandaloneChanged = false;
  for (const tabId of manualStandaloneTabIds) {
    if (!currentTabIds.has(tabId)) {
      manualStandaloneTabIds.delete(tabId);
      manualStandaloneChanged = true;
    }
  }
  if (manualStandaloneChanged) await saveManualStandaloneTabIds();
  currentWindowId = tabs[0]?.windowId;
  tabGroups = currentWindowId === undefined
    ? []
    : await chrome.tabGroups.query({ windowId: currentWindowId });
  if (mergeChromePinnedTabs()) {
    await savePersistentPins({ renderAfter: false });
  }
  if (reconcilePendingFolderItems()) {
    await saveFixedFolders({ renderAfter: false });
  }
  await reconcileFixedItemTabBindings();
  render(renderOptions);
}

function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    // Browser tab events should update state without moving the user's sidebar viewport.
    refreshTabs({ preserveViewport: true }).catch(handleError);
  }, 40);
}

function handleError(error) {
  console.error(error);
  setStatus('操作没有完成，请重新加载扩展后再试。');
}

async function closeTabs(tabsToClose) {
  lastClosedTabs = tabsToClose.map((tab) => ({
    url: tab.url,
    index: tab.index,
    pinned: tab.pinned,
    muted: Boolean(tab.mutedInfo?.muted),
    groupId: tab.groupId
  }));
  await chrome.tabs.remove(tabsToClose.map((tab) => tab.id));
  setStatus(`已关闭 ${tabsToClose.length} 个标签`, true);
}

async function restoreLastClosed() {
  if (lastClosedTabs.length === 0 || currentWindowId === undefined) return;
  const restored = [...lastClosedTabs].sort((a, b) => a.index - b.index);
  lastClosedTabs = [];
  undoButton.hidden = true;

  for (const closedTab of restored) {
    if (!closedTab.url) continue;
    await chrome.runtime.sendMessage({
      type: 'allow-duplicate-once',
      windowId: currentWindowId,
      url: closedTab.url
    });
    const restoredTab = await chrome.tabs.create({
      windowId: currentWindowId,
      url: closedTab.url,
      active: false,
      pinned: closedTab.pinned,
      index: closedTab.index
    });
    if (closedTab.muted) await chrome.tabs.update(restoredTab.id, { muted: true });
    if (!closedTab.pinned && closedTab.groupId !== NO_GROUP) {
      try {
        await chrome.tabs.group({ tabIds: restoredTab.id, groupId: closedTab.groupId });
      } catch {
        // The original group may no longer exist; keep the restored tab ungrouped.
      }
    }
  }

  setStatus(`已恢复 ${restored.length} 个标签`);
}

pinnedStrip.addEventListener('dragover', (event) => {
  const acceptsTab = draggedTab && isSavableUrl(draggedTab.url);
  const acceptsFixedEntry = draggedFixedEntry && isSavableUrl(draggedFixedEntry.item.url);
  if (!acceptsTab && !acceptsFixedEntry) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  pinnedStrip.classList.add('is-drop-target');
});
pinnedStrip.addEventListener('dragleave', (event) => {
  if (!pinnedStrip.contains(event.relatedTarget)) pinnedStrip.classList.remove('is-drop-target');
});
pinnedStrip.addEventListener('drop', (event) => {
  const tab = draggedTab;
  const fixedEntry = draggedFixedEntry;
  if (!tab && !fixedEntry) return;
  event.preventDefault();
  pinnedStrip.classList.remove('is-drop-target');
  if (tab) {
    addPersistentPin(tab).then(() => setStatus('已固定到顶部图标区')).catch(handleError);
  } else {
    pinFixedEntry(fixedEntry).catch(handleError);
  }
});

newTabButton.addEventListener('dragover', (event) => {
  if (!currentDraggedUrl() || (!draggedTab && !draggedFixedEntry && !draggedPersistentPin)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  newTabButton.classList.add('is-drop-target');
});
newTabButton.addEventListener('dragleave', () => newTabButton.classList.remove('is-drop-target'));
newTabButton.addEventListener('drop', (event) => {
  if (!currentDraggedUrl()) return;
  event.preventDefault();
  newTabButton.classList.remove('is-drop-target');
  dropCurrentDragIntoTemporary('ungrouped').catch(handleError);
});

searchInput.addEventListener('input', render);
searchToggle.addEventListener('click', () => setSearchOpen(searchPanel.hidden));
searchCloseButton.addEventListener('click', () => setSearchOpen(false));
themeToggle.addEventListener('click', () => setThemeMenuOpen(themeMenu.hidden));
for (const option of themeOptions) {
  option.addEventListener('click', () => {
    const nextPreference = normalizeThemePreference(option.dataset.themeValue);
    saveThemePreference(nextPreference).catch(handleError);
    closeThemeMenu();
    const statusLabels = {
      system: '主题已设为跟随系统',
      light: '已切换为浅色主题',
      dark: '已切换为深色主题'
    };
    setStatus(statusLabels[nextPreference]);
  });
}

SYSTEM_THEME_QUERY.addEventListener('change', () => {
  if (currentThemePreference === 'system') applyThemePreference('system');
});
helpToggle.addEventListener('click', () => {
  const open = helpPanel.hidden;
  helpPanel.hidden = !open;
  helpToggle.classList.toggle('is-on', open);
  if (open) {
    closeThemeMenu();
    setSearchOpen(false);
  }
});
undoButton.addEventListener('click', () => restoreLastClosed().catch(handleError));
newTabButton.addEventListener('click', () => {
  const createProperties = { active: true };
  if (Number.isInteger(currentWindowId)) createProperties.windowId = currentWindowId;
  chrome.tabs.create(createProperties).catch(handleError);
});

contextDuplicateButton.addEventListener('click', () => {
  const tab = contextMenuTab;
  closeContextMenu();
  if (tab) duplicateTab(tab).catch(handleError);
});
contextAddFolderButton.addEventListener('click', () => {
  const tab = contextMenuTab;
  closeContextMenu();
  if (tab) openFolderPicker(tab);
});
contextPinButton.addEventListener('click', () => {
  const tab = contextMenuTab;
  closeContextMenu();
  if (tab) togglePersistentPin(tab).catch(handleError);
});
contextMuteButton.addEventListener('click', () => {
  const tab = contextMenuTab;
  closeContextMenu();
  if (tab) chrome.tabs.update(tab.id, { muted: !tab.mutedInfo?.muted }).catch(handleError);
});
contextCloseButton.addEventListener('click', () => {
  const tab = contextMenuTab;
  closeContextMenu();
  if (tab) closeTabs([tab]).catch(handleError);
});

nativeGroupToggleButton.addEventListener('click', () => {
  const entry = contextMenuNativeGroup;
  closeContextMenu();
  if (entry) {
    chrome.tabGroups.update(entry.group.id, { collapsed: !entry.group.collapsed }).catch(handleError);
  }
});
nativeGroupNewTabButton.addEventListener('click', () => {
  const entry = contextMenuNativeGroup;
  closeContextMenu();
  if (entry) createTabInNativeGroup(entry.group).catch(handleError);
});
nativeGroupSaveCustomButton.addEventListener('click', () => {
  const entry = contextMenuNativeGroup;
  closeContextMenu();
  if (entry) saveNativeGroupAsFixedFolder(entry.group, entry.groupTabs).catch(handleError);
});

folderNewTabButton.addEventListener('click', () => {
  const folder = contextMenuFolder;
  closeContextMenu();
  if (folder) createNewTabInFixedFolder(folder).catch(handleError);
});
folderOpenAllButton.addEventListener('click', () => {
  const folder = contextMenuFolder;
  closeContextMenu();
  if (folder) openAllFolder(folder).catch(handleError);
});
folderRenameButton.addEventListener('click', () => {
  const folder = contextMenuFolder;
  closeContextMenu();
  if (!folder) return;
  const name = askForFolderName(folder.name);
  if (!name || name === folder.name) return;
  folder.name = name;
  saveFixedFolders().catch(handleError);
});
folderDeleteButton.addEventListener('click', () => {
  const folder = contextMenuFolder;
  closeContextMenu();
  if (!folder || !window.confirm(`删除固定文件夹“${folder.name}”？\n正在打开的标签不会关闭。`)) return;
  for (const item of folder.items) fixedItemTabBindings.delete(item.id);
  fixedFolders = fixedFolders.filter((candidate) => candidate.id !== folder.id);
  Promise.all([saveFixedFolders(), saveFixedItemTabBindings()]).catch(handleError);
});

savedOpenButton.addEventListener('click', () => {
  const saved = contextMenuSavedItem;
  closeContextMenu();
  if (saved) openSavedItem(saved.item).catch(handleError);
});
savedDuplicateButton.addEventListener('click', () => {
  const saved = contextMenuSavedItem;
  closeContextMenu();
  if (saved?.tab) duplicateTab(saved.tab).catch(handleError);
});
savedPinButton.addEventListener('click', () => {
  const saved = contextMenuSavedItem;
  closeContextMenu();
  if (saved) togglePersistentPinForSavedItem(saved.item, saved.tab).catch(handleError);
});
savedMuteButton.addEventListener('click', () => {
  const saved = contextMenuSavedItem;
  closeContextMenu();
  if (saved?.tab) {
    chrome.tabs.update(saved.tab.id, { muted: !saved.tab.mutedInfo?.muted }).catch(handleError);
  }
});
savedCloseButton.addEventListener('click', () => {
  const saved = contextMenuSavedItem;
  closeContextMenu();
  if (saved?.tab) closeAndRemoveFixedItem(saved.folder, saved.item, saved.tab).catch(handleError);
});
savedRemoveButton.addEventListener('click', () => {
  const saved = contextMenuSavedItem;
  closeContextMenu();
  if (saved) removeSavedItem(saved.folder.id, saved.item.id).catch(handleError);
});

pinOpenButton.addEventListener('click', () => {
  const entry = contextMenuPin;
  closeContextMenu();
  if (entry) openPersistentPin(entry.pin).catch(handleError);
});
pinCloseTabButton.addEventListener('click', () => {
  const entry = contextMenuPin;
  closeContextMenu();
  if (entry?.openTab) closeTabs([entry.openTab]).catch(handleError);
});
pinRemoveButton.addEventListener('click', () => {
  const entry = contextMenuPin;
  closeContextMenu();
  if (entry) removePersistentPin(entry.pin).catch(handleError);
});

fixedAreaToggle.addEventListener('click', () => {
  fixedAreaCollapsed = !fixedAreaCollapsed;
  renderFixedFolders();
});
fixedAreaAdd.addEventListener('click', () => {
  const name = askForFolderName();
  if (name) createFixedFolder(name).catch(handleError);
});

folderCreateOption.addEventListener('click', async () => {
  const tab = folderPickerTab;
  const name = askForFolderName();
  if (!name) return;
  const folder = await createFixedFolder(name);
  if (tab) await addTabToFolder(tab, folder.id);
});
folderPickerCancel.addEventListener('click', closeFolderPicker);
folderPicker.addEventListener('pointerdown', (event) => {
  if (event.target === folderPicker) closeFolderPicker();
});

document.addEventListener('pointerdown', (event) => {
  const clickedInsideMenu = contextMenu.contains(event.target)
    || nativeGroupContextMenu.contains(event.target)
    || folderContextMenu.contains(event.target)
    || savedContextMenu.contains(event.target)
    || pinContextMenu.contains(event.target);
  const menuIsOpen = !contextMenu.hidden
    || !nativeGroupContextMenu.hidden
    || !folderContextMenu.hidden
    || !savedContextMenu.hidden
    || !pinContextMenu.hidden;
  if (menuIsOpen && !clickedInsideMenu) closeContextMenu();
  const clickedInsideTheme = themeMenu.contains(event.target) || themeToggle.contains(event.target);
  if (!themeMenu.hidden && !clickedInsideTheme) closeThemeMenu();
});
window.addEventListener('blur', () => {
  closeContextMenu();
  closeThemeMenu();
});
window.addEventListener('resize', () => {
  closeContextMenu();
  scheduleNewTabPlacement();
});
window.addEventListener('scroll', () => {
  closeContextMenu();
  closeThemeMenu();
}, true);

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'duplicate-reused') {
    setStatus('已切换到当前窗口中打开的相同标签');
  }
});

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'k') {
    event.preventDefault();
    setSearchOpen(true);
    searchInput.select();
  }
  if (event.key === 'Escape') {
    closeContextMenu();
    closeThemeMenu();
    closeFolderPicker();
    if (!searchPanel.hidden) setSearchOpen(false);
    helpPanel.hidden = true;
    helpToggle.classList.remove('is-on');
  }
});

duplicateButton.addEventListener('click', async () => {
  const duplicates = removableDuplicates();
  if (duplicates.length === 0) return;
  await closeTabs(duplicates);
});

chrome.tabs.onCreated.addListener(scheduleRefresh);
chrome.tabs.onRemoved.addListener(scheduleRefresh);
chrome.tabs.onUpdated.addListener(scheduleRefresh);
chrome.tabs.onActivated.addListener(scheduleRefresh);
chrome.tabs.onMoved.addListener(scheduleRefresh);
chrome.tabs.onAttached.addListener(scheduleRefresh);
chrome.tabs.onDetached.addListener(scheduleRefresh);
chrome.tabs.onReplaced.addListener(scheduleRefresh);
chrome.tabGroups.onCreated.addListener(scheduleRefresh);
chrome.tabGroups.onUpdated.addListener(scheduleRefresh);
chrome.tabGroups.onMoved.addListener(scheduleRefresh);
chrome.tabGroups.onRemoved.addListener(scheduleRefresh);

if (globalThis.chrome?.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    let changed = false;
    if (changes[FIXED_FOLDERS_KEY]) {
      fixedFolders = normalizeFixedFolders(changes[FIXED_FOLDERS_KEY].newValue);
      changed = true;
    }
    if (changes[PERSISTENT_PINS_KEY]) {
      persistentPins = normalizePersistentPins(changes[PERSISTENT_PINS_KEY].newValue);
      changed = true;
    }
    if (changes[THEME_PREFERENCE_KEY]) {
      applyThemePreference(changes[THEME_PREFERENCE_KEY].newValue);
    }
    if (changed) render({ preserveViewport: true });
  });
}

window.addEventListener('storage', (event) => {
  if (event.key === FIXED_FOLDERS_KEY) {
    fixedFolders = normalizeFixedFolders(readFallbackFixedFolders());
  } else if (event.key === PERSISTENT_PINS_KEY) {
    persistentPins = normalizePersistentPins(readFallbackPersistentPins());
  } else if (event.key === THEME_PREFERENCE_KEY) {
    applyThemePreference(event.newValue);
    return;
  } else {
    return;
  }
  render({ preserveViewport: true });
});

async function initialize() {
  await Promise.all([
    loadThemePreference(),
    loadFixedFolders(),
    loadPersistentPins(),
    loadManualStandaloneTabIds(),
    loadFixedItemTabBindings()
  ]);
  await refreshTabs({ revealActive: true });
  if (globalThis.ResizeObserver) {
    layoutObserver = new ResizeObserver(scheduleNewTabPlacement);
    layoutObserver.observe(document.body);
  }
}

initialize().catch(handleError);
