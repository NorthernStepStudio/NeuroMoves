export const LogLevel = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG',
} as const;

export type LogLevelValue = (typeof LogLevel)[keyof typeof LogLevel];

export class Logger {
  private readonly component: string;

  constructor(component: string) {
    this.component = component;
  }

  log(level: LogLevelValue, message: string, data?: unknown): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      message,
      ...(data !== undefined ? { data } : {}),
    };

    try {
      console.log(JSON.stringify(entry));
    } catch {
      console.log(
        JSON.stringify({
          ...entry,
          data: '[unserializable]',
        })
      );
    }
  }

  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, data);
  }

  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }
}
