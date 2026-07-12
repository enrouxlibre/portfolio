<template>
  <v-container class="sudoku-container">
    <SudokuControls
      :is-running="isRunning"
      @reset="handleReset"
      @solve-pc="handleSolvePc"
      @solve-human="handleSolveHuman"
      @toggle-locale="toggleLocale"
    />
    <SudokuGrid :cells="cells" @cell-keydown="handleCellKeydown" />
    <p class="sudoku-steps">
      <span v-if="isRunning">{{ t("sudoku.solving") }}</span>
      <span v-else>{{ t("sudoku.steps", { n: steps }) }}</span>
    </p>
  </v-container>
</template>

<script lang="ts" setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import type { Cell } from "./sudoku/types";
import SudokuGrid from "./sudoku/SudokuGrid.vue";
import SudokuControls from "./sudoku/SudokuControls.vue";

const { t, locale } = useI18n();

// ─── Reactive state ──────────────────────────────────────────────────────────
const cells = ref<Cell[]>([]);
const steps = ref(0);
const isRunning = ref(false);
let solveVersion = 0;

// ─── Line caches (built once; cells mutated in-place on reset) ───────────────
const xLines: Cell[][] = [];
const yLines: Cell[][] = [];
const zLines: Cell[][] = [];

// ─── Utility ─────────────────────────────────────────────────────────────────
function lineIncludes(line: Cell[], n: number): boolean {
  return line.some((c) => Number(c.value) === n);
}

function emptyCellsInLine(line: Cell[]): Cell[] {
  return line.filter((c) => c.value === "");
}

function cellInLine(line: Cell[], value: number): Cell | null {
  return line.find((c) => Number(c.value) === value) ?? null;
}

function getRandomNumberList(): number[] {
  const nbs = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = nbs.length - 1; i > 0; i--) {
    const r = Math.floor(Math.random() * (i + 1));
    [nbs[i], nbs[r]] = [nbs[r], nbs[i]];
  }
  return nbs;
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function isPossible(cell: Cell, num: number): boolean {
  return (
    !lineIncludes(xLines[cell.xi], num) &&
    !lineIncludes(yLines[cell.yi], num) &&
    !lineIncludes(zLines[cell.zi], num)
  );
}

function addClue(cell: Cell, value: number): void {
  cell.status = Number(cell.value) === value ? "trueClue" : "clue";
}

function clearClues(): void {
  for (const c of cells.value) {
    if (c.status !== "default" && c.status !== "error") c.status = "default";
  }
}

function isSolved(): boolean {
  return cells.value.every((c) => c.value !== "" && Number(c.value) !== 0);
}

// ─── Grid generation ──────────────────────────────────────────────────────────
// Uses '0' as empty sentinel during generation, '' for editable cells after lock.
// yLines[col][row] mirrors original y[col][row] iteration order.

function fillGrid(): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = yLines[col][row];
      if (Number(cell.value) === 0) {
        for (const num of getRandomNumberList()) {
          if (isPossible(cell, num)) {
            cell.value = String(num);
            if (fillGrid()) return true;
            cell.value = "0";
          }
        }
        return false;
      }
    }
  }
  return true;
}

function countSolutions(): number {
  let count = 0;
  function solve() {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const cell = yLines[row][col];
        if (Number(cell.value) === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isPossible(cell, num)) {
              cell.value = String(num);
              solve();
              cell.value = "0";
              if (count > 1) return;
            }
          }
          return;
        }
      }
    }
    count++;
  }
  solve();
  return count;
}

function removeValues(targetClues = 35): void {
  const filled = [...cells.value];
  shuffle(filled);
  for (const cell of filled) {
    if (cells.value.filter((c) => Number(c.value) !== 0).length <= targetClues)
      break;
    const backup = cell.value;
    cell.value = "0";
    if (countSolutions() !== 1) cell.value = backup;
  }
}

function lockGrid(): void {
  for (const cell of cells.value) {
    if (Number(cell.value) === 0) {
      cell.value = "";
      cell.locked = false;
    } else {
      cell.locked = true;
    }
  }
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function initiateGrid(): void {
  for (const cell of cells.value) {
    cell.value = "0";
    cell.locked = false;
    cell.status = "default";
  }
  fillGrid();
  removeValues(randomInt(35, 40));
  lockGrid();
  steps.value = 0;
}

function emptyUnlockedCells(): void {
  for (const cell of cells.value) {
    if (!cell.locked) {
      cell.value = "";
      cell.status = "default";
    }
  }
}

// ─── Computer solve (slow backtracking) ──────────────────────────────────────
async function almostInstaSolve(
  timeout: number,
  version: number,
): Promise<boolean> {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (solveVersion !== version) return true;
      const cell = yLines[col][row];
      if (cell.value === "") {
        for (const num of getRandomNumberList()) {
          if (isPossible(cell, num)) {
            cell.value = String(num);
            steps.value++;
            if (solveVersion !== version) return true;
            const solved = await almostInstaSolve(timeout, version);
            if (solved) return true;
            cell.value = "";
          }
        }
        if (timeout > 0)
          await new Promise<void>((resolve) => setTimeout(resolve, timeout));
        return false;
      }
    }
  }
  if (timeout > 0)
    await new Promise<void>((resolve) => setTimeout(resolve, timeout));
  return true;
}

// ─── Human solve (pincer + three cells remaining) ────────────────────────────
type CellKey = "xi" | "yi" | "zi";
interface AxisDef {
  lines: Cell[][];
  key: CellKey;
}

const TCR_AXES: Array<{ axis: AxisDef; other: AxisDef; oo: AxisDef }> = [
  {
    axis: { lines: xLines, key: "xi" },
    other: { lines: yLines, key: "yi" },
    oo: { lines: zLines, key: "zi" },
  },
  {
    axis: { lines: yLines, key: "yi" },
    other: { lines: zLines, key: "zi" },
    oo: { lines: xLines, key: "xi" },
  },
  {
    axis: { lines: zLines, key: "zi" },
    other: { lines: xLines, key: "xi" },
    oo: { lines: yLines, key: "yi" },
  },
];

const PINCER_AXES: Array<{ axis: AxisDef; other: AxisDef }> = [
  { axis: { lines: xLines, key: "xi" }, other: { lines: yLines, key: "yi" } },
  { axis: { lines: yLines, key: "yi" }, other: { lines: xLines, key: "xi" } },
];

const BOX_GROUPS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
];

function threeCellsRemaining(): boolean {
  clearClues();
  for (const { axis, other, oo } of TCR_AXES) {
    for (const line of axis.lines) {
      if (emptyCellsInLine(line).length < 4) {
        for (let i = 1; i <= 9; i++) {
          const possibleCells: Cell[] = [];
          const clueLines: Cell[][] = [];
          for (const emptyCell of emptyCellsInLine(line)) {
            const otherLine = other.lines[emptyCell[other.key]];
            const ooLine = oo.lines[emptyCell[oo.key]];
            if (
              !lineIncludes(line, i) &&
              !lineIncludes(otherLine, i) &&
              !lineIncludes(ooLine, i)
            ) {
              possibleCells.push(emptyCell);
            } else {
              if (lineIncludes(otherLine, i)) clueLines.push(otherLine);
              if (lineIncludes(ooLine, i)) clueLines.push(ooLine);
            }
          }
          if (possibleCells.length === 1) {
            clueLines.forEach((cl) => cl.forEach((c) => addClue(c, i)));
            line.filter((c) => c.value !== "").forEach((c) => addClue(c, i));
            possibleCells[0].value = String(i);
            possibleCells[0].status = "solved";
            return true;
          }
        }
      }
    }
  }
  return false;
}

function pincer(): boolean {
  clearClues();
  for (const { axis, other } of PINCER_AXES) {
    for (let j = 0; j < 3; j++) {
      for (let n = 1; n <= 9; n++) {
        const numberCells: Cell[] = [];
        let freeIndex = -1;
        for (let i = 0; i < 3; i++) {
          const li = j * 3 + i;
          if (lineIncludes(axis.lines[li], n)) {
            const found = cellInLine(axis.lines[li], n);
            if (found) numberCells.push(found);
          } else {
            freeIndex = li;
          }
        }
        if (numberCells.length === 2 && freeIndex !== -1) {
          for (const box of BOX_GROUPS) {
            const z0 = numberCells[0].zi;
            const z1 = numberCells[1].zi;
            if (box.includes(z0) && box.includes(z1)) {
              const zIndex = box.find((b) => b !== z0 && b !== z1)!;
              if (!lineIncludes(zLines[zIndex], n)) {
                const targetCells = axis.lines[freeIndex].filter(
                  (c) => c.zi === zIndex && c.value === "",
                );
                if (targetCells.length === 1) {
                  axis.lines[numberCells[0][axis.key]].forEach((c) =>
                    addClue(c, n),
                  );
                  axis.lines[numberCells[1][axis.key]].forEach((c) =>
                    addClue(c, n),
                  );
                  targetCells[0].value = String(n);
                  targetCells[0].status = "solved";
                  return true;
                } else if (targetCells.length > 1) {
                  const possibleCells = targetCells.filter(
                    (c) => !lineIncludes(other.lines[c[other.key]], n),
                  );
                  if (possibleCells.length === 1) {
                    axis.lines[numberCells[0][axis.key]].forEach((c) =>
                      addClue(c, n),
                    );
                    axis.lines[numberCells[1][axis.key]].forEach((c) =>
                      addClue(c, n),
                    );
                    targetCells
                      .filter((c) => lineIncludes(other.lines[c[other.key]], n))
                      .forEach((c) =>
                        other.lines[c[other.key]].forEach((oc) =>
                          addClue(oc, n),
                        ),
                      );
                    possibleCells[0].value = String(n);
                    possibleCells[0].status = "solved";
                    return true;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  return false;
}

// ─── Event handlers ──────────────────────────────────────────────────────────
function handleReset(): void {
  solveVersion++;
  isRunning.value = false;
  initiateGrid();
}

async function handleSolvePc(noDelay = false): Promise<void> {
  if (isRunning.value) return;
  emptyUnlockedCells();
  isRunning.value = true;
  const version = ++solveVersion;
  clearClues();
  steps.value = 0;
  await almostInstaSolve(noDelay ? 0 : 3, version);
  if (solveVersion === version) isRunning.value = false;
}

async function handleSolveHuman(noDelay = false): Promise<void> {
  if (isRunning.value) return;
  emptyUnlockedCells();
  isRunning.value = true;
  const version = ++solveVersion;
  steps.value = 0;
  let usePincer = true;
  let failCount = 0;

  while (failCount < 2 && !isSolved() && solveVersion === version) {
    const success = usePincer ? pincer() : threeCellsRemaining();
    usePincer = !usePincer;
    if (success) {
      steps.value++;
      failCount = 0;
      if (!noDelay)
        await new Promise<void>((resolve) => setTimeout(resolve, 50));
    } else {
      failCount++;
    }
  }

  if (solveVersion === version) isRunning.value = false;
}

function handleCellKeydown(event: KeyboardEvent, cell: Cell): void {
  if (cell.locked) return;
  const v = Number(event.key);
  if (v >= 1 && v <= 9) {
    cell.value = "";
    const possible = isPossible(cell, v);
    cell.value = event.key;
    cell.status = possible ? "default" : "error";
    event.preventDefault();
  } else if (event.key === "Backspace" || event.key === "Delete") {
    cell.value = "";
    cell.status = "default";
    event.preventDefault();
  } else if (event.key.length === 1) {
    event.preventDefault();
  }
}

function toggleLocale(): void {
  locale.value = locale.value === "en" ? "fr" : "en";
}

// ─── Initialisation ───────────────────────────────────────────────────────────
onMounted(() => {
  for (let j = 0; j < 9; j++) {
    for (let i = 0; i < 9; i++) {
      const k = Math.floor(j / 3) * 3 + Math.floor(i / 3);
      const cell: Cell = {
        value: "0",
        locked: false,
        status: "default",
        xi: i,
        yi: j,
        zi: k,
      };
      cells.value.push(cell);
    }
  }
  for (let i = 0; i < 9; i++) {
    xLines.push([]);
    yLines.push([]);
    zLines.push([]);
  }
  for (const cell of cells.value) {
    xLines[cell.xi].push(cell);
    yLines[cell.yi].push(cell);
    zLines[cell.zi].push(cell);
  }
  initiateGrid();
});
</script>

<style scoped>
.sudoku-container {
  max-width: 560px;
  padding: 16px;
}

.sudoku-steps {
  text-align: center;
  margin-top: 12px;
  font-size: 16px;
}
</style>
