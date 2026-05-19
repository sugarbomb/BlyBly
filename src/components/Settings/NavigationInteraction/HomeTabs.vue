<script lang="ts" setup>
import draggable from 'vuedraggable'

import type { HomePageGroup } from '~/contentScripts/views/Home/types'
import { HomeSubPage } from '~/contentScripts/views/Home/types'
import { settings } from '~/logic'
import { useMainStore } from '~/stores/mainStore'

import SettingsItem from '../components/SettingsItem.vue'
import SettingsItemGroup from '../components/SettingsItemGroup.vue'

const mainStore = useMainStore()

const homePageGroupsModel = computed<HomePageGroup[]>({
  get: () => settings.value.homePageGroups,
  set: value => (settings.value.homePageGroups = value),
})

function homeTabsGroupSignature() {
  return settings.value.homePageGroups
    .map(g => `${g.id}:${g.items.map(i => `${i.page}:${i.visible ? 1 : 0}`).join(',')}`)
    .join('|')
}

const GROUP_ORDER = ['rankTrending', 'followLive', 'partition', 'subForYou'] as const
type GroupId = typeof GROUP_ORDER[number]

const groupRankTrending = new Set<HomeSubPage>([HomeSubPage.Ranking, HomeSubPage.WeeklyRanking, HomeSubPage.Trending])
const groupFollowLive = new Set<HomeSubPage>([HomeSubPage.Following, HomeSubPage.SubscribedSeries, HomeSubPage.Live])
const groupSubForYou = new Set<HomeSubPage>([HomeSubPage.ForYou])
const groupPartition = new Set<HomeSubPage>([HomeSubPage.PartitionForYou, HomeSubPage.PartitionRealtime])

const GROUP_MATCHER: Record<GroupId, ReadonlySet<HomeSubPage>> = {
  rankTrending: groupRankTrending,
  followLive: groupFollowLive,
  subForYou: groupSubForYou,
  partition: groupPartition,
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

  const nextSig = nextGroups.map(g => `${g.id}:${g.items.map(i => `${i.page}:${i.visible ? 1 : 0}`).join(',')}`).join('|')
  const curSig = homeTabsGroupSignature()
  if (nextSig !== curSig)
    settings.value.homePageGroups = nextGroups as any
}

function commitHomePageGroups() {
  settings.value.homePageGroups = settings.value.homePageGroups.map(g => ({
    ...g,
    items: [...(g.items ?? [])],
  })) as any
}

watchEffect(() => {
  const allPages = mainStore.homeTabs.map(t => t.page)
  ensureHomePageGroups(allPages)
})

function resetHomeTabs() {
  const allPages = mainStore.homeTabs.map(t => t.page)
  settings.value.homePageGroups = []
  ensureHomePageGroups(allPages)
}

function handleToggleHomeTab(tab: any) {
  const visibleTabsCount = settings.value.homePageGroups
    .flatMap(g => g.items)
    .filter(t => t.visible)
    .length
  if (visibleTabsCount > 1)
    tab.visible = !tab.visible
  else
    tab.visible = true
}
</script>

<template>
  <div>
    <SettingsItemGroup :title="$t('settings.group_home_tabs')">
      <SettingsItem :desc="$t('settings.home_tabs_adjustment_desc')">
        <template #title>
          <div flex="~ gap-4 items-center">
            {{ $t('settings.home_tabs_adjustment') }}
            <Button size="small" type="secondary" @click="resetHomeTabs">
              <template #left>
                <div i-mingcute:back-line />
              </template>
              {{ $t('common.operation.reset') }}
            </Button>
          </div>
        </template>

        <template #bottom>
          <div flex="~ col gap-2" w-full>
            <draggable
              v-model="homePageGroupsModel"
              item-key="id"
              handle=".group-handle"
              :component-data="{ style: 'display: flex; flex-direction: column; gap: 0.5rem;' }"
              @change="commitHomePageGroups"
              @end="commitHomePageGroups"
            >
              <template #item="{ element: group }">
                <div
                  v-if="group.items?.length"
                  relative
                  bg="$bew-fill-1" p="x-2 y-0" rounded="$bew-radius"
                >
                  <div
                    class="group-handle"
                    i-mingcute:move-line
                    pos="absolute right-2 top-2"
                    text="$bew-text-2"
                    cursor-move
                    opacity-70
                    hover:opacity-100
                    duration-200
                  />

                  <draggable
                    v-model="group.items"
                    item-key="page"
                    :component-data="{ style: 'display: flex; gap: 0.5rem; flex-wrap: wrap;' }"
                    @change="commitHomePageGroups"
                    @end="commitHomePageGroups"
                  >
                    <template #item="{ element }">
                      <div
                        flex="~ gap-2 justify-between items-center wrap" p="x-4 y-2" rounded="$bew-radius" cursor-all-scroll
                        duration-300
                        :style="{
                          background: element.visible ? 'var(--bew-theme-color-20)' : 'transparent',
                          color: element.visible ? 'var(--bew-theme-color)' : 'var(--bew-text-1)',
                        }"
                        @click="handleToggleHomeTab(element)"
                      >
                        <div min-w-0 text-ellipsis>
                          {{ $t(mainStore.homeTabs.find(tab => tab.page === element.page)?.i18nKey ?? '') }}
                        </div>
                      </div>
                    </template>
                  </draggable>
                </div>
              </template>
            </draggable>
          </div>
        </template>
      </SettingsItem>
      <SettingsItem :title="$t('settings.always_show_tabs_on_home_page')">
        <Radio v-model="settings.alwaysShowTabsOnHomePage" />
      </SettingsItem>
    </SettingsItemGroup>
  </div>
</template>
