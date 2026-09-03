<script setup lang="ts">
import { computed } from 'vue'

import RecommendationDislikeWheel from './RecommendationDislikeWheel.vue'
import VideoCard from './VideoCard.vue'

interface RecommendationWheelAction {
  key: string
  icon: string
  tooltip: string
}

const props = withDefaults(defineProps<{
  skeleton?: boolean
  // Intentionally loose: ForYou builds partial `Video` objects for different recommendation sources.
  video?: any
  type?: 'rcmd' | 'appRcmd'
  horizontal?: boolean
  showPreview?: boolean
  moreBtn?: boolean
  feedbackEnabled?: boolean
  recommendationMask?: 'feedback' | 'advertisement' | 'autoFeedback'
}>(), {
  type: 'rcmd',
  moreBtn: true,
  feedbackEnabled: false,
})
const emit = defineEmits<{
  (e: 'click', value: MouseEvent): void
  (e: 'fanAction', value: RecommendationWheelAction): void
  (e: 'undoFeedback'): void
}>()

const recommendationActions = computed<RecommendationWheelAction[]>(() => {
  if (!props.feedbackEnabled || props.recommendationMask || props.skeleton || !props.video)
    return []

  return [
    {
      key: 'dislike-author',
      icon: 'i-mingcute:user-4-line',
      tooltip: '不喜欢此作者',
    },
    {
      key: 'dislike-content',
      icon: 'i-mingcute:video-line',
      tooltip: '不喜欢此内容',
    },
  ]
})

function handleRecommendationAction(action: RecommendationWheelAction) {
  emit('fanAction', action)
}
</script>

<template>
  <div
    class="for-you-video-card"
  >
    <VideoCard
      :skeleton="props.skeleton"
      :video="props.video"
      :type="props.type"
      :horizontal="props.horizontal"
      :show-preview="props.showPreview"
      :more-btn="props.moreBtn"
      :recommendation-mask="props.recommendationMask"
      :show-cover-bottom-right="recommendationActions.length > 0"
      @click="emit('click', $event)"
      @undo-recommendation-mask="emit('undoFeedback')"
    >
      <template #coverBottomRight>
        <RecommendationDislikeWheel
          v-if="recommendationActions.length"
          :count="recommendationActions.length"
          :actions="recommendationActions"
          @select="handleRecommendationAction"
        />
      </template>
    </VideoCard>
  </div>
</template>

<style lang="scss" scoped>
.for-you-video-card {
  --uno: "transition-all duration-300 ease-in-out";
}
</style>
