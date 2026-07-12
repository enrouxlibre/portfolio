<template>
  <div class="sudoku-controls">
    <v-btn variant="outlined" :disabled="isRunning" @click="$emit('reset')">
      {{ t("sudoku.reset") }}
    </v-btn>
    <v-btn
      variant="outlined"
      :disabled="isRunning"
      @click="$emit('solvePc', noDelayPc)"
    >
      {{ t("sudoku.solvePc") }}
      <input
        type="checkbox"
        v-model="noDelayPc"
        @click.stop
        style="margin-left: 6px; cursor: pointer"
      />
    </v-btn>
    <v-btn
      variant="outlined"
      :disabled="isRunning"
      @click="$emit('solveHuman', noDelayHuman)"
    >
      {{ t("sudoku.solveHuman") }}
      <input
        type="checkbox"
        v-model="noDelayHuman"
        @click.stop
        style="margin-left: 6px; cursor: pointer"
      />
    </v-btn>
    <v-btn variant="tonal" size="small" @click="$emit('toggleLocale')">
      {{ locale === "en" ? "FR" : "EN" }}
    </v-btn>
    <v-btn
      variant="tonal"
      size="small"
      :icon="themeIcon"
      @click="toggleTheme"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useTheme } from "vuetify";

defineProps<{ isRunning: boolean }>();
defineEmits<{
  reset: [];
  solvePc: [noDelay: boolean];
  solveHuman: [noDelay: boolean];
  toggleLocale: [];
}>();

const noDelayPc = ref(false);
const noDelayHuman = ref(false);

const { t, locale } = useI18n();
const theme = useTheme();

const themeIcon = computed(() =>
  theme.global.current.value.dark ? "mdi-weather-sunny" : "mdi-weather-night",
);

function toggleTheme() {
  theme.global.name.value = theme.global.current.value.dark ? "light" : "dark";
}
</script>

<style scoped>
.sudoku-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
</style>
