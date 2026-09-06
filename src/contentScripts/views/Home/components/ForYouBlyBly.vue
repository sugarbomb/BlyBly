<script setup lang="ts">
import { useWindowSize } from '@vueuse/core'
import { computed, provide } from 'vue'

import ForYouVideoCard from '~/components/VideoCard/ForYouVideoCard.vue'
import { useBewlyApp } from '~/composables/useAppProvider'
import { type FilterMatch, FilterScope, useFilterAdvance } from '~/composables/useFilterAdvance'
import type { GridLayoutType } from '~/logic'
import { settings } from '~/logic'
import type { forYouResult } from '~/models/video/forYou'
import api from '~/utils/api'
import { getCSRF } from '~/utils/main'
import { createTopFeedSession } from '~/utils/topFeedSession'

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

interface RecommendationMaskState {
  type: 'feedback' | 'autoFeedback'
  reasonId: number
  status?: 'queued' | 'submitting'
  videoId?: string
  keyword?: string
  reason?: string
}

interface AutoFeedbackTask {
  generation: number
  uniqueId: string
  item: WebLikeVideoItem
  reasonId: number
  dedupeKey: string
  match: FilterMatch
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
  track_id?: string
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
const isLoading = ref<boolean>(false)
const needToLoginFirst = ref<boolean>(false)
const noMoreContent = ref<boolean>(false)
const pendingInit = ref<boolean>(false)
const recommendationMasks = ref<Record<string, RecommendationMaskState>>({})
const AUTO_FEEDBACK_BATCH_LIMIT = 10
const AUTO_FEEDBACK_INTERVAL_MIN = 1500
const AUTO_FEEDBACK_INTERVAL_MAX = 2500
let autoFeedbackGeneration = 0
let autoFeedbackQueue: AutoFeedbackTask[] = []
let autoFeedbackWorker: Promise<void> | undefined
let autoFeedbackDedupeKeys = new Set<string>()
const autoFeedbackInFlightDedupeKeys = new Set<string>()
const autoFeedbackCompletedDedupeKeys = new Set<string>()
let autoFeedbackBatchTaskCount = 0
const { handleReachBottom, handlePageRefresh } = useBewlyApp()
const { width, height } = useWindowSize()

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
const { getFilterMatch } = useFilterAdvance(FilterScope.ForYou)

// Context menu uses `pageType` to determine which filter scope to use.
provide('pageType', 'rcmd')

onMounted(() => {
  initData()
  initPageAction()
})

onActivated(() => {
  initPageAction()
})

async function initData(options: { resetWebLikeSession?: boolean } = {}) {
  invalidateAutoFeedbackQueue()
  if (isLoading.value) {
    pendingInit.value = true
    return
  }

  const resetWebLikeSession = options.resetWebLikeSession ?? true

  noMoreContent.value = false
  videoList.value.length = 0
  recommendationMasks.value = {}
  if (resetWebLikeSession)
    topFeedSession = createWebLikeTopFeedSession()
  await getData()
}

async function getData() {
  emit('beforeLoading')
  isLoading.value = true
  try {
    await getRecommendVideosWeb()
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
  // Keep bottom auto-loading disabled so we never inherit a previous tab's pagination callback.
  handleReachBottom.value = undefined

  handlePageRefresh.value = async () => {
    await refreshCurrentFeed()
  }
}

async function refreshCurrentFeed() {
  topFeedSession.recordBrush()
  await initData({
    resetWebLikeSession: false,
  })
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
        .filter(shouldDisplayRecommendation)
        .flatMap((item) => {
          const filterMatch = getFilterMatch(item)
          const uniqueId = `${item.id}`

          if (!filterMatch)
            return [{ uniqueId, item }]

          const autoFeedbackReasonId = getAutoFeedbackReasonId(item, filterMatch)
          if (!autoFeedbackReasonId)
            return []

          enqueueAutoFeedback({ uniqueId, item, reasonId: autoFeedbackReasonId, match: filterMatch })
          return [{ uniqueId, item }]
        })
      if (!videoList.value.length) {
        videoList.value = resData
      }
      else {
        resData.forEach((video) => {
          const findFirstEmptyItemIndex = videoList.value.findIndex(video => !video.item)
          if (findFirstEmptyItemIndex !== -1) {
            videoList.value[findFirstEmptyItemIndex] = video
          }
          else {
            videoList.value.push(video)
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
  if (!item)
    return

  // Feed the next request with the last interacted card, and only advance y_num/last_y_num by real clicks.
  topFeedSession.recordClick(item)
}

function getAutoFeedbackReasonId(item: WebLikeVideoItem, match: FilterMatch): number | undefined {
  if (!settings.value.forYouAutoFeedbackWeb || isForYouAdItem(item))
    return undefined
  if (match.temporary && settings.value.forYouAutoFeedbackWebExcludeTemporaryBlocks)
    return undefined
  if (!item.id || !item.owner?.mid || !item.track_id)
    return undefined

  if (match.target === 'author')
    return 4
  if (match.target === 'title')
    return 1

  // A video ID does not describe the author or the content, so it only filters the card.
  return undefined
}

function getFilterMatchReason(match: FilterMatch): string {
  if (match.target === 'author')
    return match.rule.type === 'uid' ? `作者 ID：${match.keyword}` : `作者关键词：${match.keyword}`
  if (match.target === 'title')
    return `标题关键词：${match.keyword}`
  return `视频 ID：${match.videoId}`
}

function createAutoFeedbackMaskState(task: AutoFeedbackTask, status: 'queued' | 'submitting'): RecommendationMaskState {
  return {
    type: 'autoFeedback',
    reasonId: task.reasonId,
    status,
    videoId: task.match.videoId,
    keyword: task.match.keyword,
    reason: getFilterMatchReason(task.match),
  }
}

function enqueueAutoFeedback(task: Omit<AutoFeedbackTask, 'generation' | 'dedupeKey'>) {
  const dedupeKey = `${task.item.id}:${task.reasonId}`
  if (
    autoFeedbackBatchTaskCount >= AUTO_FEEDBACK_BATCH_LIMIT
    || autoFeedbackDedupeKeys.has(dedupeKey)
    || autoFeedbackCompletedDedupeKeys.has(dedupeKey)
    || autoFeedbackInFlightDedupeKeys.has(dedupeKey)
  ) {
    return
  }

  autoFeedbackDedupeKeys.add(dedupeKey)
  autoFeedbackBatchTaskCount++
  const queuedTask: AutoFeedbackTask = {
    ...task,
    generation: autoFeedbackGeneration,
    dedupeKey,
  }
  autoFeedbackQueue.push(queuedTask)
  recommendationMasks.value = {
    ...recommendationMasks.value,
    [task.uniqueId]: createAutoFeedbackMaskState(queuedTask, 'queued'),
  }
  void processAutoFeedbackQueue()
}

async function processAutoFeedbackQueue() {
  if (autoFeedbackWorker)
    return autoFeedbackWorker

  autoFeedbackWorker = (async () => {
    while (autoFeedbackQueue.length > 0) {
      const task = autoFeedbackQueue.shift()!
      if (task.generation !== autoFeedbackGeneration)
        continue

      autoFeedbackInFlightDedupeKeys.add(task.dedupeKey)
      recommendationMasks.value = {
        ...recommendationMasks.value,
        [task.uniqueId]: createAutoFeedbackMaskState(task, 'submitting'),
      }
      try {
        const response = await api.video.dislikeVideoWeb({
          goto: task.item.goto || 'av',
          id: task.item.id,
          mid: task.item.owner?.mid,
          trackId: task.item.track_id,
          reasonId: task.reasonId,
          csrf: getCSRF(),
        })

        if (task.generation !== autoFeedbackGeneration)
          continue

        if (response?.code !== 0) {
          stopAutoFeedbackBatch(task.generation, task.uniqueId)
          break
        }

        autoFeedbackCompletedDedupeKeys.add(task.dedupeKey)
        recommendationMasks.value = {
          ...recommendationMasks.value,
          [task.uniqueId]: {
            ...createAutoFeedbackMaskState(task, 'submitting'),
            type: 'feedback',
            status: undefined,
          },
        }

        if (autoFeedbackQueue.some(nextTask => nextTask.generation === task.generation))
          await waitForAutoFeedbackInterval()
      }
      catch (error) {
        if (task.generation === autoFeedbackGeneration) {
          console.error('Unable to submit automatic Web recommendation feedback', error)
          stopAutoFeedbackBatch(task.generation, task.uniqueId)
          break
        }
        continue
      }
      finally {
        autoFeedbackInFlightDedupeKeys.delete(task.dedupeKey)
      }
    }
  })()

  try {
    await autoFeedbackWorker
  }
  finally {
    autoFeedbackWorker = undefined
    if (autoFeedbackQueue.some(task => task.generation === autoFeedbackGeneration))
      void processAutoFeedbackQueue()
  }
}

function stopAutoFeedbackBatch(generation: number, failedUniqueId: string) {
  const affectedUniqueIds = new Set<string>([failedUniqueId])
  autoFeedbackQueue = autoFeedbackQueue.filter((task) => {
    if (task.generation !== generation)
      return true

    affectedUniqueIds.add(task.uniqueId)
    return false
  })
  removeRecommendationCards(affectedUniqueIds)
}

function invalidateAutoFeedbackQueue() {
  autoFeedbackGeneration++
  autoFeedbackQueue = []
  autoFeedbackDedupeKeys = new Set<string>()
  autoFeedbackBatchTaskCount = 0
}

function removeRecommendationCards(uniqueIds: Set<string>) {
  videoList.value = videoList.value.filter(video => !uniqueIds.has(video.uniqueId))
  const remainingMasks = { ...recommendationMasks.value }
  uniqueIds.forEach(uniqueId => delete remainingMasks[uniqueId])
  recommendationMasks.value = remainingMasks
}

function waitForAutoFeedbackInterval() {
  const interval = AUTO_FEEDBACK_INTERVAL_MIN
    + Math.random() * (AUTO_FEEDBACK_INTERVAL_MAX - AUTO_FEEDBACK_INTERVAL_MIN)
  return new Promise<void>(resolve => window.setTimeout(resolve, interval))
}

async function handleRecommendationAction(action: { key: string }, video: VideoElement) {
  const reasonIdByAction: Record<string, number> = {
    'dislike-content': 1,
    'dislike-author': 4,
  }
  const reasonId = reasonIdByAction[action.key]
  if (!reasonId || !video.item)
    return

  const item = video.item
  try {
    const response = await api.video.dislikeVideoWeb({
      goto: item.goto || 'av',
      id: item.id,
      mid: item.owner?.mid,
      trackId: item.track_id,
      reasonId,
      csrf: getCSRF(),
    })

    if (response?.code === 0) {
      recommendationMasks.value = {
        ...recommendationMasks.value,
        [video.uniqueId]: {
          type: 'feedback',
          reasonId,
          videoId: `${item.bvid || item.id || ''}`,
          reason: reasonId === 4 ? '不喜欢作者' : '不喜欢内容',
        },
      }
    }
  }
  catch (error) {
    console.error('Unable to submit Web recommendation feedback', error)
  }
}

async function handleUndoRecommendationFeedback(video: VideoElement) {
  const maskState = recommendationMasks.value[video.uniqueId]
  if (maskState?.type !== 'feedback' || !video.item)
    return

  const item = video.item
  try {
    const response = await api.video.cancelDislikeVideoWeb({
      goto: item.goto || 'av',
      id: item.id,
      mid: item.owner?.mid,
      trackId: item.track_id,
      reasonId: maskState.reasonId,
      csrf: getCSRF(),
    })

    if (response?.code === 0) {
      const { [video.uniqueId]: _, ...remainingMasks } = recommendationMasks.value
      recommendationMasks.value = remainingMasks
    }
  }
  catch (error) {
    console.error('Unable to cancel Web recommendation feedback', error)
  }
}

function shouldDisplayRecommendation(item: WebLikeVideoItem): boolean {
  return !settings.value.forYouCloseAds
    || !isForYouAdItem(item)
    || settings.value.forYouAdCardHandling === 'mask'
}

function getRecommendationMask(video: VideoElement): 'feedback' | 'advertisement' | 'autoFeedback' | undefined {
  const feedbackMask = recommendationMasks.value[video.uniqueId]
  if (feedbackMask)
    return feedbackMask.type

  if (video.item && settings.value.forYouCloseAds && settings.value.forYouAdCardHandling === 'mask' && isForYouAdItem(video.item))
    return 'advertisement'

  // The auto-feedback setting is reserved for a future API-backed flow.
  return undefined
}

function getRecommendationMaskReason(video: VideoElement): string | undefined {
  return recommendationMasks.value[video.uniqueId]?.reason
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
    <div v-if="needToLoginFirst" flex="~ col" flex-1>
      <div flex justify-center>
        <Empty mt-6 :description="$t('common.please_log_in_first')">
          <Button type="primary" @click="jumpToLoginPage()">
            {{ $t('common.login') }}
          </Button>
        </Empty>
      </div>
    </div>

    <main v-else w-full :class="gridClass">
      <ForYouVideoCard
        v-for="video in videoList"
        :key="video.uniqueId"
        :skeleton="!video.item"
        type="rcmd"
        :video="getWebLikeCardVideo(video.item)"
        :show-preview="true"
        :horizontal="gridLayout !== 'adaptive'"
        :more-btn="true"
        feedback-enabled
        :recommendation-mask="getRecommendationMask(video)"
        :recommendation-mask-reason="getRecommendationMaskReason(video)"
        @click="handleWebLikeVideoClick(video.item)"
        @fan-action="action => handleRecommendationAction(action, video)"
        @undo-feedback="handleUndoRecommendationFeedback(video)"
      />
    </main>

    <Loading v-show="isLoading" />
    <!-- no more content -->
    <Empty v-if="noMoreContent" class="pb-4" :description="$t('common.no_more_content')" />
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
