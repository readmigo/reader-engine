export function watchSystemAppearance(
  callback: (isDark: boolean) => void,
): { isDark: boolean; cleanup: () => void } {
  if (typeof window === 'undefined') {
    return { isDark: false, cleanup: () => {} };
  }

  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e: MediaQueryListEvent) => callback(e.matches);

  mql.addEventListener('change', handler);

  return {
    isDark: mql.matches,
    cleanup: () => mql.removeEventListener('change', handler),
  };
}
