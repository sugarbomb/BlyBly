<script setup lang="ts">
import QRCodeVue from 'qrcode.vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'

import Button from '~/components/Button.vue'
import Dialog from '~/components/Dialog.vue'
import { accessKey } from '~/logic'
import { getTVLoginQRCode, pollTVLoginQRCode } from '~/utils/authProvider'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const toast = useToast()
const { t } = useI18n()

const loginQRCodeUrl = ref<string>()
const pollLoginQRCodeInterval = ref<number | undefined>()
const authCode = ref<string>('')
const qrcodeMsg = ref<string>('')

function close() {
  clearPollTimer()
  emit('update:modelValue', false)
}

function clearPollTimer() {
  if (pollLoginQRCodeInterval.value) {
    clearInterval(pollLoginQRCodeInterval.value)
    pollLoginQRCodeInterval.value = undefined
  }
}

async function setLoginQRCode() {
  const res = await getTVLoginQRCode()
  if (res.code === 0) {
    loginQRCodeUrl.value = res.data.url
    authCode.value = res.data.auth_code
  }
}

function startPollLoginQRCode() {
  clearPollTimer()

  pollLoginQRCodeInterval.value = window.setInterval(async () => {
    const pollRes = await pollTVLoginQRCode(authCode.value)

    if (pollRes.code !== 0)
      qrcodeMsg.value = pollRes.message

    if (pollRes.code === 0) {
      accessKey.value = pollRes.data.access_token
      toast.success(t('common.authorize_success'))
      close()
    }
    else if (pollRes.code === 86038) {
      await setLoginQRCode()
    }
    else if (pollRes.code === -3 || pollRes.code === -400 || pollRes.code === -404) {
      toast.error(pollRes.message)
    }
  }, 3000)
}

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) {
      clearPollTimer()
      return
    }

    qrcodeMsg.value = ''
    await setLoginQRCode()
    startPollLoginQRCode()
  },
)

onBeforeUnmount(() => {
  clearPollTimer()
})
</script>

<template>
  <Dialog
    v-if="props.modelValue"
    width="50%"
    max-width="800px"
    append-to-bewly-body
    :show-footer="false"
    :title="$t('settings.authorize_app')"
    center
    @close="close"
  >
    <div flex="~ col gap-4 items-center">
      <div>
        <p mb-2 text-center>
          {{ $t('settings.scan_qrcode_desc') }}
        </p>
        <p text="$bew-text-2 sm">
          {{ $t('settings.authorize_app_desc') }}
        </p>
      </div>

      <div bg-white border="white 4">
        <QRCodeVue v-if="loginQRCodeUrl" :value="loginQRCodeUrl" :size="150" />
        <div v-else w-150px h-150px grid="~ place-items-center">
          <div i-svg-spinners:ring-resize />
        </div>
      </div>

      <p>{{ qrcodeMsg }}</p>

      <Button type="secondary" @click="setLoginQRCode">
        {{ $t('common.operation.refresh') }}
      </Button>
    </div>
  </Dialog>
</template>
