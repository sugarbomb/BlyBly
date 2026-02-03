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
const groupSubForYou = new Set<HomeSubPage>([HomeSubPage.ForYou])

const homeTabsRankTrending = ref<{ page: HomeSubPage, visible: boolean }[]>([])
const homeTabsFollowLive = ref<{ page: HomeSubPage, visible: boolean }[]>([])
const homeTabsSubForYou = ref<{ page: HomeSubPage, visible: boolean }[]>([])

function normalizeHomeTabsList(list: { page: HomeSubPage, visible: boolean }[]) {
  const rankTrending: { page: HomeSubPage, visible: boolean }[] = []
  const followLive: { page: HomeSubPage, visible: boolean }[] = []
  const subForYou: { page: HomeSubPage, visible: boolean }[] = []

  for (const tab of list) {
    if (groupRankTrending.has(tab.page))
      rankTrending.push(tab)
    else if (groupFollowLive.has(tab.page))
      followLive.push(tab)
    else if (groupSubForYou.has(tab.page))
      subForYou.push(tab)
  }

  return { rankTrending, followLive, subForYou, all: [...rankTrending, ...followLive, ...subForYou] }
}

function syncHomeTabsFromSettings() {
  const { rankTrending, followLive, subForYou, all } = normalizeHomeTabsList(settings.value.homePageTabVisibilityList)

  const current = settings.value.homePageTabVisibilityList.map(t => t.page).join('|')
  const normalized = all.map(t => t.page).join('|')
  if (current !== normalized)
    settings.value.homePageTabVisibilityList = all

  homeTabsRankTrending.value = rankTrending
  homeTabsFollowLive.value = followLive
  homeTabsSubForYou.value = subForYou
}

function rebuildHomeTabsToSettings() {
  settings.value.homePageTabVisibilityList = [
    ...homeTabsRankTrending.value,
    ...homeTabsFollowLive.value,
    ...homeTabsSubForYou.value,
  ]
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
  const resetList = mainStore.homeTabs.map((tab) => {
    return {
      page: tab.page,
      visible: true,
    }
  })
  const { all } = normalizeHomeTabsList(resetList)
  settings.value.homePageTabVisibilityList = all
}

function handleToggleHomeTab(tab: any) {
  // Prevent disabling all tabs if there is only one
  if (settings.value.homePageTabVisibilityList.filter(tab => tab.visible === true).length > 1)
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
            <div
              v-if="homeTabsRankTrending.length"
              style="backdrop-filter: var(--bew-filter-glass-1)"
              bg="$bew-elevated" p-2 rounded="$bew-radius"
              box-border border="1 $bew-border-color"
            >
              <draggable
                v-model="homeTabsRankTrending"
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

            <div
              v-if="homeTabsFollowLive.length"
              style="backdrop-filter: var(--bew-filter-glass-1)"
              bg="$bew-elevated" p-2 rounded="$bew-radius"
              box-border border="1 $bew-border-color"
            >
              <draggable
                v-model="homeTabsFollowLive"
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

            <div
              v-if="homeTabsSubForYou.length"
              style="backdrop-filter: var(--bew-filter-glass-1)"
              bg="$bew-elevated" p-2 rounded="$bew-radius"
              box-border border="1 $bew-border-color"
            >
              <draggable
                v-model="homeTabsSubForYou"
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
