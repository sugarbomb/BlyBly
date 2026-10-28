<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import api from '~/utils/api'

interface BannerLayer {
  id?: number
  resources?: { src?: string }[]
  scale?: { initial?: number, offset?: number }
  translate?: { initial?: number[], offset?: number[] }
  opacity?: { initial?: number }
}

interface BannerData {
  pic?: string
  split_layer?: string | { layers?: BannerLayer[] }
}

const props = defineProps<{ banner?: BannerData | null }>()
const fetchedBanner = ref<BannerData | null>(null)
const banner = computed(() => props.banner ?? fetchedBanner.value)
const container = ref<HTMLElement | null>(null)
const pointer = ref(0)
const width = ref(1920)
let observer: ResizeObserver | undefined

const layers = computed(() => {
  try {
    const data = typeof banner.value?.split_layer === 'string'
      ? JSON.parse(banner.value.split_layer)
      : banner.value?.split_layer
    return (data?.layers ?? []).filter((layer: BannerLayer) => layer.resources?.[0]?.src) as BannerLayer[]
  }
  catch {
    return []
  }
})

function move(event: PointerEvent) {
  if (!container.value || event.pointerType === 'touch')
    return
  const rect = container.value.getBoundingClientRect()
  pointer.value = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1))
}

function layerStyle(layer: BannerLayer) {
  const ratio = width.value / 1920
  const initial = layer.translate?.initial ?? [0, 0]
  const offset = layer.translate?.offset ?? [0, 0]
  const x = ((initial[0] ?? 0) + (offset[0] ?? 0) * pointer.value) * ratio
  const y = ((initial[1] ?? 0) + (offset[1] ?? 0) * pointer.value) * ratio
  const scale = ((layer.scale?.initial ?? 1) + (layer.scale?.offset ?? 0) * pointer.value) * ratio
  return {
    transform: `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`,
    opacity: layer.opacity?.initial ?? 1,
  }
}

function isVideo(src = '') {
  return /\.(?:webm|mp4)(?:[?#]|$)/i.test(src)
}

function parseBannerResponse(response: unknown): BannerData | null {
  let value = response
  for (let depth = 0; depth < 4; depth++) {
    if (!value || typeof value !== 'object')
      return null
    const record = value as Record<string, unknown>
    if (typeof record.pic === 'string' || typeof record.split_layer === 'string' || (record.split_layer && typeof record.split_layer === 'object')) {
      return record as BannerData
    }
    value = record.data
  }
  return null
}

onMounted(() => {
  if (!props.banner) {
    api.banner.getHomeBanner({ resource_id: 142 })
      .then((response: unknown) => {
        fetchedBanner.value = parseBannerResponse(response)
        if (!fetchedBanner.value)
          console.error('Home banner response does not contain pic or split_layer:', response)
      })
      .catch((error: unknown) => { console.error('Failed to load home banner:', error) })
  }
  if (!container.value)
    return
  width.value = container.value.clientWidth
  observer = new ResizeObserver((entries) => {
    width.value = entries[0]?.contentRect.width || 1920
  })
  observer.observe(container.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div ref="container" class="parallax-banner" aria-hidden="true" @pointermove="move" @pointerleave="pointer = 0">
    <div v-if="banner?.pic" class="parallax-banner__fallback" :style="{ backgroundImage: `url('${banner.pic.replace(/^http:/, 'https:')}')` }" />
    <template v-for="(layer, index) in layers" :key="`${layer.id ?? index}-${index}`">
      <video
        v-if="isVideo(layer.resources?.[0]?.src)" class="parallax-banner__layer" :src="layer.resources?.[0]?.src?.replace(/^http:/, 'https:')" :style="layerStyle(layer)" autoplay
        muted loop playsinline
      />
      <img
        v-else class="parallax-banner__layer" :src="layer.resources?.[0]?.src?.replace(/^http:/, 'https:')" :style="layerStyle(layer)" alt=""
        draggable="false"
      >
    </template>
  </div>
</template>

<style scoped>
.parallax-banner {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.parallax-banner__fallback {
  position: absolute;
  inset: 0;
  background: center / contain no-repeat;
}
.parallax-banner__layer {
  position: absolute;
  top: 50%;
  left: 50%;
  max-width: none;
  max-height: none;
  pointer-events: none;
  transform-origin: center;
  transition: transform 0.2s ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .parallax-banner__layer {
    transition: none;
  }
}
</style>
