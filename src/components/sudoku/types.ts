export interface Cell {
  value: string;
  locked: boolean;
  status: "default" | "error" | "clue" | "solved" | "trueClue";
  xi: number;
  yi: number;
  zi: number;
}
