<script setup lang="ts">
import { useThrottleFn } from '@vueuse/core'

import { useBewlyApp } from '~/composables/useAppProvider'
import { TOP_BAR_VISIBILITY_CHANGE } from '~/constants/globalEvents'
import { gridLayout, settings } from '~/logic'
import type { HomeTab } from '~/stores/mainStore'
import { useMainStore } from '~/stores/mainStore'
import emitter from '~/utils/mitt'

import type { GridLayoutIcon } from './types'
import { HomeSubPage } from './types'

const mainStore = useMainStore()
const { handleBackToTop, scrollbarRef } = useBewlyApp()
const handleThrottledBackToTop = useThrottleFn((targetScrollTop: number = 0) => handleBackToTop(targetScrollTop), 1000)

const activatedPage = ref<HomeSubPage>(HomeSubPage.Ranking)
// Split the page map into 3 groups to keep related sub-pages together.
// 1) ranking/trending imports unchanged
const pagesRankTrending = {
  [HomeSubPage.Ranking]: defineAsyncComponent(() => import('./components/Ranking.vue')),
  [HomeSubPage.Trending]: defineAsyncComponent(() => import('./components/Trending.vue')),

} as const

// 2) following/live
const pagesFollowLive = {
  [HomeSubPage.Following]: defineAsyncComponent(() => import('./components/Following.vue')),
  [HomeSubPage.SubscribedSeries]: defineAsyncComponent(() => import('./components/SubscribedSeries.vue')),
  [HomeSubPage.Live]: defineAsyncComponent(() => import('./components/Live.vue')),
} as const

// 3) subscribed/foryou
const pagesSubForYou = {
  [HomeSubPage.ForYou]: defineAsyncComponent(() => import('./components/ForYouBlyBly.vue')),
} as const

const pages = {
  ...pagesRankTrending,
  ...pagesFollowLive,
  ...pagesSubForYou,
} as const
const showSearchPageMode = ref<boolean>(false)
const shouldMoveTabsUp = ref<boolean>(false)
const tabContentLoading = ref<boolean>(false)
const allTabs = ref<HomeTab[]>([])
const tabsRankTrending = ref<HomeTab[]>([])
const tabsFollowLive = ref<HomeTab[]>([])
const tabsSubForYou = ref<HomeTab[]>([])
const tabGroups = ref<{ id: GroupId, tabs: HomeTab[] }[]>([])
const tabPageRef = ref()
const topBarVisibility = ref<boolean>(false)
const gridLayoutIcons = computed((): GridLayoutIcon[] => {
  return [
    { icon: 'i-mingcute:table-3-line', iconActivated: 'i-mingcute:table-3-fill', value: 'adaptive' },
    { icon: 'i-mingcute:layout-grid-line', iconActivated: 'i-mingcute:layout-grid-fill', value: 'twoColumns' },
    { icon: 'i-mingcute:list-check-3-line', iconActivated: 'i-mingcute:list-check-3-fill', value: 'oneColumn' },
  ]
})

const GROUP_ORDER = ['rankTrending', 'followLive', 'subForYou'] as const
type GroupId = typeof GROUP_ORDER[number]

const groupRankTrending = new Set<HomeSubPage>([HomeSubPage.Ranking, HomeSubPage.Trending])
const groupFollowLive = new Set<HomeSubPage>([HomeSubPage.Following, HomeSubPage.SubscribedSeries, HomeSubPage.Live])
const groupSubForYou = new Set<HomeSubPage>([HomeSubPage.ForYou])

const GROUP_MATCHER: Record<GroupId, ReadonlySet<HomeSubPage>> = {
  rankTrending: groupRankTrending,
  followLive: groupFollowLive,
  subForYou: groupSubForYou,
}

function resolveGroupOrder(groups: { id: string }[]): GroupId[] {
  const order: GroupId[] = []
  for (const group of groups) {
    const id = group?.id as string
    if ((GROUP_ORDER as readonly string[]).includes(id) && !order.includes(id as GroupId))
      order.push(id as GroupId)
  }
  return order.length === GROUP_ORDER.length ? order : [...GROUP_ORDER]
}

function groupsSignature(groups: { id: string, items: { page: HomeSubPage, visible: boolean }[] }[]) {
  return groups
    .map(g => `${g.id}:${g.items.map(i => `${i.page}:${i.visible ? 1 : 0}`).join(',')}`)
    .join('|')
}

function ensureHomePageGroups(allPages: HomeSubPage[]) {
  const allowedPages = new Set(allPages)

  const order = resolveGroupOrder(settings.value.homePageGroups as any)
  const usedPages = new Set<HomeSubPage>()

  const nextGroups = order.map((id) => {
    const matcher = GROUP_MATCHER[id]
    const existingItems = settings.value.homePageGroups.find(g => g.id === id)?.items ?? []
    const items: { page: HomeSubPage, visible: boolean }[] = []

    for (const raw of existingItems) {
      const page = (raw as any)?.page as HomeSubPage
      if (!allowedPages.has(page))
        continue
      if (usedPages.has(page))
        continue
      if (!matcher.has(page))
        continue

      usedPages.add(page)
      items.push({ page, visible: typeof (raw as any)?.visible === 'boolean' ? (raw as any).visible : true })
    }

    for (const page of allPages) {
      if (usedPages.has(page))
        continue
      if (!matcher.has(page))
        continue
      usedPages.add(page)
      items.push({ page, visible: true })
    }

    return { id, items }
  })

  const nextSig = groupsSignature(nextGroups as any)
  const curSig = groupsSignature(settings.value.homePageGroups as any)
  if (nextSig !== curSig)
    settings.value.homePageGroups = nextGroups as any
}

// use Json stringify to watch the changes of the array item properties
watch(() => JSON.stringify(settings.value.homePageGroups), () => {
  computeTabs()
})

function computeTabs(): HomeTab[] {
  const allPages = mainStore.homeTabs.map(tab => tab.page)
  ensureHomePageGroups(allPages)

  const tabI18nKeyByPage = new Map(mainStore.homeTabs.map(t => [t.page, t.i18nKey]))

  const targetTabs: HomeTab[] = []
  const targetTabsByGroup: Record<GroupId, HomeTab[]> = {
    rankTrending: [],
    followLive: [],
    subForYou: [],
  }

  for (const group of settings.value.homePageGroups) {
    for (const tab of group.items) {
      if (!tab.visible)
        continue

      const tabItem: HomeTab = {
        i18nKey: tabI18nKeyByPage.get(tab.page) || tab.page,
        page: tab.page,
      }
      targetTabs.push(tabItem)

      if (group.id === 'rankTrending' || group.id === 'followLive' || group.id === 'subForYou')
        targetTabsByGroup[group.id].push(tabItem)
    }
  }

  allTabs.value = targetTabs
  tabsRankTrending.value = targetTabsByGroup.rankTrending
  tabsFollowLive.value = targetTabsByGroup.followLive
  tabsSubForYou.value = targetTabsByGroup.subForYou
  tabGroups.value = settings.value.homePageGroups
    .filter(g => g.id === 'rankTrending' || g.id === 'followLive' || g.id === 'subForYou')
    .map(g => ({ id: g.id, tabs: targetTabsByGroup[g.id] }))
    .filter(g => g.tabs.length)

  // If current page is hidden, fallback to the first visible tab.
  if (!targetTabs.some(t => t.page === activatedPage.value) && targetTabs.length) {
    activatedPage.value = tabGroups.value[0]?.tabs[0]?.page
  }

  return targetTabs
}

const visibleTabsCount = computed(() => allTabs.value.length)

onMounted(() => {
  showSearchPageMode.value = true
  emitter.off(TOP_BAR_VISIBILITY_CHANGE)
  emitter.on(TOP_BAR_VISIBILITY_CHANGE, (val) => {
    topBarVisibility.value = val
    shouldMoveTabsUp.value = false

    // Allow moving tabs up only when the top bar is not hidden & is set to auto-hide
    // This feature is primarily designed to compatible with the Bilibili Evolved's top bar
    // Even when the BewlyBewly top bar is hidden, the Bilibili Evolved top bar still exists, so not moving up
    if (settings.value.autoHideTopBar && settings.value.showTopBar) {
      if (!settings.value.useSearchPageModeOnHomePage) {
        if (val)
          shouldMoveTabsUp.value = false

        else
          shouldMoveTabsUp.value = true
      }
      else {
        // fix #349
        const osInstance = scrollbarRef.value?.osInstance()
        const scrollTop = osInstance.elements().viewport.scrollTop as number

        if (val)
          shouldMoveTabsUp.value = false

        else if (scrollTop > 510 + 40)
          shouldMoveTabsUp.value = true
      }
    }
  })

  computeTabs()
  if (allTabs.value.length) {
    activatedPage.value = tabGroups.value[0]?.tabs[0]?.page
  }
})

onUnmounted(() => {
  emitter.off(TOP_BAR_VISIBILITY_CHANGE)
})

function handleChangeTab(tab: HomeTab) {
  if (activatedPage.value === tab.page) {
    const osInstance = scrollbarRef.value?.osInstance()
    const scrollTop = osInstance.elements().viewport.scrollTop as number

    if ((!settings.value.useSearchPageModeOnHomePage && scrollTop > 0) || (settings.value.useSearchPageModeOnHomePage && scrollTop > 510)) {
      handleThrottledBackToTop(settings.value.useSearchPageModeOnHomePage ? 510 : 0)
    }
    else {
      if (tabContentLoading.value)
        return
      if (tabPageRef.value) {
        tabPageRef.value.initData()
      }
    }
    return
  }
  else {
    handleThrottledBackToTop(settings.value.useSearchPageModeOnHomePage ? 510 : 0)
  }

  if (tabContentLoading.value)
    toggleTabContentLoading(false)

  activatedPage.value = tab.page
}

function toggleTabContentLoading(loading: boolean) {
  tabContentLoading.value = loading
}
</script>

<template>
  <div>
    <!-- Home search page mode background -->
    <Transition name="bg">
      <div
        v-if="settings.useSearchPageModeOnHomePage && settings.individuallySetSearchPageWallpaper && showSearchPageMode"
        pos="absolute left-0 top-0" w-full h-580px
      >
        <div
          pos="absolute left-0 top-0" w-full h-inherit bg="cover center" z-1
          pointer-events-none
          :style="{
            backgroundImage: `url('${settings.searchPageWallpaper}')`,
            backgroundAttachment: settings.searchPageModeWallpaperFixed ? 'fixed' : 'unset',
          }"
        />
        <!-- background mask -->
        <Transition name="fade">
          <div
            v-if="(!settings.individuallySetSearchPageWallpaper && settings.enableWallpaperMasking) || (settings.searchPageEnableWallpaperMasking)"
            pos="relative left-0 top-0" w-full h-inherit pointer-events-none duration-300
            z-1
            :style="{
              backdropFilter: `blur(${settings.individuallySetSearchPageWallpaper ? settings.searchPageWallpaperBlurIntensity : settings.wallpaperBlurIntensity}px)`,
            }"
          >
            <div
              bg="$bew-homepage-bg" pos="absolute top-0 left-0" w-full h-full
              :style="{
                opacity: `${settings.searchPageWallpaperMaskOpacity}%`,
              }"
            />
          </div>
        </Transition>
      </div>
    </Transition>

    <main>
      <!-- Home search page mode content -->
      <Transition name="content">
        <div
          v-if="settings.useSearchPageModeOnHomePage && showSearchPageMode"
          flex="~ col"
          justify-center
          items-center relative
          w-full z-10 mb-4
          h-500px
        >
          <Logo
            v-if="settings.searchPageShowLogo" :size="180" :color="settings.searchPageLogoColor === 'white' ? 'white' : 'var(--bew-theme-color)'"
            :glow="settings.searchPageLogoGlow"
            m="t--70px b-12" z-1
          />
          <SearchBar
            :darken-on-focus="settings.searchPageDarkenOnSearchFocus"
            :blurred-on-focus="settings.searchPageBlurredOnSearchFocus"
            :focused-character="settings.searchPageSearchBarFocusCharacter"
          />
        </div>
      </Transition>

      <header
        pos="sticky top-[calc(var(--bew-top-bar-height)+10px)]" w-full z-9 m="b-4" duration-300
        ease-in-out flex="~ justify-between items-start gap-4"
        :class="{ hide: shouldMoveTabsUp }"
      >
        <div
          v-if="!(!settings.alwaysShowTabsOnHomePage && visibleTabsCount === 1)"
          w="[calc(100vw-280px)]"
          flex="~ gap-2 items-center wrap"
        >
          <section
            v-for="group in tabGroups" :key="group.id"
            style="backdrop-filter: var(--bew-filter-glass-1)"
            bg="$bew-elevated" p-1
            h-38px rounded-full
            text="sm"
            shadow="[var(--bew-shadow-1),var(--bew-shadow-edge-glow-1)]"
            box-border border="1 $bew-border-color"
          >
            <OverlayScrollbarsComponent
              class="home-tabs-inside"
              element="div" defer
              :options="{
                x: 'scroll',
                y: 'hidden',
              }"
              h-full of-hidden
            >
              <button
                v-for="tab in group.tabs" :key="tab.page"
                :class="{ 'tab-activated': activatedPage === tab.page }"
                px-3 h-inherit
                bg="transparent hover:$bew-fill-2" text="$bew-text-2 hover:$bew-text-1" fw-bold rounded-full
                cursor-pointer duration-300
                flex="~ gap-2 items-center shrink-0" relative
                @click="handleChangeTab(tab)"
              >
                <span class="text-center">{{ $t(tab.i18nKey) }}</span>

                <Transition name="fade">
                  <div
                    v-show="activatedPage === tab.page && tabContentLoading"
                    i-svg-spinners:ring-resize
                    pos="absolute right-4px top-4px" duration-300
                    text="8px white"
                  />
                </Transition>
              </button>
            </OverlayScrollbarsComponent>
          </section>
        </div>

        <div
          v-if="settings.enableGridLayoutSwitcher"
          style="backdrop-filter: var(--bew-filter-glass-1)"
          flex="~ gap-1 shrink-0" p-1 h-38px bg="$bew-elevated" transform-gpu
          ml-auto rounded-full
          shadow="[var(--bew-shadow-1),var(--bew-shadow-edge-glow-1)]"
          box-border border="1 $bew-border-color"
        >
          <div
            v-for="icon in gridLayoutIcons" :key="icon.value"
            :class="{ 'grid-layout-item-activated': gridLayout.home === icon.value }"
            flex="~ justify-center items-center"
            h-full aspect-square text="$bew-text-2 hover:$bew-text-1"
            rounded-full bg="hover:$bew-fill-2" duration-300
            cursor-pointer
            @click="gridLayout.home = icon.value"
          >
            <div :class="gridLayout.home === icon.value ? icon.iconActivated : icon.icon" text-base />
          </div>
        </div>
      </header>

      <Transition name="page-fade">
        <KeepAlive include="ForYou">
          <Component
            :is="pages[activatedPage]" :key="activatedPage"
            ref="tabPageRef"
            :grid-layout="gridLayout.home"
            :top-bar-visibility="topBarVisibility"
            @before-loading="toggleTabContentLoading(true)"
            @after-loading="toggleTabContentLoading(false)"
          />
        </KeepAlive>
      </Transition>
    </main>
  </div>
</template>

<style scoped lang="scss">
.bg-enter-active,
.bg-leave-active {
  --uno: "duration-1000 ease-in-out";
}
.bg-enter-from,
.bg-leave-to {
  --uno: "h-100vh";
}
.bg-leave-to {
  --uno: "hidden";
}

.content-enter-active,
.content-leave-active {
  --uno: "duration-1000 ease-in-out";
}
.content-enter-from,
.content-leave-to {
  --uno: "opacity-0 h-100vh";
}
.content-leave-to {
  --uno: "hidden";
}

.hide {
  --uno: "important-translate-y--70px";
}

.home-tabs-inside {
  :deep([data-overlayscrollbars-contents]) {
    --uno: "flex items-center gap-1 h-inherit rounded-$bew-radius-half";
  }
  :deep(.os-scrollbar) {
    --uno: "mb--4px";
  }
}

.tab-activated {
  --uno: "bg-$bew-theme-color-auto text-$bew-text-auto";
}

.grid-layout-item-activated {
  --uno: "bg-$bew-theme-color-auto text-$bew-text-auto";
}
</style>
