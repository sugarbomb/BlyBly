<script setup lang="ts">
import type { RecommendationRegion } from '~/components/RecommendationLayout/types'

import RecommendationRegionSettings from './RecommendationRegionSettings.vue'

const regions: RecommendationRegion[] = ['home', 'guest', 'tv', 'partition']
</script>

<template>
  <div>
    <section v-for="region in regions" :key="region" class="region-settings">
      <h2 class="region-title">
        {{ $t(`settings.recommendation_layout.regions.${region}`) }}
      </h2>
      <RecommendationRegionSettings :region="region" />
    </section>
  </div>
</template>

<style scoped lang="scss">
.region-settings + .region-settings {
  margin-top: 40px;
  padding-top: 28px;
  border-top: 1px solid var(--bew-border-color);
}

.region-title {
  margin-bottom: 20px;
  font-size: 20px;
}
</style>
