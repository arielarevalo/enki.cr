export interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export class CfLogger implements Logger {
  info(message: string, context?: Record<string, unknown>): void {
    console.log(JSON.stringify({ level: "info", message, ...context }));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(JSON.stringify({ level: "warn", message, ...context }));
  }

  error(message: string, context?: Record<string, unknown>): void {
    console.error(JSON.stringify({ level: "error", message, ...context }));
  }
}
