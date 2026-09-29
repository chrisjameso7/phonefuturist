/* Resolve appearance before paint while keeping preference and rendered theme separate. */
(() => {
  const storageKey = 'phonefuturist-theme';
  const systemQuery = matchMedia('(prefers-color-scheme: dark)');
  const validPreferences = new Set(['system', 'light', 'dark']);

  let preference = 'system';

  const sanitize = (value) =>
    validPreferences.has(value) ? value : 'system';

  try {
    preference = sanitize(localStorage.getItem(storageKey));
  } catch {
    preference = 'system';
  }

  const resolvedTheme = () =>
    preference === 'system'
      ? (systemQuery.matches ? 'dark' : 'light')
      : preference;

  const apply = () => {
    const root = document.documentElement;

    root.dataset.theme = resolvedTheme();
    root.dataset.themePreference = preference;

    document.querySelectorAll('[data-theme-choice]').forEach((select) => {
      select.value = preference;
    });
  };

  // Apply immediately to avoid a flash of the wrong theme.
  apply();

  // Follow OS appearance only while the user preference is System.
  systemQuery.addEventListener('change', () => {
    if (preference === 'system') {
      apply();
    }
  });

  // Keep appearance synchronized between tabs.
  addEventListener('storage', (event) => {
    if (event.key !== storageKey && event.key !== null) {
      return;
    }

    preference = sanitize(event.newValue);
    apply();
  });

  document.addEventListener(
    'DOMContentLoaded',
    () => {
      apply();

      document.querySelectorAll('[data-theme-choice]').forEach((select) => {
        select.addEventListener('change', () => {
          preference = sanitize(select.value);

          try {
            localStorage.setItem(storageKey, preference);
          } catch {
            // Storage may be unavailable. The current session still works.
          }

          apply();
        });
      });
    },
    { once: true }
  );
})();