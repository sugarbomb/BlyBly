<script setup lang="ts">
import { computed, type CSSProperties, onBeforeUnmount, ref } from 'vue'

import Tooltip from '~/components/Tooltip.vue'

export interface RecommendationDislikeWheelAction {
  key: string
  icon: string
  tooltip: string
}

const props = withDefaults(defineProps<{
  actions: RecommendationDislikeWheelAction[]
  count?: number
  triggerIcon?: string
}>(), {
  triggerIcon: 'i-mingcute:close-line',
})

const emit = defineEmits<{
  (e: 'select', action: RecommendationDislikeWheelAction): void
}>()

const wheelSize = 120
const triggerSize = 34
const actionSize = 40
const connectorMarkerId = `recommendation-dislike-wheel-arrow-${Math.random().toString(36).slice(2, 9)}`
const isOpen = ref<boolean>(false)
const closeTimer = ref<number>()

const visibleActions = computed(() => {
  const count = props.count ?? props.actions.length
  return props.actions.slice(0, count)
})

function clearCloseTimer() {
  if (closeTimer.value) {
    clearTimeout(closeTimer.value)
    closeTimer.value = undefined
  }
}

function openMenu() {
  if (!visibleActions.value.length)
    return

  clearCloseTimer()
  isOpen.value = true
}

function scheduleCloseMenu() {
  clearCloseTimer()
  closeTimer.value = window.setTimeout(() => {
    isOpen.value = false
  }, 180)
}

function handleSelect(action: RecommendationDislikeWheelAction) {
  emit('select', action)
  isOpen.value = false
  clearCloseTimer()
}

function getActionPoint(index: number) {
  const total = visibleActions.value.length
  const resolvedTotal = Math.max(total, 1)
  const angle = resolvedTotal === 1
    ? 225
    : 205 + (index / (resolvedTotal - 1)) * 40
  const distance = 50 + (index * 18)
  const rad = angle * Math.PI / 180

  return {
    angle,
    distance,
    x: Math.cos(rad) * distance,
    y: Math.sin(rad) * distance,
  }
}

function getActionStyle(index: number): CSSProperties {
  const total = visibleActions.value.length
  const resolvedTotal = Math.max(total, 1)
  const { x, y } = getActionPoint(index)

  return {
    position: 'absolute',
    right: '0px',
    bottom: '0px',
    zIndex: 3 + index,
    opacity: isOpen.value ? '1' : '0',
    transition: 'transform 180ms ease, opacity 180ms ease',
    transform: isOpen.value
      ? `translate(${x}px, ${y}px) scale(1)`
      : 'translate(0px, 0px) scale(0.55)',
    transitionDelay: isOpen.value
      ? `${index * 22}ms`
      : `${(resolvedTotal - index - 1) * 12}ms`,
    pointerEvents: isOpen.value ? 'auto' : 'none',
  }
}

const connectorLines = computed(() => {
  return visibleActions.value.map((_, index) => {
    const point = getActionPoint(index)

    return {
      key: index,
      x1: wheelSize - (triggerSize / 2),
      y1: wheelSize - (triggerSize / 2),
      x2: wheelSize - (actionSize / 2) + point.x,
      y2: wheelSize - (actionSize / 2) + point.y,
    }
  })
})

onBeforeUnmount(() => {
  clearCloseTimer()
})
</script>

<template>
  <div class="recommendation-dislike-wheel">
    <svg
      class="recommendation-dislike-wheel__connectors"
      :class="{ 'is-open': isOpen }"
      viewBox="0 0 120 120"
      aria-hidden="true"
    >
      <defs>
        <marker
          :id="connectorMarkerId"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill="var(--bew-theme-color)" />
        </marker>
      </defs>

      <line
        v-for="line in connectorLines"
        :key="line.key"
        :x1="line.x1"
        :y1="line.y1"
        :x2="line.x2"
        :y2="line.y2"
        :marker-end="`url(#${connectorMarkerId})`"
      />
    </svg>

    <button
      type="button"
      pos="absolute bottom-0 right-0" z="2"
      p="x-2 y-1" m="1"
      rounded="$bew-radius"
      text="!white xl"
      bg="black opacity-60"
      class="opacity-0 group-hover/cover:opacity-100"
      transform="scale-70 group-hover/cover:scale-100"
      duration-300 pointer-events-auto
      @click.stop.prevent="isOpen = !isOpen"
      @mouseenter="openMenu"
      @mouseleave="scheduleCloseMenu"
    >
      <span :class="triggerIcon" class="recommendation-dislike-wheel__icon" />
    </button>

    <div
      v-for="(action, index) in visibleActions"
      :key="action.key"
      :style="getActionStyle(index)"
      @mouseenter="openMenu"
      @mouseleave="scheduleCloseMenu"
    >
      <Tooltip
        :content="action.tooltip"
        placement="left"
        type="dark"
      >
        <button
          type="button"
          class="recommendation-dislike-wheel__action"
          @click.stop.prevent="handleSelect(action)"
        >
          <span :class="action.icon" class="recommendation-dislike-wheel__icon" />
        </button>
      </Tooltip>
    </div>
  </div>
</template>

<style scoped lang="scss">
.recommendation-dislike-wheel {
  --uno: "relative w-120px h-120px overflow-visible pointer-events-none";
}

.recommendation-dislike-wheel__connectors {
  --uno: "absolute inset-0 pointer-events-none";

  line {
    stroke: var(--bew-theme-color);
    stroke-width: 1.6;
    stroke-linecap: round;
    opacity: 0;
    transition: opacity 180ms ease;
  }

  &.is-open line {
    opacity: 0.82;
  }
}

.recommendation-dislike-wheel__action {
  --uno: "grid place-items-center rounded-full border border-white/10 shadow-$bew-shadow-1";
  --uno: "bg-black/60 text-white backdrop-blur-10px duration-200 transform-gpu";
  --uno: "hover:bg-black/75 hover:scale-105 active:scale-95";
  --uno: "pointer-events-auto";
}

.recommendation-dislike-wheel__action {
  width: 40px;
  height: 40px;
}

.recommendation-dislike-wheel__icon {
  --uno: "text-16px lh-1";
}
</style>
