<script lang="ts" setup>
import draggable from 'vuedraggable'

import AccessKeyAuthorizeDialog from '~/components/AccessKeyAuthorizeDialog.vue'
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

const groupRankTrending = new Set<HomeSubPage>([HomeSubPage.Ranking, HomeSubPage.Trending])
const groupFollowLive = new Set<HomeSubPage>([HomeSubPage.Following, HomeSubPage.SubscribedSeries, HomeSubPage.Live])

type HomeTabGroupId = 'rankTrending' | 'followLive' | 'subForYou'

interface HomeTabVisibility {
  page: HomeSubPage
  visible: boolean
}

interface HomeTabGroup {
  id: HomeTabGroupId
  tabs: HomeTabVisibility[]
}

const defaultGroupOrder: HomeTabGroupId[] = ['rankTrending', 'followLive', 'subForYou']
const homeTabGroups = ref<HomeTabGroup[]>([])

function getGroupId(page: HomeSubPage): HomeTabGroupId {
  if (groupRankTrending.has(page))
    return 'rankTrending'
  if (groupFollowLive.has(page))
    return 'followLive'
  return 'subForYou'
}

function normalizeHomeTabsList(list: HomeTabVisibility[]) {
  const groups: Record<HomeTabGroupId, HomeTabVisibility[]> = {
    rankTrending: [],
    followLive: [],
    subForYou: [],
  }

  const groupOrder: HomeTabGroupId[] = []
  const seenPages = new Set<HomeSubPage>()

  for (const tab of list) {
    if (seenPages.has(tab.page))
      continue
    seenPages.add(tab.page)

    const groupId = getGroupId(tab.page)
    groups[groupId].push(tab)
    if (!groupOrder.includes(groupId))
      groupOrder.push(groupId)
  }

  // Ensure all tabs exist (keep default order for missing ones)
  for (const tab of mainStore.homeTabs) {
    if (seenPages.has(tab.page))
      continue
    seenPages.add(tab.page)
    groups[getGroupId(tab.page)].push({ page: tab.page, visible: true })
  }

  const normalizedOrder = [...groupOrder]
  for (const id of defaultGroupOrder) {
    if (!normalizedOrder.includes(id))
      normalizedOrder.push(id)
  }

  const normalizedGroups = normalizedOrder.map(id => ({ id, tabs: groups[id] }))
  const all = normalizedGroups.flatMap(g => g.tabs)

  return { normalizedGroups, all }
}

function syncHomeTabsFromSettings() {
  const { normalizedGroups, all } = normalizeHomeTabsList(settings.value.homePageTabVisibilityList)

  const currentKey = settings.value.homePageTabVisibilityList.map(t => `${t.page}:${t.visible}`).join('|')
  const normalizedKey = all.map(t => `${t.page}:${t.visible}`).join('|')
  if (currentKey !== normalizedKey)
    settings.value.homePageTabVisibilityList = all

  homeTabGroups.value = normalizedGroups
}

function rebuildHomeTabsToSettings() {
  settings.value.homePageTabVisibilityList = homeTabGroups.value.flatMap(g => g.tabs)
}

watch(
  () => settings.value.homePageTabVisibilityList.map(t => `${t.page}:${t.visible}`).join('|'),
  () => syncHomeTabsFromSettings(),
  { immediate: true },
)

function handleRevoke() {
  revokeAccessKey()
}

function resetHomeTabs() {
  const defaultList = mainStore.homeTabs.map(tab => ({ page: tab.page, visible: true }))
  const { normalizedGroups, all } = normalizeHomeTabsList(defaultList)
  homeTabGroups.value = normalizedGroups
  settings.value.homePageTabVisibilityList = all
}

function handleToggleHomeTab(tab: HomeTabVisibility) {
  // Prevent disabling all tabs if there is only one
  const allTabs = homeTabGroups.value.flatMap(g => g.tabs)
  const visibleCount = allTabs.filter(t => t.visible).length
  if (tab.visible && visibleCount <= 1)
    return

  tab.visible = !tab.visible
  rebuildHomeTabsToSettings()
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
              v-model="homeTabGroups"
              item-key="id"
              handle=".home-tab-group-handle"
              :component-data="{ style: 'display: flex; flex-direction: column; gap: 0.5rem;' }"
              @change="rebuildHomeTabsToSettings"
            >
              <template #item="{ element: group }">
                <div
                  style="backdrop-filter: var(--bew-filter-glass-1)"
                  bg="$bew-elevated" p-2 rounded="$bew-radius"
                  box-border border="1 $bew-border-color"
                >
                  <div flex="~ items-center justify-between" p="x-2 y-1">
                    <div flex="~ items-center gap-2">
                      <div class="home-tab-group-handle" cursor-grab text="$bew-text-2">
                        <div i-mingcute:move-line />
                      </div>
                      <div v-if="group.id === 'rankTrending'" text="$bew-text-2" text-sm>
                        {{ $t('home.ranking') }} / {{ $t('home.trending') }}
                      </div>
                      <div v-else-if="group.id === 'followLive'" text="$bew-text-2" text-sm>
                        {{ $t('home.following') }} / {{ $t('home.subscribed_series') }} / {{ $t('home.live') }}
                      </div>
                      <div v-else text="$bew-text-2" text-sm>
                        {{ $t('home.for_you') }}
                      </div>
                    </div>
                  </div>

                  <draggable
                    v-model="group.tabs"
                    item-key="page"
                    :component-data="{ style: 'display: flex; gap: 0.5rem; flex-wrap: wrap;' }"
                    @change="rebuildHomeTabsToSettings"
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
