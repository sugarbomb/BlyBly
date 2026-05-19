<script setup lang="ts">
import type { CSSProperties } from 'vue'
import { useI18n } from 'vue-i18n'

import { useBewlyApp } from '~/composables/useAppProvider'
import { FilterScope, useFilterAdvance } from '~/composables/useFilterAdvance'
import { settings } from '~/logic'
import { Type as ThreePointV2Type } from '~/models/video/appForYou'
import { openLinkToNewTab } from '~/utils/main'
import { openLinkInBackground } from '~/utils/tabs'

import type { Video } from '../types'
import DislikeDialog from './components/DislikeDialog.vue'

const props = defineProps<{
  video: Video
  contextMenuStyles: CSSProperties
}>()
const emit = defineEmits<{
  (event: 'removed', selectedOpt?: { dislikeReasonId: number }): void
  (event: 'close'): void
  (event: 'reopen'): void
}>()

const getVideoType = inject<() => string>('getVideoType')!
const pageType = inject<string>('pageType', 'unknown')

const videoOptions = reactive<{ id: number, name: string }[]>([
  { id: 1, name: '不感兴趣' },
  { id: 2, name: '不想看此UP主' },
])

const { t } = useI18n()
const showContextMenu = ref<boolean>(false)
const showDislikeDialog = ref<boolean>(false)
const showPipWindow = ref<boolean>(false)
const { openIframeDrawer } = useBewlyApp()
const { addRule } = useFilterAdvance()

function getFilterScope() {
  // 通过pageType判断当前页面
  if (pageType === 'trending')
    return FilterScope.Trending
  if (pageType === 'weeklyRanking')
    return FilterScope.Weekly
  if (pageType === 'ranking')
    return FilterScope.Ranking
  if (pageType === 'partitionForYou')
    return FilterScope.PartitionForYou
  if (pageType === 'partitionRealtime')
    return FilterScope.PartitionRealtime
  if (pageType === 'rcmd' || pageType === 'appRcmd')
    return FilterScope.ForYou

  // 如果无法判断页面类型，返回undefined使用默认存储
  return undefined
}

enum VideoOption {
  OpenInNewTab,
  OpenInBackground,
  OpenInCurrentTab,
  OpenInNewWindow,
  OpenInDrawer,

  ViewTheOriginalCover,
  ViewThisUserChannel,

  CopyVideoLink,
  CopyBVNumber,
  CopyAVNumber,
}

interface MenuOption {
  key: string | number
  name: string
  icon: string
  color?: string
  action: () => void
}

const menuGroups = computed((): MenuOption[][] => {
  const groups: MenuOption[][] = []

  if (settings.value.videoCardContextMenuGroups.blockUserAssistant) {
    const blockUserGroup: MenuOption[] = []
    if (!Array.isArray(props.video?.author) && props.video?.author?.mid) {
      blockUserGroup.push(
        { key: 'block-user', name: '屏蔽此UP主', icon: 'i-solar:user-block-bold-duotone', action: handleBlockUser },
        { key: 'block-user-7', name: '临时屏蔽此UP主 7天', icon: 'i-solar:user-block-bold-duotone', action: () => handleTemporaryBlockUser(7) },
        { key: 'block-user-15', name: '临时屏蔽此UP主 15天', icon: 'i-solar:user-block-bold-duotone', action: () => handleTemporaryBlockUser(15) },
      )
    }
    if (blockUserGroup.length > 0)
      groups.push(blockUserGroup)
  }

  if (settings.value.videoCardContextMenuGroups.blockVideoAssistant) {
    const blockVideoGroup: MenuOption[] = []
    if (props.video?.id) {
      blockVideoGroup.push(
        { key: 'block-video-7', name: '临时屏蔽此视频 7天', icon: 'i-solar:video-frame-cut-bold-duotone', action: () => handleTemporaryBlockVideo(7) },
        { key: 'block-video-15', name: '临时屏蔽此视频 15天', icon: 'i-solar:video-frame-cut-bold-duotone', action: () => handleTemporaryBlockVideo(15) },
      )
    }
    if (blockVideoGroup.length > 0)
      groups.push(blockVideoGroup)
  }

  if (settings.value.videoCardContextMenuGroups.blockUserAssistant || settings.value.videoCardContextMenuGroups.blockVideoAssistant) {
    const dislikeGroup: MenuOption[] = []

    if (getVideoType() === 'appRcmd') {
      for (const option of props.video.threePointV2 ?? []) {
        if (option.type === ThreePointV2Type.WatchLater || option.type === ThreePointV2Type.Feedback)
          continue

        dislikeGroup.push({
          key: `app-${option.type}`,
          name: option.type === ThreePointV2Type.Dislike ? t('video_card.operation.not_interested') : option.title,
          icon: 'i-solar:confounded-circle-bold-duotone',
          action: () => handleAppMoreCommand(option.type),
        })
      }
    }
    else if (getVideoType() === 'rcmd') {
      for (const option of videoOptions) {
        dislikeGroup.push({
          key: `web-${option.id}`,
          name: option.name,
          icon: 'i-solar:confounded-circle-bold-duotone',
          action: () => handleMoreCommand(option.id),
        })
      }
    }

    if (dislikeGroup.length > 0)
      groups.push(dislikeGroup)
  }

  if (settings.value.videoCardContextMenuGroups.openWays) {
    groups.push([
      { key: VideoOption.OpenInNewTab, name: t('video_card.operation.open_in_new_tab'), icon: 'i-solar:square-top-down-bold-duotone', action: () => handleCommonCommand(VideoOption.OpenInNewTab) },
      { key: VideoOption.OpenInBackground, name: t('video_card.operation.open_in_background'), icon: 'i-solar:square-top-down-bold-duotone', action: () => handleCommonCommand(VideoOption.OpenInBackground) },
      { key: VideoOption.OpenInNewWindow, name: t('video_card.operation.open_in_new_window'), icon: 'i-solar:maximize-square-3-bold-duotone', action: () => handleCommonCommand(VideoOption.OpenInNewWindow) },
      { key: VideoOption.OpenInCurrentTab, name: t('video_card.operation.open_in_current_tab'), icon: 'i-solar:square-top-down-bold-duotone', action: () => handleCommonCommand(VideoOption.OpenInCurrentTab) },
      { key: VideoOption.OpenInDrawer, name: t('video_card.operation.open_in_drawer'), icon: 'i-solar:archive-up-minimlistic-bold-duotone', action: () => handleCommonCommand(VideoOption.OpenInDrawer) },
    ])
  }

  if (settings.value.videoCardContextMenuGroups.copyAssistant) {
    groups.push([
      { key: VideoOption.CopyVideoLink, name: t('video_card.operation.copy_video_link'), icon: 'i-solar:copy-bold-duotone', action: () => handleCommonCommand(VideoOption.CopyVideoLink) },
      { key: VideoOption.CopyBVNumber, name: t('video_card.operation.copy_bv_number'), icon: 'i-solar:copy-bold-duotone', action: () => handleCommonCommand(VideoOption.CopyBVNumber) },
      { key: VideoOption.CopyAVNumber, name: t('video_card.operation.copy_av_number'), icon: 'i-solar:copy-bold-duotone', action: () => handleCommonCommand(VideoOption.CopyAVNumber) },
    ])
  }

  if (settings.value.videoCardContextMenuGroups.cover) {
    groups.push([
      { key: VideoOption.ViewTheOriginalCover, name: t('video_card.operation.view_the_original_cover'), icon: 'i-solar:gallery-minimalistic-bold-duotone', action: () => handleCommonCommand(VideoOption.ViewTheOriginalCover) },
    ])
  }

  let result = groups
  if (getVideoType() === 'bangumi' || getVideoType() === 'live') {
    result = result.map((group) => {
      return group.filter((opt) => {
        return opt.key !== VideoOption.CopyBVNumber && opt.key !== VideoOption.CopyAVNumber && opt.key !== VideoOption.ViewThisUserChannel
      })
    })
  }
  return result.filter(group => group.length > 0)
})

onMounted(() => {
  showContextMenu.value = true
})

function handleMoreCommand(_command: number) {
  handleRemoved()
}

function handleAppMoreCommand(command: ThreePointV2Type) {
  switch (command) {
    case ThreePointV2Type.Feedback:
      break
    case ThreePointV2Type.Dislike:
      openAppDislikeDialog()
      break
  }
}

function handleCommonCommand(command: VideoOption) {
  switch (command) {
    case VideoOption.OpenInNewTab:
      openLinkToNewTab(props.video.url!)
      handleClose()
      break
    case VideoOption.OpenInBackground:
      openLinkInBackground(props.video.url!)
      handleClose()
      break
    case VideoOption.OpenInNewWindow:
      showPipWindow.value = true
      break
    case VideoOption.OpenInCurrentTab:
      window.open(props.video.url, '_self')
      handleClose()
      break
    case VideoOption.OpenInDrawer:
      openIframeDrawer(props.video.url || '')
      handleClose()
      break

    case VideoOption.CopyVideoLink:
      navigator.clipboard.writeText(props.video.url!)
      handleClose()
      break
    case VideoOption.CopyBVNumber:
      navigator.clipboard.writeText(props.video.bvid!)
      handleClose()
      break
    case VideoOption.CopyAVNumber:
      navigator.clipboard.writeText(`av${props.video.id.toString()}`)
      handleClose()
      break

    case VideoOption.ViewTheOriginalCover:
      window.open(props.video.cover, '_blank')
      handleClose()
      break
  }
}

function openAppDislikeDialog() {
  showDislikeDialog.value = true
  showContextMenu.value = false
}

function handleClose() {
  showContextMenu.value = false
  showPipWindow.value = false
  emit('close')
}

function handleReopen() {
  // showContextMenu.value = false
  // showPipWindow.value = false
  // console.log('reopen')
  // emit('reopen')
  handleClose()
}

function handleRemoved(selectedOpt?: { dislikeReasonId: number }) {
  emit('removed', selectedOpt)
  handleClose()
}

function handleBlockUser() {
  addUserBlockRule()
  handleClose()
}

function handleTemporaryBlockUser(days: 7 | 15) {
  addUserBlockRule(days)
  handleClose()
}

function handleTemporaryBlockVideo(days: 7 | 15) {
  const title = props.video?.title?.trim()
  const bvid = props.video?.bvid?.trim()
  const aid = props.video?.aid || props.video?.id
  const value = bvid || (aid ? `av${aid}` : title)

  if (value)
    useFilterAdvance(FilterScope.ExpiringGlobal).addRule({ type: 'keyword', value, enabled: true, duration: days })

  handleClose()
}

function addUserBlockRule(duration?: 7 | 15) {
  let mid: number | undefined
  if (props.video?.author) {
    if (Array.isArray(props.video.author)) {
      // 多作者暂不处理
      mid = undefined
    }
    else {
      mid = props.video.author.mid
    }
  }
  if (mid) {
    if (duration) {
      useFilterAdvance(FilterScope.ExpiringGlobal).addRule({ type: 'uid', value: String(mid), enabled: true, duration })
      return
    }

    const filterScope = getFilterScope()
    if (filterScope) {
      useFilterAdvance(filterScope).addRule({ type: 'uid', value: String(mid), enabled: true })
    }
    else {
      addRule({ type: 'uid', value: String(mid), enabled: true })
    }
  }
}
</script>

<template>
  <div>
    <!-- more popup -->
    <div v-if="showContextMenu">
      <div
        style="backdrop-filter: var(--bew-filter-glass-1); box-shadow: var(--bew-shadow-edge-glow-1), var(--bew-shadow-1);"
        :style="contextMenuStyles"
        p-1 bg="$bew-elevated" rounded="$bew-radius"
        min-w-200px m="t-4 l-[calc(-200px+1rem)]"
        border="1 $bew-border-color"
        z-10
      >
        <ul flex="~ col gap-1">
          <template v-for="(optionGroup, index) in menuGroups" :key="index">
            <li
              v-for="option in optionGroup"
              :key="option.key"
              class="context-menu-item"
              @click="option.action"
            >
              <i class="item-icon" :class="option.icon" />
              {{ option.name }}
            </li>

            <div v-if="index !== menuGroups.length - 1" class="divider" />
          </template>
        </ul>
      </div>
    </div>

    <!-- mask -->
    <div
      v-if="showContextMenu"
      pos="fixed top-0 left-0" w-full h-full
      @click="handleClose"
      @click.right.prevent.stop="handleReopen"
    />

    <DislikeDialog
      v-model="showDislikeDialog"
      :video="video"
      @close="handleClose"
      @removed="handleRemoved"
    />

    <PipWindow
      v-if="showPipWindow"
      :url="video.url"
      @close="handleClose"
    />
  </div>
</template>

<style lang="scss" scoped>
.context-menu-item {
  --uno: "hover:bg-$bew-fill-2 text-sm px-2.5 py-1.75 rounded-$bew-radius-half cursor-pointer";
  --uno: "flex items-center";
}

.item-icon {
  --uno: "mr-2 inline-block color-$bew-text-color-2";
}

.divider {
  --uno: "w-full h-1px px-2px bg-$bew-border-color";
}
</style>
