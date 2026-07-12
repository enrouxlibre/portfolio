<template>
  <div class="sudoku-grid">
    <input
      v-for="(cell, idx) in cells"
      :key="idx"
      :value="cell.value"
      :disabled="cell.locked"
      :class="['sudoku-cell', `status-${cell.status}`]"
      :style="cellBorderStyle(cell)"
      type="text"
      inputmode="numeric"
      @keydown="$emit('cellKeydown', $event, cell)"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useTheme } from "vuetify";
import type { Cell } from "./types";

defineProps<{ cells: Cell[] }>();
defineEmits<{ cellKeydown: [event: KeyboardEvent, cell: Cell] }>();

const theme = useTheme();
const dark = computed(() => theme.global.current.value.dark);

// ── Palette ──────────────────────────────────────────────────────────────────
const gridGap = computed(() => (dark.value ? "#0d0d1a" : "#166534"));
const cellBg = computed(() => (dark.value ? "#1a1a2e" : "#ffffff"));
const cellColor = computed(() => (dark.value ? "#c8c8ff" : "#1a1a1a"));
const lockedBg = computed(() => (dark.value ? "#0f0f23" : "#f0fdf4"));
const lockedColor = computed(() => (dark.value ? "#6868a8" : "#374151"));
const borderColor = computed(() => (dark.value ? "#7c3aed" : "#166534"));
const errorColor = computed(() => (dark.value ? "#ff6b9d" : "#dc2626"));
const clueBg = computed(() => (dark.value ? "#4c1d95" : "#bbf7d0"));
const clueColor = computed(() => (dark.value ? "#c4b5fd" : "#14532d"));
const solvedBg = computed(() => (dark.value ? "#1e40af" : "#16a34a"));
const solvedColor = computed(() => (dark.value ? "#bfdbfe" : "#ffffff"));
const trueClueBg = computed(() => (dark.value ? "#6d28d9" : "#fbbf24"));
const trueClueColor = computed(() => (dark.value ? "#ede9fe" : "#78350f"));

function cellBorderStyle(cell: Cell) {
  const border = `2px solid ${borderColor.value}`;
  return {
    borderLeft: cell.xi % 3 === 0 ? border : undefined,
    borderTop: cell.yi % 3 === 0 ? border : undefined,
    borderRight: cell.xi === 8 ? border : undefined,
    borderBottom: cell.yi === 8 ? border : undefined,
  };
}
</script>

<style scoped>
.sudoku-grid {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  grid-template-rows: repeat(9, 1fr);
  width: min(500px, 95vw);
  height: min(500px, 95vw);
  background: v-bind(gridGap);
  gap: 1px;
  margin: 0 auto;
}

.sudoku-cell {
  background: v-bind(cellBg);
  color: v-bind(cellColor);
  min-width: 0;
  border: 0;
  font-size: clamp(12px, 4.5vw, 40px);
  text-align: center;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  outline: none;
  cursor: default;
  transition:
    background 0.2s,
    color 0.2s;
}

.sudoku-cell:disabled {
  background: v-bind(lockedBg);
  color: v-bind(lockedColor);
}

.sudoku-cell.status-error {
  color: v-bind(errorColor);
}

.sudoku-cell.status-clue {
  background: v-bind(clueBg) !important;
  color: v-bind(clueColor) !important;
}

.sudoku-cell.status-solved {
  background: v-bind(solvedBg) !important;
  color: v-bind(solvedColor) !important;
}

.sudoku-cell.status-trueClue {
  background: v-bind(trueClueBg) !important;
  color: v-bind(trueClueColor) !important;
}
</style>
