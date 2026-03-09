export interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  withContext(extra: Record<string, unknown>): Logger;
}

export class AgentLogger implements Logger {
  private readonly baseContext: Record<string, unknown>;

  constructor(context: Record<string, unknown> = {}) {
    this.baseContext = context;
  }

  info(message: string, context?: Record<string, unknown>): void {
    console.log(
      JSON.stringify({
        level: "info",
        message,
        timestamp: new Date().toISOString(),
        ...this.baseContext,
        ...context,
      }),
    );
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(
      JSON.stringify({
        level: "warn",
        message,
        timestamp: new Date().toISOString(),
        ...this.baseContext,
        ...context,
      }),
    );
  }

  error(message: string, context?: Record<string, unknown>): void {
    console.error(
      JSON.stringify({
        level: "error",
        message,
        timestamp: new Date().toISOString(),
        ...this.baseContext,
        ...context,
      }),
    );
  }

  withContext(extra: Record<string, unknown>): Logger {
    return new AgentLogger({ ...this.baseContext, ...extra });
  }
}
