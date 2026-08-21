(() => {
  const key = 'themePreferenceModeV2';
  let preference = 'system';
  try {
    const savedPreference = window.localStorage.getItem(key);
    if (['system', 'light', 'dark'].includes(savedPreference)) preference = savedPreference;
  } catch {
    // Follow the system when page-local storage is unavailable.
  }
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme = preference === 'system' ? systemTheme : preference;
})();
