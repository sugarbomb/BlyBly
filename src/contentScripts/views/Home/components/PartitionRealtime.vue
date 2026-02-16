<script setup lang="ts">
import PartitionSelectionControl from '~/components/List/PartitionSelectionControl.vue'
import PartitionRealtimeControlRail from '~/components/SideBar/PartitionRealtimeControlRail.vue'
import { useBewlyApp } from '~/composables/useAppProvider'
import type { GridLayoutType } from '~/logic'
import { PARTITION_ZONE_DATASET } from '~/utils/partitionZoneDataset'

defineOptions({
  name: 'PartitionRealtime',
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

const { handlePageRefresh } = useBewlyApp()
const isLoading = ref<boolean>(false)
const showPartitionPanel = ref<boolean>(true)
const selectedPartitionIds = ref<Array<string | number>>([])
const activePartitionId = ref<string | number | null>(null)

const partitionOptions = ref<PartitionOption[]>(PARTITION_ZONE_DATASET.map((item, index) => ({
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

const railStatusIcon = computed(() => {
  return activePartition.value?.icon || 'i-mingcute:layout-grid-line'
})

const railStatusColor = computed(() => {
  return activePartition.value?.color || ''
})

const railStatusLabel = computed(() => {
  if (!activePartition.value)
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
})

onActivated(() => {
  initPageAction()
})

watch(selectedPartitions, (nextSelected) => {
  if (!nextSelected.length) {
    activePartitionId.value = null
    return
  }

  const hasActive = nextSelected.some(item => item.id === activePartitionId.value)
  if (!hasActive)
    activePartitionId.value = nextSelected[0].id
}, { immediate: true })

function initPageAction() {
  handlePageRefresh.value = async () => {
    await initData()
  }
}

async function initData() {
  if (isLoading.value)
    return

  emit('beforeLoading')
  isLoading.value = true
  try {
    await nextTick()
  }
  finally {
    isLoading.value = false
    emit('afterLoading')
  }
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
})
</script>

<template>
  <div flex="~ gap-20px" w-full>
    <main w-full min-w-0 :class="gridClass">
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
  --uno: "grid cols-1 gap-4";
}

.grid-two-columns {
  --uno: "grid cols-1 gap-4";
}

.grid-one-column {
  --uno: "grid cols-1 gap-4";
}
</style>
