<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'

import Button from '~/components/Button.vue'

interface MonthWeekStatus {
  issue?: number | string
  uploaded?: boolean
  label?: string
}

interface WeeklySeriesOption {
  number: number | string
  title?: string
  subject?: string
  name?: string
  uploaded?: boolean
  status?: number
}

interface NormalizedSeriesOption {
  number: number
  title: string
  uploaded: boolean
}

const props = withDefaults(defineProps<{
  month?: number | string
  issue: number | string
  title: string
  keywords?: string[]
  monthStatuses?: MonthWeekStatus[]
  seriesOptions?: WeeklySeriesOption[]
  activeWeekIndex?: number
  canPrev?: boolean
  canNext?: boolean
}>(), {
  keywords: () => [],
  monthStatuses: () => [],
  seriesOptions: () => [],
  activeWeekIndex: -1,
  canPrev: true,
  canNext: true,
})

const emit = defineEmits<{
  (e: 'olderMonth'): void
  (e: 'newerMonth'): void
  (e: 'selectWeek', index: number): void
  (e: 'selectSeries', number: number): void
}>()

const seriesPanelOpen = ref(false)
const seriesSearchNumber = ref('')
const seriesSelectorRef = ref<HTMLElement>()

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

const normalizedIssueNumber = computed(() => {
  const issueNumber = Number(normalizedIssue.value)
  return Number.isFinite(issueNumber) ? issueNumber : 0
})

const normalizedMonth = computed(() => {
  const monthText = `${props.month ?? ''}`
  const digitOnly = monthText.replace(/\D/g, '')
  if (!digitOnly)
    return ''

  return digitOnly.padStart(2, '0')
})

const normalizedKeywords = computed(() => {
  const uniqueKeywords = new Set<string>()
  for (const raw of props.keywords) {
    const keyword = `${raw ?? ''}`.trim()
    if (!keyword)
      continue
    uniqueKeywords.add(keyword)
    if (uniqueKeywords.size >= 6)
      break
  }
  return [...uniqueKeywords]
})

const normalizedSeriesOptions = computed(() => {
  const usedNumbers = new Set<number>()

  return props.seriesOptions
    .map((option) => {
      const rawNumber = `${option.number ?? ''}`
      const digitOnly = rawNumber.replace(/\D/g, '')
      const number = Number(digitOnly || rawNumber)

      if (!Number.isFinite(number) || number <= 0 || usedNumbers.has(number))
        return null

      usedNumbers.add(number)

      const uploaded = option.uploaded ?? (option.status === undefined || option.status === 2)

      return {
        number,
        title: `${option.title ?? option.subject ?? option.name ?? ''}`.trim() || `第 ${number} 期`,
        uploaded,
      }
    })
    .filter((option): option is NormalizedSeriesOption => Boolean(option))
    .sort((a, b) => b.number - a.number)
})

const canQuickJump = computed(() => {
  const targetNumber = Number(seriesSearchNumber.value)
  return normalizedSeriesOptions.value.some(option => option.uploaded && option.number === targetNumber)
})

watch(normalizedIssueNumber, (number) => {
  if (!seriesPanelOpen.value)
    seriesSearchNumber.value = number ? `${number}` : ''
}, { immediate: true })

onClickOutside(seriesSelectorRef, () => {
  closeSeriesPanel()
})

function handleOlderMonth() {
  if (!props.canPrev)
    return

  emit('olderMonth')
}

function handleNewerMonth() {
  if (!props.canNext)
    return

  emit('newerMonth')
}

function handleSelectWeek(index: number) {
  const status = normalizedMonthStatuses.value[index]
  if (!status?.uploaded)
    return

  emit('selectWeek', index)
}

function openSeriesPanel() {
  if (!normalizedSeriesOptions.value.length)
    return

  seriesSearchNumber.value = normalizedIssueNumber.value ? `${normalizedIssueNumber.value}` : ''
  seriesPanelOpen.value = true
}

function closeSeriesPanel() {
  seriesPanelOpen.value = false
}

function toggleSeriesPanel() {
  if (seriesPanelOpen.value)
    closeSeriesPanel()
  else
    openSeriesPanel()
}

function handleSelectSeries(number: number) {
  const targetOption = normalizedSeriesOptions.value.find(option => option.number === number)
  if (!targetOption?.uploaded)
    return

  emit('selectSeries', number)
  closeSeriesPanel()
}

function handleQuickJump() {
  const targetNumber = Number(seriesSearchNumber.value)
  if (!Number.isFinite(targetNumber))
    return

  handleSelectSeries(targetNumber)
}
</script>

<template>
  <div class="weekly-ranking-control">
    <div class="weekly-control-content">
      <div class="header-row">
        <div ref="seriesSelectorRef" class="series-selector">
          <div class="issue-group" aria-label="当前期数">
            <span v-if="normalizedMonth" class="issue-month">
              {{ normalizedMonth }}月
            </span>
            <span class="issue-number">{{ normalizedIssue }}</span>
            <button
              type="button"
              class="issue-arrow-button"
              :class="{ active: seriesPanelOpen }"
              title="选择期数"
              aria-label="选择期数"
              :aria-expanded="seriesPanelOpen"
              :disabled="!normalizedSeriesOptions.length"
              @click.stop="toggleSeriesPanel"
              @keydown.esc="closeSeriesPanel"
            >
              <span class="issue-arrow" i-mingcute:down-line />
            </button>
          </div>

          <Transition name="series-panel">
            <div
              v-if="seriesPanelOpen"
              class="series-panel"
              style="backdrop-filter: var(--bew-filter-glass-1)"
            >
              <form class="series-jump-form" @submit.prevent="handleQuickJump">
                <input
                  v-model.trim="seriesSearchNumber"
                  class="series-jump-input"
                  type="number"
                  min="1"
                  inputmode="numeric"
                  placeholder="期数"
                  aria-label="输入期数"
                  @keydown.esc="closeSeriesPanel"
                >
                <button
                  type="submit"
                  class="series-jump-button"
                  :disabled="!canQuickJump"
                >
                  跳转
                </button>
              </form>

              <div class="series-list" role="listbox" aria-label="全部期数">
                <button
                  v-for="option in normalizedSeriesOptions"
                  :key="option.number"
                  type="button"
                  class="series-option"
                  :class="{
                    active: option.number === normalizedIssueNumber,
                    pending: !option.uploaded,
                  }"
                  :disabled="!option.uploaded"
                  :title="option.uploaded ? option.title : '未更新'"
                  role="option"
                  :aria-selected="option.number === normalizedIssueNumber"
                  @click="handleSelectSeries(option.number)"
                >
                  <span class="series-option-number">{{ option.number }}</span>
                  <span class="series-option-title">{{ option.title }}</span>
                </button>
              </div>
            </div>
          </Transition>
        </div>
        <h3 class="ranking-title">
          {{ title }}
        </h3>
      </div>

      <div v-if="normalizedKeywords.length" class="keywords-row" aria-label="推荐词条">
        <span
          v-for="keyword in normalizedKeywords"
          :key="keyword"
          class="keyword-chip"
          :title="keyword"
        >
          {{ keyword }}
        </span>
      </div>
    </div>

    <div class="month-controls">
      <Button
        type="secondary"
        :disabled="!canPrev"
        @click="handleOlderMonth"
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
            pending: !status.uploaded,
            active: activeWeekIndex === index,
          }"
          :title="status.uploaded ? '' : '未更新'"
          :aria-disabled="!status.uploaded"
          @click="handleSelectWeek(index)"
        >
          <span class="month-status-dot" />
          <span>{{ status.issue }}</span>
        </button>
      </div>

      <Button
        type="secondary"
        :disabled="!canNext"
        @click="handleNewerMonth"
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
  --weekly-chip-gap: 0.5rem;
  --weekly-chip-padding-block: 0.2rem;
  --weekly-chip-padding-inline: 0.5rem;
  --weekly-chip-size: 0.75em;
  --weekly-bottom-control-height: 2.25rem;
  --weekly-keywords-line-height: 1.7;
  --weekly-keywords-max-lines: 2;

  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--weekly-gap);
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: visible;
}

.weekly-control-content {
  position: relative;
  z-index: 2;
  flex: 1 0 auto;
  min-width: 0;
  min-height: max-content;
}

.header-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: var(--weekly-header-gap);
  min-width: 0;
}

.series-selector {
  position: relative;
  display: inline-flex;
  align-items: center;
  max-width: 100%;
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
  max-width: 100%;
  padding: 0;
  border: 0;
  color: inherit;
  background: transparent;
}

.issue-arrow-button.active .issue-arrow {
  transform: rotate(180deg);
}

.issue-month {
  font-size: var(--weekly-issue-month-size);
  font-weight: 600;
  color: var(--bew-text-2);
}

.issue-arrow-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  width: 1.375rem;
  height: 1.375rem;
  margin-left: -0.25rem;
  padding: 0;
  border: 0;
  border-radius: var(--bew-radius);
  color: var(--bew-text-2);
  background: transparent;
  cursor: pointer;
  transition:
    color 200ms,
    background 200ms;
}

.issue-arrow-button:hover,
.issue-arrow-button.active {
  color: var(--bew-theme-color);
  background: var(--bew-fill-1);
}

.issue-arrow-button:disabled {
  opacity: 0.45;
  cursor: default;
}

.issue-arrow {
  flex: 0 0 auto;
  font-size: 1rem;
  color: currentcolor;
  transition:
    transform 200ms,
    color 200ms;
}

.series-panel {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  z-index: 20;
  width: min(22rem, calc(100vw - 2rem));
  padding: 0.625rem;
  border: 1px solid var(--bew-border-color);
  border-radius: var(--bew-radius);
  box-shadow: var(--bew-shadow-2);
  background: var(--bew-elevated);
}

.series-jump-form {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.625rem;
}

.series-jump-input {
  min-width: 0;
  flex: 1;
  height: 2rem;
  box-sizing: border-box;
  padding: 0 0.625rem;
  border: 1px solid var(--bew-border-color);
  border-radius: var(--bew-radius);
  color: var(--bew-text-1);
  background: var(--bew-fill-1);
  outline: none;
}

.series-jump-input:focus {
  border-color: var(--bew-theme-color);
}

.series-jump-button {
  flex: 0 0 auto;
  height: 2rem;
  padding: 0 0.75rem;
  border: 0;
  border-radius: var(--bew-radius);
  color: white;
  background: var(--bew-theme-color);
  cursor: pointer;
}

.series-jump-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.series-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 18rem;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.series-option {
  width: 100%;
  display: grid;
  grid-template-columns: 3rem minmax(0, 1fr);
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem;
  border: 0;
  border-radius: var(--bew-radius);
  color: var(--bew-text-1);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition:
    color 200ms,
    background 200ms;
}

.series-option:hover,
.series-option.active {
  color: var(--bew-theme-color);
  background: var(--bew-fill-1);
}

.series-option.pending {
  opacity: 0.55;
  cursor: not-allowed;
}

.series-option-number {
  font-size: 0.875em;
  font-weight: 700;
  color: currentcolor;
}

.series-option-title {
  min-width: 0;
  overflow: hidden;
  color: var(--bew-text-1);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.month-controls {
  position: relative;
  z-index: 0;
  flex: 0 0 auto;
  width: 100%;
  min-height: var(--weekly-bottom-control-height);
  display: flex;
  align-items: center;
  gap: var(--weekly-control-gap);
}

.keywords-row {
  width: 100%;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--weekly-chip-gap);
  margin-top: var(--weekly-gap);
  line-height: var(--weekly-keywords-line-height);
  overflow: hidden;
}

.keyword-chip {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
  padding: var(--weekly-chip-padding-block) var(--weekly-chip-padding-inline);
  box-sizing: border-box;
  overflow: hidden;
  border-radius: var(--bew-radius);
  font-size: var(--weekly-chip-size);
  color: var(--bew-text-2);
  background: var(--bew-fill-1);
  text-overflow: ellipsis;
  white-space: nowrap;
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

.month-status-item.pending {
  opacity: 0.6;
  cursor: not-allowed;
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
  max-width: 100%;
  font-size: var(--weekly-title-size);
  font-weight: 600;
  color: var(--bew-text-1);
  text-align: right;
  min-width: 0;
  padding-right: 0.375rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.series-panel-enter-active,
.series-panel-leave-active {
  transition:
    opacity 160ms,
    transform 160ms;
}

.series-panel-enter-from,
.series-panel-leave-to {
  opacity: 0;
  transform: translateY(-0.25rem);
}
</style>
