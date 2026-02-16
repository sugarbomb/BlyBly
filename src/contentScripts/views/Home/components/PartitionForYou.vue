<script setup lang="ts">
import PartitionSelectionControl from '~/components/List/PartitionSelectionControl.vue'
import PartitionRealtimeControlRail from '~/components/SideBar/PartitionRealtimeControlRail.vue'
import type { Video } from '~/components/VideoCard/types'
import { useBewlyApp } from '~/composables/useAppProvider'
import type { GridLayoutType } from '~/logic'
import { partitionForYouState } from '~/logic'
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

const { handlePageRefresh } = useBewlyApp()
const isLoading = ref<boolean>(false)
const videoList = ref<VideoElement[]>([])
const requestToken = ref<number>(0)
const showPartitionPanel = computed<boolean>({
  get: () => partitionForYouState.value.showPanel,
  set: value => partitionForYouState.value.showPanel = value,
})
const selectedPartitionIds = computed<Array<string | number>>({
  get: () => partitionForYouState.value.selectedPartitionIds,
  set: value => partitionForYouState.value.selectedPartitionIds = value,
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
  return selectedPartitions.value.find(item => item.id === activePartitionId.value) ?? null
})

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
  return selectedPartitions.value.length <= 1
})

const gridClass = computed((): string => {
  if (props.gridLayout === 'adaptive')
    return 'grid-adaptive'
  if (props.gridLayout === 'twoColumns')
    return 'grid-two-columns'
  return 'grid-one-column'
})

onMounted(() => {
  initPageAction()
  initData()
})

onActivated(() => {
  initPageAction()
})

watch(selectedPartitions, (nextSelected) => {
  if (!nextSelected.length) {
    activePartitionId.value = null
    videoList.value = []
    return
  }

  const hasActive = nextSelected.some(item => item.id === activePartitionId.value)
  if (!hasActive)
    activePartitionId.value = nextSelected[0].id
}, { immediate: true })

watch(activePartitionId, (nextPartitionId, prevPartitionId) => {
  if (nextPartitionId === prevPartitionId)
    return
  initData()
})

function initPageAction() {
  handlePageRefresh.value = async () => {
    await initData()
  }
}

async function initData() {
  if (isLoading.value)
    return

  const fromRegion = resolveActivePartitionId()
  if (!fromRegion) {
    videoList.value = []
    return
  }

  emit('beforeLoading')
  isLoading.value = true

  const currentToken = requestToken.value + 1
  requestToken.value = currentToken

  try {
    videoList.value = Array.from({ length: PAGE_SIZE }, (_, index) => ({
      uniqueId: `partition-foryou-${fromRegion}-pending-${currentToken}-${index}`,
    }))

    const response = await api.partition.getPartitionForYouList({
      from_region: fromRegion,
    }) as PartitionForYouResult

    if (currentToken !== requestToken.value)
      return

    if (response?.code === 0) {
      const archives = extractArchives(response)
      videoList.value = archives.map((item, index) => ({
        uniqueId: resolveUniqueId(item, index),
        item,
      }))
    }
    else {
      videoList.value = []
    }

    await nextTick()
  }
  catch (error) {
    console.error(error)
    videoList.value = []
  }
  finally {
    isLoading.value = false
    emit('afterLoading')
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
  if (payload.selected)
    activePartitionId.value = payload.partition.id
  else if (activePartitionId.value === payload.partition.id)
    activePartitionId.value = payload.selectedIds[0] ?? null
}

function handleSwitchPartition() {
  const items = selectedPartitions.value
  if (items.length <= 1)
    return

  const currentIndex = items.findIndex(item => item.id === activePartitionId.value)
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % items.length : 0
  activePartitionId.value = items[nextIndex].id
}

function handleConfirmPartitions(partitions: PartitionOption[]) {
  if (!partitions.length)
    return
  if (!activePartitionId.value)
    activePartitionId.value = partitions[0].id
}

defineExpose({
  initData,
  showPartitionPanel,
  selectedPartitionIds,
  selectedPartitions,
  activePartition,
  videoList,
})
</script>

<template>
  <div flex="~ gap-20px" w-full>
    <main w-full min-w-0 flex="~ col">
      <div block lg:hidden m="b-3">
        <PartitionRealtimeControlRail
          v-model="showPartitionPanel"
          variant="inline"
          :status-icon="railStatusIcon"
          :status-color="railStatusColor"
          :status-label="railStatusLabel"
          :switch-disabled="switchDisabled"
          :loading="isLoading"
          @switch-partition="handleSwitchPartition"
          @refresh="initData"
        />
      </div>

      <PartitionSelectionControl
        v-model="selectedPartitionIds"
        v-model:visible="showPartitionPanel"
        :partitions="partitionOptions"
        @select-partition="handleSelectPartition"
        @confirm="handleConfirmPartitions"
      />

      <div
        m="t-4"
        relative
        w-full
        min-h-0
        :class="gridClass"
      >
        <VideoCard
          v-for="(video, index) in videoList"
          :key="video.uniqueId"
          :skeleton="!video.item"
          :video="video.item ? toVideoCardData(video.item, index + 1) : undefined"
          show-preview
          :horizontal="gridLayout !== 'adaptive'"
        />
      </div>
    </main>

    <div hidden lg:block>
      <PartitionRealtimeControlRail
        v-model="showPartitionPanel"
        :status-icon="railStatusIcon"
        :status-color="railStatusColor"
        :status-label="railStatusLabel"
        :switch-disabled="switchDisabled"
        :loading="isLoading"
        @switch-partition="handleSwitchPartition"
        @refresh="initData"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
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
