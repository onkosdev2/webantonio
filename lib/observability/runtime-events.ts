type RuntimeEvent = Record<string, string | number | boolean | null | undefined>;
let operationSequence = 0;

export function logRuntimeEvent(event: RuntimeEvent) {
  console.info("[runtime]", { at: new Date().toISOString(), ...event });
}

export async function trackRuntimeOperation<T>(
  operation: string,
  run: () => Promise<T>,
  details: RuntimeEvent = {}
): Promise<T> {
  const id = (++operationSequence).toString(36);
  const startedAt = Date.now();
  logRuntimeEvent({ event: "operation_start", id, operation, ...details });
  try {
    const result = await run();
    logRuntimeEvent({
      event: "operation_end",
      id,
      operation,
      outcome: "ok",
      durationMs: Date.now() - startedAt,
      ...details
    });
    return result;
  } catch (error) {
    logRuntimeEvent({
      event: "operation_end",
      id,
      operation,
      outcome: "error",
      errorName: error instanceof Error ? error.name : "UnknownError",
      durationMs: Date.now() - startedAt,
      ...details
    });
    throw error;
  }
}

let memoryMonitorStarted = false;

export function startMemoryMonitor() {
  if (memoryMonitorStarted || process.env.NODE_ENV !== "production") return;
  memoryMonitorStarted = true;

  const report = () => {
    const memory = process.memoryUsage();
    const rssMb = Math.round(memory.rss / 1024 / 1024);
    const heapUsedMb = Math.round(memory.heapUsed / 1024 / 1024);
    logRuntimeEvent({
      event: rssMb >= 435 ? "memory_pressure" : "memory_sample",
      rssMb,
      heapUsedMb,
      heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
      externalMb: Math.round(memory.external / 1024 / 1024),
      arrayBuffersMb: Math.round(memory.arrayBuffers / 1024 / 1024)
    });
  };

  report();
  const timer = setInterval(report, 15_000);
  timer.unref();
}
