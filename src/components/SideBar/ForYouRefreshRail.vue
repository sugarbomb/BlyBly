<script setup lang="ts">
import { ref } from 'vue'

import Button from '~/components/Button.vue'
import Tooltip from '~/components/Tooltip.vue'

import ForYouPlatformToggleButton, { type ForYouPlatformMode } from './ForYouPlatformToggleButton.vue'

const props = withDefaults(defineProps<{
  loading: boolean
  variant?: 'sidebar' | 'floating'
}>(), {
  variant: 'sidebar',
})

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

const platformMode = ref<ForYouPlatformMode>('web')
</script>

<template>
  <aside
    v-if="props.variant === 'sidebar'"
    pos="sticky top-150px"
    h="[calc(100vh-140px)]"
    w-56px shrink-0
  >
    <div flex="~ col items-center">
      <div
        style="backdrop-filter: var(--bew-filter-glass-1)"
        bg="$bew-elevated" p-2 rounded="$bew-radius"
        shadow="[var(--bew-shadow-1),var(--bew-shadow-edge-glow-1)]"
        box-border border="1 $bew-border-color"
        flex="~ col items-center gap-2"
      >
        <Tooltip :content="$t('common.operation.refresh')" placement="left">
          <Button
            type="secondary"
            :disabled="props.loading"
            :loading="props.loading"
            round
            center
            class="rail-btn"
            @click="emit('refresh')"
          >
            <div i-mingcute:refresh-2-line text="lg" />
          </Button>
        </Tooltip>

        <ForYouPlatformToggleButton v-model="platformMode" :disabled="props.loading" />
      </div>
    </div>
  </aside>

  <div
    v-else
    pos="fixed right-14px top-1/2"
    style="transform: translateY(-50%)"
    z-50
    flex="~ col"
  >
    <div
      style="backdrop-filter: var(--bew-filter-glass-1)"
      bg="$bew-elevated" p-2 rounded="$bew-radius"
      shadow="[var(--bew-shadow-1),var(--bew-shadow-edge-glow-1)]"
      box-border border="1 $bew-border-color"
      flex="~ col items-center gap-2"
    >
      <Tooltip :content="$t('common.operation.refresh')" placement="left">
        <Button
          type="secondary"
          :loading="props.loading"
          :disabled="props.loading"
          round
          center
          class="rail-btn"
          @click="emit('refresh')"
        >
          <div i-mingcute:refresh-2-line text="lg" />
        </Button>
      </Tooltip>

      <ForYouPlatformToggleButton v-model="platformMode" :disabled="props.loading" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.rail-btn {
  --b-button-width: 40px;
  --b-button-height: 40px;
  --b-button-padding: 0px;
  --b-button-border-width: 1px;
  --b-button-color: var(--bew-elevated);
  --b-button-color-hover: var(--bew-elevated-hover);
  --b-button-shadow: var(--bew-shadow-1);
  --b-button-shadow-hover: var(--bew-shadow-2);
  --b-button-shadow-active: var(--bew-shadow-1);
}
</style>
