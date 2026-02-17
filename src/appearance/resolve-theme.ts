import type { AppearanceMode, ThemeMapping, ThemeName } from '../types/settings';

export function resolveTheme(
  appearanceMode: AppearanceMode,
  themeMapping: ThemeMapping,
  systemIsDark: boolean,
): ThemeName {
  switch (appearanceMode) {
    case 'light':
      return themeMapping.lightTheme;
    case 'dark':
      return themeMapping.darkTheme;
    case 'auto':
      return systemIsDark ? themeMapping.darkTheme : themeMapping.lightTheme;
  }
}
