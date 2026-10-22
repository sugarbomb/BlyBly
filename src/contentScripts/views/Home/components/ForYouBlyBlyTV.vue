<script setup lang="ts">
import { computed, provide, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import AccessKeyAuthorizeDialog from '~/components/AccessKeyAuthorizeDialog.vue'
import RecommendationLayout from '~/components/RecommendationLayout/RecommendationLayout.vue'
import type { RecommendationLayoutHandle, RecommendationLoadContext, RecommendationPage } from '~/components/RecommendationLayout/types'
import ForYouRefreshRail from '~/components/SideBar/ForYouRefreshRail.vue'
import ForYouVideoCard from '~/components/VideoCard/ForYouVideoCard.vue'
import { useBewlyApp } from '~/composables/useAppProvider'
import { FilterScope, useFilterAdvance } from '~/composables/useFilterAdvance'
import { useRecommendationLayoutSettings } from '~/composables/useRecommendationLayoutSettings'
import { LanguageType } from '~/enums/appEnums'
import type { GridLayoutType } from '~/logic'
import { accessKey, settings } from '~/logic'
import type { AppForYouResult, Item as AppVideoItem } from '~/models/video/appForYou'
import api from '~/utils/api'
import { TVAppKey } from '~/utils/authProvider'
import { isVerticalVideo } from '~/utils/uriParse'

const props = defineProps<{ gridLayout: GridLayoutType }>()
const emit = defineEmits<{
  (e: 'beforeLoading'): void
  (e: 'afterLoading'): void
}>()

interface AppVideoElement {
  uniqueId: string
  item: AppVideoItem
}

const { t } = useI18n()
const layoutSettings = useRecommendationLayoutSettings('tv')
const layoutOptions = computed(() => ({
  ...layoutSettings.value,
  minItems: 4,
  maxItems: 10,
  itemCount: layoutSettings.value.itemCount === undefined ? undefined : Math.max(4, Math.min(layoutSettings.value.itemCount, 10)),
}))
const layoutRef = ref<RecommendationLayoutHandle<AppVideoElement>>()
const needToLoginFirst = ref(false)
const showAccessKeyAuthorizeDialog = ref(false)
const { handleReachBottom, handlePageRefresh, scrollbarRef } = useBewlyApp()
const scrollViewport = computed<HTMLElement | undefined>(() => scrollbarRef.value?.osInstance()?.elements().viewport)
const { shouldFilterItem } = useFilterAdvance(FilterScope.ForYouTV)

provide('pageType', 'tvRcmd')
onMounted(initPageAction)
onActivated(initPageAction)

watch(() => accessKey.value, async (key) => {
  if (key)
    await initData()
})

async function initData() {
  needToLoginFirst.value = false
  if (!accessKey.value)
    return
  await nextTick()
  await layoutRef.value?.refresh('initial')
}

async function loadPage(context: RecommendationLoadContext): Promise<RecommendationPage<AppVideoElement>> {
  const idx = context.mode === 'append' && typeof context.cursor === 'number' ? context.cursor : 1
  const response: AppForYouResult = await api.video.getAppRecommendVideos({
    access_key: accessKey.value,
    s_locale: settings.value.language === LanguageType.Mandarin_TW || settings.value.language === LanguageType.Cantonese ? 'zh-Hant_TW' : 'zh-Hans_CN',
    c_locate: settings.value.language === LanguageType.Mandarin_TW || settings.value.language === LanguageType.Cantonese ? 'zh-Hant_TW' : 'zh-Hans_CN',
    appkey: TVAppKey.appkey,
    idx,
  })
  if (context.signal.aborted)
    throw new DOMException('Aborted', 'AbortError')
  if (response.code === 62011) {
    needToLoginFirst.value = true
    return { items: [], hasMore: false }
  }
  if (response.code !== 0)
    throw new Error(t('recommendation.load_failed'))
  const rawItems = response.data?.items ?? []
  const items = rawItems
    .filter(item => !item.card_type.includes('banner') && item.card_type !== 'cm_v1')
    .filter((item) => {
      const owner = {
        mid: item?.mask?.avatar?.up_id || item?.args?.up_id || 0,
        name: item?.mask?.avatar?.text || item?.args?.up_name || '',
      }
      return !shouldFilterItem({ ...item, owner, title: item.title || '' })
    })
  return {
    items: items.map(item => ({
      uniqueId: item.args?.aid ? `av-${item.args.aid}` : item.bvid || item.uri || `idx-${item.idx}`,
      item,
    })),
    cursor: rawItems.at(-1)?.idx ?? idx,
    hasMore: rawItems.length > 0,
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

    <RecommendationLayout
      v-else ref="layoutRef" v-bind="layoutOptions"
      :grid-layout="props.gridLayout" :scroll-target="scrollViewport"
      :load-page="loadPage" :get-item-key="video => video.uniqueId"
      @before-loading="emit('beforeLoading')" @after-loading="emit('afterLoading')"
    >
      <template #default="{ items }">
        <ForYouVideoCard
          v-for="video in items"
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
      </template>
      <template #placeholder="{ count }">
        <ForYouVideoCard v-for="index in count" :key="`pending-${index}`" skeleton type="appRcmd" :horizontal="gridLayout !== 'adaptive'" />
      </template>
      <template v-if="layoutOptions.loadModes.includes('manual')" #tools="{ load, loading }">
        <ForYouRefreshRail :loading="loading" :placement="layoutOptions.toolsSide === 'left' ? 'right' : 'left'" @refresh="load('manual')" />
      </template>
    </RecommendationLayout>

    <AccessKeyAuthorizeDialog v-model="showAccessKeyAuthorizeDialog" />
  </div>
</template>
