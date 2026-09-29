import type { TaskEvent, TaskSpec, TaskState } from "./types.js";
export interface TaskStore {
  createTask(input: Omit<TaskSpec,"id"|"state"|"createdAt"|"updatedAt">): Promise<TaskSpec>;
  getTask(id:string):Promise<TaskSpec|null>; updateTask(id:string,patch:Partial<TaskSpec>):Promise<TaskSpec>;
  appendEvent(event:TaskEvent):Promise<void>; listEvents(id:string):Promise<TaskEvent[]>;
}
export class MemoryTaskStore implements TaskStore {
  private tasks=new Map<string,TaskSpec>(); private events=new Map<string,TaskEvent[]>();
  async createTask(input:Omit<TaskSpec,"id"|"state"|"createdAt"|"updatedAt">):Promise<TaskSpec>{
    const now=new Date().toISOString(); const task:TaskSpec={...input,id:crypto.randomUUID(),state:"PLANNING",createdAt:now,updatedAt:now};
    this.tasks.set(task.id,task); this.events.set(task.id,[]); return task;
  }
  async getTask(id:string){return this.tasks.get(id)??null;}
  async updateTask(id:string,patch:Partial<TaskSpec>):Promise<TaskSpec>{const task=this.tasks.get(id);if(!task)throw new Error("Task not found");const updated={...task,...patch,updatedAt:new Date().toISOString()};this.tasks.set(id,updated);return updated;}
  async appendEvent(event:TaskEvent){this.events.get(event.taskId)?.push(event);}
  async listEvents(id:string){return [...(this.events.get(id)??[])];}
}
export function isTaskState(value:string):value is TaskState{return ["PLANNING","IMPLEMENTING","TESTING","REVIEWING","FIXING","OPEN_PR","WAITING_HUMAN_APPROVAL","MERGING","COMPLETED","FAILED"].includes(value);}