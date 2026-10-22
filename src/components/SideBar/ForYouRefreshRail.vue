<script setup lang="ts">
import Button from '~/components/Button.vue'
import Tooltip from '~/components/Tooltip.vue'

withDefaults(defineProps<{
  loading: boolean
  disabled?: boolean
  placement?: 'left' | 'right'
}>(), {
  disabled: false,
  placement: 'left',
})

const emit = defineEmits<{
  (e: 'refresh'): void
}>()
</script>

<template>
  <div
    style="backdrop-filter: var(--bew-filter-glass-1)"
    bg="$bew-content-alt" dark:bg="$bew-elevated" p-2 rounded="$bew-radius"
    shadow="[var(--bew-shadow-edge-glow-1),var(--bew-shadow-2)]"
    box-border border="1 $bew-border-color"
  >
    <Tooltip :content="$t('common.operation.refresh')" :placement="placement">
      <Button
        type="secondary"
        :loading="loading"
        :disabled="loading || disabled"
        round
        center
        class="rail-refresh-button"
        @click="emit('refresh')"
      >
        <div i-mingcute:refresh-2-line text="lg" />
      </Button>
    </Tooltip>
  </div>
</template>

<style scoped lang="scss">
.rail-refresh-button {
  --b-button-width: 40px;
  --b-button-height: 90px;
  --b-button-padding: 0px;
  --b-button-border-width: 1px;
  --b-button-color: var(--bew-elevated);
  --b-button-color-hover: var(--bew-elevated-hover);
  --b-button-shadow: var(--bew-shadow-1);
  --b-button-shadow-hover: var(--bew-shadow-2);
  --b-button-shadow-active: var(--bew-shadow-1);
}
</style>
