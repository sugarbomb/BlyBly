<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

enum NavigationInteractionPage {
  TopBar = 'TopBar',
  Dock = 'Dock',
  SidebarButton = 'SidebarButton',
  HomeTabs = 'HomeTabs',
  RecommendationRefreshButton = 'RecommendationRefreshButton',
}

const { t } = useI18n()

const activePage = ref<NavigationInteractionPage>(NavigationInteractionPage.TopBar)

const pages = [
  {
    value: NavigationInteractionPage.TopBar,
    title: t('settings.group_topbar'),
    icon: 'i-mingcute:layout-top-line',
    iconActivated: 'i-mingcute:layout-top-fill',
    component: defineAsyncComponent(() => import('./TopBar.vue')),
  },
  {
    value: NavigationInteractionPage.Dock,
    title: t('settings.group_dock'),
    icon: 'i-mingcute:layout-bottom-line',
    iconActivated: 'i-mingcute:layout-bottom-fill',
    component: defineAsyncComponent(() => import('./Dock.vue')),
  },
  {
    value: NavigationInteractionPage.SidebarButton,
    title: t('settings.group_sidebar'),
    icon: 'i-mingcute:layout-right-line',
    iconActivated: 'i-mingcute:layout-right-fill',
    component: defineAsyncComponent(() => import('./SidebarButton.vue')),
  },
  {
    value: NavigationInteractionPage.HomeTabs,
    title: t('settings.group_home_tabs'),
    icon: 'i-mingcute:layout-grid-line',
    iconActivated: 'i-mingcute:layout-grid-fill',
    component: defineAsyncComponent(() => import('./HomeTabs.vue')),
  },
  {
    value: NavigationInteractionPage.RecommendationRefreshButton,
    title: t('settings.menu_recommendation_components'),
    icon: 'i-mingcute:layout-6-line',
    iconActivated: 'i-mingcute:layout-6-fill',
    component: defineAsyncComponent(() => import('./RecommendationRefreshButton.vue')),
  },
]
</script>

<template>
  <div flex="~ gap-2">
    <div w-140px>
      <div w-inherit pos="fixed">
        <ul flex="~ col gap-1">
          <li
            v-for="page in pages"
            :key="page.value"
            :style="{ backgroundColor: activePage === page.value ? 'var(--bew-fill-3)' : '' }"
            cursor-pointer p="y-2 x-4" ml--4 rounded="$bew-radius" bg="hover:$bew-fill-2"
            duration-300
            @click="activePage = page.value"
          >
            <div class="flex items-center">
              <div :class="activePage === page.value ? page.iconActivated : page.icon" class="mr-2 text-lg" />
              <span>{{ page.title }}</span>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <div class="flex-1 p-4">
      <Transition name="page-fade">
        <Component :is="pages.find(page => page.value === activePage)?.component" />
      </Transition>
    </div>
  </div>
</template>
