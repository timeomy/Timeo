type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

function writeLog(level: LogLevel, message: string, meta?: unknown): void {
  const timestamp = new Date().toISOString();
  if (meta === undefined) {
    console.log(`[${timestamp}] [${level}] ${message}`);
    return;
  }

  console.log(`[${timestamp}] [${level}] ${message}`, meta);
}

export const logger = {
  info: (message: string, meta?: unknown) => writeLog("INFO", message, meta),
  warn: (message: string, meta?: unknown) => writeLog("WARN", message, meta),
  error: (message: string, meta?: unknown) => writeLog("ERROR", message, meta),
  debug: (message: string, meta?: unknown) => writeLog("DEBUG", message, meta),
};
