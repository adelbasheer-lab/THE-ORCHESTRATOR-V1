export const TASK_STATES = [
  "PLANNING","IMPLEMENTING","TESTING","REVIEWING","FIXING","OPEN_PR","WAITING_HUMAN_APPROVAL","MERGING","COMPLETED","FAILED",
] as const;
export type TaskState = (typeof TASK_STATES)[number];
export type AgentName = "gpt" | "claude";
export interface TaskSpec {
  id: string; objective: string; repository: string; baseBranch: string; testCommand: string; state: TaskState;
  branchName?: string; pullRequestNumber?: number; pullRequestUrl?: string; plan?: string; latestReview?: string; failureReason?: string;
  createdAt: string; updatedAt: string;
}
export interface AgentTurn { agent: AgentName; taskId: string; instruction: string; workspacePath: string; context: string; }
export interface AgentResult { text: string; toolCalls: ToolCall[]; }
export interface ToolCall { name: string; input: Record<string, unknown>; output?: string; }
export interface TaskEvent { taskId: string; type: string; actor: AgentName | "system" | "human"; payload: Record<string, unknown>; createdAt: string; }