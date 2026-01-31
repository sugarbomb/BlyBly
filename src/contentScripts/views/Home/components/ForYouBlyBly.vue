<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core'
import type { Ref } from 'vue'
import { computed, provide } from 'vue'

import ForYouRefreshRail from '~/components/SideBar/ForYouRefreshRail.vue'
import ForYouVideoCard from '~/components/VideoCard/ForYouVideoCard.vue'
import { useBewlyApp } from '~/composables/useAppProvider'
import { useFilterAdvance } from '~/composables/useFilterAdvance'
import { LanguageType } from '~/enums/appEnums'
import type { GridLayoutType } from '~/logic'
import { accessKey, settings } from '~/logic'
import type { AppForYouResult, Item as AppVideoItem } from '~/models/video/appForYou'
import { Type as ThreePointV2Type } from '~/models/video/appForYou'
import type { forYouResult, Item as VideoItem } from '~/models/video/forYou'
import api from '~/utils/api'
import { TVAppKey } from '~/utils/authProvider'
import { isVerticalVideo } from '~/utils/uriParse'

const props = defineProps<{
  gridLayout: GridLayoutType
}>()

const emit = defineEmits<{
  (e: 'beforeLoading'): void
  (e: 'afterLoading'): void
}>()

// https://github.com/starknt/BewlyBewly/blob/fad999c2e482095dc3840bb291af53d15ff44130/src/contentScripts/views/Home/components/ForYou.vue#L16
interface VideoElement {
  uniqueId: string
  item?: VideoItem
}

interface AppVideoElement {
  uniqueId: string
  item?: AppVideoItem
}

const gridClass = computed((): string => {
  if (props.gridLayout === 'adaptive')
    return 'grid-adaptive'
  if (props.gridLayout === 'twoColumns')
    return 'grid-two-columns'
  return 'grid-one-column'
})

const videoList = ref<VideoElement[]>([])
const appVideoList = ref<AppVideoElement[]>([])
const isLoading = ref<boolean>(false)
const needToLoginFirst = ref<boolean>(false)
const containerRef = ref<HTMLElement>() as Ref<HTMLElement>
const refreshIdx = ref<number>(1)
const noMoreContent = ref<boolean>(false)
const { handleReachBottom, handlePageRefresh, haveScrollbar } = useBewlyApp()
const activatedAppVideo = ref<AppVideoItem | null>()
const videoCardRef = ref(null)
const showDislikeDialog = ref<boolean>(false)
const selectedDislikeReason = ref<number>(1)
const PAGE_SIZE = 30

// 推荐页过滤器
const { options: forYouFilterOptions } = useFilterAdvance('foryou-filter')

// 动态 provide pageType，确保 context menu 能正确识别
const pageType = computed(() => settings.value.recommendationMode === 'web' ? 'rcmd' : 'appRcmd')
provide('pageType', pageType.value)

function shouldFilterByForYou(item: any): boolean {
  if (!forYouFilterOptions.value.enabled || forYouFilterOptions.value.rules.length === 0)
    return false
  return forYouFilterOptions.value.rules.filter(r => r.enabled).some((rule) => {
    if (rule.type === 'title' && item.title) {
      return item.title.toLowerCase().includes(rule.value.toLowerCase())
    }
    else if (rule.type === 'username' && item.owner?.name) {
      return item.owner.name.toLowerCase().includes(rule.value.toLowerCase())
    }
    else if (rule.type === 'uid' && item.owner?.mid) {
      return String(item.owner.mid) === rule.value
    }
    return false
  })
}

onKeyStroke((e: KeyboardEvent) => {
  if (showDislikeDialog.value) {
    const dislikeReasons = activatedAppVideo.value?.three_point_v2?.find(option => option.type === ThreePointV2Type.Dislike)?.reasons || []

    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault()
      dislikeReasons.forEach((reason) => {
        if (dislikeReasons[Number(e.key) - 1] && reason.id === dislikeReasons[Number(e.key) - 1].id)
          selectedDislikeReason.value = reason.id
      })
    }
    else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const currentIndex = dislikeReasons.findIndex(reason => selectedDislikeReason.value === reason.id)
      if (currentIndex > 0)
        selectedDislikeReason.value = dislikeReasons[currentIndex - 1].id
    }
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const currentIndex = dislikeReasons.findIndex(reason => selectedDislikeReason.value === reason.id)
      if (currentIndex < dislikeReasons.length - 1)
        selectedDislikeReason.value = dislikeReasons[currentIndex + 1].id
    }
  }
})

onMounted(() => {
  // Delay by 0.2 seconds to obtain the `settings.value.recommendationMode` value
  // otherwise the `settings.value.recommendationMode` value will be undefined
  // i have no idea to fix that...
  setTimeout(() => {
    initData()
  }, 200)

  initPageAction()
})

onActivated(() => {
  initPageAction()
})

async function initData() {
  videoList.value.length = 0
  appVideoList.value.length = 0
  await getData()
}

async function getData() {
  emit('beforeLoading')
  isLoading.value = true
  try {
    if (settings.value.recommendationMode === 'web') {
      await getRecommendVideos()
    }
    else {
      for (let i = 0; i < 3; i++)
        await getAppRecommendVideos()
    }
  }
  finally {
    isLoading.value = false
    emit('afterLoading')
  }
}

function initPageAction() {
  handleReachBottom.value = async () => {
    if (isLoading.value)
      return
    if (noMoreContent.value)
      return

    getData()
  }

  handlePageRefresh.value = async () => {
    if (isLoading.value)
      return

    initData()
  }
}

async function getRecommendVideos() {
  try {
    let i = 0
    if (videoList.value.length < PAGE_SIZE) {
      const pendingVideos: VideoElement[] = Array.from({
        length: PAGE_SIZE - videoList.value.length,
      }, () => ({
        uniqueId: `unique-id-${(videoList.value.length || 0) + i++})}`,
      } satisfies VideoElement))
      videoList.value.push(...pendingVideos)
    }
    const response: forYouResult = await api.video.getRecommendVideos({
      fresh_idx: refreshIdx.value++,
      ps: PAGE_SIZE,
    })
    if (!response.data) {
      noMoreContent.value = true
      return
    }
    if (response.code === 0) {
      const resData = response.data.item.filter(item => !shouldFilterByForYou(item))
      if (!videoList.value.length) {
        videoList.value = resData.map(item => ({ uniqueId: `${item.id}`, item }))
      }
      else {
        resData.forEach((item) => {
          const findFirstEmptyItemIndex = videoList.value.findIndex(video => !video.item)
          if (findFirstEmptyItemIndex !== -1) {
            videoList.value[findFirstEmptyItemIndex] = {
              uniqueId: `${item.id}`,
              item,
            }
          }
          else {
            videoList.value.push({
              uniqueId: `${item.id}`,
              item,
            })
          }
        })
      }
    }
    else if (response.code === 62011) {
      needToLoginFirst.value = true
    }
  }
  finally {
    const filledItems = videoList.value.filter(video => video.item)
    videoList.value = filledItems
    if (!needToLoginFirst.value) {
      await nextTick()
      if (!await haveScrollbar() || filledItems.length < PAGE_SIZE || filledItems.length < 1) {
        getRecommendVideos()
      }
    }
  }
}

async function getAppRecommendVideos() {
  try {
    let i = 0
    if (appVideoList.value.length < PAGE_SIZE) {
      const pendingVideos: AppVideoElement[] = Array.from({
        length: PAGE_SIZE - appVideoList.value.length,
      }, () => ({
        uniqueId: `unique-id-${(appVideoList.value.length || 0) + i++})}`,
      } satisfies AppVideoElement))
      appVideoList.value.push(...pendingVideos)
    }
    const response: AppForYouResult = await api.video.getAppRecommendVideos({
      access_key: accessKey.value,
      s_locale: settings.value.language === LanguageType.Mandarin_TW || settings.value.language === LanguageType.Cantonese ? 'zh-Hant_TW' : 'zh-Hans_CN',
      c_locate: settings.value.language === LanguageType.Mandarin_TW || settings.value.language === LanguageType.Cantonese ? 'zh-Hant_TW' : 'zh-Hans_CN',
      appkey: TVAppKey.appkey,
      idx: appVideoList.value.length > 0 ? appVideoList.value[appVideoList.value.length - 1].item?.idx : 1,
    })
    if (response.code === 0) {
      let resData = response.data.items.filter(item => !item.card_type.includes('banner') && item.card_type !== 'cm_v1')
      resData = resData.filter((item) => {
        const owner = {
          mid: item?.mask?.avatar?.up_id || item?.args?.up_id || 0,
          name: item?.mask?.avatar?.text || item?.args?.up_name || '',
          face: item?.mask?.avatar?.cover || item?.avatar?.cover || '',
        }
        return !shouldFilterByForYou({ ...item, owner, title: item.title || '' })
      })
      if (!appVideoList.value.length) {
        appVideoList.value = resData.map(item => ({ uniqueId: `${item.idx}`, item }))
      }
      else {
        resData.forEach((item) => {
          const findFirstEmptyItemIndex = appVideoList.value.findIndex(video => !video.item)
          if (findFirstEmptyItemIndex !== -1) {
            appVideoList.value[findFirstEmptyItemIndex] = {
              uniqueId: `${item.idx}`,
              item,
            }
          }
          else {
            appVideoList.value.push({
              uniqueId: `${item.idx}`,
              item,
            })
          }
        })
      }
    }
    else if (response.code === 62011) {
      needToLoginFirst.value = true
    }
  }
  finally {
    const filledItems = appVideoList.value.filter(video => video.item)
    appVideoList.value = filledItems
    if (!needToLoginFirst.value) {
      await nextTick()
      if (!await haveScrollbar() || filledItems.length < PAGE_SIZE || filledItems.length < 1) {
        getAppRecommendVideos()
      }
    }
  }
}

function jumpToLoginPage() {
  location.href = 'https://passport.bilibili.com/login'
}

defineExpose({ initData })
</script>

<template>
  <div>
    <Empty v-if="needToLoginFirst" mt-6 :description="$t('common.please_log_in_first')">
      <Button type="primary" @click="jumpToLoginPage()">
        {{ $t('common.login') }}
      </Button>
    </Empty>

    <div
      v-else
      m="b-0 t-0" relative w-full h-full
    >
      <div flex="~ gap-40px">
        <main
          ref="containerRef"
          w-full
          :class="gridClass"
        >
          <template v-if="settings.recommendationMode === 'web'">
            <ForYouVideoCard
              v-for="video in videoList"
              :key="video.uniqueId"
              :skeleton="!video.item"
              type="rcmd"
              :video="video.item ? {
                id: video.item.id,
                duration: video.item.duration,
                title: video.item.title,
                cover: video.item.pic,
                author: {
                  name: video.item.owner.name,
                  authorFace: video.item.owner.face,
                  followed: !!video.item.is_followed,
                  mid: video.item.owner.mid,
                },
                view: video.item.stat.view,
                danmaku: video.item.stat.danmaku,
                publishedTimestamp: video.item.pubdate,
                bvid: video.item.bvid,
                cid: video.item.cid,
              } : undefined"
              :show-preview="true"
              :horizontal="gridLayout !== 'adaptive'"
              :more-btn="true"
            />
          </template>
          <template v-else>
            <ForYouVideoCard
              v-for="video in appVideoList"
              :key="video.uniqueId"
              ref="videoCardRef"
              :skeleton="!video.item"
              type="appRcmd"
              :video="video.item ? {
                id: video.item.args.aid ?? 0,
                durationStr: video.item.cover_right_text,
                title: `${video.item.title}`,
                cover: `${video.item.cover}`,
                author: {
                  name: video.item?.mask?.avatar.text,
                  authorFace: video.item?.mask?.avatar.cover || video.item?.avatar?.cover,
                  followed: video.item?.bottom_rcmd_reason === '已关注' || video.item?.bottom_rcmd_reason === '已關注',
                  mid: video.item?.mask?.avatar.up_id,
                },
                capsuleText: video.item?.desc?.split('·')[1],
                bvid: video.item.bvid,
                viewStr: video.item.cover_left_text_1,
                danmakuStr: video.item.cover_left_text_2,
                cid: video.item?.player_args?.cid,
                goto: video.item?.goto,
                url: video.item?.goto === 'bangumi' ? video.item.uri : '',
                type: video.item.card_goto === 'bangumi' ? 'bangumi' : isVerticalVideo(video.item.uri!) ? 'vertical' : 'horizontal',
                threePointV2: video.item?.three_point_v2,
              } : undefined"
              :show-preview="true"
              :horizontal="gridLayout !== 'adaptive'"
              :more-btn="true"
            />
            <!-- :more-options="video.three_point_v2" -->
          </template>
        </main>

        <div hidden xl:block>
          <ForYouRefreshRail :loading="isLoading" @refresh="initData" />
        </div>
      </div>
    </div>

    <Loading v-show="isLoading" />
    <!-- no more content -->
    <Empty v-if="noMoreContent" class="pb-4" :description="$t('common.no_more_content')" />
  </div>
</template>

<style lang="scss" scoped>
.grid-adaptive {
  --uno: "grid 2xl:cols-5 xl:cols-4 lg:cols-3 md:cols-2 sm:cols-1 cols-1 gap-5";
}

.grid-two-columns {
  --uno: "grid cols-1 xl:cols-2 gap-4";
}

.grid-one-column {
  --uno: "grid cols-1 gap-4";
}
</style>
