export enum MenuType {
  General = 'general',
  DesktopAndDock = 'desktopAndDock',
  Appearance = 'appearance',
  BewlyPages = 'bewlyPages',
  Compatibility = 'compatibility',
  ContentFilter = 'contentFilter',
  BilibiliSettings = 'BilibiliSettings',
  About = 'about',
  RankingFilter = 'rankingFilter',
}

export enum BewlyPage {
  Home = 'Home',
  Search = 'Search',
}

export interface MenuItem {
  value: MenuType
  title: string
  icon: string
  iconActivated: string
}
