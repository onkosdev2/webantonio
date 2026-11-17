import type { Instrumentation } from "next";
import { startMemoryMonitor } from "@/lib/observability/runtime-events";

function normalizeRoute(pathname: string) {
  if (pathname.startsWith("/api/")) return "/api/*";
  if (pathname.startsWith("/noticias/")) return "/noticias/*";
  if (pathname.startsWith("/casos-clinicos/")) return "/casos-clinicos/*";
  if (pathname.startsWith("/editoriales/")) return "/editoriales/*";
  if (pathname.startsWith("/investigacion/")) return "/investigacion/*";
  if (pathname.startsWith("/reflexiones/")) return "/reflexiones/*";
  if (pathname.startsWith("/galeria/")) return "/galeria/*";
  if (pathname.startsWith("/panel/")) return "/panel/*";
  return pathname;
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") startMemoryMonitor();
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context
) => {
  console.error("[runtime]", {
    at: new Date().toISOString(),
    event: "http_request_error",
    route: normalizeRoute(request.path.split("?", 1)[0]),
    httpMethod: request.method,
    routerKind: context.routerKind,
    routeType: context.routeType,
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorMessage: error instanceof Error ? error.message.slice(0, 240) : undefined
  });
};
