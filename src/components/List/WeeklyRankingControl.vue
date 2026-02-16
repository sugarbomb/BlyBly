<script setup lang="ts">
import Button from '~/components/Button.vue'

interface MonthWeekStatus {
  issue?: number | string
  uploaded?: boolean
  label?: string
}

const props = withDefaults(defineProps<{
  month?: number | string
  issue: number | string
  title: string
  monthStatuses?: MonthWeekStatus[]
  activeWeekIndex?: number
  canPrev?: boolean
  canNext?: boolean
}>(), {
  monthStatuses: () => [],
  activeWeekIndex: -1,
  canPrev: true,
  canNext: true,
})

const emit = defineEmits<{
  (e: 'prevMonth'): void
  (e: 'nextMonth'): void
  (e: 'selectWeek', index: number): void
}>()

const normalizedMonthStatuses = computed(() => {
  return Array.from({ length: 4 }, (_, index) => {
    const status = props.monthStatuses[index]
    const rawIssue = `${status?.issue ?? status?.label ?? index + 1}`
    const digitOnly = rawIssue.replace(/\D/g, '')

    return {
      issue: digitOnly || `${index + 1}`,
      uploaded: status?.uploaded ?? false,
    }
  })
})

const normalizedIssue = computed(() => {
  const issueText = `${props.issue}`
  const digitOnly = issueText.replace(/\D/g, '')
  return digitOnly || issueText
})

const normalizedMonth = computed(() => {
  const monthText = `${props.month ?? ''}`
  const digitOnly = monthText.replace(/\D/g, '')
  if (!digitOnly)
    return ''

  return digitOnly.padStart(2, '0')
})

function handlePrevMonth() {
  if (!props.canPrev)
    return

  emit('prevMonth')
}

function handleNextMonth() {
  if (!props.canNext)
    return

  emit('nextMonth')
}

function handleSelectWeek(index: number) {
  emit('selectWeek', index)
}
</script>

<template>
  <div class="weekly-ranking-control">
    <div class="header-row">
      <div class="issue-group" aria-label="当前期数">
        <span v-if="normalizedMonth" class="issue-month">
          {{ normalizedMonth }}月
        </span>
        <span class="issue-number">{{ normalizedIssue }}</span>
      </div>
      <h3 class="ranking-title">
        {{ title }}
      </h3>
    </div>

    <div class="month-controls">
      <Button
        type="secondary"
        :disabled="!canPrev"
        @click="handlePrevMonth"
      >
        <div i-mingcute:left-line />
      </Button>

      <div class="month-status-list">
        <button
          v-for="(status, index) in normalizedMonthStatuses"
          :key="`${index}-${status.issue}`"
          type="button"
          class="month-status-item"
          :class="{
            uploaded: status.uploaded,
            active: activeWeekIndex === index,
          }"
          @click="handleSelectWeek(index)"
        >
          <span class="month-status-dot" />
          <span>{{ status.issue }}</span>
        </button>
      </div>

      <Button
        type="secondary"
        :disabled="!canNext"
        @click="handleNextMonth"
      >
        <div i-mingcute:right-line />
      </Button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.weekly-ranking-control {
  --weekly-gap: 0.625rem;
  --weekly-header-gap: 0.75rem;
  --weekly-control-gap: 0.5rem;
  --weekly-status-gap: 0.5rem;
  --weekly-status-padding-block: 0.375rem;
  --weekly-status-padding-inline: 0.5rem;
  --weekly-issue-size: 2.25em;
  --weekly-issue-month-size: 0.875em;
  --weekly-title-size: 1em;

  display: flex;
  flex-direction: column;
  gap: var(--weekly-gap);
  width: 100%;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--weekly-header-gap);
  flex-wrap: wrap;
}

.issue-number {
  font-size: var(--weekly-issue-size);
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--bew-theme-color);
}

.issue-group {
  display: flex;
  align-items: baseline;
  gap: calc(var(--weekly-header-gap) * 0.5);
}

.issue-month {
  font-size: var(--weekly-issue-month-size);
  font-weight: 600;
  color: var(--bew-text-2);
}

.month-controls {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--weekly-control-gap);
}

.month-status-list {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--weekly-status-gap);
}

.month-status-item {
  padding: var(--weekly-status-padding-block) var(--weekly-status-padding-inline);
  color: var(--bew-text-2);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(var(--weekly-status-gap) * 0.5);
  font-size: 0.75em;
  border-radius: var(--bew-radius);
  border: 0;
  background: transparent;
  transition: color 200ms;
  cursor: pointer;
}

.month-status-item:hover {
  background: transparent;
  color: var(--bew-text-1);
}

.month-status-item.uploaded {
  color: var(--bew-theme-color);
}

.month-status-item.active {
  text-decoration: underline;
  text-underline-offset: 0.25em;
}

.month-status-dot {
  width: 0.25em;
  height: 0.25em;
  border-radius: 999px;
  background: currentcolor;
}

.month-status-item.uploaded .month-status-dot {
  background: currentcolor;
}

.ranking-title {
  margin: 0;
  font-size: var(--weekly-title-size);
  font-weight: 600;
  color: var(--bew-text-1);
  text-align: center;
}
</style>
