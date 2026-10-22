<script setup lang="ts" generic="T = unknown">
import type { CSSProperties } from 'vue'
import { computed, nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, reactive, ref, toRefs, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { GridLayoutType } from '~/logic'

import type { RecommendationLayoutMetrics, RecommendationLoadContext, RecommendationLoadTrigger, RecommendationPageLoader } from './types'
import { calculateRecommendationSize } from './types'
import { useRecommendationGestures } from './useRecommendationGestures'
import { useRecommendationList } from './useRecommendationList'

const props = withDefaults(defineProps<{
  loadPage?: RecommendationPageLoader<T>
  getItemKey?: (item: T) => string | number | undefined
  immediate?: boolean
  gridLayout?: GridLayoutType
  toolsSide?: 'left' | 'right'
  showTools?: boolean
  showNavigation?: boolean
  toolsPositionRatio?: number
  loadModes?: RecommendationLoadTrigger[]
  loading?: boolean
  noMore?: boolean
  scrollTarget?: HTMLElement
  bottomDistance?: number
  wheelThreshold?: number
  wheelConfirmThreshold?: number
  pullThreshold?: number
  pullConfirmThreshold?: number
  wheelIndicator?: boolean
  pullMotion?: boolean
  minItemWidth?: number
  maxColumns?: number
  itemAspectRatio?: number
  itemContentHeight?: number
  horizontalItemHeight?: number
  minItems?: number
  maxItems?: number
  extraRows?: number
  itemCount?: number
}>(), {
  immediate: true,
  gridLayout: 'adaptive',
  toolsSide: 'right',
  showTools: true,
  showNavigation: true,
  toolsPositionRatio: 25,
  loadModes: () => ['manual', 'pull'],
  loading: false,
  noMore: false,
  bottomDistance: 300,
  wheelThreshold: 400,
  wheelConfirmThreshold: 800,
  pullThreshold: 80,
  pullConfirmThreshold: 160,
  wheelIndicator: true,
  pullMotion: true,
  minItemWidth: 240,
  maxColumns: 5,
  itemAspectRatio: 16 / 9,
  itemContentHeight: 108,
  horizontalItemHeight: 140,
  minItems: 1,
  maxItems: 60,
  extraRows: 0,
})

const emit = defineEmits<{
  (event: 'load', source: RecommendationLoadTrigger): void
  (event: 'layoutChange', metrics: RecommendationLayoutMetrics): void
  (event: 'beforeLoading'): void
  (event: 'afterLoading'): void
}>()
const { t } = useI18n()

const list = useRecommendationList<T>(
  context => props.loadPage!(context),
  item => props.getItemKey?.(item),
)
const managed = computed(() => !!props.loadPage)
const loading = computed(() => props.loading || (managed.value && (list.loading.value || list.refreshing.value)))
const noMore = computed(() => props.noMore || (managed.value && !loading.value && list.noMore.value))

const gridRef = ref<HTMLElement>()
const toolsRef = ref<HTMLElement>()
const toolsTop = ref(20)
const metrics = ref<RecommendationLayoutMetrics>({ columns: 1, rows: 1, itemCount: props.minItems })
const active = ref(true)
const gap = computed(() => props.gridLayout === 'adaptive' ? 20 : 16)
const gridStyle = computed<CSSProperties>(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${metrics.value.columns}, minmax(0, 1fr))`,
  gap: `${gap.value}px`,
}))
let resizeObserver: ResizeObserver | undefined
let pendingLoad = false
let emptyLoads = 0

function refresh(source: RecommendationLoadContext['source'] = 'manual') {
  emptyLoads = 0
  return managed.value ? list.refresh(source, metrics.value.itemCount) : Promise.resolve()
}

function retry() {
  if (managed.value)
    void list.load(list.mode.value === 'append' ? 'bottom' : 'manual', metrics.value.itemCount)
}

function requestLoad(source: RecommendationLoadTrigger = 'manual', commitReady?: Promise<void>) {
  if (props.loadModes.includes('bottom') && source !== 'bottom')
    return false
  if (!active.value || loading.value || (noMore.value && source === 'bottom') || pendingLoad || !props.loadModes.includes(source))
    return false
  pendingLoad = true
  if (managed.value)
    void list.load(source, metrics.value.itemCount, commitReady)
  emit('load', source)
  void nextTick(() => {
    pendingLoad = false
  })
  return true
}

function measure() {
  if (!active.value || !gridRef.value)
    return
  const rect = gridRef.value.getBoundingClientRect()
  if (rect.width <= 0)
    return
  const viewport = props.scrollTarget?.getBoundingClientRect()
  const viewportBottom = Math.min(window.innerHeight, viewport?.bottom ?? window.innerHeight)
  const viewportTop = Math.max(0, viewport?.top ?? 0)
  const toolsHeight = toolsRef.value?.getBoundingClientRect().height ?? 0
  toolsTop.value = Math.max(16, Math.min(
    (viewportBottom - viewportTop) * props.toolsPositionRatio / 100,
    viewportBottom - viewportTop - toolsHeight - 16,
  ))
  const height = Math.max(0, viewportBottom - Math.max(viewportTop, rect.top))
  let columns = 1
  if (props.gridLayout === 'adaptive') {
    columns = Math.max(1, Math.min(props.maxColumns, Math.floor((rect.width + gap.value) / (Math.max(1, props.minItemWidth) + gap.value))))
  }
  else if (props.gridLayout === 'twoColumns') {
    columns = rect.width >= props.minItemWidth * 2 + gap.value ? 2 : 1
  }
  const cardWidth = Math.max(1, (rect.width - gap.value * (columns - 1)) / columns)
  const itemHeight = props.gridLayout === 'adaptive'
    ? cardWidth / Math.max(0.1, props.itemAspectRatio) + props.itemContentHeight
    : props.horizontalItemHeight
  const next = calculateRecommendationSize({
    height,
    columns,
    gap: gap.value,
    itemHeight,
    minItems: props.minItems,
    maxItems: props.maxItems,
    extraRows: props.extraRows,
    itemCount: props.itemCount,
  })
  if (next.columns !== metrics.value.columns || next.rows !== metrics.value.rows || next.itemCount !== metrics.value.itemCount) {
    metrics.value = next
    emit('layoutChange', next)
  }
}

function handleScroll() {
  if (!active.value || !props.loadModes.includes('bottom') || !gridRef.value)
    return
  const viewportBottom = Math.min(window.innerHeight, props.scrollTarget?.getBoundingClientRect().bottom ?? window.innerHeight)
  if (gridRef.value.getBoundingClientRect().bottom <= viewportBottom + props.bottomDistance)
    requestLoad('bottom')
}

const {
  source: gestureSource,
  dragging,
  triggered,
  rebounding,
  finishRebound,
  pullEnabled,
  firstProgress,
  secondProgress,
  showIndicator,
  indicatorPosition,
  contentStyle,
  handleWheel,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  handleClick,
  cancelPull,
  reset: resetGestures,
} = useRecommendationGestures(reactive({ ...toRefs(props), loading, noMore }), active, requestLoad)

const preservingItems = computed(() => list.loading.value && list.source.value === 'pull' && rebounding.value && list.items.value.length > 0)
const displayItems = computed(() => list.loading.value && list.mode.value === 'replace' && !preservingItems.value ? [] : list.items.value)

watch(loading, (value) => {
  if (!managed.value)
    return
  if (value)
    emit('beforeLoading')
  else
    emit('afterLoading')
}, { flush: 'sync' })

watch(list.loading, (value) => {
  if (!managed.value)
    return
  if (!value && !list.error.value) {
    emptyLoads = list.addedCount.value ? 0 : emptyLoads + 1
    if (emptyLoads < 3 && !list.refreshing.value)
      void nextTick(handleScroll)
  }
}, { flush: 'sync' })

watch(list.refreshing, (value) => {
  if (!value && !list.error.value)
    void nextTick(handleScroll)
})

watch(() => props.scrollTarget, (target, previous) => {
  previous?.removeEventListener('scroll', handleScroll)
  target?.addEventListener('scroll', handleScroll, { passive: true })
  void nextTick(measure)
})

watch(() => [props.gridLayout, props.minItemWidth, props.maxColumns, props.itemAspectRatio, props.itemContentHeight, props.horizontalItemHeight, props.minItems, props.maxItems, props.extraRows, props.itemCount, props.showTools, props.showNavigation, props.toolsPositionRatio, props.loadModes.join(',')], () => nextTick(measure))

watch(() => props.loadModes.join(','), () => {
  emptyLoads = 0
  void nextTick(handleScroll)
})

onMounted(() => {
  resizeObserver = new ResizeObserver(measure)
  if (gridRef.value)
    resizeObserver.observe(gridRef.value)
  props.scrollTarget?.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('resize', measure, { passive: true })
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
  window.addEventListener('pointercancel', cancelPull)
  window.addEventListener('blur', resetGestures)
  measure()
  if (managed.value && props.immediate)
    void refresh('initial')
})

onActivated(() => {
  active.value = true
  void nextTick(() => {
    measure()
    handleScroll()
  })
})
onDeactivated(() => {
  active.value = false
  resetGestures()
})
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  props.scrollTarget?.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', measure)
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
  window.removeEventListener('pointercancel', cancelPull)
  window.removeEventListener('blur', resetGestures)
})

defineExpose({ requestLoad, refresh, metrics, items: list.items, loading, noMore, error: list.error })
</script>

<template>
  <div class="recommendation-layout" :class="{ 'tools-left': toolsSide === 'left' }">
    <section
      class="recommendation-content"
      :class="{ 'pull-enabled': pullEnabled, 'is-dragging': dragging }"
      @wheel="handleWheel" @pointerdown="handlePointerDown" @click.capture="handleClick"
      @touchstart.passive="handleTouchStart" @touchmove="handleTouchMove" @touchend="handleTouchEnd" @touchcancel="cancelPull"
    >
      <div v-if="pullEnabled" class="pull-affordance">
        <button
          type="button" class="pull-grip" data-recommendation-grip
          :disabled="loading" :title="t('recommendation.pull_refresh')"
          :aria-label="t('recommendation.pull_refresh')"
        >
          <span class="i-mingcute:hand-grab-line" aria-hidden="true" />
          <span>{{ t(dragging ? 'recommendation.cancel' : 'recommendation.pull_refresh') }}</span>
        </button>
      </div>
      <div class="recommendation-moving" :style="contentStyle" @transitionend.self="finishRebound">
        <nav v-if="showNavigation && $slots.navigation" class="recommendation-navigation">
          <slot name="navigation" :metrics="metrics" />
        </nav>
        <div ref="gridRef" :style="gridStyle">
          <slot :metrics="metrics" :items="displayItems" :loading="loading" />
          <slot v-if="loading && !preservingItems && !rebounding" name="placeholder" :count="metrics.itemCount" :mode="list.mode.value" />
        </div>
        <slot name="status" :loading="loading" :no-more="noMore" :error="list.error.value">
          <Loading v-show="loading && !rebounding" />
          <Empty v-if="!loading && list.error.value" class="pb-4" :description="t('recommendation.load_failed')">
            <Button type="secondary" @click="retry">
              {{ t('recommendation.retry') }}
            </Button>
          </Empty>
          <Empty v-else-if="noMore" class="pb-4" :description="t('common.no_more_content')" />
        </slot>
      </div>
    </section>
    <aside v-if="showTools && $slots.tools && !loadModes.includes('bottom')" ref="toolsRef" class="recommendation-tools" :style="{ top: `${toolsTop}px` }">
      <slot name="tools" :load="requestLoad" :loading="loading" :metrics="metrics" />
    </aside>
    <div v-if="showIndicator" class="gesture-indicator" :style="indicatorPosition" role="status" aria-live="polite">
      <div class="gesture-ring">
        <svg viewBox="0 0 56 56" aria-hidden="true">
          <circle class="ring-track" cx="28" cy="28" r="23" />
          <circle class="ring-track" cx="28" cy="28" r="16" />
          <circle
            class="ring-progress" cx="28" cy="28" r="23" pathLength="100"
            :stroke-dashoffset="100 * (1 - firstProgress)"
          />
          <circle
            class="ring-progress ring-second" cx="28" cy="28" r="16" pathLength="100"
            :stroke-dashoffset="100 * (1 - secondProgress)"
          />
        </svg>
        <span class="ring-stage">{{ triggered ? '✓' : firstProgress < 1 ? '1' : '2' }}</span>
      </div>
      <div>
        <div>{{ t(triggered ? 'recommendation.loading' : firstProgress < 1 ? 'recommendation.confirming' : 'recommendation.await_confirmation') }}</div>
        <div class="gesture-hint">
          {{ t(triggered ? 'recommendation.complete' : gestureSource === 'wheel' ? 'recommendation.wheel_hint' : 'recommendation.pull_hint') }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.recommendation-layout {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  width: 100%;
}

.tools-left {
  flex-direction: row-reverse;
}

.recommendation-content {
  flex: 1;
  min-width: 0;
}

.recommendation-navigation {
  margin-bottom: 20px;
}

.recommendation-tools {
  position: sticky;
  top: 20px;
  flex-shrink: 0;
}
.recommendation-content.pull-enabled {
  cursor: grab;
}

.recommendation-content.is-dragging {
  cursor: grabbing;
  user-select: none;
}

.recommendation-moving {
  will-change: transform;
}

.pull-affordance {
  position: sticky;
  top: calc(var(--bew-top-bar-height, 0px) + 12px);
  z-index: 2;
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
  pointer-events: none;
}

.pull-grip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border: 1px solid var(--bew-border-color);
  border-radius: 999px;
  background: var(--bew-elevated);
  color: var(--bew-text-2);
  box-shadow: var(--bew-shadow-1);
  font-size: 12px;
  cursor: grab;
  touch-action: none;
  user-select: none;
  pointer-events: auto;
}

.is-dragging .pull-grip {
  cursor: grabbing;
}

.gesture-indicator {
  position: fixed;
  box-sizing: border-box;
  width: 236px;
  max-width: calc(100vw - 24px);
  z-index: 10001;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px 10px 8px;
  border: 1px solid var(--bew-border-color);
  border-radius: var(--bew-radius);
  background: var(--bew-elevated-solid);
  box-shadow: var(--bew-shadow-2);
  font-size: 13px;
  pointer-events: none;
}

.gesture-ring {
  position: relative;
  width: 56px;
  height: 56px;
  flex-shrink: 0;
}

.gesture-ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
  fill: none;
  stroke-width: 3;
}

.ring-track {
  stroke: var(--bew-fill-2);
}

.ring-progress {
  stroke: var(--bew-theme-color);
  stroke-dasharray: 100;
  stroke-linecap: round;
}

.ring-second {
  stroke: var(--bew-text-1);
}

.ring-stage {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 12px;
}

.gesture-hint {
  margin-top: 4px;
  color: var(--bew-text-2);
  font-size: 11px;
}
</style>
