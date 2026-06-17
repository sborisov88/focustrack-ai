// Структурированное JSON-логирование для Edge Functions.
// Каждая запись — отдельная строка JSON с уровнем, временной меткой и контекстом
// функции. Это позволяет фильтровать логи по уровню (info|warn|error) и
// анализировать их — в том числе AI-инструментами — в логах Supabase.
export type LogLevel = "info" | "warn" | "error"

export type LogFields = Record<string, unknown>

export function logEvent(
  level: LogLevel,
  fn: string,
  message: string,
  fields: LogFields = {},
): void {
  const entry = {
    level,
    ts: new Date().toISOString(),
    fn,
    message,
    ...fields,
  }
  const line = JSON.stringify(entry)

  if (level === "error") {
    console.error(line)
  } else if (level === "warn") {
    console.warn(line)
  } else {
    console.log(line)
  }
}

export function createLogger(fn: string) {
  return {
    info: (message: string, fields?: LogFields) =>
      logEvent("info", fn, message, fields),
    warn: (message: string, fields?: LogFields) =>
      logEvent("warn", fn, message, fields),
    error: (message: string, fields?: LogFields) =>
      logEvent("error", fn, message, fields),
  }
}
