/* PhoneFuturist Early Access uses the designed dark appearance only. */
(() => {
  const root = document.documentElement;
  root.dataset.theme = 'dark';
  root.dataset.themePreference = 'dark';

  try {
    localStorage.removeItem('phonefuturist-theme');
  } catch {
    // Appearance storage may be unavailable. Dark remains the rendered theme.
  }
})();
