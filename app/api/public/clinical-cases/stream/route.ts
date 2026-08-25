import { subscribeToClinicalCasePublications } from "@/lib/realtime/clinical-case-publications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

export async function GET(request: Request) {
  let unsubscribe: () => void = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (value: string) => controller.enqueue(encoder.encode(value));

      send("event: connected\ndata: {\"status\":\"ready\"}\n\n");

      unsubscribe = subscribeToClinicalCasePublications((event) => {
        send(`event: publication\ndata: ${JSON.stringify(event)}\n\n`);
      });

      heartbeat = setInterval(() => {
        send(`: keepalive ${Date.now()}\n\n`);
      }, 25_000);

      request.signal.addEventListener("abort", () => {
        unsubscribe();
        if (heartbeat) clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // La conexión ya fue cerrada por el navegador.
        }
      }, { once: true });
    },
    cancel() {
      unsubscribe();
      if (heartbeat) clearInterval(heartbeat);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
