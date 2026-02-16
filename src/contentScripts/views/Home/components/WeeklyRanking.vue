<script setup lang="ts">
import WeeklyRankingControl from '~/components/List/WeeklyRankingControl.vue'
import { useBewlyApp } from '~/composables/useAppProvider'
import type { GridLayoutType } from '~/logic'
import api from '~/utils/api'

interface WeeklySeriesItem {
  number: number
  subject: string
  status: number
  name: string
}

interface MonthlySeriesPage {
  key: string
  monthLabel: string
  items: WeeklySeriesItem[]
}

interface WeeklySeriesListResult {
  code: number
  message: string
  ttl: number
  data: {
    list: WeeklySeriesItem[]
  }
}

interface WeeklySeriesDetailResult {
  code: number
  message: string
  ttl: number
  data?: {
    list?: any[]
  } | any[]
}

interface WeeklyVideoCardItem {
  id: number
  bvid?: string
  cid?: number
  title: string
  desc?: string
  cover: string
  duration?: number
  view?: number
  danmaku?: number
  publishedTimestamp?: number
  tag?: string
  author: {
    name?: string
    authorFace: string
    mid?: number
  }
}

const props = defineProps<{
  gridLayout: GridLayoutType
  topBarVisibility?: boolean
}>()

const emit = defineEmits<{
  (e: 'beforeLoading'): void
  (e: 'afterLoading'): void
}>()

const PAGE_SIZE = 4
const { handlePageRefresh } = useBewlyApp()
const monthIndex = ref<number>(0)
const activeWeekIndex = ref<number>(0)
const isLoading = ref<boolean>(false)
const isDetailLoading = ref<boolean>(false)
const pendingRefresh = ref<boolean>(false)
const weeklySeriesList = ref<WeeklySeriesItem[]>([])
const weeklyVideoCards = ref<WeeklyVideoCardItem[]>([])
const detailCache = new Map<number, WeeklyVideoCardItem[]>()
let detailRequestToken = 0

onMounted(() => {
  initData()
  initPageAction()
})

onActivated(() => {
  initPageAction()
})

function parseSeriesTime(name: string): { key: string, monthLabel: string } {
  const fullMatch = name.match(/^(\d{4}).*?(\d{2})\.\d{2}\s*-\s*\d{2}\.\d{2}/)
  if (fullMatch) {
    const [, year, month] = fullMatch
    return {
      key: `${year}-${month}`,
      monthLabel: month,
    }
  }

  const monthOnlyMatch = name.match(/(\d{2})\.\d{2}\s*-\s*\d{2}\.\d{2}/)
  const month = monthOnlyMatch?.[1] ?? '00'
  return {
    key: `unknown-${month}-${name}`,
    monthLabel: month,
  }
}

function fillFutureItems(items: WeeklySeriesItem[], monthLabel: string): WeeklySeriesItem[] {
  const orderedItems = [...items].sort((a, b) => a.number - b.number)
  const realItems = orderedItems.length > PAGE_SIZE
    ? orderedItems.slice(-PAGE_SIZE)
    : orderedItems

  const missingCount = PAGE_SIZE - realItems.length
  if (missingCount <= 0)
    return realItems

  const maxIssue = realItems[realItems.length - 1]?.number ?? 0
  const placeholders: WeeklySeriesItem[] = []

  for (let i = 1; i <= missingCount; i += 1) {
    const futureIssue = maxIssue + i
    placeholders.push({
      number: futureIssue,
      subject: `${monthLabel}月待上传`,
      status: 0,
      name: '',
    })
  }

  return [...realItems, ...placeholders]
}

const monthPages = computed<MonthlySeriesPage[]>(() => {
  const pages: MonthlySeriesPage[] = []

  for (const item of weeklySeriesList.value) {
    const timeInfo = parseSeriesTime(item.name)
    const targetPage = pages.find(page => page.key === timeInfo.key)
    if (targetPage)
      targetPage.items.push(item)
    else
      pages.push({ key: timeInfo.key, monthLabel: timeInfo.monthLabel, items: [item] })
  }

  return pages.map(page => ({
    key: page.key,
    monthLabel: page.monthLabel,
    items: fillFutureItems(page.items, page.monthLabel),
  }))
})

const pageCount = computed(() => {
  return Math.max(1, monthPages.value.length)
})

const currentPageItems = computed(() => {
  return monthPages.value[monthIndex.value]?.items ?? []
})

const selectedSeries = computed(() => {
  return currentPageItems.value[activeWeekIndex.value]
})

const currentMonthStatuses = computed(() => {
  return currentPageItems.value.map(item => ({
    issue: item.number,
    uploaded: item.status === 2,
    title: item.subject,
  }))
})

const currentMonth = computed(() => {
  return monthPages.value[monthIndex.value]?.monthLabel ?? ''
})

watch(pageCount, (total) => {
  if (monthIndex.value > total - 1)
    monthIndex.value = Math.max(0, total - 1)
})

const currentIssue = computed(() => {
  return selectedSeries.value?.number ?? 0
})

const currentTitle = computed(() => {
  return selectedSeries.value?.subject ?? '周榜标题'
})

const recommendedTerms = computed(() => {
  const terms: string[] = []
  const seen = new Set<string>()

  for (const video of weeklyVideoCards.value) {
    const candidates = splitReasonText(video.tag ?? '')
    for (const candidate of candidates) {
      if (seen.has(candidate))
        continue
      seen.add(candidate)
      terms.push(candidate)
      if (terms.length >= 6)
        return terms
    }
  }

  return terms
})

const gridClass = computed((): string => {
  if (props.gridLayout === 'adaptive')
    return 'grid-adaptive'
  if (props.gridLayout === 'twoColumns')
    return 'grid-two-columns'
  return 'grid-one-column'
})

function handlePrevMonth() {
  if (monthIndex.value >= pageCount.value - 1)
    return

  const nextMonthIndex = monthIndex.value + 1
  const preferredIssue = currentIssue.value - 1
  activeWeekIndex.value = resolveWeekIndex(nextMonthIndex, preferredIssue, 'older')
  monthIndex.value = nextMonthIndex
}

function handleNextMonth() {
  if (monthIndex.value <= 0)
    return

  const nextMonthIndex = monthIndex.value - 1
  const preferredIssue = currentIssue.value + 1
  activeWeekIndex.value = resolveWeekIndex(nextMonthIndex, preferredIssue, 'newer')
  monthIndex.value = nextMonthIndex
}

function handleSelectWeek(index: number) {
  const selectedItem = currentPageItems.value[index]
  if (!selectedItem || selectedItem.status !== 2)
    return

  activeWeekIndex.value = index
}

function resolveWeekIndex(targetMonthIndex: number, preferredIssue: number, direction: 'older' | 'newer'): number {
  const items = monthPages.value[targetMonthIndex]?.items ?? []
  if (!items.length)
    return 0

  const exactIndex = items.findIndex(item => item.status === 2 && item.number === preferredIssue)
  if (exactIndex >= 0)
    return exactIndex

  const uploadedEntries = items
    .map((item, index) => ({ item, index }))
    .filter(entry => entry.item.status === 2)

  if (!uploadedEntries.length)
    return 0

  if (direction === 'older') {
    const candidates = uploadedEntries.filter(entry => entry.item.number <= preferredIssue)
    return (candidates[candidates.length - 1] ?? uploadedEntries[uploadedEntries.length - 1]).index
  }

  const candidates = uploadedEntries.filter(entry => entry.item.number >= preferredIssue)
  return (candidates[0] ?? uploadedEntries[0]).index
}

watch(selectedSeries, (item) => {
  void syncWeeklyVideosBySeries(item)
}, { immediate: true })

async function initData() {
  monthIndex.value = 0
  activeWeekIndex.value = 0
  weeklySeriesList.value = []
  weeklyVideoCards.value = []
  detailCache.clear()
  await getData()
}

async function getData() {
  emit('beforeLoading')
  isLoading.value = true
  try {
    await getWeeklySeriesList()
  }
  finally {
    isLoading.value = false
    emit('afterLoading')
    if (pendingRefresh.value) {
      pendingRefresh.value = false
      await initData()
    }
  }
}

function initPageAction() {
  handlePageRefresh.value = async () => {
    if (isLoading.value) {
      pendingRefresh.value = true
      return
    }
    await initData()
  }
}

async function getWeeklySeriesList() {
  try {
    const response: WeeklySeriesListResult = await api.weeklyRanking.getWeeklyRankingSeriesList()
    if (response.code === 0)
      weeklySeriesList.value = response.data?.list ?? []
  }
  catch {
    weeklySeriesList.value = []
  }
}

async function syncWeeklyVideosBySeries(series?: WeeklySeriesItem) {
  if (!series || series.status !== 2) {
    weeklyVideoCards.value = []
    isDetailLoading.value = false
    return
  }

  const { number } = series
  if (detailCache.has(number)) {
    weeklyVideoCards.value = detailCache.get(number) ?? []
    isDetailLoading.value = false
    return
  }

  isDetailLoading.value = true
  const currentToken = ++detailRequestToken
  try {
    const response: WeeklySeriesDetailResult = await api.weeklyRanking.getWeeklyRankingSeriesDetail({ number })
    const normalizedVideos = normalizeWeeklyVideoList(response)
    detailCache.set(number, normalizedVideos)
    if (currentToken === detailRequestToken)
      weeklyVideoCards.value = normalizedVideos
  }
  catch {
    if (currentToken === detailRequestToken)
      weeklyVideoCards.value = []
  }
  finally {
    if (currentToken === detailRequestToken)
      isDetailLoading.value = false
  }
}

function normalizeWeeklyVideoList(response: WeeklySeriesDetailResult): WeeklyVideoCardItem[] {
  const rawData = response?.data
  const rawList = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData?.list)
      ? rawData.list
      : []

  return rawList
    .map((item, index) => normalizeWeeklyVideoItem(item, index))
    .filter(Boolean) as WeeklyVideoCardItem[]
}

function normalizeWeeklyVideoItem(item: any, index: number): WeeklyVideoCardItem | null {
  const base = item?.archive ?? item
  const owner = base?.owner ?? item?.owner ?? {}
  const stat = base?.stat ?? item?.stat ?? {}
  const rcmdReason = item?.rcmd_reason ?? base?.rcmd_reason
  const reasonText = typeof rcmdReason === 'string' ? rcmdReason : rcmdReason?.content

  const id = Number(base?.aid ?? base?.id ?? item?.aid ?? item?.id ?? 0) || (index + 1)
  const bvid = `${base?.bvid ?? item?.bvid ?? ''}` || undefined
  const title = `${base?.title ?? item?.title ?? ''}`.trim()
  const cover = `${base?.pic ?? base?.cover ?? item?.pic ?? item?.cover ?? ''}`.trim()

  if (!title || !cover)
    return null

  return {
    id,
    bvid,
    cid: Number(base?.cid ?? item?.cid ?? 0) || undefined,
    title,
    desc: `${base?.desc ?? item?.desc ?? ''}`.trim() || undefined,
    cover,
    duration: Number(base?.duration ?? item?.duration ?? 0) || undefined,
    view: Number(stat?.view ?? base?.view ?? item?.view ?? 0) || undefined,
    danmaku: Number(stat?.danmaku ?? base?.danmaku ?? item?.danmaku ?? 0) || undefined,
    publishedTimestamp: Number(base?.pubdate ?? item?.pubdate ?? base?.ctime ?? item?.ctime ?? 0) || undefined,
    tag: `${reasonText ?? item?.tag_name ?? ''}`.trim(),
    author: {
      name: `${owner?.name ?? owner?.uname ?? ''}`.trim() || undefined,
      authorFace: `${owner?.face ?? owner?.avatar ?? ''}`.trim(),
      mid: Number(owner?.mid ?? owner?.uid ?? 0) || undefined,
    },
  }
}

function splitReasonText(text: string): string[] {
  return text
    .split(/[，。！？、；,.!?/\s]+/g)
    .map(item => item.trim())
    .filter(item => item.length >= 2 && item.length <= 14)
}

defineExpose({ initData })
</script>

<template>
  <div>
    <main w-full :class="gridClass">
      <div
        class="weekly-control-card"
        style="backdrop-filter: var(--bew-filter-glass-1)"
        bg="$bew-elevated"
        rounded="$bew-radius"
        p-4
        box-border border="1 $bew-border-color"
        text-center w-full
      >
        <WeeklyRankingControl
          :month="currentMonth"
          :issue="currentIssue"
          :title="currentTitle"
          :keywords="recommendedTerms"
          :month-statuses="currentMonthStatuses"
          :active-week-index="activeWeekIndex"
          :can-prev="monthIndex < pageCount - 1"
          :can-next="monthIndex > 0"
          @prev-month="handlePrevMonth"
          @next-month="handleNextMonth"
          @select-week="handleSelectWeek"
        />
      </div>

      <template v-if="!isDetailLoading">
        <VideoCard
          v-for="(video, index) in weeklyVideoCards"
          :key="video.bvid || `${video.id}-${index}`"
          :video="{
            id: video.id,
            duration: video.duration,
            title: video.title,
            desc: video.desc,
            cover: video.cover,
            author: {
              name: video.author.name,
              authorFace: video.author.authorFace,
              mid: video.author.mid,
            },
            view: video.view,
            danmaku: video.danmaku,
            publishedTimestamp: video.publishedTimestamp,
            bvid: video.bvid,
            tag: video.tag || '',
            cid: video.cid,
            rank: index + 1,
          }"
          show-preview
          :horizontal="gridLayout !== 'adaptive'"
        />
      </template>

      <template v-else>
        <VideoCardSkeleton
          v-for="item in 12"
          :key="item"
          :horizontal="gridLayout !== 'adaptive'"
        />
      </template>
    </main>
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
