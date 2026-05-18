export enum MenuType {
  General = 'general',
  Appearance = 'appearance',
  BewlyPages = 'bewlyPages',
  NavigationInteraction = 'navigationInteraction',
  Compatibility = 'compatibility',
  Filters = 'filters',
  BilibiliSettings = 'BilibiliSettings',
  About = 'about',
}

export enum BewlyPage {
  Search = 'Search',
  Recommendation = 'Recommendation',
  TouchScreen = 'TouchScreen',
  LinkOpening = 'LinkOpening',
  Ads = 'Ads',
  VideoCard = 'VideoCard',
}

export interface MenuItem {
  value: MenuType
  title: string
  icon: string
  iconActivated: string
}
