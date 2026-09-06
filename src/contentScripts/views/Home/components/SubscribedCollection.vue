<script setup lang="ts">
import { useBewlyApp } from '~/composables/useAppProvider'
import type { GridLayoutType } from '~/logic'
import { settings } from '~/logic'

const props = defineProps<{
  gridLayout: GridLayoutType
  topBarVisibility: boolean
}>()

const emit = defineEmits<{
  (e: 'beforeLoading'): void
  (e: 'afterLoading'): void
}>()

const { handlePageRefresh } = useBewlyApp()
const shouldMoveAsideUp = ref(false)

watch(() => props.topBarVisibility, () => {
  shouldMoveAsideUp.value = settings.value.autoHideTopBar
    && settings.value.showTopBar
    && !props.topBarVisibility
})

onMounted(() => {
  initData()
  initPageAction()
})

onActivated(() => {
  initPageAction()
})

function initPageAction() {
  handlePageRefresh.value = async () => initData()
}

function initData() {
  emit('beforeLoading')
  emit('afterLoading')
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
      <OverlayScrollbarsComponent h-inherit p-20px m--20px defer>
        <ul flex="~ col gap-2">
          <li>
            <span
              class="active"
              px-4 lh-30px h-30px w-inherit block
              rounded="$bew-radius"
            >
              {{ $t('ranking.all') }}
            </span>
          </li>
        </ul>
      </OverlayScrollbarsComponent>
    </aside>

    <main w-full min-w-0>
      <Empty mt-6 :description="$t('home.subscribed_collection_placeholder')" />
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
</style>
