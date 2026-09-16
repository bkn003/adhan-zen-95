
export type Screen = 'home' | 'nearby' | 'shops' | 'qibla' | 'qaza' | 'settings';

export interface NavigationItem {
  id: Screen;
  label: string;
  tamilLabel: string;
  icon: string;
}
