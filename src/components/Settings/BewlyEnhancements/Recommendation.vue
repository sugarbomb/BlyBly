<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

import AccessKeyAuthorizeDialog from '~/components/AccessKeyAuthorizeDialog.vue'
import { accessKey, settings } from '~/logic'
import { revokeAccessKey } from '~/utils/authProvider'

import SettingsItem from '../components/SettingsItem.vue'
import SettingsItemGroup from '../components/SettingsItemGroup.vue'

const showAccessKeyAuthorizeDialog = ref<boolean>(false)
const { t } = useI18n()

const adCardHandlingOptions = computed(() => [
  { label: t('settings.for_you_ad_card_handling_opt.remove'), value: 'remove' },
  { label: t('settings.for_you_ad_card_handling_opt.mask'), value: 'mask' },
])

function handleRevoke() {
  revokeAccessKey()
}
</script>

<template>
  <div>
    <SettingsItemGroup :title="$t('settings.group_home_recommendation_interface')">
      <SettingsItem :title="$t('settings.for_you_close_ads')">
        <Radio v-model="settings.forYouCloseAds" />
      </SettingsItem>
      <SettingsItem v-if="settings.forYouCloseAds" :title="$t('settings.for_you_ad_card_handling')">
        <Select v-model="settings.forYouAdCardHandling" :options="adCardHandlingOptions" w="full" />
      </SettingsItem>
      <SettingsItem :title="$t('settings.for_you_auto_feedback_web')">
        <template #desc>
          {{ $t('settings.for_you_auto_feedback_web_desc') }}
        </template>
        <Radio v-model="settings.forYouAutoFeedbackWeb" />
      </SettingsItem>
      <SettingsItem
        v-if="settings.forYouAutoFeedbackWeb"
        :title="$t('settings.for_you_auto_feedback_web_exclude_temporary_blocks')"
      >
        <template #desc>
          {{ $t('settings.for_you_auto_feedback_web_exclude_temporary_blocks_desc') }}
        </template>
        <Radio v-model="settings.forYouAutoFeedbackWebExcludeTemporaryBlocks" />
      </SettingsItem>
    </SettingsItemGroup>

    <SettingsItemGroup :title="$t('settings.group_recommendation_mode')">
      <SettingsItem :title="$t('settings.authorize_app')">
        <template #desc>
          {{ $t('settings.authorize_app_desc') }}
          <br>
          <a
            href="https://github.com/indefined/UserScripts/tree/master/bilibiliHome#%E6%8E%88%E6%9D%83%E8%AF%B4%E6%98%8E" target="_blank" color="$bew-theme-color"
          >{{ $t('settings.authorize_app_more_info_access_key') }}</a>
        </template>

        <div w-full>
          <Button v-if="!accessKey" type="primary" center block @click="showAccessKeyAuthorizeDialog = true">
            {{ $t('settings.btn.authorize') }}...
          </Button>
          <Button
            v-else type="secondary" center block style="--b-button-text-color: var(--bew-error-color)"
            @click="handleRevoke"
          >
            {{ $t('settings.btn.revoke') }}
          </Button>
        </div>
      </SettingsItem>
    </SettingsItemGroup>

    <AccessKeyAuthorizeDialog v-model="showAccessKeyAuthorizeDialog" />
  </div>
</template>

<style lang="scss" scoped>
.unrestricted-width-settings-item {
  :deep(.left-content) {
    --uno: w-full;
  }

  :deep(.right-content) {
    --uno: w-auto;
  }
}
</style>
