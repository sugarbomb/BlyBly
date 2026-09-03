<script setup lang="ts">
import { useWindowSize } from '@vueuse/core'
import { computed, provide } from 'vue'

import ForYouVideoCard from '~/components/VideoCard/ForYouVideoCard.vue'
import { useBewlyApp } from '~/composables/useAppProvider'
import { FilterScope, useFilterAdvance } from '~/composables/useFilterAdvance'
import type { GridLayoutType } from '~/logic'
import type { forYouResult } from '~/models/video/forYou'
import api from '~/utils/api'
import { createTopFeedSession } from '~/utils/topFeedSession'

const props = defineProps<{
  gridLayout: GridLayoutType
}>()

const emit = defineEmits<{
  (e: 'beforeLoading'): void
  (e: 'afterLoading'): void
}>()

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

const gridClass = computed((): string => {
  if (props.gridLayout === 'adaptive')
    return 'grid-adaptive'
  if (props.gridLayout === 'twoColumns')
    return 'grid-two-columns'
  return 'grid-one-column'
})

const videoList = ref<VideoElement[]>([])
const isLoading = ref(false)
const noMoreContent = ref(false)
const pendingInit = ref(false)
const { handleReachBottom, handlePageRefresh } = useBewlyApp()
const { width, height } = useWindowSize()

const gridColumnCount = computed<number>(() => {
  if (props.gridLayout === 'adaptive') {
    if (width.value >= 1536)
      return 5
    if (width.value >= 1280)
      return 4
    if (width.value >= 1024)
      return 3
    if (width.value >= 768)
      return 2
  }
  if (props.gridLayout === 'twoColumns')
    return width.value >= 1280 ? 2 : 1
  return 1
})

const pageSize = computed(() => Math.max(4, Math.min(gridColumnCount.value * 2, 10)))
let topFeedSession = createWebLikeTopFeedSession()

const { shouldFilterItem } = useFilterAdvance(FilterScope.ForYou)
provide('pageType', 'rcmd')

onMounted(() => {
  initData()
  initPageAction()
})

onActivated(initPageAction)

async function initData(options: { resetSession?: boolean } = {}) {
  if (isLoading.value) {
    pendingInit.value = true
    return
  }

  noMoreContent.value = false
  videoList.value.length = 0
  if (options.resetSession ?? true)
    topFeedSession = createWebLikeTopFeedSession()
  await getData()
}

async function getData() {
  emit('beforeLoading')
  isLoading.value = true
  try {
    let i = 0
    const pendingVideos = Array.from({ length: pageSize.value }, () => ({
      uniqueId: `unique-id-${i++}`,
    } satisfies VideoElement))
    videoList.value.push(...pendingVideos)

    const response: forYouResult = await api.video.getRecommendVideosGuest(buildRequestParams())
    if (!response.data) {
      noMoreContent.value = true
      return
    }
    if (response.code === 0) {
      topFeedSession.applyResponse(response, { phase: 'current' })
      videoList.value = (response.data.item as WebLikeVideoItem[])
        .filter(item => !isAdItem(item))
        .filter(item => !shouldFilterItem(item))
        .map(item => ({ uniqueId: `${item.id}`, item }))
    }
  }
  finally {
    videoList.value = videoList.value.filter(video => video.item)
    isLoading.value = false
    emit('afterLoading')
    if (pendingInit.value) {
      pendingInit.value = false
      await initData()
    }
  }
}

function initPageAction() {
  handleReachBottom.value = undefined
  handlePageRefresh.value = refreshFeed
}

async function refreshFeed() {
  topFeedSession.recordBrush()
  await initData({ resetSession: false })
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
  <div>
    <main w-full :class="gridClass">
      <ForYouVideoCard
        v-for="video in videoList"
        :key="video.uniqueId"
        :skeleton="!video.item"
        type="rcmd"
        :video="getCardVideo(video.item)"
        :show-preview="true"
        :horizontal="gridLayout !== 'adaptive'"
        :more-btn="true"
        @click="handleVideoClick(video.item)"
      />
    </main>

    <Loading v-show="isLoading" />
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
