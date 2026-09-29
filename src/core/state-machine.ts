import type { TaskState } from "./types.js";
const allowed: Record<TaskState, TaskState[]> = {
  PLANNING:["IMPLEMENTING","FAILED"], IMPLEMENTING:["TESTING","FIXING","FAILED"], TESTING:["REVIEWING","OPEN_PR","FIXING","FAILED"],
  REVIEWING:["FIXING","OPEN_PR","FAILED"], FIXING:["TESTING","FAILED"], OPEN_PR:["WAITING_HUMAN_APPROVAL","FAILED"],
  WAITING_HUMAN_APPROVAL:["MERGING","FAILED"], MERGING:["COMPLETED","FAILED"], COMPLETED:[], FAILED:[]
};
export function assertTransition(from: TaskState,to: TaskState): void { if(!allowed[from].includes(to)) throw new Error(`Invalid task transition: ${from} -> ${to}`); }
export function canTransition(from: TaskState,to: TaskState): boolean { return allowed[from].includes(to); }