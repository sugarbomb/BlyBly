<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { BewlyPage } from '../types'

const { t } = useI18n()

const activePage = ref<BewlyPage>(BewlyPage.Search)

const pages = [
  {
    value: BewlyPage.Search,
    title: t('settings.menu_search_page'),
    icon: 'i-mingcute:search-2-line',
    iconActivated: 'i-mingcute:search-2-fill',
    component: defineAsyncComponent(() => import('./SearchPage/SearchPage.vue')),
  },
  {
    value: BewlyPage.Recommendation,
    title: t('settings.menu_home'),
    icon: 'i-mingcute:home-5-line',
    iconActivated: 'i-mingcute:home-5-fill',
    component: defineAsyncComponent(() => import('./Home/Home.vue')),
  },
  {
    value: BewlyPage.TouchScreen,
    title: t('settings.group_touch_screen'),
    icon: 'i-mingcute:finger-tap-line',
    iconActivated: 'i-mingcute:finger-tap-fill',
    component: defineAsyncComponent(() => import('./TouchScreen.vue')),
  },
  // {
  //   value: BewlyPage.Ads,
  //   title: t('settings.group_ads'),
  //   icon: 'i-mingcute:shield-line',
  //   iconActivated: 'i-mingcute:shield-fill',
  //   component: defineAsyncComponent(() => import('./Ads.vue')),
  // },
  {
    value: BewlyPage.Filters,
    title: t('settings.menu_filters'),
    icon: 'i-mingcute:filter-line',
    iconActivated: 'i-mingcute:filter-fill',
    component: defineAsyncComponent(() => import('../Filters/Filters.vue')),
  },
]
</script>

<template>
  <div flex="~ gap-2">
    <!-- Sidebar -->
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

    <!-- Content -->
    <div class="flex-1 p-4">
      <Transition name="page-fade">
        <Component :is="pages.find(page => page.value === activePage)?.component" />
      </Transition>
    </div>
  </div>
</template>
