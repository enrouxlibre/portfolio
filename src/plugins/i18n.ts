import { createI18n } from "vue-i18n";

export default createI18n({
  legacy: false,
  locale: "en",
  fallbackLocale: "en",
  messages: {
    en: {
      sudoku: {
        reset: "Reset",
        solvePc: "Solve (Computer)",
        solveHuman: "Solve (Human)",
        steps: "Steps: {n}",
        solving: "Solving…",
      },
    },
    fr: {
      sudoku: {
        reset: "Réinitialiser",
        solvePc: "Résoudre (Ordinateur)",
        solveHuman: "Résoudre (Humain)",
        steps: "Étapes : {n}",
        solving: "Résolution…",
      },
    },
  },
});
