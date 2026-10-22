<script setup lang="ts">
import { useWindowSize } from '@vueuse/core'
import { computed, provide } from 'vue'
import { useI18n } from 'vue-i18n'

import RecommendationLayout from '~/components/RecommendationLayout/RecommendationLayout.vue'
import type { RecommendationLayoutHandle, RecommendationLayoutMetrics, RecommendationLoadContext, RecommendationPage } from '~/components/RecommendationLayout/types'
import ForYouRefreshRail from '~/components/SideBar/ForYouRefreshRail.vue'
import ForYouVideoCard from '~/components/VideoCard/ForYouVideoCard.vue'
import { useBewlyApp } from '~/composables/useAppProvider'
import { type FilterMatch, FilterScope, useFilterAdvance } from '~/composables/useFilterAdvance'
import { useRecommendationLayoutSettings } from '~/composables/useRecommendationLayoutSettings'
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

const { t } = useI18n()
const layoutSettings = useRecommendationLayoutSettings('home')
const layoutOptions = computed(() => ({
  ...layoutSettings.value,
  minItems: 4,
  maxItems: 10,
  itemCount: layoutSettings.value.itemCount === undefined ? undefined : Math.max(4, Math.min(layoutSettings.value.itemCount, 10)),
}))
const layoutRef = ref<RecommendationLayoutHandle<VideoElement>>()
const videoList = computed({
  get: () => layoutRef.value?.items ?? [],
  set: (items: VideoElement[]) => {
    if (layoutRef.value)
      layoutRef.value.items = items
  },
})
const needToLoginFirst = ref(false)
const recommendationMasks = ref<Record<string, RecommendationMaskState>>({})
const pageActive = ref(true)
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
const { handleReachBottom, handlePageRefresh, scrollbarRef } = useBewlyApp()
const { width, height } = useWindowSize()

const scrollViewport = computed<HTMLElement | undefined>(() => scrollbarRef.value?.osInstance()?.elements().viewport)
const gridColumnCount = ref(1)
const pageSize = ref(4)
let topFeedSession = createWebLikeTopFeedSession()

function handleLayoutChange(metrics: RecommendationLayoutMetrics) {
  gridColumnCount.value = metrics.columns
  pageSize.value = Math.max(4, Math.min(metrics.itemCount, 10))
}

// 推荐页过滤器
const { getFilterMatch } = useFilterAdvance(FilterScope.ForYou)

// Context menu uses `pageType` to determine which filter scope to use.
provide('pageType', 'rcmd')

onMounted(initPageAction)
onActivated(initPageAction)
onDeactivated(() => {
  pageActive.value = false
})
onBeforeUnmount(() => {
  pageActive.value = false
  invalidateAutoFeedbackQueue()
})

async function initData(options: { resetWebLikeSession?: boolean } = {}) {
  needToLoginFirst.value = false
  await nextTick()
  await layoutRef.value?.refresh((options.resetWebLikeSession ?? true) ? 'initial' : 'manual')
}

function initPageAction() {
  pageActive.value = true
  handleReachBottom.value = undefined
  handlePageRefresh.value = () => initData({ resetWebLikeSession: false })
  void processAutoFeedbackQueue()
}

function handleAfterLoading() {
  emit('afterLoading')
  void processAutoFeedbackQueue()
}

async function loadPage(context: RecommendationLoadContext): Promise<RecommendationPage<VideoElement>> {
  pageSize.value = Math.max(4, Math.min(context.count, 10))
  if (context.mode === 'replace') {
    invalidateAutoFeedbackQueue()
    recommendationMasks.value = {}
  }
  else {
    autoFeedbackBatchTaskCount = 0
  }
  if (context.source === 'initial')
    topFeedSession = createWebLikeTopFeedSession()
  else
    topFeedSession.recordBrush()

  const response: forYouResult = await api.video.getRecommendVideosWeb(buildWebLikeRequestParams())
  if (context.signal.aborted)
    throw new DOMException('Aborted', 'AbortError')
  if (response.code === 62011) {
    needToLoginFirst.value = true
    return { items: [], hasMore: false }
  }
  if (response.code !== 0)
    throw new Error(t('recommendation.load_failed'))
  if (!response.data)
    return { items: [], hasMore: false }

  topFeedSession.applyResponse(response, { phase: 'current' })
  const items = (response.data.item ?? []) as WebLikeVideoItem[]
  return {
    items: items.filter(shouldDisplayRecommendation).flatMap((item) => {
      const filterMatch = getFilterMatch({ ...item, owner: item.owner ?? undefined })
      const uniqueId = `${item.id}`
      if (!filterMatch)
        return [{ uniqueId, item }]
      const reasonId = getAutoFeedbackReasonId(item, filterMatch)
      if (!reasonId)
        return []
      enqueueAutoFeedback({ uniqueId, item, reasonId, match: filterMatch })
      return [{ uniqueId, item }]
    }),
    hasMore: items.length > 0,
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
    return t(match.rule.type === 'uid' ? 'recommendation.feedback_reasons.author_id' : 'recommendation.feedback_reasons.author_keyword', { keyword: match.keyword })
  if (match.target === 'title')
    return t('recommendation.feedback_reasons.title_keyword', { keyword: match.keyword })
  return t('recommendation.feedback_reasons.video_id', { videoId: match.videoId })
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
}

async function processAutoFeedbackQueue() {
  if (autoFeedbackWorker)
    return autoFeedbackWorker
  if (!pageActive.value || layoutRef.value?.loading)
    return

  autoFeedbackWorker = (async () => {
    while (autoFeedbackQueue.length > 0) {
      const generation = autoFeedbackGeneration
      // Delay the first submission too, and never submit alongside a list refresh.
      await waitForAutoFeedbackInterval()
      if (!pageActive.value || layoutRef.value?.loading)
        break
      if (generation !== autoFeedbackGeneration)
        continue
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
    if (pageActive.value && !layoutRef.value?.loading && autoFeedbackQueue.some(task => task.generation === autoFeedbackGeneration))
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
          reason: t(reasonId === 4 ? 'recommendation.feedback_reasons.dislike_author' : 'recommendation.feedback_reasons.dislike_content'),
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
    ? `🚀${t('recommendation.advertisement')} ${businessInfo?.title || archive?.title || item.title || ''}`
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

    <RecommendationLayout
      v-else ref="layoutRef" v-bind="layoutOptions"
      :grid-layout="props.gridLayout" :scroll-target="scrollViewport"
      :load-page="loadPage" :get-item-key="video => video.uniqueId"
      @layout-change="handleLayoutChange"
      @before-loading="emit('beforeLoading')" @after-loading="handleAfterLoading"
    >
      <template #default="{ items }">
        <ForYouVideoCard
          v-for="video in items"
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
      </template>
      <template #placeholder="{ count }">
        <ForYouVideoCard v-for="index in count" :key="`pending-${index}`" skeleton type="rcmd" :horizontal="gridLayout !== 'adaptive'" />
      </template>
      <template v-if="layoutOptions.loadModes.includes('manual')" #tools="{ load, loading }">
        <ForYouRefreshRail :loading="loading" :placement="layoutOptions.toolsSide === 'left' ? 'right' : 'left'" @refresh="load('manual')" />
      </template>
    </RecommendationLayout>
  </div>
</template>
