<script setup lang="ts">
import VideoCard from './VideoCard.vue'

const props = withDefaults(defineProps<{
  skeleton?: boolean
  // Intentionally loose: ForYou builds partial `Video` objects for different recommendation sources.
  video?: any
  type?: 'rcmd' | 'appRcmd'
  horizontal?: boolean
  showPreview?: boolean
  moreBtn?: boolean
}>(), {
  type: 'rcmd',
  moreBtn: true,
})
</script>

<template>
  <div class="for-you-video-card">
    <VideoCard
      :skeleton="props.skeleton"
      :video="props.video"
      :type="props.type"
      :horizontal="props.horizontal"
      :show-preview="props.showPreview"
      :more-btn="props.moreBtn"
    />
  </div>
</template>
