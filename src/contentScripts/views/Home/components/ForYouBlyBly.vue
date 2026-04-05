<script setup lang="ts">
import { useWindowSize } from '@vueuse/core'
import { computed, provide, watch } from 'vue'

import AccessKeyAuthorizeDialog from '~/components/AccessKeyAuthorizeDialog.vue'
import ForYouRefreshRail from '~/components/SideBar/ForYouRefreshRail.vue'
import ForYouVideoCard from '~/components/VideoCard/ForYouVideoCard.vue'
import { useBewlyApp } from '~/composables/useAppProvider'
import { useFilterAdvance } from '~/composables/useFilterAdvance'
import { LanguageType } from '~/enums/appEnums'
import type { GridLayoutType } from '~/logic'
import { accessKey, settings } from '~/logic'
import type { AppForYouResult, Item as AppVideoItem } from '~/models/video/appForYou'
import type { forYouResult } from '~/models/video/forYou'
import api from '~/utils/api'
import { TVAppKey } from '~/utils/authProvider'
import { getUserID } from '~/utils/main'
import { createTopFeedSession } from '~/utils/topFeedSession'
import { isVerticalVideo } from '~/utils/uriParse'

const props = defineProps<{
  gridLayout: GridLayoutType
}>()

const emit = defineEmits<{
  (e: 'beforeLoading'): void
  (e: 'afterLoading'): void
}>()

// https://github.com/starknt/BewlyBewly/blob/fad999c2e482095dc3840bb291af53d15ff44130/src/contentScripts/views/Home/components/ForYou.vue#L16
interface VideoElement {
  uniqueId: string
  item?: WebLikeVideoItem
}

interface AppVideoElement {
  uniqueId: string
  item?: AppVideoItem
}

interface WebLikeVideoItem {
  id?: number | string
  bvid?: string
  goto?: string
  cid?: number | string
  uri?: string
  pic?: string
  title?: string
  duration?: number | string
  pubdate?: number | string
  is_followed?: number
  owner?: {
    mid?: number | string
    name?: string
    face?: string
  } | null
  stat?: {
    view?: number | string
    vv?: number | string
    danmaku?: number | string
  } | null
  business_info?: {
    is_ad?: boolean
    creative_id?: number | string
    card_type?: number
    pic?: string
    title?: string
    desc?: string
    adver_name?: string
    archive?: {
      aid?: number | string
      cid?: number | string
      bvid?: string
      pic?: string
      title?: string
      duration?: number | string
      pubdate?: number | string
      owner?: {
        mid?: number | string
        name?: string
        face?: string
      } | null
      stat?: {
        view?: number | string
        vv?: number | string
        danmaku?: number | string
      } | null
    } | null
  } | null
}

const gridClass = computed((): string => {
  if (props.gridLayout === 'adaptive')
    return 'grid-adaptive'
  if (props.gridLayout === 'twoColumns')
    return 'grid-two-columns'
  return 'grid-one-column'
})

const videoList = ref<VideoElement[]>([])
const appVideoList = ref<AppVideoElement[]>([])
const isLoading = ref<boolean>(false)
const needToLoginFirst = ref<boolean>(false)
const noMoreContent = ref<boolean>(false)
const pendingInit = ref<boolean>(false)
const { handleReachBottom, handlePageRefresh } = useBewlyApp()
const { width, height } = useWindowSize()

type ForYouPlatformMode = 'web' | 'app' | 'guest'
const initialPlatformMode: ForYouPlatformMode = !getUserID()
  ? 'guest'
  : settings.value.recommendationMode === 'app'
    ? 'app'
    : 'web'
const platformMode = ref<ForYouPlatformMode>(initialPlatformMode)
const isAppMode = computed(() => platformMode.value === 'app')
const isWebMode = computed(() => platformMode.value === 'web')
const isWebLikeMode = computed(() => platformMode.value === 'web' || platformMode.value === 'guest')

const showAccessKeyAuthorizeDialog = ref<boolean>(false)

const gridColumnCount = computed<number>(() => {
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

  let columns = 1

  if (props.gridLayout === 'adaptive') {
    // Keep consistent with template breakpoints: 2xl:5 xl:4 lg:3 md:2 sm:1
    if (width.value >= 1536)
      columns = 5
    else if (width.value >= 1280)
      columns = 4
    else if (width.value >= 1024)
      columns = 3
    else if (width.value >= 768)
      columns = 2
    else
      columns = 1
  }
  else if (props.gridLayout === 'twoColumns') {
    // template: cols-1 xl:cols-2
    columns = width.value >= 1280 ? 2 : 1
  }
  else {
    columns = 1
  }

  return clamp(columns, 1, 5)
})

const pageSize = computed<number>(() => {
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

  // Aim for ~2 rows; 5->10, 4->8, 3->6, 2->4...
  return clamp(gridColumnCount.value * 2, 4, 10)
})
// Home web recommendation uses a per-tab session-like state machine.
// It must be created after pageSize is available, otherwise setup will fail before the first request.
let topFeedSession = createWebLikeTopFeedSession()

// 推荐页过滤器
const { options: forYouFilterOptions } = useFilterAdvance('foryou-filter')

// Context menu uses `pageType` to determine which filter storage to use.
// For both rcmd/appRcmd we map to the same key (`foryou-filter`), so a constant is fine here.
provide('pageType', 'rcmd')

function shouldFilterByForYou(item: any): boolean {
  if (!forYouFilterOptions.value.enabled || forYouFilterOptions.value.rules.length === 0)
    return false
  return forYouFilterOptions.value.rules.filter(r => r.enabled).some((rule) => {
    if (rule.type === 'title' && item.title) {
      return item.title.toLowerCase().includes(rule.value.toLowerCase())
    }
    else if (rule.type === 'username' && item.owner?.name) {
      return item.owner.name.toLowerCase().includes(rule.value.toLowerCase())
    }
    else if (rule.type === 'uid' && item.owner?.mid) {
      return String(item.owner.mid) === rule.value
    }
    return false
  })
}

function isWebLikePlatformMode(mode: ForYouPlatformMode): boolean {
  return mode === 'web' || mode === 'guest'
}

onMounted(() => {
  initData()
  initPageAction()
})

onActivated(() => {
  initPageAction()
})

watch(platformMode, async (newMode, oldMode) => {
  needToLoginFirst.value = false
  noMoreContent.value = false

  if (newMode === 'app')
    settings.value.recommendationMode = 'app'
  else if (newMode === 'web')
    settings.value.recommendationMode = 'web'
  // guest mode doesn't change settings

  const switchedSource = newMode !== oldMode
  const reuseWebLikeSession = isWebLikePlatformMode(newMode)

  if (switchedSource && reuseWebLikeSession) {
    // Switching source should not inherit the previous source's click feedback chain.
    // Keep the current session counters, but clear last_clicklist before the next request.
    topFeedSession.clearClickFeedback()
  }

  await initData({
    resetWebLikeSession: !reuseWebLikeSession,
  })
})

watch(() => accessKey.value, async (newAccessKey) => {
  if (!newAccessKey)
    return
  if (!isAppMode.value)
    return
  await initData()
})

async function initData(options: { resetWebLikeSession?: boolean } = {}) {
  if (isLoading.value) {
    pendingInit.value = true
    return
  }

  const resetWebLikeSession = options.resetWebLikeSession ?? true

  noMoreContent.value = false
  videoList.value.length = 0
  appVideoList.value.length = 0
  if (resetWebLikeSession)
    topFeedSession = createWebLikeTopFeedSession()
  await getData()
}

async function getData() {
  emit('beforeLoading')
  isLoading.value = true
  try {
    if (isAppMode.value) {
      if (!accessKey.value)
        return
      await getAppRecommendVideos()
    }
    else if (isWebMode.value) {
      await getRecommendVideosWeb()
    }
    else {
      await getRecommendVideosGuest()
    }
  }
  finally {
    isLoading.value = false
    emit('afterLoading')

    if (pendingInit.value) {
      pendingInit.value = false
      await initData()
    }
  }
}

function initPageAction() {
  // Manual refresh page: this tab owns refresh through the side rail only.
  // Keep bottom auto-loading disabled so we never inherit a previous tab's pagination callback.
  handleReachBottom.value = undefined

  handlePageRefresh.value = async () => {
    await refreshCurrentFeed()
  }
}

async function refreshCurrentFeed() {
  // Manual refresh should advance the current web-like session instead of creating a brand-new one.
  // That keeps uniq_id stable inside the tab and lets fresh_idx/last_showlist continue like the homepage.
  if (isWebLikeMode.value)
    topFeedSession.recordBrush()
  await initData({
    resetWebLikeSession: !isWebLikeMode.value,
  })
}

async function getRecommendVideosGuest() {
  try {
    let i = 0
    if (videoList.value.length < pageSize.value) {
      const pendingVideos: VideoElement[] = Array.from({
        length: pageSize.value - videoList.value.length,
      }, () => ({
        uniqueId: `unique-id-${(videoList.value.length || 0) + i++}`,
      } satisfies VideoElement))
      videoList.value.push(...pendingVideos)
    }

    const response: forYouResult = await api.video.getRecommendVideosGuest(buildWebLikeRequestParams())

    if (!response.data) {
      noMoreContent.value = true
      return
    }
    if (response.code === 0) {
      topFeedSession.applyResponse(response, { phase: 'current' })
      const resData = (response.data.item as WebLikeVideoItem[])
        .filter(item => !isForYouAdItem(item))
        .filter(item => !shouldFilterByForYou(item))
      if (!videoList.value.length) {
        videoList.value = resData.map(item => ({ uniqueId: `${item.id}`, item }))
      }
      else {
        resData.forEach((item) => {
          const findFirstEmptyItemIndex = videoList.value.findIndex(video => !video.item)
          if (findFirstEmptyItemIndex !== -1) {
            videoList.value[findFirstEmptyItemIndex] = {
              uniqueId: `${item.id}`,
              item,
            }
          }
          else {
            videoList.value.push({
              uniqueId: `${item.id}`,
              item,
            })
          }
        })
      }
    }
  }
  finally {
    const filledItems = videoList.value.filter(video => video.item)
    videoList.value = filledItems
  }
}

async function getRecommendVideosWeb() {
  try {
    let i = 0
    if (videoList.value.length < pageSize.value) {
      const pendingVideos: VideoElement[] = Array.from({
        length: pageSize.value - videoList.value.length,
      }, () => ({
        uniqueId: `unique-id-${(videoList.value.length || 0) + i++}`,
      } satisfies VideoElement))
      videoList.value.push(...pendingVideos)
    }

    const response: forYouResult = await api.video.getRecommendVideosWeb(buildWebLikeRequestParams())

    if (!response.data) {
      noMoreContent.value = true
      return
    }
    if (response.code === 0) {
      topFeedSession.applyResponse(response, { phase: 'current' })
      const resData = (response.data.item as WebLikeVideoItem[])
        .filter(item => !isForYouAdItem(item))
        .filter(item => !shouldFilterByForYou(item))
      if (!videoList.value.length) {
        videoList.value = resData.map(item => ({ uniqueId: `${item.id}`, item }))
      }
      else {
        resData.forEach((item) => {
          const findFirstEmptyItemIndex = videoList.value.findIndex(video => !video.item)
          if (findFirstEmptyItemIndex !== -1) {
            videoList.value[findFirstEmptyItemIndex] = {
              uniqueId: `${item.id}`,
              item,
            }
          }
          else {
            videoList.value.push({
              uniqueId: `${item.id}`,
              item,
            })
          }
        })
      }
    }
    else if (response.code === 62011) {
      needToLoginFirst.value = true
    }
  }
  finally {
    const filledItems = videoList.value.filter(video => video.item)
    videoList.value = filledItems
  }
}

async function getAppRecommendVideos() {
  try {
    let i = 0
    if (appVideoList.value.length < pageSize.value) {
      const pendingVideos: AppVideoElement[] = Array.from({
        length: pageSize.value - appVideoList.value.length,
      }, () => ({
        uniqueId: `unique-id-${(appVideoList.value.length || 0) + i++}`,
      } satisfies AppVideoElement))
      appVideoList.value.push(...pendingVideos)
    }

    const response: AppForYouResult = await api.video.getAppRecommendVideos({
      access_key: accessKey.value,
      s_locale: settings.value.language === LanguageType.Mandarin_TW || settings.value.language === LanguageType.Cantonese ? 'zh-Hant_TW' : 'zh-Hans_CN',
      c_locate: settings.value.language === LanguageType.Mandarin_TW || settings.value.language === LanguageType.Cantonese ? 'zh-Hant_TW' : 'zh-Hans_CN',
      appkey: TVAppKey.appkey,
      idx: appVideoList.value.length > 0 ? appVideoList.value[appVideoList.value.length - 1].item?.idx : 1,
    })

    if (!response.data) {
      noMoreContent.value = true
      return
    }

    if (response.code === 0) {
      let resData = response.data.items.filter(item => !item.card_type.includes('banner') && item.card_type !== 'cm_v1')
      resData = resData.filter((item) => {
        const owner = {
          mid: item?.mask?.avatar?.up_id || item?.args?.up_id || 0,
          name: item?.mask?.avatar?.text || item?.args?.up_name || '',
          face: item?.mask?.avatar?.cover || item?.avatar?.cover || '',
        }
        return !shouldFilterByForYou({ ...item, owner, title: item.title || '' })
      })

      if (!appVideoList.value.length) {
        appVideoList.value = resData.map(item => ({ uniqueId: `${item.idx}`, item }))
      }
      else {
        resData.forEach((item) => {
          const findFirstEmptyItemIndex = appVideoList.value.findIndex(video => !video.item)
          if (findFirstEmptyItemIndex !== -1) {
            appVideoList.value[findFirstEmptyItemIndex] = {
              uniqueId: `${item.idx}`,
              item,
            }
          }
          else {
            appVideoList.value.push({
              uniqueId: `${item.idx}`,
              item,
            })
          }
        })
      }
    }
    else if (response.code === 62011) {
      needToLoginFirst.value = true
    }
  }
  finally {
    const filledItems = appVideoList.value.filter(video => video.item)
    appVideoList.value = filledItems
  }
}

function createWebLikeTopFeedSession() {
  // Reset the session whenever this tab reloads so request params continue from a fresh homepage-like state.
  return createTopFeedSession({
    ps: pageSize.value,
    screen: [normalizeScreenSize(width.value), normalizeScreenSize(height.value)],
  })
}

function buildWebLikeRequestParams(): Record<string, string> {
  return topFeedSession.getCurrentParams({
    web_location: '1430650',
    y_num: `${gridColumnCount.value}`,
    fresh_type: '3',
    feed_version: 'V8',
    fetch_row: '1',
    device: 'win',
    homepage_ver: '1',
    ps: `${pageSize.value}`,
    last_y_num: `${gridColumnCount.value}`,
    screen: `${normalizeScreenSize(width.value)}-${normalizeScreenSize(height.value)}`,
    seo_info: '',
    tt_exp: '',
  })
}

function handleWebLikeVideoClick(item?: WebLikeVideoItem) {
  if (!item || !isWebLikeMode.value)
    return

  // Feed the next request with the last interacted card, and only advance y_num/last_y_num by real clicks.
  topFeedSession.recordClick(item)
}

function isForYouAdItem(item?: WebLikeVideoItem): boolean {
  const businessInfo = item?.business_info
  return Boolean(
    item?.goto === 'ad'
    || businessInfo?.is_ad
    || businessInfo?.creative_id
    || businessInfo?.card_type === 82,
  )
}

function getWebLikeCardVideo(item?: WebLikeVideoItem) {
  if (!item)
    return undefined

  const businessInfo = item.business_info
  const archive = businessInfo?.archive
  const owner = item.owner ?? archive?.owner
  const stat = item.stat ?? archive?.stat
  const title = isForYouAdItem(item)
    ? `🚀广告 ${businessInfo?.title || archive?.title || item.title || ''}`
    : item.title

  return {
    id: Number(item.id || archive?.aid || archive?.cid || 0),
    duration: item.duration || archive?.duration || 0,
    title,
    cover: item.pic || businessInfo?.pic || archive?.pic || '',
    author: {
      name: owner?.name || businessInfo?.adver_name || businessInfo?.desc || '',
      authorFace: owner?.face || '',
      followed: !!item.is_followed,
      mid: owner?.mid || undefined,
    },
    view: Number(stat?.view || stat?.vv || 0),
    danmaku: Number(stat?.danmaku || 0),
    publishedTimestamp: Number(item.pubdate || archive?.pubdate || 0),
    bvid: `${item.bvid || archive?.bvid || ''}` || undefined,
    cid: Number(item.cid || archive?.cid || 0) || undefined,
  }
}

function normalizeScreenSize(value: number): number {
  const size = Math.round(value)
  return size > 0 ? size : 1
}

function jumpToLoginPage() {
  location.href = 'https://passport.bilibili.com/login'
}

defineExpose({ initData })
</script>

<template>
  <div>
    <div flex="~ gap-40px" w-full>
      <div v-if="isAppMode && !accessKey" flex="~ col" flex-1>
        <div flex justify-center>
          <Empty mt-6 :description="$t('settings.authorize_app_desc')">
            <Button type="primary" @click="showAccessKeyAuthorizeDialog = true">
              {{ $t('settings.btn.authorize') }}...
            </Button>
          </Empty>
        </div>
      </div>

      <div v-else-if="needToLoginFirst" flex="~ col" flex-1>
        <div flex justify-center>
          <Empty mt-6 :description="$t('common.please_log_in_first')">
            <Button type="primary" @click="jumpToLoginPage()">
              {{ $t('common.login') }}
            </Button>
          </Empty>
        </div>
      </div>

      <div
        v-else
        m="b-0 t-0" relative w-full h-full
        flex-1
      >
        <main
          w-full
          :class="gridClass"
        >
          <template v-if="isWebLikeMode">
            <ForYouVideoCard
              v-for="video in videoList"
              :key="video.uniqueId"
              :skeleton="!video.item"
              type="rcmd"
              :video="getWebLikeCardVideo(video.item)"
              :show-preview="true"
              :horizontal="gridLayout !== 'adaptive'"
              :more-btn="true"
              @click="handleWebLikeVideoClick(video.item)"
            />
          </template>

          <template v-else>
            <ForYouVideoCard
              v-for="video in appVideoList"
              :key="video.uniqueId"
              :skeleton="!video.item"
              type="appRcmd"
              :video="video.item ? {
                id: video.item.args.aid ?? 0,
                durationStr: video.item.cover_right_text,
                title: `${video.item.title}`,
                cover: `${video.item.cover}`,
                author: {
                  name: video.item?.mask?.avatar.text,
                  authorFace: video.item?.mask?.avatar.cover || video.item?.avatar?.cover,
                  followed: video.item?.bottom_rcmd_reason === '已关注' || video.item?.bottom_rcmd_reason === '已關注',
                  mid: video.item?.mask?.avatar.up_id,
                },
                capsuleText: video.item?.desc?.split('·')[1],
                bvid: video.item.bvid,
                viewStr: video.item.cover_left_text_1,
                danmakuStr: video.item.cover_left_text_2,
                cid: video.item?.player_args?.cid,
                goto: video.item?.goto,
                url: video.item?.goto === 'bangumi' ? video.item.uri : '',
                type: video.item.card_goto === 'bangumi' ? 'bangumi' : isVerticalVideo(video.item.uri!) ? 'vertical' : 'horizontal',
                threePointV2: video.item?.three_point_v2,
              } : undefined"
              :show-preview="true"
              :horizontal="gridLayout !== 'adaptive'"
              :more-btn="true"
            />
          </template>
        </main>
      </div>

      <div hidden xl:block>
        <ForYouRefreshRail v-model="platformMode" :loading="isLoading" @refresh="refreshCurrentFeed" />
      </div>
    </div>

    <Loading v-show="isLoading" />
    <!-- no more content -->
    <Empty v-if="noMoreContent" class="pb-4" :description="$t('common.no_more_content')" />

    <AccessKeyAuthorizeDialog v-model="showAccessKeyAuthorizeDialog" />
  </div>
</template>

<style lang="scss" scoped>
.grid-adaptive {
  --uno: "grid 2xl:cols-5 xl:cols-4 lg:cols-3 md:cols-2 sm:cols-1 cols-1 gap-5";
}

.grid-two-columns {
  --uno: "grid cols-1 xl:cols-2 gap-4";
}

.grid-one-column {
  --uno: "grid cols-1 gap-4";
}
</style>
