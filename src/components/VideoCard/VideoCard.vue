<script lang="ts" setup>
import { Icon } from '@iconify/vue'
import type { CSSProperties } from 'vue'
import { useToast } from 'vue-toastification'

import Button from '~/components/Button.vue'
import { useBewlyApp } from '~/composables/useAppProvider'
import { settings } from '~/logic'
import type { VideoInfo } from '~/models/video/videoInfo'
import type { VideoPreviewResult } from '~/models/video/videoPreview'
import { useMainStore } from '~/stores/mainStore'
import api from '~/utils/api'
import { calcCurrentTime, calcTimeSince, numFormatter } from '~/utils/dataFormatter'
import { getCSRF, removeHttpFromUrl } from '~/utils/main'

import Tooltip from '../Tooltip.vue'
import type { Video } from './types'
import { getCurrentTime, getCurrentVideoUrl } from './utils'
import VideoCardAuthorAvatar from './VideoCardAuthor/components/VideoCardAuthorAvatar.vue'
import VideoCardAuthorName from './VideoCardAuthor/components/VideoCardAuthorName.vue'
import VideoCardContextMenu from './VideoCardContextMenu/VideoCardContextMenu.vue'
import VideoCardSkeleton from './VideoCardSkeleton.vue'

const props = withDefaults(defineProps<Props>(), {
  showWatcherLater: true,
  showCoverBottomRight: false,
  type: 'common',
  moreBtn: true,
})
const emit = defineEmits<{
  (e: 'click', value: MouseEvent): void
  (e: 'undoRecommendationMask'): void
}>()

interface Props {
  skeleton?: boolean
  video?: Video
  /** rcmd: recommend video; appRcmd: app recommend video; bangumi: bangumi video; common: common video */
  type?: 'rcmd' | 'appRcmd' | 'bangumi' | 'common'
  showWatcherLater?: boolean
  showCoverBottomRight?: boolean
  horizontal?: boolean
  showPreview?: boolean
  moreBtn?: boolean
  recommendationMask?: 'feedback' | 'advertisement' | 'autoFeedback'
  recommendationMaskReason?: string
}

const toast = useToast()
const { mainAppRef, openIframeDrawer } = useBewlyApp()
const { setActivatedCover } = useMainStore()

const showVideoOptions = ref<boolean>(false)
const videoOptionsFloatingStyles = ref<CSSProperties>({})
const moreBtnRef = ref<HTMLDivElement | null>(null)
const revealRecommendationMask = ref<boolean>(false)
const recommendationMaskHovered = ref<boolean>(false)

const showRecommendationOriginal = computed(() => {
  return !props.recommendationMask
    || (props.recommendationMask === 'feedback' && revealRecommendationMask.value)
})

const videoCurrentTime = ref<number | null>(null)

const videoUrl = computed(() => {
  if (props.recommendationMask || !props.video)
    return undefined

  if (props.video.url)
    return props.video.url
  else if (props.video.bvid || props.video.aid)
    return getCurrentVideoUrl(props.video, videoCurrentTime)
  else if (props.video.epid)
    return `https://www.bilibili.com/bangumi/play/ep${props.video.epid}`
  else if (props.video.roomid)
    return `https://live.bilibili.com/${props.video.roomid}`
  else
    return ''
})

const isInWatchLater = ref<boolean>(false)
const isHover = ref<boolean>(false)
const mouseEnterTimeOut = ref()
const mouseLeaveTimeOut = ref()
const previewVideoUrl = ref<string>('')
const contentVisibility = ref<'auto' | 'visible'>('auto')
const videoElement = ref<HTMLVideoElement | null>(null)

watch(() => isHover.value, async (newValue) => {
  if (!props.video || !newValue)
    return

  if (props.showPreview && settings.value.enableVideoPreview
    && !previewVideoUrl.value && (props.video.aid || props.video.bvid)) {
    let cid = props.video.cid
    if (!cid) {
      try {
        const res: VideoInfo = await api.video.getVideoInfo({
          bvid: props.video.bvid,
        })
        if (res.code === 0)
          cid = res.data.cid
      }
      catch {

      }
    }
    api.video.getVideoPreview({
      bvid: props.video.bvid,
      cid,
    }).then((res: VideoPreviewResult) => {
      if (res.code === 0)
        previewVideoUrl.value = res.data.durl[0].url
    })
  }
})

function toggleWatchLater() {
  if (!props.video)
    return

  if (!isInWatchLater.value) {
    api.watchlater.saveToWatchLater({
      aid: props.video.id,
      csrf: getCSRF(),
    })
      .then((res) => {
        if (res.code === 0)
          isInWatchLater.value = true
        else
          toast.error(res.message)
      })
  }
  else {
    api.watchlater.removeFromWatchLater({
      aid: props.video.id,
      csrf: getCSRF(),
    })
      .then((res) => {
        if (res.code === 0)
          isInWatchLater.value = false
        else
          toast.error(res.message)
      })
  }
}

function handleMouseEnter() {
  if (props.video)
    setActivatedCover(`${removeHttpFromUrl(props.video.cover)}@672w_378h_1c_!web-home-common-cover`)

  // fix #789
  contentVisibility.value = 'visible'
  if (settings.value.hoverVideoCardDelayed) {
    mouseEnterTimeOut.value = setTimeout(() => {
      isHover.value = true
      clearTimeout(mouseLeaveTimeOut.value)
    }, 1200)
  }
  else {
    mouseEnterTimeOut.value = setTimeout(() => {
      isHover.value = true
      clearTimeout(mouseLeaveTimeOut.value)
    }, 500)
  }
}

function handelMouseLeave() {
  contentVisibility.value = 'auto'
  isHover.value = false
  revealRecommendationMask.value = false
  recommendationMaskHovered.value = false
  clearTimeout(mouseEnterTimeOut.value)
  clearTimeout(mouseLeaveTimeOut.value)
}

function handleClick(event: MouseEvent) {
  videoCurrentTime.value = getCurrentTime(videoElement)

  if (settings.value.videoCardLinkOpenMode === 'drawer' && videoUrl.value && !event.ctrlKey && !event.metaKey) {
    event.preventDefault()
    openIframeDrawer(videoUrl.value)
  }
}

function handleCardClick(event: MouseEvent) {
  emit('click', event)
}

function handleMoreBtnClick(_event: MouseEvent) {
  if (!moreBtnRef.value)
    return
  const { top, right, bottom } = moreBtnRef.value.getBoundingClientRect()
  const openUpward = bottom > window.innerHeight / 2

  showVideoOptions.value = false
  videoOptionsFloatingStyles.value = {
    position: 'fixed',
    top: `${openUpward ? top - 8 : bottom + 8}px`,
    left: `${Math.min(right, window.innerWidth - 8)}px`,
    maxHeight: 'calc(100vh - 16px)',
    overflowY: 'auto',
    transform: `translate(-100%, ${openUpward ? '-100%' : '0'})`,
  }
  showVideoOptions.value = true
}

provide('getVideoType', () => props.type!)
</script>

<template>
  <div
    :style="{ contentVisibility }"
    intrinsic-size-300px
    duration-300 ease-in-out
    rounded="$bew-radius"
    ring="hover:8 hover:$bew-fill-2 active:8 active:$bew-fill-3"
    bg="hover:$bew-fill-2 active:$bew-fill-3"
    transform="~ translate-z-0"
    mb-4
  >
    <div v-if="!skeleton && video">
      <div
        class="video-card group"
        w="full"
        rounded="$bew-radius"
        @click="handleCardClick"
      >
        <ALink
          :style="{ display: horizontal ? 'flex' : 'block', gap: horizontal ? '1.5rem' : '0' }"
          :href="videoUrl"
          type="videoCard"
          :custom-click-event="settings.videoCardLinkOpenMode === 'drawer'"
          @mouseenter="handleMouseEnter"
          @mouseleave="handelMouseLeave"
          @click="handleClick"
        >
          <!-- Cover -->
          <div
            class="group/cover"
            :class="horizontal ? 'horizontal-card-cover' : 'vertical-card-cover'"
            shrink-0
            h-fit relative bg="$bew-skeleton" rounded="$bew-radius"
            cursor-pointer
            group-hover:z-2
            transform="~ translate-z-0"
          >
            <!-- Video cover -->
            <Picture
              :src="`${removeHttpFromUrl(video.cover)}@672w_378h_1c_!web-home-common-cover`"
              loading="eager"
              w="full" max-w-full align-middle aspect-video object-cover
              rounded="$bew-radius"
            />

            <div
              v-if="recommendationMask"
              class="recommendation-mask"
              :class="{ revealed: revealRecommendationMask }"
              pos="absolute top-0 left-0" w-full h-fit aspect-video flex="~ col gap-2 items-center justify-center"
              bg="$bew-fill-4" backdrop-blur-20px mix-blend-luminosity rounded="$bew-radius" z-2
              @mouseenter="recommendationMaskHovered = true"
              @mouseleave="recommendationMaskHovered = false"
            >
              <p
                class="recommendation-mask-message"
                :title="recommendationMaskHovered ? recommendationMaskReason : undefined"
                mb-2 color-white text-lg
              >
                {{ recommendationMaskHovered && recommendationMaskReason
                  ? recommendationMaskReason
                  : $t(`settings.for_you_mask_${recommendationMask}`) }}
              </p>
              <div v-if="recommendationMask === 'feedback'" flex="~ gap-2 items-center">
                <Button
                  color="rgba(255,255,255,.35)" text-color="white" size="small"
                  @click.prevent.stop="emit('undoRecommendationMask')"
                >
                  <template #left>
                    <div i-mingcute:back-line text-lg />
                  </template>
                  {{ $t('common.undo') }}
                </Button>
                <Button
                  color="rgba(255,255,255,.35)" text-color="white" size="small"
                  @click.prevent.stop
                  @mouseenter="revealRecommendationMask = true"
                  @mouseleave="revealRecommendationMask = false"
                >
                  <template #left>
                    <div i-mingcute:eye-2-line text-lg />
                  </template>
                  查看
                </Button>
              </div>
            </div>

            <!-- Video preview -->
            <Transition v-if="!recommendationMask && showPreview && settings.enableVideoPreview" name="fade">
              <video
                v-if="previewVideoUrl && isHover"
                ref="videoElement"
                autoplay muted
                :controls="settings.enableVideoCtrlBarOnVideoCard"
                :style="{ pointerEvents: settings.enableVideoCtrlBarOnVideoCard ? 'auto' : 'none' }"
                pos="absolute top-0 left-0" w-full aspect-video rounded="$bew-radius" bg-black
                @mouseenter="handleMouseEnter"
              >
                <source :src="previewVideoUrl" type="video/mp4">
              </video>
            </Transition>

            <!-- Ranking Number -->
            <div
              v-if="video.rank"
              pos="absolute top-0"
              p-2 group-hover:opacity-0
              duration-300
            >
              <div
                v-if="Number(video.rank) <= 3"
                bg="$bew-theme-color" text-center lh-0 h-30px w-30px
                text-white rounded="1/2" shadow="$bew-shadow-1"
                border="1 $bew-theme-color"
                grid="~ place-content-center"
                text="xl" fw-bold
              >
                {{ video.rank }}
              </div>
              <div
                v-else
                bg="$bew-elevated-solid" text-center lh-30px h-30px w-30px
                rounded="1/2" shadow="$bew-shadow-1"
                border="1 $bew-border-color"
              >
                {{ video.rank }}
              </div>
            </div>

            <!-- Video Duration -->
            <div
              v-if="video.duration || video.durationStr"
              pos="absolute bottom-0 right-0"
              z="2"
              p="x-2 y-1"
              m="1"
              rounded="$bew-radius"
              text="!white xs"
              bg="black opacity-60"
              class="group-hover:opacity-0"
              duration-300
            >
              {{ video.duration ? calcCurrentTime(video.duration) : video.durationStr }}
            </div>

            <div
              class="opacity-0 group-hover/cover:opacity-100"
              transform="scale-70 group-hover/cover:scale-100"
              duration-300
              pos="absolute top-0 left-0" z-2
              @click.stop=""
            >
              <slot name="coverTopLeft" />
            </div>

            <div
              v-if="video.liveStatus === 1"
              class="group-hover:opacity-0"
              pos="absolute left-0 top-0" bg="$bew-theme-color" text="xs white" fw-bold
              p="x-2 y-1" m-1 inline-block rounded="$bew-radius" duration-300
            >
              LIVE
              <i i-svg-spinners:pulse-3 align-middle mt--0.2em />
            </div>

            <div
              v-if="video.badge && Object.keys(video.badge).length > 0"
              class="group-hover:opacity-0"
              :style="{
                backgroundColor: video.badge.bgColor,
                color: video.badge.color,
              }"
              pos="absolute right-0 top-0" bg="$bew-theme-color" text="xs white"
              p="x-2 y-1" m-1 inline-block rounded="$bew-radius" duration-300
            >
              {{ video.badge.text }}
            </div>

            <!-- Watcher later button -->
            <button
              v-if="showWatcherLater"
              pos="absolute top-0 right-0" z="2"
              p="x-2 y-1" m="1"
              rounded="$bew-radius"
              text="!white xl"
              bg="black opacity-60"
              class="opacity-0 group-hover/cover:opacity-100"
              transform="scale-70 group-hover/cover:scale-100"
              duration-300
              @click.prevent.stop="toggleWatchLater"
            >
              <Tooltip v-if="!isInWatchLater" :content="$t('common.save_to_watch_later')" placement="bottom-right" type="dark">
                <div i-mingcute:carplay-line />
              </Tooltip>
              <Tooltip v-else :content="$t('common.added')" placement="bottom-right" type="dark">
                <Icon icon="line-md:confirm" />
              </Tooltip>
            </button>

            <div
              v-if="showCoverBottomRight && $slots.coverBottomRight"
              class="group-hover/cover:opacity-100"
              pos="absolute bottom-0 right-0"
              z="2"
              p="0"
              opacity-0
              transform="scale-70 group-hover/cover:scale-100"
              duration-300
              @click.stop=""
            >
              <slot name="coverBottomRight" />
            </div>
          </div>

          <!-- Other Information -->
          <div
            v-if="showRecommendationOriginal"
            :style="{
              width: horizontal ? '100%' : 'unset',
              marginTop: horizontal ? '0' : '1rem',
            }"
            flex="~"
          >
            <!-- Author Avatar -->
            <VideoCardAuthorAvatar
              v-if="!horizontal && video.author"
              :author="video.author"
              :is-live="video.liveStatus === 1"
            />
            <div class="group/desc" flex="~ col" w="full" align="items-start">
              <div flex="~ gap-1 justify-between items-start" w="full" pos="relative">
                <h3
                  class="keep-two-lines"
                  text="overflow-ellipsis $bew-text-1 lg"
                  cursor="pointer"
                >
                  <a :href="videoUrl" target="_blank" :title="video.title">
                    {{ video.title }}
                  </a>
                </h3>

                <div
                  v-if="moreBtn"
                  ref="moreBtnRef"
                  :class="{ 'more-active': showVideoOptions }"
                  bg="hover:$bew-fill-2 active:$bew-fill-3"
                  shrink-0 w-32px h-32px m="t--3px r--4px"
                  grid place-items-center cursor-pointer rounded="50%" duration-300
                  @click.stop.prevent="handleMoreBtnClick"
                >
                  <div i-mingcute:more-2-line text="lg" />
                </div>
              </div>
              <div text="sm $bew-text-2" w-fit m="t-2" flex="~ items-center wrap">
                <!-- Author Avatar -->
                <span
                  :style="{
                    marginBottom: horizontal ? '0.5rem' : '0',
                  }"
                  flex="inline items-center"
                >
                  <VideoCardAuthorAvatar
                    v-if="horizontal && video.author"
                    :author="video.author"
                    :is-live="video.liveStatus === 1"
                  />
                  <VideoCardAuthorName
                    :author="video.author"
                  />
                </span>
              </div>

              <div flex="~ items-center gap-1 wrap">
                <!-- View & Danmaku Count -->
                <div
                  text="sm $bew-text-2" rounded="$bew-radius"
                  inline-block
                >
                  <span v-if="video.view || video.viewStr">
                    {{ video.view ? $t('common.view', { count: numFormatter(video.view) }, video.view) : `${numFormatter(video.viewStr || '0')}${$t('common.viewWithoutNum')}` }}
                  </span>
                  <template v-if="video.danmaku || video.danmakuStr">
                    <span text-xs font-light mx-4px>•</span>
                    <span>{{ video.danmaku ? $t('common.danmaku', { count: numFormatter(video.danmaku) }, video.danmaku) : `${numFormatter(video.danmakuStr || '0')}${$t('common.danmakuWithoutNum')}` }}</span>
                  </template>
                  <br>
                </div>
              </div>
              <div mt-2 flex="~ gap-1 wrap" text="sm">
                <!-- Tag -->
                <span
                  v-if="video.tag"
                  text="$bew-theme-color" lh-6 p="x-2" rounded="$bew-radius" bg="$bew-theme-color-20"
                >
                  {{ video.tag }}
                </span>
                <span
                  v-if="video.publishedTimestamp || video.capsuleText"
                  bg="$bew-fill-1" p="x-2" rounded="$bew-radius" text="$bew-text-3" lh-6
                  mr-1
                >
                  {{ video.publishedTimestamp ? calcTimeSince(video.publishedTimestamp * 1000) : video.capsuleText?.trim() }}
                </span>
                <!-- Video type -->
                <span text="$bew-text-2" grid="~ place-items-center">
                  <div v-if="video.type === 'vertical'" i-mingcute:cellphone-2-line />
                  <div v-else-if="video.type === 'bangumi'" i-mingcute:movie-line />
                </span>
              </div>
            </div>
          </div>
        </ALink>
      </div>
    </div>

    <!-- skeleton -->
    <VideoCardSkeleton
      v-if="skeleton"
      :horizontal="horizontal"
      important-mb-0
    />

    <!-- context menu -->
    <Teleport
      v-if="showVideoOptions && video"
      :to="mainAppRef"
    >
      <VideoCardContextMenu
        :video="{
          ...video,
          url: videoUrl,
        }"
        :context-menu-styles="videoOptionsFloatingStyles"
        @close="showVideoOptions = false"
      />
      <!-- @reopen="handleMoreBtnClick" -->
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.horizontal-card-cover {
  --uno: "xl:w-280px lg:w-250px md:w-200px w-200px";
}

.vertical-card-cover {
  --uno: "w-full";
}

.more-active {
  --uno: "opacity-100";
}

.recommendation-mask {
  transition: opacity 180ms ease;
}

.recommendation-mask.revealed {
  opacity: 0;
}

.recommendation-mask-message {
  max-width: calc(100% - 2rem);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
