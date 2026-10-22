<script setup lang="ts">
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
import { computed, ref } from 'vue'
import draggable from 'vuedraggable'

import type { GridLayoutType } from '~/logic'
import { settings } from '~/logic'
import type { HomeTab } from '~/stores/mainStore'

import type { GridLayoutIcon, HomePageGroupId, HomeSubPage } from '../types'

interface EditableTab extends HomeTab {
  visible: boolean
}

interface EditableGroup {
  id: HomePageGroupId
  tabs: EditableTab[]
}

const props = withDefaults(defineProps<{
  groups: { id: HomePageGroupId, tabs: HomeTab[] }[]
  editableGroups?: EditableGroup[]
  activePage: HomeSubPage
  gridLayout: GridLayoutType
  loading?: boolean
  moveUp?: boolean
  alwaysShowTabs?: boolean
  showGridLayoutSwitcher?: boolean
}>(), {
  loading: false,
  moveUp: false,
  alwaysShowTabs: false,
  showGridLayoutSwitcher: false,
})

const emit = defineEmits<{
  (event: 'select', tab: HomeTab): void
  (event: 'update:gridLayout', layout: GridLayoutType): void
  (event: 'toggleTab', groupId: HomePageGroupId, page: HomeSubPage): void
  (event: 'reorderTabs', groupId: HomePageGroupId, pages: HomeSubPage[]): void
  (event: 'swapGroups', source: HomePageGroupId, target: HomePageGroupId): void
}>()

const visibleTabsCount = computed(() => props.groups.reduce((count, group) => count + group.tabs.length, 0))
const editing = ref(false)
const availableGroups = computed<EditableGroup[]>(() => props.editableGroups
  ?? props.groups.map(group => ({ ...group, tabs: group.tabs.map(tab => ({ ...tab, visible: true })) })))
const displayedGroups = computed<EditableGroup[]>(() => editing.value
  ? availableGroups.value
  : props.groups.map(group => ({ ...group, tabs: group.tabs.map(tab => ({ ...tab, visible: true })) })))
const editableVisibleCount = computed(() => availableGroups.value.reduce((count, group) => count + group.tabs.filter(tab => tab.visible).length, 0))

function toggleEditing() {
  editing.value = !editing.value
}

function toggleTab(groupId: HomePageGroupId, tab: EditableTab) {
  if (tab.visible && editableVisibleCount.value <= 1)
    return
  emit('toggleTab', groupId, tab.page)
}

function reorderTabs(groupId: HomePageGroupId, tabs: EditableTab[]) {
  emit('reorderTabs', groupId, tabs.map(tab => tab.page))
}

function moveTab(groupId: HomePageGroupId, from: number, to: number) {
  const tabs = availableGroups.value.find(group => group.id === groupId)?.tabs
  if (!tabs || to < 0 || to >= tabs.length)
    return
  const next = [...tabs]
  const [tab] = next.splice(from, 1)
  next.splice(to, 0, tab)
  reorderTabs(groupId, next)
}

function swapAdjacentGroups(index: number) {
  const source = displayedGroups.value[index]
  const target = displayedGroups.value[index + 1]
  if (source && target)
    emit('swapGroups', source.id, target.id)
}

function handleEscape(event: KeyboardEvent) {
  if (!editing.value)
    return
  event.preventDefault()
  event.stopPropagation()
  editing.value = false
}

const gridLayoutIcons: GridLayoutIcon[] = [
  { icon: 'i-mingcute:table-3-line', iconActivated: 'i-mingcute:table-3-fill', value: 'adaptive' },
  { icon: 'i-mingcute:layout-grid-line', iconActivated: 'i-mingcute:layout-grid-fill', value: 'twoColumns' },
  { icon: 'i-mingcute:list-check-3-line', iconActivated: 'i-mingcute:list-check-3-fill', value: 'oneColumn' },
]
</script>

<template>
  <header
    pos="sticky top-[calc(var(--bew-top-bar-height)+10px)]" w-full z-9 m="b-4" duration-300
    ease-in-out flex="~ justify-between items-start gap-4"
    :class="{ hide: moveUp && !editing }"
    @keydown.esc="handleEscape"
  >
    <div
      class="home-navigation-tabs"
      w="[calc(100vw-280px)]"
      flex="~ gap-2 items-center wrap"
    >
      <template v-if="editing || alwaysShowTabs || visibleTabsCount !== 1">
        <template v-for="(group, groupIndex) in displayedGroups" :key="group.id">
          <section
            class="home-navigation-group"
            :class="{ 'is-editing': editing, 'is-empty': !group.tabs.some(tab => tab.visible) }"
            :data-group="group.id"
            style="backdrop-filter: var(--bew-filter-glass-1)"
            bg="$bew-elevated" p-1
            h-38px rounded-full
            text="sm"
            shadow="[var(--bew-shadow-1),var(--bew-shadow-edge-glow-1)]"
            box-border border="1 $bew-border-color"
          >
            <svg v-if="editing" class="group-edit-outline" aria-hidden="true" focusable="false">
              <rect width="100%" height="100%" rx="23" vector-effect="non-scaling-stroke" />
            </svg>
            <OverlayScrollbarsComponent
              class="home-tabs-inside"
              element="div" defer
              :options="{
                overflow: {
                  x: 'scroll',
                  y: 'hidden',
                },
              }"
              h-full of-hidden
            >
              <draggable
                v-if="editing" :model-value="group.tabs" item-key="page"
                class="home-tabs-edit-list" handle=".home-tab-toggle"
                ghost-class="home-tab-drag-ghost" :animation="150"
                @update:model-value="(tabs: EditableTab[]) => reorderTabs(group.id, tabs)"
              >
                <template #item="{ element: tab, index }">
                  <div class="home-tab-edit-item" :class="{ 'tab-selected': tab.visible }" :data-page="tab.page">
                    <button
                      type="button" class="home-tab-toggle" :aria-pressed="tab.visible"
                      :aria-disabled="tab.visible && editableVisibleCount <= 1"
                      :title="$t(tab.visible && editableVisibleCount <= 1 ? 'home.navigation.last_visible' : 'home.navigation.toggle_tab')"
                      @click="toggleTab(group.id, tab)"
                      @keydown.left.prevent.stop="moveTab(group.id, index, index - 1)"
                      @keydown.right.prevent.stop="moveTab(group.id, index, index + 1)"
                    >
                      <span>{{ $t(tab.i18nKey) }}</span>
                    </button>
                  </div>
                </template>
              </draggable>
              <template v-else>
                <button
                  v-for="tab in group.tabs" :key="tab.page"
                  :class="{ 'tab-activated': activePage === tab.page }"
                  px-3 h-inherit
                  bg="transparent hover:$bew-fill-2" text="$bew-text-2 hover:$bew-text-1" fw-bold rounded-full
                  cursor-pointer duration-300
                  flex="~ gap-2 items-center shrink-0" relative
                  @click="emit('select', tab)"
                >
                  <span class="text-center">{{ $t(tab.i18nKey) }}</span>

                  <Transition name="fade">
                    <div
                      v-show="activePage === tab.page && loading"
                      i-svg-spinners:ring-resize
                      pos="absolute right-4px top-4px" duration-300
                      text="8px white"
                    />
                  </Transition>
                </button>
              </template>
            </OverlayScrollbarsComponent>
          </section>
          <button
            v-if="editing && groupIndex < displayedGroups.length - 1"
            type="button" class="navigation-swap"
            :title="$t('home.navigation.swap_adjacent')" :aria-label="$t('home.navigation.swap_adjacent')"
            @click="swapAdjacentGroups(groupIndex)"
          >
            <i i-mingcute:transfer-3-line aria-hidden="true" />
          </button>
        </template>
      </template>
      <button
        v-if="editing || settings.showHomeNavigationEditButton"
        type="button" class="navigation-edit-toggle" :class="{ 'is-editing': editing }"
        :aria-pressed="editing" :title="editing ? $t('home.navigation.done') : `${$t('home.navigation.edit')}，${$t('home.navigation.edit_button_tip')}`"
        :aria-label="$t(editing ? 'home.navigation.done' : 'home.navigation.edit')"
        @click="toggleEditing"
      >
        <span v-if="editing">{{ $t('home.navigation.confirm') }}</span>
        <i v-else i-mingcute:edit-line aria-hidden="true" />
      </button>
    </div>

    <div
      v-if="showGridLayoutSwitcher"
      style="backdrop-filter: var(--bew-filter-glass-1)"
      flex="~ gap-1 shrink-0" p-1 h-38px bg="$bew-elevated" transform-gpu
      ml-auto rounded-full
      shadow="[var(--bew-shadow-1),var(--bew-shadow-edge-glow-1)]"
      box-border border="1 $bew-border-color"
    >
      <div
        v-for="icon in gridLayoutIcons" :key="icon.value"
        :class="{ 'grid-layout-item-activated': gridLayout === icon.value }"
        flex="~ justify-center items-center"
        h-full aspect-square text="$bew-text-2 hover:$bew-text-1"
        rounded-full bg="hover:$bew-fill-2" duration-300
        cursor-pointer
        @click="emit('update:gridLayout', icon.value)"
      >
        <div :class="gridLayout === icon.value ? icon.iconActivated : icon.icon" text-base />
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
.hide {
  --uno: "important-translate-y--70px";
}

.home-tabs-inside {
  min-width: 0;
  :deep([data-overlayscrollbars-contents]) {
    --uno: "flex items-center gap-1 h-inherit rounded-$bew-radius-half";
  }
  :deep(.os-scrollbar) {
    --uno: "mb--4px";
  }
}

.tab-activated {
  --uno: "bg-$bew-theme-color-auto text-$bew-text-auto";
}

.grid-layout-item-activated {
  --uno: "bg-$bew-theme-color-auto text-$bew-text-auto";
}

.home-navigation-group {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
}

.group-edit-outline {
  position: absolute;
  inset: -4px;
  width: calc(100% + 8px);
  height: calc(100% + 8px);
  overflow: visible;
  fill: none;
  stroke: var(--bew-theme-color);
  stroke-width: 2;
  stroke-dasharray: 8 6;
  pointer-events: none;
}

.home-navigation-group.is-empty {
  filter: grayscale(1);
  opacity: 0.55;
}

.home-tabs-edit-list {
  display: flex;
  gap: 4px;
  height: 100%;
}

.home-tab-edit-item {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  height: 100%;
  border-radius: 999px;
  color: var(--bew-text-3);
}

.home-tab-edit-item.tab-selected {
  background: var(--bew-theme-color-20);
  color: var(--bew-theme-color);
}

.home-tab-toggle,
.navigation-edit-toggle,
.navigation-swap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  height: 30px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.home-tab-toggle {
  padding: 0 12px;
  font-weight: bold;
  cursor: grab;
}

.home-tab-drag-ghost {
  opacity: 0.4;
}

.navigation-edit-toggle,
.navigation-swap {
  width: 30px;
  color: var(--bew-text-2);
}

.navigation-edit-toggle {
  color: var(--bew-text-3);
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 150ms ease,
    color 150ms ease;
}

.home-navigation-tabs:hover:not(:has(.home-navigation-group:hover)) .navigation-edit-toggle {
  opacity: 0.6;
  pointer-events: auto;
}

.navigation-edit-toggle.is-editing {
  width: auto;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--bew-theme-color-20);
}

.home-navigation-tabs .navigation-edit-toggle.is-editing,
.home-navigation-tabs .navigation-edit-toggle:hover,
.home-navigation-tabs .navigation-edit-toggle:focus-visible {
  opacity: 1;
  pointer-events: auto;
}

.navigation-edit-toggle.is-editing,
.navigation-edit-toggle:hover,
.navigation-swap:hover {
  color: var(--bew-theme-color);
}
</style>
