<script setup lang="ts">
import WeeklyRankingControl from '~/components/List/WeeklyRankingControl.vue'

defineOptions({
  name: 'WeeklyRanking',
})

interface WeeklySeriesItem {
  number: number
  subject: string
  status: number
  name: string
}

interface MonthlySeriesPage {
  month: string
  items: WeeklySeriesItem[]
}

const PAGE_SIZE = 4
const monthIndex = ref<number>(0)
const activeWeekIndex = ref<number>(0)

const weeklySeriesSeed: WeeklySeriesItem[] = [
  {
    number: 279,
    subject: '身残志坚钻石大盗',
    status: 2,
    name: '2024第279期 07.19 - 07.25',
  },
  {
    number: 278,
    subject: '第一视角体验边境巡逻',
    status: 2,
    name: '2024第278期 07.12 - 07.18',
  },
  {
    number: 277,
    subject: '千人合奏现场录音还原',
    status: 2,
    name: '2024第277期 07.05 - 07.11',
  },
  {
    number: 276,
    subject: '硬核拆解超音速客机',
    status: 2,
    name: '2024第276期 06.28 - 07.04',
  },
  {
    number: 275,
    subject: '在热带雨林建造树屋',
    status: 2,
    name: '2024第275期 06.21 - 06.27',
  },
  {
    number: 274,
    subject: '零预算拍出电影感短片',
    status: 2,
    name: '2024第274期 06.14 - 06.20',
  },
  {
    number: 273,
    subject: '旧城区深夜美食地图',
    status: 2,
    name: '2024第273期 06.07 - 06.13',
  },
  {
    number: 272,
    subject: '72小时跨城接力直播',
    status: 2,
    name: '2024第272期 05.31 - 06.06',
  },
  {
    number: 271,
    subject: '高空伞降编队挑战',
    status: 2,
    name: '2024第271期 05.24 - 05.30',
  },
  {
    number: 270,
    subject: '海上风暴中的应急演练',
    status: 2,
    name: '2024第270期 05.17 - 05.23',
  },
]

function getStartMonth(name: string): string {
  const match = name.match(/(\d{2})\.\d{2}\s*-\s*\d{2}\.\d{2}/)
  return match?.[1] ?? ''
}

function fillFutureItems(items: WeeklySeriesItem[], month: string): WeeklySeriesItem[] {
  const realItems = [...items]
    .sort((a, b) => a.number - b.number)
    .slice(0, PAGE_SIZE)

  const missingCount = PAGE_SIZE - realItems.length
  if (missingCount <= 0)
    return realItems

  const maxIssue = realItems[realItems.length - 1]?.number ?? 0
  const placeholders: WeeklySeriesItem[] = []

  for (let i = 1; i <= missingCount; i += 1) {
    const futureIssue = maxIssue + i
    placeholders.push({
      number: futureIssue,
      subject: `${month}月待上传`,
      status: 0,
      name: '',
    })
  }

  return [...realItems, ...placeholders]
}

const monthPages = computed<MonthlySeriesPage[]>(() => {
  const pages: MonthlySeriesPage[] = []

  for (const item of weeklySeriesSeed) {
    const month = getStartMonth(item.name)
    const targetPage = pages.find(page => page.month === month)
    if (targetPage)
      targetPage.items.push(item)
    else
      pages.push({ month, items: [item] })
  }

  return pages.map(page => ({
    month: page.month,
    items: fillFutureItems(page.items, page.month),
  }))
})

const pageCount = computed(() => {
  return Math.max(1, monthPages.value.length)
})

const currentPageItems = computed(() => {
  return monthPages.value[monthIndex.value]?.items ?? []
})

const currentMonthStatuses = computed(() => {
  return currentPageItems.value.map(item => ({
    issue: item.number,
    uploaded: item.status === 2,
    title: item.subject,
  }))
})

const currentMonth = computed(() => {
  return monthPages.value[monthIndex.value]?.month ?? ''
})

watch(pageCount, (total) => {
  if (monthIndex.value > total - 1)
    monthIndex.value = Math.max(0, total - 1)
})

const currentIssue = computed(() => {
  const currentWeekData = currentMonthStatuses.value[activeWeekIndex.value]
  return currentWeekData?.issue ?? 0
})

const currentTitle = computed(() => {
  const currentWeekData = currentMonthStatuses.value[activeWeekIndex.value]
  return currentWeekData?.title ?? '周榜标题'
})

function handlePrevMonth() {
  if (monthIndex.value >= pageCount.value - 1)
    return

  monthIndex.value += 1
  activeWeekIndex.value = 0
}

function handleNextMonth() {
  if (monthIndex.value <= 0)
    return

  monthIndex.value -= 1
  activeWeekIndex.value = 0
}

function handleSelectWeek(index: number) {
  activeWeekIndex.value = index
}
</script>

<template>
  <div
    style="backdrop-filter: var(--bew-filter-glass-1)"
    bg="$bew-elevated"
    rounded="$bew-radius"
    p-6
    box-border border="1 $bew-border-color"
    text-center max-w-700px mx-auto
  >
    <WeeklyRankingControl
      :month="currentMonth"
      :issue="currentIssue"
      :title="currentTitle"
      :month-statuses="currentMonthStatuses"
      :active-week-index="activeWeekIndex"
      :can-prev="monthIndex < pageCount - 1"
      :can-next="monthIndex > 0"
      @prev-month="handlePrevMonth"
      @next-month="handleNextMonth"
      @select-week="handleSelectWeek"
    />
  </div>
</template>
