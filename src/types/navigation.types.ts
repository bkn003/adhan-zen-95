
export type Screen = 'home' | 'nearby' | 'qibla' | 'settings';

export interface NavigationItem {
  id: Screen;
  label: string;
  tamilLabel: string;
  icon: string;
}
