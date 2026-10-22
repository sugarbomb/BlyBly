import { computed } from 'vue'

import type { RecommendationControlSettings, RecommendationLoadTrigger, RecommendationRegion } from '~/components/RecommendationLayout/types'
import type { Settings } from '~/logic/storage'
import { originalSettings, settings } from '~/logic/storage'

export function normalizeRecommendationNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = value === '' || value === null || value === undefined ? fallback : Number(value)
  const number = Number.isFinite(parsed) ? parsed : fallback
  return Math.max(min, Math.min(max, Math.round(number)))
}

export function resolveRecommendationControls(region: RecommendationRegion, stored: Partial<Settings>): RecommendationControlSettings {
  const current = { ...originalSettings, ...stored }
  const legacy: RecommendationControlSettings = {
    showTools: current.recommendationShowTools,
    showNavigation: current.recommendationShowNavigation,
    toolsSide: current.partitionControlRailPosition,
    toolsHeight: current.partitionControlRailHeight,
    automaticBottom: current.recommendationLoadMode === 'bottom',
    manualButton: true,
    wheelEnabled: current.recommendationLoadMode === 'wheel',
    pullEnabled: true,
    bottomDistance: current.recommendationBottomDistance,
    wheelThreshold: current.recommendationWheelThreshold,
    wheelConfirmThreshold: current.recommendationWheelThreshold * 2,
    pullThreshold: current.recommendationPullThreshold,
    pullConfirmThreshold: current.recommendationPullThreshold * 2,
    wheelIndicator: true,
    pullMotion: true,
    autoFill: current.recommendationAutoFill,
    fixedItems: current.recommendationFixedItems,
    minItems: 1,
    maxItems: 100,
    extraRows: current.recommendationExtraRows,
  }
  const merged = { ...legacy, ...current.recommendationControls?.[region] }
  const minItems = 1
  const maxItems = 100
  const wheelThreshold = normalizeRecommendationNumber(merged.wheelThreshold, 400, 50, 3000)
  const pullThreshold = normalizeRecommendationNumber(merged.pullThreshold, 80, 30, 400)
  const automaticBottom = merged.automaticBottom === true
  return {
    showTools: !automaticBottom && merged.manualButton !== false,
    showNavigation: merged.showNavigation !== false,
    toolsSide: merged.toolsSide === 'left' ? 'left' : 'right',
    toolsHeight: normalizeRecommendationNumber(merged.toolsHeight, 0, 0, 5),
    automaticBottom,
    manualButton: !automaticBottom && merged.manualButton !== false,
    wheelEnabled: !automaticBottom && merged.wheelEnabled === true,
    pullEnabled: !automaticBottom && merged.pullEnabled === true,
    bottomDistance: 300,
    wheelThreshold,
    wheelConfirmThreshold: normalizeRecommendationNumber(merged.wheelConfirmThreshold, wheelThreshold * 2, wheelThreshold + 1, 6000),
    pullThreshold,
    pullConfirmThreshold: normalizeRecommendationNumber(merged.pullConfirmThreshold, pullThreshold * 2, pullThreshold + 1, 800),
    wheelIndicator: true,
    pullMotion: true,
    autoFill: merged.autoFill !== false,
    fixedItems: normalizeRecommendationNumber(merged.fixedItems, 10, minItems, maxItems),
    minItems,
    maxItems,
    extraRows: normalizeRecommendationNumber(merged.extraRows, 0, 0, 5),
  }
}

export function useRecommendationControls(region: RecommendationRegion | (() => RecommendationRegion)) {
  return computed({
    get: () => resolveRecommendationControls(typeof region === 'function' ? region() : region, settings.value),
    set: (value: RecommendationControlSettings) => {
      const key = typeof region === 'function' ? region() : region
      settings.value.recommendationControls = {
        ...settings.value.recommendationControls,
        [key]: { ...value },
      }
    },
  })
}

export function useRecommendationLayoutSettings(region: RecommendationRegion = 'guest') {
  const controls = useRecommendationControls(region)
  return computed(() => {
    const current = controls.value
    const loadModes: RecommendationLoadTrigger[] = []
    if (current.automaticBottom) {
      loadModes.push('bottom')
    }
    else {
      if (current.manualButton)
        loadModes.push('manual')
      if (current.wheelEnabled)
        loadModes.push('wheel')
      if (current.pullEnabled)
        loadModes.push('pull')
    }
    const positionRatios = [25, 100 / 3, 40, 50, 200 / 3, 80]
    return {
      showTools: current.showTools,
      showNavigation: current.showNavigation,
      toolsSide: current.toolsSide,
      toolsPositionRatio: positionRatios[current.toolsHeight],
      loadModes,
      bottomDistance: current.bottomDistance,
      wheelThreshold: current.wheelThreshold,
      wheelConfirmThreshold: current.wheelConfirmThreshold,
      pullThreshold: current.pullThreshold,
      pullConfirmThreshold: current.pullConfirmThreshold,
      wheelIndicator: current.wheelIndicator,
      pullMotion: current.pullMotion,
      minItems: current.minItems,
      maxItems: current.maxItems,
      extraRows: current.extraRows,
      itemCount: current.autoFill ? undefined : current.fixedItems,
    }
  })
}
