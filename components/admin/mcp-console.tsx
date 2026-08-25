"use client";

import { useState } from "react";

type JsonValue = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

function pretty(value: JsonValue | undefined) {
  return JSON.stringify(value ?? {}, null, 2);
}

export function McpConsole() {
  const [resourceUri, setResourceUri] = useState("oncology://content/cases");
  const [toolName, setToolName] = useState("search_cases");
  const [toolArgs, setToolArgs] = useState(pretty({ query: "EGFR", limit: 5 }));
  const [resourceResult, setResourceResult] = useState<string>("");
  const [toolsResult, setToolsResult] = useState<string>("");
  const [callResult, setCallResult] = useState<string>("");
  const [loading, setLoading] = useState<"" | "resources" | "resource" | "tools" | "call">("");

  async function loadResources() {
    setLoading("resources");
    const response = await fetch("/api/mcp/resources");
    const data = await response.json();
    setResourceResult(pretty(data));
    setLoading("");
  }

  async function loadResource() {
    setLoading("resource");
    const response = await fetch(
      `/api/mcp/resource?uri=${encodeURIComponent(resourceUri)}`
    );
    const data = await response.json();
    setResourceResult(pretty(data));
    setLoading("");
  }

  async function loadTools() {
    setLoading("tools");
    const response = await fetch("/api/mcp/tools");
    const data = await response.json();
    setToolsResult(pretty(data));
    setLoading("");
  }

  async function callTool() {
    setLoading("call");

    let parsedArgs: JsonValue;

    try {
      parsedArgs = JSON.parse(toolArgs);
    } catch {
      setCallResult("JSON invalido en los argumentos.");
      setLoading("");
      return;
    }

    const response = await fetch("/api/mcp/tools", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tool: toolName,
        args: parsedArgs
      })
    });

    const data = await response.json();
    setCallResult(pretty(data));
    setLoading("");
  }

  return (
    <div className="admin-content-grid">
      <section className="admin-panel admin-section-span admin-hero-panel">
        <span className="eyebrow">Consola MCP</span>
        <h2>Conecta ChatGPT con el flujo editorial de casos clínicos.</h2>
        <p>
          El servidor MCP estándar está disponible en <strong>/mcp</strong>. Permite
          crear borradores desde una conversación, planificar y colocar imágenes,
          definir la portada y publicar solo después de una confirmación explícita.
        </p>
      </section>

      <section className="admin-panel admin-section-span">
        <div className="admin-panel-heading">
          <div>
            <span className="kicker">Conexión ChatGPT</span>
            <h2>Endpoint MCP · /mcp</h2>
          </div>
        </div>
        <p>
          En local usa <code>http://localhost:3000/mcp</code> con MCP Inspector.
          Para ChatGPT expón este endpoint con Secure MCP Tunnel y registra la URL
          HTTPS resultante en Developer mode. La consola inferior conserva las
          herramientas internas anteriores para diagnóstico.
        </p>
      </section>

      <section className="admin-panel admin-section-span">
        <div className="admin-panel-heading">
          <div>
            <span className="kicker">Recursos</span>
            <h2>Exploración MCP</h2>
          </div>
        </div>

        <div className="mcp-console-grid">
          <div className="mcp-console-card">
            <label className="case-field">
              <span>URI del recurso</span>
              <input
                value={resourceUri}
                onChange={(event) => setResourceUri(event.target.value)}
              />
            </label>

            <div className="case-form-actions">
              <button
                className="button secondary"
                type="button"
                onClick={loadResources}
                disabled={loading !== ""}
              >
                {loading === "resources" ? "Cargando..." : "Listar recursos"}
              </button>
              <button
                className="button primary"
                type="button"
                onClick={loadResource}
                disabled={loading !== ""}
              >
                {loading === "resource" ? "Leyendo..." : "Leer recurso"}
              </button>
            </div>
          </div>

          <pre className="mcp-console-output">{resourceResult || "Sin respuesta todavía."}</pre>
        </div>
      </section>

      <section className="admin-panel admin-section-span">
        <div className="admin-panel-heading">
          <div>
            <span className="kicker">Tools</span>
            <h2>Ejecución de herramientas</h2>
          </div>
          <button
            className="button secondary"
            type="button"
            onClick={loadTools}
            disabled={loading !== ""}
          >
            {loading === "tools" ? "Cargando..." : "Listar tools"}
          </button>
        </div>

        <div className="mcp-console-grid">
          <div className="mcp-console-card">
            <label className="case-field">
              <span>Tool</span>
              <select value={toolName} onChange={(event) => setToolName(event.target.value)}>
                <option value="search_cases">search_cases</option>
                <option value="search_news">search_news</option>
                <option value="create_draft">create_draft</option>
                <option value="queue_for_review">queue_for_review</option>
              </select>
            </label>

            <label className="case-field">
              <span>Argumentos JSON</span>
              <textarea
                rows={12}
                value={toolArgs}
                onChange={(event) => setToolArgs(event.target.value)}
              />
            </label>

            <div className="case-form-actions">
              <button
                className="button primary"
                type="button"
                onClick={callTool}
                disabled={loading !== ""}
              >
                {loading === "call" ? "Ejecutando..." : "Ejecutar tool"}
              </button>
            </div>
          </div>

          <div className="mcp-console-stack">
            <pre className="mcp-console-output">{toolsResult || "Lista de tools aún no cargada."}</pre>
            <pre className="mcp-console-output">{callResult || "Resultado de ejecución aún no disponible."}</pre>
          </div>
        </div>
      </section>
    </div>
  );
}
