export enum MenuType {
  General = 'general',
  DesktopAndDock = 'desktopAndDock',
  Appearance = 'appearance',
  BewlyPages = 'bewlyPages',
  Compatibility = 'compatibility',
  Filters = 'filters',
  BilibiliSettings = 'BilibiliSettings',
  About = 'about',
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
