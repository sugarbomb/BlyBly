import type { Ref } from 'vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import type { RecommendationLoadTrigger } from './types'

interface GestureOptions {
  loadModes: RecommendationLoadTrigger[]
  loading: boolean
  noMore: boolean
  wheelThreshold: number
  wheelConfirmThreshold: number
  pullThreshold: number
  pullConfirmThreshold: number
  wheelIndicator: boolean
  pullMotion: boolean
}

export function useRecommendationGestures(
  options: GestureOptions,
  active: Ref<boolean>,
  requestLoad: (source: RecommendationLoadTrigger, commitReady?: Promise<void>) => boolean,
) {
  const source = ref<'wheel' | 'pull'>()
  const distance = ref(0)
  const dragging = ref(false)
  const triggered = ref(false)
  const rebounding = ref(false)
  const indicatorPosition = ref({ left: '16px', top: '16px' })
  const manualMode = computed(() => !options.loadModes.includes('bottom'))
  const pullEnabled = computed(() => manualMode.value && options.loadModes.includes('pull'))
  const firstThreshold = computed(() => Math.max(1, source.value === 'pull' ? options.pullThreshold : options.wheelThreshold))
  const secondThreshold = computed(() => Math.max(firstThreshold.value + 1, source.value === 'pull' ? options.pullConfirmThreshold : options.wheelConfirmThreshold))
  const firstProgress = computed(() => Math.min(1, distance.value / firstThreshold.value))
  const secondProgress = computed(() => Math.max(0, Math.min(1, (distance.value - firstThreshold.value) / (secondThreshold.value - firstThreshold.value))))
  const showIndicator = computed(() => !!source.value && (source.value === 'pull' || options.wheelIndicator))
  const contentStyle = computed(() => ({
    transform: `translate3d(0, ${dragging.value && options.pullMotion ? Math.min(120, distance.value * 0.5) : 0}px, 0)`,
    transition: dragging.value ? 'none' : 'transform 220ms ease-out',
  }))

  let wheelLocked = false
  let wheelIdleTimer: ReturnType<typeof setTimeout> | undefined
  let indicatorTimer: ReturnType<typeof setTimeout> | undefined
  let pullStart: { id: number, y: number } | undefined
  let pullConsumed = false
  let captureTarget: HTMLElement | undefined
  let suppressClickUntil = 0
  let reboundTimer: ReturnType<typeof setTimeout> | undefined
  let reboundFrame: number | undefined
  let reboundReady: Promise<void> | undefined
  let resolveRebound: (() => void) | undefined
  let pullFrame: number | undefined
  let pendingPull: { id: number, y: number } | undefined

  function clearPullFrame() {
    if (pullFrame !== undefined)
      cancelAnimationFrame(pullFrame)
    pullFrame = undefined
    pendingPull = undefined
  }

  function canInteract() {
    return active.value && manualMode.value && !options.loading && !rebounding.value
  }

  function finishRebound(event?: TransitionEvent) {
    if (event && event.propertyName !== 'transform')
      return
    clearTimeout(reboundTimer)
    if (reboundFrame !== undefined)
      cancelAnimationFrame(reboundFrame)
    reboundFrame = undefined
    rebounding.value = false
    resolveRebound?.()
    resolveRebound = undefined
    reboundReady = undefined
  }

  function startRebound() {
    finishRebound()
    if (!options.pullMotion)
      return
    rebounding.value = true
    reboundReady = new Promise<void>((resolve) => {
      resolveRebound = resolve
    })
    // Allow the rebound to paint before starting the fallback for missing transition events.
    reboundFrame = requestAnimationFrame(() => {
      reboundFrame = requestAnimationFrame(() => {
        reboundFrame = undefined
        reboundTimer = setTimeout(finishRebound, 250)
      })
    })
  }

  function positionIndicator(x: number, y: number) {
    indicatorPosition.value = {
      left: `${Math.max(12, Math.min(x + 24, window.innerWidth - 252))}px`,
      top: `${Math.max(12, Math.min(y + 20, window.innerHeight - 100))}px`,
    }
  }

  function clearProgress() {
    clearTimeout(indicatorTimer)
    source.value = undefined
    distance.value = 0
    triggered.value = false
  }

  function trigger(currentSource: 'wheel' | 'pull') {
    if (currentSource === 'pull') {
      // Fetch immediately; only committing the new grid waits for the rebound.
      triggered.value = true
      pullConsumed = true
      distance.value = secondThreshold.value
      suppressClickUntil = performance.now() + 400
      cancelPull()
      startRebound()
      clearTimeout(indicatorTimer)
      if (!requestLoad('pull', reboundReady)) {
        finishRebound()
        clearProgress()
        return
      }
      indicatorTimer = setTimeout(clearProgress, 350)
      return
    }
    triggered.value = true
    distance.value = secondThreshold.value
    dragging.value = false
    if (!requestLoad(currentSource)) {
      clearProgress()
      return
    }
    wheelLocked = true
    clearTimeout(indicatorTimer)
    indicatorTimer = setTimeout(clearProgress, 350)
  }

  function handleWheel(event: WheelEvent) {
    if (!active.value || !manualMode.value || !options.loadModes.includes('wheel') || event.ctrlKey || event.deltaY === 0)
      return
    if ((event.target as Element | null)?.closest('input, textarea, select, [contenteditable="true"]'))
      return
    if (event.cancelable)
      event.preventDefault()
    clearTimeout(wheelIdleTimer)
    wheelIdleTimer = setTimeout(() => {
      wheelLocked = false
      if (source.value === 'wheel' && distance.value < firstThreshold.value)
        clearProgress()
    }, 300)
    if (wheelLocked || !canInteract() || dragging.value)
      return
    if (triggered.value)
      clearProgress()
    if (event.deltaY < 0) {
      if (source.value === 'wheel')
        clearProgress()
      return
    }
    if (source.value !== 'wheel') {
      clearProgress()
      source.value = 'wheel'
    }
    positionIndicator(event.clientX, event.clientY)
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1
    const next = distance.value + event.deltaY * unit
    // Keep the first confirmation visible before accepting the second stage.
    distance.value = distance.value < firstThreshold.value && next >= firstThreshold.value
      ? firstThreshold.value
      : Math.min(next, secondThreshold.value)
    if (distance.value >= secondThreshold.value)
      trigger('wheel')
  }

  function beginPull(target: EventTarget | null, id: number, x: number, y: number) {
    if (!pullEnabled.value || !canInteract() || triggered.value || pullStart)
      return false
    const element = target as Element | null
    const grip = element?.closest('[data-recommendation-grip]')
    if (!grip && element?.closest('button, a, input, select, textarea, [role="button"], [contenteditable="true"]'))
      return false
    clearProgress()
    clearTimeout(wheelIdleTimer)
    wheelLocked = false
    pullStart = { id, y }
    pullConsumed = false
    source.value = 'pull'
    dragging.value = true
    positionIndicator(x, y)
    return true
  }

  function handlePointerDown(event: PointerEvent) {
    if (event.pointerType === 'touch' || !event.isPrimary || event.button !== 0)
      return
    if (!beginPull(event.target, event.pointerId, event.clientX, event.clientY))
      return
    event.preventDefault()
    captureTarget = event.currentTarget as HTMLElement
    captureTarget.setPointerCapture(event.pointerId)
  }

  function movePull(id: number, y: number) {
    if (!pullStart || pullStart.id !== id || pullConsumed || triggered.value || !canInteract())
      return
    distance.value = Math.max(0, Math.min(y - pullStart.y, secondThreshold.value))
    if (distance.value > 6)
      suppressClickUntil = performance.now() + 400
    if (distance.value >= secondThreshold.value)
      trigger('pull')
  }

  function handlePointerMove(event: PointerEvent) {
    if (event.pointerType !== 'touch')
      schedulePull(event.pointerId, event.clientY)
  }

  function schedulePull(id: number, y: number) {
    if (!pullStart || pullStart.id !== id || pullConsumed || !canInteract())
      return
    pendingPull = { id, y }
    if (pullFrame !== undefined)
      return
    pullFrame = requestAnimationFrame(() => {
      const next = pendingPull
      pullFrame = undefined
      pendingPull = undefined
      if (next)
        movePull(next.id, next.y)
    })
  }

  function cancelPull() {
    clearPullFrame()
    const id = pullStart?.id
    pullStart = undefined
    dragging.value = false
    if (id !== undefined && captureTarget?.hasPointerCapture(id))
      captureTarget.releasePointerCapture(id)
    captureTarget = undefined
    if (source.value === 'pull' && !triggered.value)
      clearProgress()
  }

  function handlePointerUp(event: PointerEvent) {
    if (event.pointerType === 'touch' || pullStart?.id !== event.pointerId)
      return
    movePull(event.pointerId, event.clientY)
    cancelPull()
  }

  function handleTouchStart(event: TouchEvent) {
    if (event.touches.length !== 1) {
      cancelPull()
      return
    }
    const touch = event.touches[0]
    beginPull(event.target, touch.identifier, touch.clientX, touch.clientY)
  }

  function handleTouchMove(event: TouchEvent) {
    if (event.touches.length !== 1) {
      cancelPull()
      return
    }
    const touch = event.touches[0]
    if (pullStart?.id !== touch.identifier)
      return
    if (event.cancelable)
      event.preventDefault()
    schedulePull(touch.identifier, touch.clientY)
  }

  function handleTouchEnd(event: TouchEvent) {
    const touch = Array.from(event.changedTouches).find(touch => touch.identifier === pullStart?.id)
    if (!touch)
      return
    movePull(touch.identifier, touch.clientY)
    cancelPull()
  }

  function handleClick(event: MouseEvent) {
    if (performance.now() < suppressClickUntil) {
      event.preventDefault()
      event.stopPropagation()
      suppressClickUntil = 0
    }
  }

  function reset() {
    finishRebound()
    cancelPull()
    clearProgress()
    clearTimeout(wheelIdleTimer)
    wheelLocked = false
  }

  watch(() => [active.value, options.loading, options.noMore, options.loadModes.join(',')], () => {
    if (!active.value || !manualMode.value) {
      reset()
    }
    else if (options.loading) {
      cancelPull()
      if (!triggered.value)
        clearProgress()
    }
  }, { flush: 'sync' })
  watch(() => options.loadModes.join(','), reset)
  onBeforeUnmount(reset)

  return {
    source,
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
    reset,
  }
}
