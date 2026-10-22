<script setup lang="ts">
import { useWindowSize } from '@vueuse/core'
import { computed, provide } from 'vue'
import { useI18n } from 'vue-i18n'

import RecommendationLayout from '~/components/RecommendationLayout/RecommendationLayout.vue'
import type { RecommendationLayoutHandle, RecommendationLayoutMetrics, RecommendationLoadContext, RecommendationLoadTrigger, RecommendationPage } from '~/components/RecommendationLayout/types'
import ForYouRefreshRail from '~/components/SideBar/ForYouRefreshRail.vue'
import ForYouVideoCard from '~/components/VideoCard/ForYouVideoCard.vue'
import { useBewlyApp } from '~/composables/useAppProvider'
import { FilterScope, useFilterAdvance } from '~/composables/useFilterAdvance'
import { useRecommendationLayoutSettings } from '~/composables/useRecommendationLayoutSettings'
import type { GridLayoutType } from '~/logic'
import type { forYouResult } from '~/models/video/forYou'
import api from '~/utils/api'
import { createTopFeedSession } from '~/utils/topFeedSession'

const props = defineProps<{
  gridLayout: GridLayoutType
  loadModes?: RecommendationLoadTrigger[]
  toolsSide?: 'left' | 'right'
  minItems?: number
  maxItems?: number
  extraRows?: number
}>()

const emit = defineEmits<{
  (e: 'beforeLoading'): void
  (e: 'afterLoading'): void
}>()
const { t } = useI18n()
const layoutSettings = useRecommendationLayoutSettings('guest')
const layoutOptions = computed(() => {
  const current = layoutSettings.value
  const minItems = Math.max(4, Math.min(props.minItems ?? current.minItems, 10))
  const maxItems = Math.max(minItems, Math.min(props.maxItems ?? current.maxItems, 10))
  return {
    ...current,
    toolsSide: props.toolsSide ?? current.toolsSide,
    loadModes: props.loadModes ?? current.loadModes,
    minItems,
    maxItems,
    extraRows: props.extraRows ?? current.extraRows,
    itemCount: current.itemCount === undefined ? undefined : Math.max(minItems, Math.min(current.itemCount, maxItems)),
  }
})

interface VideoElement {
  uniqueId: string
  item?: WebLikeVideoItem
}

interface WebLikeVideoItem {
  id?: number | string
  bvid?: string
  goto?: string
  cid?: number | string
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

const layoutRef = ref<RecommendationLayoutHandle<VideoElement>>()
const { handleReachBottom, handlePageRefresh, scrollbarRef } = useBewlyApp()
const { width, height } = useWindowSize()
const scrollViewport = computed<HTMLElement | undefined>(() => scrollbarRef.value?.osInstance()?.elements().viewport)
const gridColumnCount = ref(1)
const pageSize = ref(layoutOptions.value.minItems)
let topFeedSession = createWebLikeTopFeedSession()

function handleLayoutChange(metrics: RecommendationLayoutMetrics) {
  gridColumnCount.value = metrics.columns
  pageSize.value = Math.max(4, Math.min(metrics.itemCount, 10))
}

const { shouldFilterItem } = useFilterAdvance(FilterScope.ForYouGuest)
provide('pageType', 'guestRcmd')

onMounted(initPageAction)
onActivated(initPageAction)

function initData(options: { resetSession?: boolean } = {}) {
  return layoutRef.value?.refresh((options.resetSession ?? true) ? 'initial' : 'manual') ?? Promise.resolve()
}

async function loadPage(context: RecommendationLoadContext): Promise<RecommendationPage<VideoElement>> {
  pageSize.value = Math.max(4, Math.min(context.count, 10))
  if (context.source === 'initial')
    topFeedSession = createWebLikeTopFeedSession()
  else
    topFeedSession.recordBrush()

  const response: forYouResult = await api.video.getRecommendVideosGuest(buildRequestParams())
  if (context.signal.aborted)
    throw new DOMException('Aborted', 'AbortError')
  if (response.code !== 0)
    throw new Error(t('recommendation.load_failed'))
  if (!response.data)
    return { items: [], hasMore: false }

  topFeedSession.applyResponse(response, { phase: 'current' })
  const items = (response.data.item ?? []) as WebLikeVideoItem[]
  return {
    items: items
      .filter(item => !isAdItem(item))
      .filter(item => !shouldFilterItem({ ...item, owner: item.owner ?? undefined }))
      .map(item => ({ uniqueId: `${item.id}`, item })),
    hasMore: items.length > 0,
  }
}

function initPageAction() {
  // The shared layout owns bottom detection and pagination.
  handleReachBottom.value = undefined
  handlePageRefresh.value = () => layoutRef.value?.refresh('manual')
}

function createWebLikeTopFeedSession() {
  return createTopFeedSession({
    ps: pageSize.value,
    screen: [normalizeScreenSize(width.value), normalizeScreenSize(height.value)],
  })
}

function buildRequestParams(): Record<string, string> {
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

function handleVideoClick(item?: WebLikeVideoItem) {
  if (item)
    topFeedSession.recordClick(item)
}

function isAdItem(item?: WebLikeVideoItem): boolean {
  const businessInfo = item?.business_info
  return Boolean(item?.goto === 'ad' || businessInfo?.is_ad || businessInfo?.creative_id || businessInfo?.card_type === 82)
}

function getCardVideo(item?: WebLikeVideoItem) {
  if (!item)
    return undefined

  const businessInfo = item.business_info
  const archive = businessInfo?.archive
  const owner = item.owner ?? archive?.owner
  const stat = item.stat ?? archive?.stat
  return {
    id: Number(item.id || archive?.aid || archive?.cid || 0),
    duration: item.duration || archive?.duration || 0,
    title: item.title,
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
  return Math.max(1, Math.round(value))
}

defineExpose({ initData })
</script>

<template>
  <RecommendationLayout
    ref="layoutRef"
    v-bind="layoutOptions"
    :load-page="loadPage"
    :get-item-key="video => video.uniqueId"
    :grid-layout="gridLayout"
    :scroll-target="scrollViewport"
    @layout-change="handleLayoutChange"
    @before-loading="emit('beforeLoading')"
    @after-loading="emit('afterLoading')"
  >
    <template v-if="$slots.navigation" #navigation="slotProps">
      <slot name="navigation" v-bind="slotProps" />
    </template>
    <template #default="{ items }">
      <ForYouVideoCard
        v-for="video in items"
        :key="video.uniqueId"
        :skeleton="!video.item"
        type="rcmd"
        :video="getCardVideo(video.item)"
        :show-preview="true"
        :horizontal="gridLayout !== 'adaptive'"
        :more-btn="true"
        @click="handleVideoClick(video.item)"
      />
    </template>
    <template #placeholder="{ count }">
      <ForYouVideoCard
        v-for="index in count" :key="`pending-${index}`"
        skeleton type="rcmd" :horizontal="gridLayout !== 'adaptive'"
      />
    </template>
    <template v-if="layoutOptions.loadModes.includes('manual') || $slots.tools" #tools="slotProps">
      <slot name="tools" v-bind="slotProps">
        <ForYouRefreshRail
          :loading="slotProps.loading"
          :placement="layoutOptions.toolsSide === 'left' ? 'right' : 'left'"
          @refresh="slotProps.load('manual')"
        />
      </slot>
    </template>
  </RecommendationLayout>
</template>
