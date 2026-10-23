<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import PartitionSelectionControl from '~/components/List/PartitionSelectionControl.vue'
import RecommendationLayout from '~/components/RecommendationLayout/RecommendationLayout.vue'
import type { RecommendationLayoutHandle, RecommendationLoadContext, RecommendationPage } from '~/components/RecommendationLayout/types'
import PartitionRealtimeControlRail from '~/components/SideBar/PartitionRealtimeControlRail.vue'
import type { Video } from '~/components/VideoCard/types'
import { useBewlyApp } from '~/composables/useAppProvider'
import { FilterScope, useFilterAdvance } from '~/composables/useFilterAdvance'
import { useRecommendationControls, useRecommendationLayoutSettings } from '~/composables/useRecommendationLayoutSettings'
import { type GridLayoutType, partitionForYouState } from '~/logic'
import type { PartitionNavigationMode } from '~/logic/storage'
import api from '~/utils/api'
import { PARTITION_ZONE_DATASET_V2 } from '~/utils/partitionZoneDatasetv2'

defineOptions({
  name: 'PartitionForYou',
})

const props = defineProps<{
  gridLayout: GridLayoutType
  topBarVisibility?: boolean
}>()

const emit = defineEmits<{
  (e: 'beforeLoading'): void
  (e: 'afterLoading'): void
}>()

interface PartitionOption {
  id: string | number
  name: string
  icon?: string
  color?: string
  href?: string
  zoneId?: string | number
}

interface PartitionForYouResult {
  code: number
  data?: {
    archives?: PartitionForYouArchive[]
    items?: PartitionForYouArchive[]
    item?: PartitionForYouArchive[]
    list?: PartitionForYouArchive[]
  }
}

interface PartitionForYouArchive {
  aid?: number | string
  bvid?: string
  cid?: number | string
  pic?: string
  cover?: string
  title?: string
  desc?: string
  dynamic?: string
  duration?: number | string
  pubdate?: number | string
  tname?: string
  owner?: {
    mid?: number | string
    name?: string
    face?: string
  }
  author?: {
    mid?: number | string
    name?: string
    face?: string
  }
  stat?: {
    view?: number | string
    danmaku?: number | string
  }
}

interface VideoElement {
  uniqueId: string
  item?: PartitionForYouArchive
}

const PAGE_SIZE = 15
const DISPLAY_ID_MIN = 1
const DISPLAY_ID_MAX_MIN = 3
const DISPLAY_ID_MAX_MAX = 10

const { t } = useI18n()
const { handleReachBottom, handlePageRefresh, scrollbarRef } = useBewlyApp()
const { shouldFilterItem } = useFilterAdvance(FilterScope.PartitionForYou)
const partitionControls = useRecommendationControls('partition')
const layoutSettings = useRecommendationLayoutSettings('partition')
const layoutRef = ref<RecommendationLayoutHandle<VideoElement>>()
const videoList = computed(() => layoutRef.value?.items ?? [])
const scrollViewport = computed<HTMLElement | undefined>(() => scrollbarRef.value?.osInstance()?.elements().viewport)
const displayId = ref<number>(DISPLAY_ID_MIN)
const displayIdCycleMax = ref<number>(getRandomDisplayIdCycleMax())
const showPartitionPanel = computed<boolean>({
  get: () => partitionForYouState.value.showPanel && partitionControls.value.showNavigation,
  set: (value) => {
    partitionForYouState.value.showPanel = value
    if (value && !partitionControls.value.showNavigation)
      partitionControls.value = { ...partitionControls.value, showNavigation: true }
  },
})
const editingNavigation = ref(!partitionForYouState.value.navigationPartitionIds?.length)
const navigationMode = computed<PartitionNavigationMode>({
  get: () => partitionForYouState.value.navigationMode === 'pick' ? 'pick' : 'all',
  set: (value) => {
    editingNavigation.value = value === 'pick'
    partitionForYouState.value.navigationMode = value
    partitionForYouState.value.previewEnabled = value !== 'pick'
  },
})
const previewEnabled = computed({
  get: () => navigationMode.value !== 'pick',
  set: (value: boolean) => navigationMode.value = value ? 'all' : 'pick',
})
const selectedPartitionIds = computed<Array<string | number>>({
  get: () => partitionForYouState.value.selectedPartitionIds,
  set: value => partitionForYouState.value.selectedPartitionIds = value,
})
const navigationPartitionIds = computed<Array<string | number>>({
  get: () => partitionForYouState.value.navigationPartitionIds ?? [],
  set: value => partitionForYouState.value.navigationPartitionIds = value,
})
const activePartitionId = computed<string | number | null>({
  get: () => partitionForYouState.value.activePartitionId,
  set: value => partitionForYouState.value.activePartitionId = value,
})

provide('pageType', 'partitionForYou')

const partitionOptions = ref<PartitionOption[]>(PARTITION_ZONE_DATASET_V2.map((item, index) => ({
  id: item.zoneId || `zone-${index + 1}`,
  zoneId: item.zoneId || '',
  name: item.name || `分区 ${index + 1}`,
  icon: item.icon,
  href: item.href || '',
})))

const selectedPartitions = computed(() => {
  const selectedSet = new Set(selectedPartitionIds.value)
  return partitionOptions.value.filter(item => selectedSet.has(item.id))
})

const activePartition = computed(() => {
  return partitionOptions.value.find(item => item.id === activePartitionId.value) ?? null
})

const browsing = computed(() => !showPartitionPanel.value || navigationMode.value === 'all' || !editingNavigation.value)
const activeRegion = computed(resolveActivePartitionId)
const layoutOptions = computed(() => ({
  ...layoutSettings.value,
  loadModes: browsing.value && activeRegion.value ? layoutSettings.value.loadModes : [],
  // The endpoint returns a fixed batch; sizing does not change its request parameters.
  maxItems: PAGE_SIZE,
  itemCount: layoutSettings.value.itemCount === undefined ? undefined : Math.min(PAGE_SIZE, layoutSettings.value.itemCount),
}))
const showRefresh = computed(() => browsing.value && layoutSettings.value.loadModes.includes('manual'))

const partitionStatus = computed<'idle' | 'selected'>(() => {
  return activePartition.value ? 'selected' : 'idle'
})

const railStatusIcon = computed(() => {
  if (partitionStatus.value === 'selected')
    return activePartition.value?.icon || 'i-mingcute:question-line'
  return 'i-mingcute:question-line'
})

const railStatusColor = computed(() => {
  return activePartition.value?.color || ''
})

const railStatusLabel = computed(() => {
  if (partitionStatus.value === 'idle' || !activePartition.value)
    return '未选择分区'
  return `当前分区：${activePartition.value.name}`
})

const switchDisabled = computed(() => {
  return !browsing.value || selectedPartitions.value.length <= 1
})

function shouldFilterByForYou(item: { aid?: number | string, bvid?: string, title?: string, owner?: { name?: string, mid?: number | string } }): boolean {
  return shouldFilterItem(item)
}

function resolveArchiveOwner(item: PartitionForYouArchive) {
  return item.author ?? item.owner ?? {}
}

onMounted(() => {
  initPageAction()
})

onActivated(() => {
  initPageAction()
})

watch(browsing, async (value) => {
  if (!value || videoList.value.length)
    return
  const currentLayout = layoutRef.value
  await nextTick()
  if (currentLayout && currentLayout === layoutRef.value)
    await initData()
})

watch(activeRegion, (nextPartitionId, prevPartitionId) => {
  if (nextPartitionId === prevPartitionId)
    return
  resetDisplayIdCycle()
}, { flush: 'sync' })

function initPageAction() {
  // The common layout owns bottom detection for this tab.
  handleReachBottom.value = undefined

  handlePageRefresh.value = async () => {
    await initData()
  }
}

async function initData() {
  if (!browsing.value || !activeRegion.value)
    return
  await nextTick()
  if (!browsing.value)
    return
  await layoutRef.value?.refresh()
}

async function loadPage(context: RecommendationLoadContext): Promise<RecommendationPage<VideoElement>> {
  if (context.signal.aborted || !browsing.value)
    throw new DOMException('Aborted', 'AbortError')
  const fromRegion = activeRegion.value
  if (!fromRegion)
    return { items: [], hasMore: false }

  const response = await api.partition.getPartitionForYouList({
    from_region: fromRegion,
    display_id: displayId.value,
  }) as PartitionForYouResult

  if (context.signal.aborted || !browsing.value || fromRegion !== activeRegion.value)
    throw new DOMException('Aborted', 'AbortError')
  if (response?.code !== 0)
    throw new Error(t('recommendation.load_failed'))

  const rawArchives = extractArchives(response)
  const archives = rawArchives.filter((item) => {
    const owner = resolveArchiveOwner(item)
    return !shouldFilterByForYou({
      aid: item.aid,
      bvid: item.bvid,
      title: item.title ?? '',
      owner: { name: owner?.name ?? '', mid: owner?.mid },
    })
  })
  displayId.value = getNextDisplayId(displayId.value)
  return {
    items: archives.map((item, index) => ({ uniqueId: resolveUniqueId(item, index), item })),
    hasMore: rawArchives.length > 0,
  }
}

function extractArchives(response: PartitionForYouResult): PartitionForYouArchive[] {
  const data = response.data
  if (!data)
    return []

  return data.items ?? data.item ?? data.archives ?? data.list ?? []
}

function resolveUniqueId(item: PartitionForYouArchive, index: number): string {
  const aid = toNumber(item.aid)
  if (aid)
    return `aid-${aid}`

  const bvid = `${item.bvid ?? ''}`.trim()
  if (bvid)
    return `bvid-${bvid}`

  return `partition-foryou-video-${index}`
}

function getRandomDisplayIdCycleMax(): number {
  return Math.floor(Math.random() * (DISPLAY_ID_MAX_MAX - DISPLAY_ID_MAX_MIN + 1)) + DISPLAY_ID_MAX_MIN
}

function resetDisplayIdCycle() {
  displayId.value = DISPLAY_ID_MIN
  displayIdCycleMax.value = getRandomDisplayIdCycleMax()
}

function toNumber(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed))
    return 0
  return parsed
}

function toVideoCardData(item: PartitionForYouArchive, fallbackId: number): Video {
  const aid = toNumber(item.aid)
  const cid = toNumber(item.cid)
  const view = toNumber(item.stat?.view)
  const danmaku = toNumber(item.stat?.danmaku)
  const duration = toNumber(item.duration)
  const publishedTimestamp = toNumber(item.pubdate)
  const authorSource = item.author ?? item.owner
  const mid = toNumber(authorSource?.mid)

  return {
    id: aid || cid || fallbackId,
    aid: aid || undefined,
    bvid: `${item.bvid ?? ''}`.trim() || undefined,
    cid: cid || undefined,
    title: `${item.title ?? ''}`.trim() || '分区投稿',
    desc: `${item.desc ?? item.dynamic ?? ''}`.trim(),
    cover: `${item.pic ?? item.cover ?? ''}`.trim(),
    duration: duration || undefined,
    publishedTimestamp: publishedTimestamp || undefined,
    author: {
      name: `${authorSource?.name ?? ''}`.trim(),
      authorFace: `${authorSource?.face ?? ''}`.trim(),
      mid: mid || undefined,
    },
    view: view || undefined,
    danmaku: danmaku || undefined,
    tag: `${item.tname ?? ''}`.trim(),
    threePointV2: [],
  }
}

function resolveActivePartitionId(): number | null {
  const rawId = activePartition.value?.zoneId ?? activePartition.value?.id
  if (rawId === null || rawId === undefined)
    return null

  const fromRegion = Number(`${rawId}`.trim())
  if (!Number.isFinite(fromRegion) || fromRegion <= 0)
    return null

  return fromRegion
}

function handleSelectPartition(payload: { partition: PartitionOption, selected: boolean, selectedIds: Array<string | number> }) {
  if (!browsing.value)
    return
  if (payload.selected)
    activePartitionId.value = payload.partition.id
  else if (!payload.selectedIds.length)
    activePartitionId.value = null
}

function getNextDisplayId(current: number): number {
  if (current >= displayIdCycleMax.value) {
    displayIdCycleMax.value = getRandomDisplayIdCycleMax()
    return DISPLAY_ID_MIN
  }
  return current + 1
}

function handleSwitchPartition() {
  if (!browsing.value)
    return
  const items = selectedPartitions.value
  if (items.length <= 1)
    return

  const currentIndex = items.findIndex(item => item.id === activePartitionId.value)
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % items.length : 0
  activePartitionId.value = items[nextIndex].id
}

defineExpose({
  initData,
  showPartitionPanel,
  previewEnabled,
  navigationMode,
  selectedPartitionIds,
  selectedPartitions,
  activePartition,
  videoList,
})
</script>

<template>
  <RecommendationLayout
    :key="activeRegion ?? 'idle'" ref="layoutRef" class="partition-recommendations"
    v-bind="layoutOptions" :grid-layout="props.gridLayout" :scroll-target="scrollViewport"
    :load-page="loadPage" :get-item-key="video => video.uniqueId"
    :immediate="browsing && !!activeRegion" :show-navigation="showPartitionPanel" persistent-tools
    @before-loading="emit('beforeLoading')" @after-loading="emit('afterLoading')"
  >
    <template #header="{ load, loading }">
      <div block lg:hidden m="b-3">
        <PartitionRealtimeControlRail
          v-model="showPartitionPanel" variant="inline"
          :status-icon="railStatusIcon" :status-color="railStatusColor" :status-label="railStatusLabel"
          :switch-disabled="switchDisabled" :loading="loading" :show-refresh="showRefresh"
          @switch-partition="handleSwitchPartition" @refresh="load('manual')"
        />
      </div>
    </template>

    <template #navigation>
      <PartitionSelectionControl
        v-model="selectedPartitionIds" v-model:navigation-ids="navigationPartitionIds"
        v-model:editing="editingNavigation" v-model:visible="showPartitionPanel" v-model:mode="navigationMode"
        :browse-active-id="activePartitionId" :partitions="partitionOptions"
        @select-partition="handleSelectPartition"
      />
    </template>

    <template #default="{ items }">
      <VideoCard
        v-for="(video, index) in items" :key="video.uniqueId"
        :skeleton="!video.item" :video="video.item ? toVideoCardData(video.item, index + 1) : undefined"
        show-preview :horizontal="gridLayout !== 'adaptive'"
      />
    </template>
    <template #placeholder="{ count }">
      <VideoCard v-for="index in count" :key="`partition-pending-${index}`" skeleton :horizontal="gridLayout !== 'adaptive'" />
    </template>

    <template #tools="{ load, loading }">
      <PartitionRealtimeControlRail
        v-model="showPartitionPanel"
        :status-icon="railStatusIcon" :status-color="railStatusColor" :status-label="railStatusLabel"
        :switch-disabled="switchDisabled" :loading="loading" :show-refresh="showRefresh"
        :position="layoutOptions.toolsSide" :position-ratio="layoutOptions.toolsPositionRatio"
        @switch-partition="handleSwitchPartition" @refresh="load('manual')"
      />
    </template>
  </RecommendationLayout>
</template>

<style scoped lang="scss">
.partition-recommendations :deep(.recommendation-tools) {
  --uno: "hidden lg:block w-56px";
}
</style>
