import { timingSafeEqual } from "node:crypto";

export class SecurityPolicy {
  readonly allowedRepositories: Set<string>;
  readonly allowedTestCommands: Set<string>;
  readonly maxTaskMinutes: number;
  readonly testTimeoutMs: number;
  readonly keepFailedWorkspaces: boolean;

  private readonly apiKey?: string;
  private readonly approvalKey?: string;
  private readonly allowAnonymousDev: boolean;
  private readonly secrets: string[];

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.allowedRepositories = new Set(parseCsv(env.GITHUB_ALLOWED_REPOSITORIES || env.GITHUB_REPOSITORY));
    this.allowedTestCommands = new Set(parseCsv(env.ALLOWED_TEST_COMMANDS || "npm test"));
    this.maxTaskMinutes = positiveInt(env.MAX_TASK_MINUTES, 30, 1, 240);
    this.testTimeoutMs = positiveInt(env.TEST_TIMEOUT_MS, 1_800_000, 1_000, 7_200_000);
    this.keepFailedWorkspaces = env.KEEP_FAILED_WORKSPACES === "true";

    this.apiKey = env.ORCHESTRATOR_API_KEY?.trim() || undefined;
    this.approvalKey = env.ORCHESTRATOR_APPROVAL_KEY?.trim() || undefined;
    this.allowAnonymousDev = env.NODE_ENV !== "production" && env.ORCHESTRATOR_ALLOW_ANONYMOUS_DEV === "true";

    this.secrets = [
      this.apiKey,
      this.approvalKey,
      env.OPENAI_API_KEY,
      env.ANTHROPIC_API_KEY,
      env.GITHUB_TOKEN,
      ...parseMcpSecrets(env.MCP_SERVERS_JSON),
    ].filter((value): value is string => Boolean(value));
  }

  requireApiKey(provided: string | undefined): void {
    this.requireSecret(this.apiKey, provided, "ORCHESTRATOR_API_KEY");
  }

  requireApprovalKey(provided: string | undefined): void {
    this.requireSecret(this.approvalKey, provided, "ORCHESTRATOR_APPROVAL_KEY");
  }

  assertRepository(repository: string): void {
    if (!this.allowedRepositories.has(repository)) {
      throw new Error("Repository is not allowed by GITHUB_ALLOWED_REPOSITORIES");
    }
  }

  assertTestCommand(testCommand: string): void {
    if (!this.allowedTestCommands.has(testCommand)) {
      throw new Error("Test command is not allowed by ALLOWED_TEST_COMMANDS");
    }
  }

  assertWithinDeadline(deadlineAt: number): void {
    if (Date.now() > deadlineAt) {
      throw new Error("Task deadline exceeded");
    }
  }

  deadlineAt(createdAt: string): number {
    return new Date(createdAt).getTime() + this.maxTaskMinutes * 60_000;
  }

  redact(value: unknown): unknown {
    if (typeof value === "string") return this.redactText(value);
    if (Array.isArray(value)) return value.map((item) => this.redact(item));
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, this.redact(v)]));
    }
    return value;
  }

  private redactText(value: string): string {
    let result = value;
    for (const secret of this.secrets) {
      if (secret.length >= 6) result = result.split(secret).join("[REDACTED]");
    }
    return result.length > 20_000 ? result.slice(0, 20_000) + "\n[truncated]" : result;
  }

  private requireSecret(expected: string | undefined, provided: string | undefined, name: string): void {
    if (!expected) {
      if (this.allowAnonymousDev) return;
      throw new Error(name + " is not configured");
    }
    if (!provided || !safeEqual(expected, provided)) {
      throw new Error("Unauthorized");
    }
  }
}

function safeEqual(expected: string, provided: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

function parseCsv(value?: string): string[] {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function positiveInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value ?? fallback);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function parseMcpSecrets(value?: string): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => (typeof item?.authToken === "string" ? [item.authToken] : []));
  } catch {
    return [];
  }
}
