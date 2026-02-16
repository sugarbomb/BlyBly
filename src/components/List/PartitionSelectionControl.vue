<script setup lang="ts">
interface PartitionItem {
  id: string | number
  name: string
  icon?: string
  color?: string
  href?: string
  zoneId?: string | number
  disabled?: boolean
}

interface PartitionSelectPayload {
  partition: PartitionItem
  selected: boolean
  selectedIds: Array<string | number>
  selectedPartitions: PartitionItem[]
}

const props = withDefaults(defineProps<{
  modelValue?: Array<string | number>
  visible?: boolean
  partitions?: PartitionItem[]
  emptyText?: string
  confirmText?: string
}>(), {
  modelValue: () => [],
  visible: true,
  partitions: () => [],
  emptyText: '暂无可选分区',
  confirmText: '确认这些选中',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Array<string | number>): void
  (e: 'update:visible', value: boolean): void
  (e: 'change', partitions: PartitionItem[]): void
  (e: 'selectPartition', payload: PartitionSelectPayload): void
  (e: 'confirm', partitions: PartitionItem[]): void
}>()

const normalizedPartitions = computed<PartitionItem[]>(() => {
  const items: PartitionItem[] = []

  props.partitions.forEach((partition, index) => {
    const name = `${partition?.name ?? ''}`.trim()
    const zoneId = `${partition?.zoneId ?? ''}`.trim()
    if (!name)
      return

    items.push({
      id: partition.id ?? `partition-${index}`,
      name,
      icon: `${partition.icon ?? ''}`.trim() || undefined,
      color: `${partition.color ?? ''}`.trim() || undefined,
      href: `${partition.href ?? ''}`.trim() || undefined,
      zoneId,
      disabled: !!partition.disabled || !zoneId,
    })
  })

  return items
})

const selectedIds = computed(() => {
  const validIds = new Set(normalizedPartitions.value.filter(item => !item.disabled).map(item => item.id))
  return props.modelValue.filter(id => validIds.has(id))
})

const selectedIdSet = computed(() => {
  return new Set(selectedIds.value)
})

const selectedPartitions = computed(() => {
  return normalizedPartitions.value.filter(partition => selectedIdSet.value.has(partition.id))
})

watch(normalizedPartitions, (nextPartitions) => {
  const validIds = new Set(nextPartitions.filter(item => !item.disabled).map(item => item.id))
  const nextSelectedIds = props.modelValue.filter(id => validIds.has(id))
  if (nextSelectedIds.length === props.modelValue.length)
    return

  const nextSelectedPartitions = nextPartitions.filter(item => nextSelectedIds.includes(item.id))
  emit('update:modelValue', nextSelectedIds)
  emit('change', nextSelectedPartitions)
})

function handleSelect(partition: PartitionItem) {
  if (partition.disabled)
    return

  const nextSelectedIdSet = new Set(selectedIdSet.value)
  let selected = false

  if (nextSelectedIdSet.has(partition.id)) {
    nextSelectedIdSet.delete(partition.id)
  }
  else {
    nextSelectedIdSet.add(partition.id)
    selected = true
  }

  const nextSelectedIds = normalizedPartitions.value
    .map(item => item.id)
    .filter(id => nextSelectedIdSet.has(id))

  const nextSelectedPartitions = normalizedPartitions.value
    .filter(item => nextSelectedIdSet.has(item.id))

  emit('update:modelValue', nextSelectedIds)
  emit('change', nextSelectedPartitions)
  emit('selectPartition', {
    partition,
    selected,
    selectedIds: nextSelectedIds,
    selectedPartitions: nextSelectedPartitions,
  })
}

function handleConfirm() {
  if (!selectedPartitions.value.length)
    return

  emit('confirm', selectedPartitions.value)
  emit('update:visible', false)
}

function resolveFallbackLabel(name: string): string {
  const label = `${name}`.trim()
  if (!label)
    return '#'
  return label.slice(0, 1).toUpperCase()
}

defineExpose({
  selectedPartitions,
})
</script>

<template>
  <div v-show="visible" class="partition-select-control">
    <div
      v-if="normalizedPartitions.length"
      class="partition-grid"
      role="listbox"
      aria-label="分区选择"
    >
      <button
        v-for="partition in normalizedPartitions"
        :key="partition.id"
        type="button"
        class="partition-item"
        :class="{
          active: selectedIdSet.has(partition.id),
          disabled: partition.disabled,
        }"
        :title="partition.href || partition.name"
        :data-href="partition.href || undefined"
        :data-zone-id="partition.zoneId || undefined"
        :aria-selected="selectedIdSet.has(partition.id)"
        :aria-disabled="partition.disabled"
        @click="handleSelect(partition)"
      >
        <span class="partition-icon">
          <svg v-if="partition.icon?.startsWith('#')" aria-hidden="true">
            <use :xlink:href="partition.icon" />
          </svg>
          <i
            v-else-if="partition.icon?.startsWith('i-')"
            :class="partition.icon"
            :style="{ color: partition.color }"
            aria-hidden="true"
          />
          <img v-else-if="partition.icon" :src="partition.icon" :alt="partition.name" loading="lazy">
          <span v-else class="partition-icon-fallback">
            {{ resolveFallbackLabel(partition.name) }}
          </span>
        </span>
        <span class="partition-name">{{ partition.name }}</span>
      </button>
    </div>
    <div v-else class="partition-empty">
      {{ emptyText }}
    </div>

    <div class="partition-actions">
      <span class="selected-count">已选 {{ selectedPartitions.length }} 项</span>
      <button
        type="button"
        class="confirm-btn"
        :disabled="!selectedPartitions.length"
        @click="handleConfirm"
      >
        {{ confirmText }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.partition-select-control {
  width: 100%;
}

.partition-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(112px, 1fr));
  gap: 0.5rem;
}

.partition-item {
  min-height: 2.5rem;
  border: 0;
  border-radius: var(--bew-radius);
  background: transparent;
  color: var(--bew-text-2);
  padding: 0.4rem 0.625rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition:
    border-color 200ms,
    color 200ms,
    background-color 200ms;
  box-shadow: none;
}

.partition-item:hover {
  background: var(--bew-fill-1);
}

.partition-item.active {
  color: var(--bew-text-auto);
  background: var(--bew-theme-color);
}

.partition-item.disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.partition-item.disabled:hover {
  color: var(--bew-text-2);
  background: transparent;
}

.partition-icon {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.partition-icon svg,
.partition-icon i {
  width: 1.1rem;
  height: 1.1rem;
  font-size: 1rem;
}

.partition-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.partition-icon-fallback {
  font-size: 0.9em;
  line-height: 1;
}

.partition-name {
  font-size: 0.875em;
  font-weight: 600;
  color: currentcolor;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.partition-empty {
  min-height: 2.5rem;
  border-radius: var(--bew-radius);
  border: 1px dashed var(--bew-border-color);
  color: var(--bew-text-3);
  font-size: 0.875em;
  display: flex;
  align-items: center;
  justify-content: center;
}

.partition-actions {
  margin-top: 0.625rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.selected-count {
  color: var(--bew-text-2);
  font-size: 0.75em;
}

.confirm-btn {
  border: 1px solid transparent;
  border-radius: var(--bew-radius);
  background: var(--bew-theme-color);
  color: var(--bew-text-auto);
  padding: 0.35rem 0.75rem;
  font-size: 0.8em;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 200ms;
}

.confirm-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .partition-grid {
    grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
  }

  .partition-item {
    padding: 0.35rem 0.5rem;
    gap: 0.375rem;
  }
}
</style>
