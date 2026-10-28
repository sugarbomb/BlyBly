<script setup lang="ts">
import { useBewlyApp } from '~/composables/useAppProvider'
import type { GridLayoutType } from '~/logic'
import { settings } from '~/logic'
import api from '~/utils/api'
import { getUserID } from '~/utils/main'

interface FavoriteCollection {
  id: number
  mid: number
  title: string
  cover: string
  intro: string
  media_count: number
  view_count: number
  upper: {
    mid: number
    name: string
    face: string
  }
}

interface FavoriteCollectionResult {
  code: number
  message: string
  data: {
    count: number
    list: FavoriteCollection[] | null
    has_more: boolean
  }
}

interface FavoriteCollectionArchive {
  aid: number
  bvid: string
  duration: number
  pic: string
  pubdate: number
  title: string
  stat: {
    view: number
    danmaku: number
  }
}

interface FavoriteCollectionResourcesResult {
  code: number
  message: string
  data: {
    archives: FavoriteCollectionArchive[] | null
    page: {
      page_num: number
      page_size: number
      total: number
    }
  }
}

interface FavoriteCollectionVideo {
  collection: FavoriteCollection
  video: FavoriteCollectionArchive
}

type CollectionCountSnapshot = Record<string, number>
type CollectionCountHistory = Record<string, CollectionCountSnapshot>

const props = defineProps<{
  gridLayout: GridLayoutType
  topBarVisibility: boolean
}>()

const emit = defineEmits<{
  (e: 'beforeLoading'): void
  (e: 'afterLoading'): void
}>()

const COLLECTION_PREVIEW_SIZE = 4
const COLLECTION_COUNT_STORAGE_KEY = 'blybly-season-local-history'

const { handleBackToTop, handlePageRefresh, handleReachBottom } = useBewlyApp()
const shouldMoveAsideUp = ref(false)
const isCollectionLoading = ref(false)
const needToLoginFirst = ref(false)
const favoriteCollections = ref<FavoriteCollection[]>([])
const collectionPage = ref(1)
const collectionHasMore = ref(false)
const isLoadingMoreCollections = ref(false)
const collectionLoadIndicator = ref<HTMLElement | null>(null)
let collectionLoadObserver: IntersectionObserver | undefined
const activatedCollection = ref<FavoriteCollection>()
const fullCollection = ref<FavoriteCollection>()
const fullCollectionVideos = ref<FavoriteCollectionVideo[]>([])
const isFullCollectionLoading = ref(false)
const fullCollectionPage = ref(1)
const fullCollectionHasMore = ref(true)
let fullCollectionGeneration = 0
const collectionPreviewCache = reactive(new Map<number, FavoriteCollectionVideo[]>())
const expandedCollectionIds = reactive(new Set<number>())
const collectionPreviewLoadingIds = reactive(new Set<number>())
const collectionCountChanges = reactive(new Map<number, number>())
const collectionCountsUserId = ref('')
let collectionPreviewGeneration = 0
let shouldReloadOnActivated = false

const gridClass = computed((): string => {
  if (props.gridLayout === 'adaptive')
    return 'grid-adaptive'
  if (props.gridLayout === 'twoColumns')
    return 'grid-two-columns'
  return 'grid-one-column'
})

const displayedCollections = computed(() => activatedCollection.value
  ? [activatedCollection.value]
  : favoriteCollections.value)

watch(() => props.topBarVisibility, () => {
  shouldMoveAsideUp.value = settings.value.autoHideTopBar
    && settings.value.showTopBar
    && !props.topBarVisibility
})

watch(collectionLoadIndicator, (element, previousElement) => {
  if (previousElement)
    collectionLoadObserver?.unobserve(previousElement)
  if (element) {
    collectionLoadObserver ??= new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting))
        void loadMoreCollections()
    })
    collectionLoadObserver.observe(element)
  }
})

onMounted(() => {
  initData()
  initPageAction()
})

onActivated(() => {
  initPageAction()
  if (shouldReloadOnActivated) {
    shouldReloadOnActivated = false
    initData()
  }
})

onDeactivated(() => {
  shouldReloadOnActivated = true
  collectionCountChanges.clear()
  persistCollectionCountSnapshot()
})

onBeforeUnmount(() => {
  collectionLoadObserver?.disconnect()
  persistCollectionCountSnapshot()
})

function initPageAction() {
  handleReachBottom.value = async () => {
    if (!fullCollection.value || isFullCollectionLoading.value || !fullCollectionHasMore.value)
      return
    await getFullCollectionVideos()
  }
  handlePageRefresh.value = async () => {
    if (isCollectionLoading.value || isFullCollectionLoading.value || isLoadingMoreCollections.value)
      return
    await initData()
  }
}

async function initData() {
  if (isCollectionLoading.value || isLoadingMoreCollections.value)
    return

  emit('beforeLoading')
  try {
    isCollectionLoading.value = true
    collectionPage.value = 1
    collectionHasMore.value = false
    needToLoginFirst.value = false
    fullCollectionVideos.value = []
    fullCollectionPage.value = 1
    fullCollectionHasMore.value = true
    fullCollectionGeneration++
    isFullCollectionLoading.value = false
    expandedCollectionIds.clear()
    collectionPreviewCache.clear()
    collectionPreviewLoadingIds.clear()
    collectionPreviewGeneration++

    try {
      const userId = getUserID()
      const response: FavoriteCollectionResult = await api.favorite.getFavoriteCollections({
        up_mid: userId,
      })

      if (response.code === -101) {
        needToLoginFirst.value = true
        favoriteCollections.value = []
        activatedCollection.value = undefined
        return
      }

      if (response.code !== 0)
        return

      favoriteCollections.value = response.data.list ?? []
      collectionHasMore.value = response.data.has_more
      collectionCountsUserId.value = userId
      await updateCollectionCountChanges(userId)
      if (activatedCollection.value) {
        activatedCollection.value = favoriteCollections.value.find(
          item => item.id === activatedCollection.value?.id,
        )
      }
      if (fullCollection.value) {
        fullCollection.value = favoriteCollections.value.find(
          item => item.id === fullCollection.value?.id,
        )
      }
    }
    finally {
      isCollectionLoading.value = false
    }

    if (fullCollection.value) {
      await getFullCollectionVideos()
    }
    else {
      const initialCollection = activatedCollection.value ?? favoriteCollections.value[0]
      if (initialCollection)
        await toggleCollectionPreview(initialCollection)
    }
  }
  finally {
    isCollectionLoading.value = false
    emit('afterLoading')
  }
}

async function loadMoreCollections() {
  if (isCollectionLoading.value || isLoadingMoreCollections.value || !collectionHasMore.value)
    return

  isLoadingMoreCollections.value = true
  try {
    const nextPage = collectionPage.value + 1
    const response: FavoriteCollectionResult = await api.favorite.getFavoriteCollections({
      up_mid: getUserID(),
      pn: nextPage,
    })
    if (response.code !== 0)
      return

    const existingIds = new Set(favoriteCollections.value.map(item => item.id))
    const newCollections = (response.data.list ?? []).filter((item) => {
      if (existingIds.has(item.id))
        return false
      existingIds.add(item.id)
      return true
    })
    const previousSnapshot = await readCollectionCountSnapshot(collectionCountsUserId.value)
    for (const item of newCollections) {
      const previousCount = previousSnapshot?.[String(item.id)]
      if (previousCount !== undefined && Number.isFinite(previousCount)) {
        const change = item.media_count - previousCount
        if (change !== 0)
          collectionCountChanges.set(item.id, change)
      }
    }
    favoriteCollections.value.push(...newCollections)
    collectionPage.value = nextPage
    collectionHasMore.value = response.data.has_more
    await persistCollectionCountSnapshot()
    await nextTick()
    if (collectionHasMore.value && collectionLoadIndicator.value) {
      collectionLoadObserver?.unobserve(collectionLoadIndicator.value)
      collectionLoadObserver?.observe(collectionLoadIndicator.value)
    }
  }
  finally {
    isLoadingMoreCollections.value = false
  }
}

async function changeCollection(collection?: FavoriteCollection) {
  if (isCollectionLoading.value)
    return

  fullCollectionGeneration++
  fullCollection.value = undefined
  fullCollectionVideos.value = []
  fullCollectionPage.value = 1
  fullCollectionHasMore.value = true
  isFullCollectionLoading.value = false
  activatedCollection.value = collection
  if (!collection) {
    handleBackToTop(settings.value.useSearchPageModeOnHomePage ? 510 : 0)
    return
  }

  if (!expandedCollectionIds.has(collection.id))
    await toggleCollectionPreview(collection)
}

async function openFullCollection(collection: FavoriteCollection) {
  if (isCollectionLoading.value)
    return

  fullCollectionGeneration++
  fullCollection.value = collection
  activatedCollection.value = collection
  fullCollectionVideos.value = []
  fullCollectionPage.value = 1
  fullCollectionHasMore.value = true
  isFullCollectionLoading.value = false
  handleBackToTop(settings.value.useSearchPageModeOnHomePage ? 510 : 0)
  await getFullCollectionVideos()
}

async function toggleCollectionPreview(collection: FavoriteCollection) {
  if (expandedCollectionIds.has(collection.id)) {
    expandedCollectionIds.delete(collection.id)
    return
  }

  expandedCollectionIds.add(collection.id)
  if (collectionPreviewCache.has(collection.id) || collectionPreviewLoadingIds.has(collection.id))
    return

  if (collection.media_count <= 0) {
    collectionPreviewCache.set(collection.id, [])
    return
  }

  collectionPreviewLoadingIds.add(collection.id)
  const requestGeneration = collectionPreviewGeneration
  const lastPage = Math.max(
    1,
    Math.ceil(collection.media_count / COLLECTION_PREVIEW_SIZE),
  )

  try {
    const response: FavoriteCollectionResourcesResult
      = await api.favorite.getFavoriteCollectionResources({
        mid: collection.upper.mid || collection.mid,
        season_id: collection.id,
        page_num: lastPage,
        page_size: COLLECTION_PREVIEW_SIZE,
      })

    if (requestGeneration !== collectionPreviewGeneration || response.code !== 0)
      return

    const previewVideos = (response.data.archives ?? [])
      .slice()
      .reverse()
      .map(video => ({ collection, video }))
    collectionPreviewCache.set(collection.id, previewVideos)
  }
  finally {
    if (requestGeneration === collectionPreviewGeneration)
      collectionPreviewLoadingIds.delete(collection.id)
  }
}

function jumpToLoginPage() {
  location.href = 'https://passport.bilibili.com/login'
}

function getCurrentCollectionCountSnapshot(): CollectionCountSnapshot {
  return Object.fromEntries(
    favoriteCollections.value.map(item => [String(item.id), item.media_count]),
  )
}

async function readCollectionCountSnapshot(userId: string) {
  if (!userId)
    return undefined

  const result = await browser.storage.local.get(COLLECTION_COUNT_STORAGE_KEY)
  const history = result[COLLECTION_COUNT_STORAGE_KEY]
  if (!history || typeof history !== 'object' || Array.isArray(history))
    return undefined

  const snapshot = (history as CollectionCountHistory)[userId]
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot))
    return undefined

  return snapshot as CollectionCountSnapshot
}

async function updateCollectionCountChanges(userId: string) {
  collectionCountChanges.clear()
  const previousSnapshot = await readCollectionCountSnapshot(userId)

  if (!previousSnapshot) {
    await persistCollectionCountSnapshot()
    return
  }

  favoriteCollections.value.forEach((item) => {
    const previousCount = previousSnapshot[String(item.id)]
    if (!Number.isFinite(previousCount))
      return

    const change = item.media_count - previousCount
    if (change !== 0)
      collectionCountChanges.set(item.id, change)
  })

  await persistCollectionCountSnapshot()
}

async function persistCollectionCountSnapshot() {
  const userId = collectionCountsUserId.value
  if (!userId || !favoriteCollections.value.length)
    return

  const result = await browser.storage.local.get(COLLECTION_COUNT_STORAGE_KEY)
  const storedHistory = result[COLLECTION_COUNT_STORAGE_KEY]
  const history: CollectionCountHistory
    = storedHistory && typeof storedHistory === 'object' && !Array.isArray(storedHistory)
      ? { ...storedHistory as CollectionCountHistory }
      : {}
  history[userId] = { ...history[userId], ...getCurrentCollectionCountSnapshot() }

  await browser.storage.local.set({
    [COLLECTION_COUNT_STORAGE_KEY]: history,
  })
}

function formatCollectionCount(item: FavoriteCollection) {
  const change = collectionCountChanges.get(item.id)
  if (!change)
    return item.media_count.toLocaleString()
  return change > 0 ? `+${change}` : String(change)
}

async function getFullCollectionVideos() {
  const collection = fullCollection.value
  if (!collection || isFullCollectionLoading.value || !fullCollectionHasMore.value)
    return

  isFullCollectionLoading.value = true
  const requestGeneration = fullCollectionGeneration

  try {
    const response: FavoriteCollectionResourcesResult
      = await api.favorite.getFavoriteCollectionResources({
        mid: collection.upper.mid || collection.mid,
        season_id: collection.id,
        page_num: fullCollectionPage.value,
        page_size: 30,
      })

    if (requestGeneration !== fullCollectionGeneration)
      return
    if (response.code !== 0) {
      fullCollectionHasMore.value = false
      return
    }

    const existingAids = new Set(fullCollectionVideos.value.map(item => item.video.aid))
    const newVideos = (response.data.archives ?? [])
      .filter((video) => {
        if (existingAids.has(video.aid))
          return false
        existingAids.add(video.aid)
        return true
      })
      .map(video => ({ collection, video }))
    fullCollectionVideos.value.push(...newVideos)

    const { page_num: pageNum, page_size: pageSize, total } = response.data.page
    fullCollectionPage.value = pageNum + 1
    fullCollectionHasMore.value = pageNum * pageSize < total
  }
  finally {
    if (requestGeneration === fullCollectionGeneration)
      isFullCollectionLoading.value = false
  }
}

defineExpose({ initData })
</script>

<template>
  <div flex="~ gap-40px" :data-grid-layout="gridLayout">
    <aside
      pos="sticky top-150px" h="[calc(100vh-140px)]" w-200px shrink-0 duration-300
      ease-in-out
      :class="{ hide: shouldMoveAsideUp }"
    >
      <OverlayScrollbarsComponent
        h-inherit p-20px m--20px defer
        :options="{ overflow: { x: 'hidden' } }"
      >
        <ul flex="~ col gap-2" w-full>
          <li w-full>
            <button
              :class="{ active: !activatedCollection }"
              px-4 lh-30px h-30px w-full rounded="$bew-radius"
              cursor-pointer transition="all 300 ease-out"
              hover:bg="$bew-fill-2" hover:scale-105 un-text="$bew-text-1"
              flex items-center text-left
              @click="changeCollection()"
            >
              {{ $t('ranking.all') }}
            </button>
          </li>
          <li v-for="item in favoriteCollections" :key="item.id" w-full>
            <button
              :class="{ active: activatedCollection?.id === item.id }"
              px-4 lh-30px h-30px w-full
              rounded="$bew-radius" cursor-pointer transition="all 300 ease-out"
              hover:bg="$bew-fill-2" hover:scale-105 un-text="$bew-text-1"
              flex items-center justify-between gap-2 text-left
              @click="changeCollection(item)"
            >
              <span min-w-0 flex-1 truncate>{{ item.title }}</span>
              <span
                class="collection-count"
                shrink-0 text="xs"
                :class="{
                  'collection-count-increase': (collectionCountChanges.get(item.id) ?? 0) > 0,
                  'collection-count-decrease': (collectionCountChanges.get(item.id) ?? 0) < 0,
                }"
              >
                {{ formatCollectionCount(item) }}
              </span>
            </button>
          </li>
          <li
            v-if="collectionHasMore" ref="collectionLoadIndicator" w-full h-30px flex
            items-center justify-center un-text="$bew-text-3" role="status" :aria-label="isLoadingMoreCollections ? '加载中' : '向下滚动加载更多合集'"
          >
            <span v-if="isLoadingMoreCollections">…</span>
            <span v-else i-tabler:chevrons-down inline-block aria-hidden="true" />
          </li>
        </ul>
      </OverlayScrollbarsComponent>
    </aside>

    <main w-full min-w-0>
      <Empty v-if="needToLoginFirst" mt-6 :description="$t('common.please_log_in_first')">
        <Button type="primary" @click="jumpToLoginPage()">
          {{ $t('common.login') }}
        </Button>
      </Empty>

      <Loading v-else-if="isCollectionLoading" mt-6 />

      <div v-else-if="!fullCollection" flex="~ col gap-4">
        <template v-if="favoriteCollections.length">
          <section
            v-for="collection in displayedCollections"
            :key="collection.id"
            flex="~ col gap-4"
          >
            <div
              class="collection-summary"
              w-full p-3 rounded="$bew-radius" bg="$bew-content-alt-solid"
              flex="~ gap-4" items-center text-left cursor-pointer
              role="button" tabindex="0"
              @click="toggleCollectionPreview(collection)"
              @keydown.enter.self="toggleCollectionPreview(collection)"
              @keydown.space.self.prevent="toggleCollectionPreview(collection)"
            >
              <button
                class="collection-cover-link"
                type="button"
                :aria-label="collection.title"
                @click.stop="openFullCollection(collection)"
              >
                <img
                  :src="collection.cover"
                  :alt="collection.title"
                  w-full h-full object-cover
                  rounded="$bew-radius-half" bg="$bew-skeleton"
                >
              </button>
              <span min-w-0 flex="~ col 1 gap-1">
                <button
                  class="collection-title-link"
                  type="button"
                  @click.stop="openFullCollection(collection)"
                >
                  {{ collection.title }}
                </button>
                <span text="sm $bew-text-2" truncate>{{ collection.upper.name }}</span>
                <span v-if="collection.intro" text="sm $bew-text-3" truncate>
                  {{ collection.intro }}
                </span>
                <span flex="~ gap-3" items-center text="xs $bew-text-3">
                  <span flex="~ gap-1" items-center>
                    <span i-tabler:stack-2 />
                    {{ collection.media_count.toLocaleString() }}
                  </span>
                  <span flex="~ gap-1" items-center>
                    <span i-tabler:eye />
                    {{ collection.view_count.toLocaleString() }}
                  </span>
                </span>
              </span>
              <span
                i-tabler:chevron-down shrink-0 text="$bew-text-2"
                transition="transform 300 ease-out"
                :class="{ 'rotate-180': expandedCollectionIds.has(collection.id) }"
              />
            </div>

            <div
              v-if="expandedCollectionIds.has(collection.id)"
              :class="gridClass"
            >
              <template v-if="collectionPreviewCache.get(collection.id)?.length">
                <VideoCard
                  v-for="item in collectionPreviewCache.get(collection.id) ?? []"
                  :key="`${item.collection.id}-${item.video.aid}`"
                  :video="{
                    id: item.video.aid,
                    duration: item.video.duration,
                    title: item.video.title,
                    cover: item.video.pic,
                    author: {
                      name: item.collection.upper.name,
                      authorFace: item.collection.upper.face,
                      mid: item.collection.upper.mid || item.collection.mid,
                    },
                    view: item.video.stat.view,
                    danmaku: item.video.stat.danmaku,
                    publishedTimestamp: item.video.pubdate,
                    bvid: item.video.bvid,
                  }"
                  :horizontal="gridLayout !== 'adaptive'"
                  w-full
                />
              </template>

              <template v-else-if="collectionPreviewLoadingIds.has(collection.id)">
                <VideoCardSkeleton
                  v-for="item in COLLECTION_PREVIEW_SIZE"
                  :key="item"
                  :horizontal="gridLayout !== 'adaptive'"
                />
              </template>

              <Empty v-else col-span-full :description="$t('common.no_more_content')" />
            </div>
          </section>
        </template>

        <Empty v-else mt-6 :description="$t('common.no_more_content')" />
      </div>

      <template v-else>
        <div v-if="fullCollectionVideos.length" :class="gridClass">
          <VideoCard
            v-for="item in fullCollectionVideos"
            :key="`${item.collection.id}-${item.video.aid}`"
            :video="{
              id: item.video.aid,
              duration: item.video.duration,
              title: item.video.title,
              cover: item.video.pic,
              author: {
                name: item.collection.upper.name,
                authorFace: item.collection.upper.face,
                mid: item.collection.upper.mid || item.collection.mid,
              },
              view: item.video.stat.view,
              danmaku: item.video.stat.danmaku,
              publishedTimestamp: item.video.pubdate,
              bvid: item.video.bvid,
            }"
            :horizontal="gridLayout !== 'adaptive'"
            w-full
          />
        </div>

        <div v-else-if="isFullCollectionLoading" :class="gridClass">
          <VideoCardSkeleton
            v-for="item in 10"
            :key="item"
            :horizontal="gridLayout !== 'adaptive'"
          />
        </div>

        <Empty v-else mt-6 :description="$t('common.no_more_content')" />
        <Loading v-if="isFullCollectionLoading && fullCollectionVideos.length" mt-4 />
      </template>
    </main>
  </div>
</template>

<style lang="scss" scoped>
.active {
  --uno: "scale-110 bg-$bew-theme-color-auto text-$bew-text-auto shadow-$bew-shadow-2";
}

.hide {
  --uno: "h-[calc(100vh-70)] translate-y--70px";
}

.grid-adaptive {
  --uno: "grid 2xl:cols-4 xl:cols-3 lg:cols-2 md:cols-1 sm:cols-1 cols-1 gap-5";
}

.grid-two-columns {
  --uno: "grid cols-1 xl:cols-2 gap-4";
}

.grid-one-column {
  --uno: "grid cols-1 gap-4";
}

.collection-title-link {
  display: inline-block;
  align-self: flex-start;
  min-width: 0;
  width: fit-content;
  max-width: 100%;
  padding: 0;
  overflow: hidden;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--bew-text-1);
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border: 0;
  text-decoration: none;
  text-underline-offset: 3px;
  transition:
    color 200ms ease,
    text-decoration-color 200ms ease;

  &:hover,
  &:focus-visible {
    color: var(--bew-theme-color);
    text-decoration: underline;
  }
}

.collection-cover-link {
  display: block;
  flex-shrink: 0;
  width: 160px;
  padding: 0;
  cursor: pointer;
  background: transparent;
  border: 0;
  aspect-ratio: 16 / 9;
}

.collection-count {
  color: var(--bew-text-3);
}

.collection-count-increase {
  color: var(--bew-theme-color);
}

.collection-count-decrease {
  color: var(--bew-warning-color);
}

.active .collection-count-increase,
.active .collection-count-decrease {
  color: var(--bew-text-auto);
}
</style>
