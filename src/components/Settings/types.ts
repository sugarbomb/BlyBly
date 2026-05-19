export enum MenuType {
  General = 'general',
  Appearance = 'appearance',
  BewlyEnhancements = 'bewlyEnhancements',
  NavigationInteraction = 'navigationInteraction',
  Other = 'other',
  BilibiliSettings = 'BilibiliSettings',
}

export enum BewlyPage {
  Search = 'Search',
  Recommendation = 'Recommendation',
  TouchScreen = 'TouchScreen',
  Ads = 'Ads',
  Filters = 'Filters',
}

export interface MenuItem {
  value: MenuType
  title: string
  icon: string
  iconActivated: string
}
