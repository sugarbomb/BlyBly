<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const genres = computed(() => [
  { name: t('topbar.logo_dropdown.anime'), icon: '#channel-anime', href: 'https://www.bilibili.com/anime' },
  { name: t('topbar.logo_dropdown.movies'), icon: '#channel-movie', href: 'https://www.bilibili.com/movie' },
])

const otherLinks = computed(() => [
  { name: t('topbar.logo_dropdown.articles'), icon: '#channel-read', href: 'https://www.bilibili.com/read/home' },
  { name: t('topbar.logo_dropdown.game_center'), icon: 'i-mingcute:game-2-fill', color: '#69B1DD', href: 'https://game.bilibili.com/platform' },
  { name: t('topbar.logo_dropdown.comic_con_and_goods'), icon: 'i-mingcute:store-fill', color: '#E4C081', href: 'https://show.bilibili.com/platform/home.html' },

])
</script>

<template>
  <OverlayScrollbarsComponent
    element="div" defer
    :options="{
      x: 'hidden',
      y: 'scroll',
    }"
    style="backdrop-filter: var(--bew-filter-glass-1);"
    h="[calc(100vh-100px)]" max-h="445px"
    w="[calc(100vw-100px)]" max-w="fit"
    shadow="[var(--bew-shadow-3),var(--bew-shadow-edge-glow-1)]"
    bg="$bew-elevated-alt"
    rounded="$bew-radius"
    border="1 $bew-border-color"
  >
    <div
      flex="~ gap-1"
      p="4" w-inherit
    >
      <ul
        v-for="(item, index) in [0, 10, 20, 30]"
        :key="index"
        class="link-list"
      >
        <li
          v-for="genre in genres.slice(item, item + 10)"
          :key="genre.name"
          class="link-item"
        >
          <ALink
            :href="genre.href"
            type="topBar"
          >
            <svg aria-hidden="true" class="svg-icon">
              <use :xlink:href="genre.icon" />
            </svg>
            <span>{{ genre.name }}</span>
          </ALink>
        </li>
      </ul>
      <ul
        v-for="(item, index) in [0]"
        :key="index"
        class="link-list"
      >
        <li
          v-for="otherLink in otherLinks.slice(item, item + 10)"
          :key="otherLink.name"
          class="link-item group"
        >
          <ALink
            :href="otherLink.href"
            type="topBar"
          >
            <div v-if="otherLink.icon.startsWith('#')" class="icon">
              <svg
                aria-hidden="true"
              >
                <use :xlink:href="otherLink.icon" />
              </svg>
            </div>

            <div
              v-else
              class="icon"
            >
              <i
                :class="otherLink.icon"
                :style="{ color: otherLink.color }"
              />
            </div>
            <span>{{ otherLink.name }}</span>
          </ALink>
        </li>
      </ul>
    </div>
  </OverlayScrollbarsComponent>
</template>

<style lang="scss" scoped>
.link-list {
  // --uno: "last-of-type:p-4 last-of-type:bg-$bew-fill-1 last-of-type:h-fit last-of-type:m--4";
  // --uno: "last-of-type:ml-2";
}

.link-item {
  --uno: "mb-1 last-of-type:mb-0 text-sm";

  a {
    --uno: "flex items-center text-nowrap min-w-160px h-38px p-2 pr-3 rounded-$bew-radius duration-300";
    --uno: "hover:bg-$bew-fill-alt hover:shadow-[var(--bew-shadow-1),var(--bew-shadow-edge-glow-1)]";
  }
}

.svg-icon {
  --uno: "w-2em h-2em mr-3 vertical-bottom fill-current overflow-hidden";
}

.icon {
  --uno: "w-2em h-2em mr-3 bg-$bew-content-solid vertical-bottom fill-current overflow-hidden";
  --uno: "text-1.25em grid place-items-center rounded-1/2 shrink-0";
  --uno: "border-1 border-$bew-border-color";

  svg {
    --uno: "w-1.25em h-1.25em";
  }
}
</style>
