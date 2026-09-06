<script setup lang="ts">
import { useWindowSize } from '@vueuse/core'
import { computed, provide, watch } from 'vue'

import AccessKeyAuthorizeDialog from '~/components/AccessKeyAuthorizeDialog.vue'
import ForYouVideoCard from '~/components/VideoCard/ForYouVideoCard.vue'
import { useBewlyApp } from '~/composables/useAppProvider'
import { FilterScope, useFilterAdvance } from '~/composables/useFilterAdvance'
import { LanguageType } from '~/enums/appEnums'
import type { GridLayoutType } from '~/logic'
import { accessKey, settings } from '~/logic'
import type { AppForYouResult, Item as AppVideoItem } from '~/models/video/appForYou'
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

const appVideoList = ref<AppVideoElement[]>([])
const isLoading = ref(false)
const needToLoginFirst = ref(false)
const noMoreContent = ref(false)
const pendingInit = ref(false)
const showAccessKeyAuthorizeDialog = ref(false)
const { handleReachBottom, handlePageRefresh } = useBewlyApp()
const { width } = useWindowSize()
const { shouldFilterItem } = useFilterAdvance(FilterScope.ForYouTV)

provide('pageType', 'tvRcmd')

const gridColumnCount = computed<number>(() => {
  if (props.gridLayout === 'adaptive') {
    if (width.value >= 1536)
      return 5
    if (width.value >= 1280)
      return 4
    if (width.value >= 1024)
      return 3
    if (width.value >= 768)
      return 2
  }
  if (props.gridLayout === 'twoColumns')
    return width.value >= 1280 ? 2 : 1
  return 1
})

const pageSize = computed(() => Math.max(4, Math.min(gridColumnCount.value * 2, 10)))

onMounted(() => {
  initData()
  initPageAction()
})

onActivated(initPageAction)

watch(() => accessKey.value, async (newAccessKey) => {
  if (newAccessKey)
    await initData()
})

async function initData() {
  if (isLoading.value) {
    pendingInit.value = true
    return
  }

  noMoreContent.value = false
  needToLoginFirst.value = false
  appVideoList.value.length = 0
  if (!accessKey.value)
    return
  await getData()
}

async function getData() {
  emit('beforeLoading')
  isLoading.value = true
  try {
    let i = 0
    appVideoList.value = Array.from({ length: pageSize.value }, () => ({
      uniqueId: `unique-id-${i++}`,
    } satisfies AppVideoElement))

    const response: AppForYouResult = await api.video.getAppRecommendVideos({
      access_key: accessKey.value,
      s_locale: settings.value.language === LanguageType.Mandarin_TW || settings.value.language === LanguageType.Cantonese ? 'zh-Hant_TW' : 'zh-Hans_CN',
      c_locate: settings.value.language === LanguageType.Mandarin_TW || settings.value.language === LanguageType.Cantonese ? 'zh-Hant_TW' : 'zh-Hans_CN',
      appkey: TVAppKey.appkey,
      idx: 1,
    })

    if (!response.data) {
      noMoreContent.value = true
      return
    }
    if (response.code === 0) {
      const items = response.data.items
        .filter(item => !item.card_type.includes('banner') && item.card_type !== 'cm_v1')
        .filter((item) => {
          const owner = {
            mid: item?.mask?.avatar?.up_id || item?.args?.up_id || 0,
            name: item?.mask?.avatar?.text || item?.args?.up_name || '',
            face: item?.mask?.avatar?.cover || item?.avatar?.cover || '',
          }
          return !shouldFilterItem({ ...item, owner, title: item.title || '' })
        })
      appVideoList.value = items.map(item => ({ uniqueId: `${item.idx}`, item }))
    }
    else if (response.code === 62011) {
      needToLoginFirst.value = true
    }
  }
  finally {
    appVideoList.value = appVideoList.value.filter(video => video.item)
    isLoading.value = false
    emit('afterLoading')
    if (pendingInit.value) {
      pendingInit.value = false
      await initData()
    }
  }
}

function initPageAction() {
  handleReachBottom.value = undefined
  handlePageRefresh.value = initData
}

function jumpToLoginPage() {
  location.href = 'https://passport.bilibili.com/login'
}

defineExpose({ initData })
</script>

<template>
  <div>
    <div v-if="!accessKey" flex justify-center>
      <Empty mt-6 :description="$t('settings.authorize_app_desc')">
        <Button type="primary" @click="showAccessKeyAuthorizeDialog = true">
          {{ $t('settings.btn.authorize') }}...
        </Button>
      </Empty>
    </div>

    <div v-else-if="needToLoginFirst" flex justify-center>
      <Empty mt-6 :description="$t('common.please_log_in_first')">
        <Button type="primary" @click="jumpToLoginPage()">
          {{ $t('common.login') }}
        </Button>
      </Empty>
    </div>

    <main v-else w-full :class="gridClass">
      <ForYouVideoCard
        v-for="video in appVideoList"
        :key="video.uniqueId"
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
    </main>

    <Loading v-show="isLoading" />
    <Empty v-if="noMoreContent" class="pb-4" :description="$t('common.no_more_content')" />
    <AccessKeyAuthorizeDialog v-model="showAccessKeyAuthorizeDialog" />
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
