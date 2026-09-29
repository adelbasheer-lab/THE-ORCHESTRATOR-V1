export const TASK_STATES = [
  "PLANNING","IMPLEMENTING","TESTING","REVIEWING","FIXING","OPEN_PR","WAITING_HUMAN_APPROVAL","MERGING","COMPLETED","FAILED",
] as const;
export type TaskState = (typeof TASK_STATES)[number];
export type AgentName = "gpt" | "claude";
export interface ResearchMetadata {
  protocolVersion: string;
  studyId: string;
  runId: string;
  condition: "IMPLEMENTATION_ONLY" | "STRUCTURED_OVERSIGHT";
  benchmarkTaskId: string;
  seed?: number;
  allowedPaths: string[];
  canaryPaths?: string[];
}

export interface TaskSpec {
  id: string; objective: string; repository: string; baseBranch: string; testCommand: string; state: TaskState;
  branchName?: string; pullRequestNumber?: number; pullRequestUrl?: string; plan?: string; latestReview?: string; failureReason?: string;
  research?: ResearchMetadata;
  createdAt: string; updatedAt: string;
}
export interface AgentTurn { agent: AgentName; taskId: string; instruction: string; workspacePath: string; context: string; }
export interface AgentResult { text: string; toolCalls: ToolCall[]; }
export interface ToolCall { name: string; input: Record<string, unknown>; output?: string; }
export interface TaskEvent { taskId: string; type: string; actor: AgentName | "system" | "human"; payload: Record<string, unknown>; createdAt: string; }