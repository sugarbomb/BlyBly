<script lang="ts" setup>
import draggable from 'vuedraggable'

import AccessKeyAuthorizeDialog from '~/components/AccessKeyAuthorizeDialog.vue'
import type { HomePageGroup } from '~/contentScripts/views/Home/types'
import { HomeSubPage } from '~/contentScripts/views/Home/types'
import { accessKey, settings } from '~/logic'
import { useMainStore } from '~/stores/mainStore'
import { revokeAccessKey } from '~/utils/authProvider'

import SettingsItem from '../../components/SettingsItem.vue'
import SettingsItemGroup from '../../components/SettingsItemGroup.vue'
import SearchPage from '../SearchPage/SearchPage.vue'

const mainStore = useMainStore()

const showSearchPageModeSharedSettings = ref<boolean>(false)
const showAccessKeyAuthorizeDialog = ref<boolean>(false)

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

function handleRevoke() {
  revokeAccessKey()
}

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
  // Prevent disabling all tabs if there is only one
  if (visibleTabsCount > 1)
    tab.visible = !tab.visible
  else
    tab.visible = true
}
</script>

<template>
  <div>
    <SettingsItemGroup :title="$t('settings.group_recommendation_mode')">
      <SettingsItem :title="$t('settings.authorize_app')">
        <template #desc>
          {{ $t('settings.authorize_app_desc') }}
          <br>
          <a
            href="https://github.com/indefined/UserScripts/tree/master/bilibiliHome#%E6%8E%88%E6%9D%83%E8%AF%B4%E6%98%8E" target="_blank" color="$bew-theme-color"
          >{{ $t('settings.authorize_app_more_info_access_key') }}</a>
        </template>

        <div w-full>
          <Button v-if="!accessKey" type="primary" center block @click="showAccessKeyAuthorizeDialog = true">
            {{ $t('settings.btn.authorize') }}...
          </Button>
          <Button
            v-else type="secondary" center block style="--b-button-text-color: var(--bew-error-color)"
            @click="handleRevoke"
          >
            {{ $t('settings.btn.revoke') }}
          </Button>
        </div>
      </SettingsItem>

      <AccessKeyAuthorizeDialog v-model="showAccessKeyAuthorizeDialog" />
    </SettingsItemGroup>

    <SettingsItemGroup :title="$t('settings.group_following')">
      <SettingsItem :title="$t('settings.following_tab_show_livestreaming_videos')">
        <Radio v-model="settings.followingTabShowLivestreamingVideos" />
      </SettingsItem>
    </SettingsItemGroup>

    <SettingsItemGroup
      :title="$t('settings.group_home_tabs')"
    >
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
                  style="backdrop-filter: var(--bew-filter-glass-1)"
                  bg="$bew-elevated" p-2 rounded="$bew-radius"
                  box-border border="1 $bew-border-color"
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
                        flex="~ gap-2 items-center" p="x-4 y-2" bg="$bew-fill-1" rounded="$bew-radius" cursor-all-scroll
                        duration-300
                        :style="{
                          background: element.visible ? 'var(--bew-theme-color-20)' : 'var(--bew-fill-1)',
                          color: element.visible ? 'var(--bew-theme-color)' : 'var(--bew-text-1)',
                        }"
                        @click="handleToggleHomeTab(element)"
                      >
                        {{ $t(mainStore.homeTabs.find(tab => tab.page === element.page)?.i18nKey ?? '') }}
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

    <SettingsItemGroup :title="$t('settings.group_search_page_mode')">
      <SettingsItem :title="$t('settings.use_search_page_mode')">
        <Radio v-model="settings.useSearchPageModeOnHomePage" />
      </SettingsItem>
      <template v-if="settings.useSearchPageModeOnHomePage">
        <SettingsItem :title="$t('settings.settings_shared_with_the_search_page')">
          <template #desc>
            <span color="$bew-warning-color">{{ $t('settings.settings_shared_with_the_search_page_desc') }}</span>
          </template>
          <Button type="secondary" block center @click="showSearchPageModeSharedSettings = true">
            {{ $t('settings.btn.open_settings') }}
          </Button>

          <Dialog
            v-if="showSearchPageModeSharedSettings"
            width="80%"
            max-width="900px"
            content-height="64vh"
            :show-footer="false"
            :title="$t('settings.settings_shared_with_the_search_page')"
            append-to-bewly-body
            @close="showSearchPageModeSharedSettings = false"
          >
            <template #desc>
              <span color="$bew-warning-color">{{ $t('settings.settings_shared_with_the_search_page_desc') }}</span>
            </template>

            <SearchPage />
          </Dialog>
        </SettingsItem>

        <SettingsItem :title="$t('settings.search_page_mode_wallpaper_fixed')">
          <Radio v-model="settings.searchPageModeWallpaperFixed" />
        </SettingsItem>
      </template>
    </SettingsItemGroup>
  </div>
</template>

<style lang="scss" scoped>
.unrestricted-width-settings-item {
  :deep(.left-content) {
    --uno: w-full;
  }

  :deep(.right-content) {
    --uno: w-auto;
  }
}
</style>
