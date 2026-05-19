<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import browser from 'webextension-polyfill'

import { originalSettings, settings } from '~/logic'

import { version } from '../../../../package.json'
import SettingsItem from '../components/SettingsItem.vue'
import SettingsItemGroup from '../components/SettingsItemGroup.vue'

const { t } = useI18n()

const importSettingsRef = ref<HTMLElement>()
const hasNewVersion = ref<boolean>(false)

const isDev = computed((): boolean => import.meta.env.DEV)

const bilibiliEvolvedThemeColor = computed(() => {
  return getComputedStyle(document.querySelector('html') as HTMLElement).getPropertyValue('--theme-color').trim() ?? '#00a1d6'
})

onMounted(() => {
  checkGitHubRelease()
})

function handleImportSettings() {
  if (importSettingsRef.value) {
    importSettingsRef.value.click()

    const handleChange = (event: Event) => {
      const input = event.target as HTMLInputElement
      if (input.files && input.files.length > 0) {
        const selectedFile = input.files[0]
        input.value = ''

        const reader = new FileReader()
        reader.onload = (event: Event) => {
          const fileReaderTarget = event.target as FileReader
          const fileContent = fileReaderTarget.result as string
          const jsonObject = JSON.parse(fileContent) as any

          Object.keys(jsonObject).forEach((key) => {
            if (key in settings.value)
              (settings.value as any)[key] = jsonObject[key]
          })

          importSettingsRef.value?.removeEventListener('change', handleChange)
        }
        reader.readAsText(selectedFile)
      }
    }

    importSettingsRef.value.addEventListener('change', handleChange)
  }
}

function handleExportSettings() {
  const jsonStr = JSON.stringify(settings.value)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'bewly-settings.json'
  a.click()
  URL.revokeObjectURL(url)
}

function handleResetSettings() {
  const result = confirm(
    t('settings.reset_settings_confirm'),
  )
  if (result) {
    originalSettings.language = settings.value.language
    settings.value = originalSettings
  }
}

async function checkGitHubRelease() {
  const apiUrl = `https://api.github.com/repos/sugarbomb/BlyBly/releases/latest`

  try {
    const response = await fetch(apiUrl)
    if (!response.ok)
      throw new Error('Network response was not ok')

    const data = await response.json()
    const latestVersion = data.tag_name
    const currentVersion = `v${version}`

    if (latestVersion !== currentVersion)
      hasNewVersion.value = true
  }
  catch {
  }
}

function changeThemeColor(color: string) {
  settings.value.themeColor = color
}
</script>

<template>
  <div>
    <section mb-8 mt-2>
      <div relative w-200px m-auto>
        <img
          :src="`${browser.runtime.getURL('/assets/bly-vtuber-style-logo1.png')}`" alt="" width="200"
        >

        <a
          v-if="hasNewVersion"
          href="https://github.com/sugarbomb/BlyBly/releases" target="_blank"
          pos="absolute bottom-0 right-0" transform="translate-x-50%" un-text="xs $bew-text-1" p="y-1 x-2" bg="$bew-fill-1"
          rounded-12
        >
          NEW
        </a>
      </div>
      <section text-2xl text-center mt-2>
        <p flex="inline gap-2" fw-900>
          <span>BlyBly</span>
          <span
            v-if="isDev"
            inline-block text="$bew-warning-color"
          >
            Dev
          </span>
        </p>
        <p text-center>
          <a
            href="https://github.com/sugarbomb/BlyBly/releases" target="_blank"
            un-text="sm color-$bew-text-2 hover:color-$bew-text-3"
          >
            v{{ version }}
          </a>
        </p>
      </section>
    </section>

    <SettingsItemGroup :title="$t('settings.links')">
      <SettingsItem>
        <template #bottom>
          <div grid="~ xl:cols-6 lg:cols-5 md:cols-4 cols-3 gap-2">
            <a
              href="https://github.com/sugarbomb/BlyBly" target="_blank"
              class="link-card"
              bg="black dark:white !opacity-10 !hover:opacity-20"
              un-text="black dark:white"
            >
              <div i-tabler:brand-github /> BlyBly
            </a>
            <a
              href="https://github.com/sugarbomb/BlyBly/releases" target="_blank"
              class="link-card"
              bg="#3b82f6 dark:#93c5fd !opacity-10 !hover:opacity-20"
              un-text="#3b82f6 dark:#93c5fd"
            >
              <div i-mingcute:version-line /> Releases
            </a>
            <a
              href="https://github.com/hakadao/BewlyBewly" target="_blank"
              class="link-card"
              bg="black dark:white !opacity-10 !hover:opacity-20"
              un-text="black dark:white"
            >
              <div i-tabler:brand-github /> BewlyBewly
            </a>
            <!--
            <button
              class="link-card"
              bg="#f87171 dark:#fca5a5 !opacity-10 !hover:opacity-20"
              un-text="#f87171 dark:#fca5a5"
              @click="dialogVisible.sponsor = true"
            >
              <div i-tabler:heart /> {{ $t('settings.sponsor') }}
            </button>
            <Dialog
              v-if="dialogVisible.sponsor"
              width="50%"
              max-width="600px"
              :title="$t('settings.sponsor')"
              content-height="50vh"
              append-to-bewly-body
              @close="dialogVisible.sponsor = false"
            >
              <p mb-4>
                {{ $t('settings.sponsor_desc') }}
              </p>
              <p mb-4>
                1. {{ $t('settings.afdian') }}:
                <a
                  href="https://afdian.com/@hakadao" target="_blank"
                  color="$bew-theme-color"
                >https://afdian.com/@hakadao</a>
              </p>
              <img
                :src="browser.runtime.getURL('/assets/sponsor/afdian.jpg')" alt=""
                max-w-400px w-full
              >

              <p mb-4 mt-6>
                2. Buy me a coffee:
                <a
                  href="https://buymeacoffee.com/hakadao" target="_blank"
                  color="$bew-theme-color"
                >https://buymeacoffee.com/hakadao</a>
              </p>
              <img
                :src="browser.runtime.getURL('/assets/sponsor/bmc.png')" alt=""
                max-w-150px w-full
              >
            </Dialog>
            -->
          </div>
        </template>
      </SettingsItem>
    </SettingsItemGroup>

    <SettingsItemGroup :title="`${$t('settings.import_settings')} / ${$t('settings.export_settings')} / ${$t('settings.reset_settings')}`">
      <SettingsItem>
        <template #bottom>
          <div flex="~ gap-2 wrap">
            <Button class="btn" @click="handleImportSettings">
              <template #left>
                <div i-uil:import />
              </template>
              <input ref="importSettingsRef" type="file" accept=".json" hidden>
              {{ $t('settings.import_settings') }}
            </Button>
            <Tooltip placement="bottom" :content="$t('settings.export_settings_desc')">
              <Button class="btn" @click="handleExportSettings">
                <template #left>
                  <div i-uil:export />
                </template>
                {{ $t('settings.export_settings') }}
              </Button>
            </Tooltip>
            <Button class="btn" @click="handleResetSettings">
              <template #left>
                <i i-mingcute:back-line />
              </template>
              {{ $t('settings.reset_settings') }}
            </Button>
          </div>
        </template>
      </SettingsItem>
    </SettingsItemGroup>

    <SettingsItemGroup :title="$t('settings.group_compatibility')">
      <SettingsItem :title="$t('settings.topbar_visibility')" :desc="$t('settings.topbar_visibility_desc')">
        <Radio v-model="settings.showTopBar" :label="settings.showTopBar ? $t('settings.chk_box.show') : $t('settings.chk_box.hidden')" />
      </SettingsItem>
      <SettingsItem :title="$t('settings.adapt_to_other_page_styles')" :desc="$t('settings.adapt_to_other_page_styles_desc')">
        <Radio v-model="settings.adaptToOtherPageStyles" />
      </SettingsItem>
    </SettingsItemGroup>

    <SettingsItemGroup :title="$t('settings.group_scrolling')">
      <SettingsItem :title="$t('settings.enable_horizontal_scrolling')" :desc="$t('settings.enable_horizontal_scrolling_desc')">
        <Radio v-model="settings.enableHorizontalScrolling" />
      </SettingsItem>
    </SettingsItemGroup>

    <SettingsItemGroup :title="$t('settings.group_following')">
      <SettingsItem :title="$t('settings.following_tab_show_livestreaming_videos')">
        <Radio v-model="settings.followingTabShowLivestreamingVideos" />
      </SettingsItem>
    </SettingsItemGroup>

    <SettingsItemGroup title="Bilibili Evolved">
      <SettingsItem :title="$t('settings.follow_bilibili_evolved_color')" :desc="$t('settings.follow_bilibili_evolved_color_desc')">
        <div
          w-20px h-20px rounded-8 cursor-pointer transition
          duration-300 box-border
          :style="{
            background: bilibiliEvolvedThemeColor,
            transform: bilibiliEvolvedThemeColor === settings.themeColor ? 'scale(1.3)' : 'scale(1)',
            border: bilibiliEvolvedThemeColor === settings.themeColor ? '2px solid white' : '2px solid transparent',
            boxShadow: bilibiliEvolvedThemeColor === settings.themeColor ? '0 0 0 1px var(--bew-border-color), var(--bew-shadow-1)' : 'none',
          }"
          @click="changeThemeColor(bilibiliEvolvedThemeColor)"
        />
      </SettingsItem>
    </SettingsItemGroup>
  </div>
</template>

<style lang="scss" scoped>
.btn {
  --b-button-color: var(--bew-fill-1);
  --b-button-color-hover: var(--bew-fill-2);
}

.link-card {
  --uno: "w-full h-48px px-4 py-2 flex items-center rounded-$bew-radius";
  --uno: "duration-300";

  > div {
    --uno: "mr-2 shrink-0";
  }
}
</style>
