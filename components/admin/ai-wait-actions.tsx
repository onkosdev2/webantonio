"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Sparkle } from "@phosphor-icons/react";
import { validateCasePrivacy } from "@/components/admin/case-privacy-confirmation";

type AiIntent =
  | "ai_generate"
  | "ai_regenerate"
  | "ai_expand"
  | "ai_shorten"
  | "ai_retone";

type AiWaitActionsProps = {
  enableAiGenerate?: boolean;
  enableAiActions?: boolean;
};

const intentMessages: Record<
  AiIntent,
  {
    title: string;
    body: string;
  }
> = {
  ai_generate: {
    title: "Preparando el caso y su plan visual",
    body: "Estoy redactando el caso, analizando su valor docente y definiendo entre tres y cinco figuras clínicas no redundantes."
  },
  ai_regenerate: {
    title: "Regenerando el caso y sus figuras",
    body: "Estoy reescribiendo el contenido y reconstruyendo el plan visual para que responda a la nueva versión."
  },
  ai_expand: {
    title: "Ampliando el contenido",
    body: "Estoy agregando contexto útil y desarrollando mejor las ideas sin perder el foco clínico."
  },
  ai_shorten: {
    title: "Haciendo el texto más preciso",
    body: "Estoy condensando el caso para que quede más ágil, legible y directo."
  },
  ai_retone: {
    title: "Ajustando el tono",
    body: "Estoy adaptando el estilo del texto al tono seleccionado, cuidando que conserve rigor y claridad."
  }
};

export function AiWaitActions({
  enableAiGenerate = false,
  enableAiActions = false
}: AiWaitActionsProps) {
  const { data, pending } = useFormStatus();
  const [queuedIntent, setQueuedIntent] = useState<AiIntent | null>(null);
  const [clickedAt, setClickedAt] = useState(0);

  const submittedIntent = useMemo(() => {
    const intent = data?.get("intent");
    return typeof intent === "string" && intent in intentMessages
      ? (intent as AiIntent)
      : null;
  }, [data]);

  const activeIntent = submittedIntent ?? queuedIntent;
  const activeMessage = activeIntent ? intentMessages[activeIntent] : null;

  useEffect(() => {
    if (!queuedIntent || pending || clickedAt === 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setQueuedIntent(null);
      setClickedAt(0);
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [clickedAt, pending, queuedIntent]);

  const prepareAiSubmit = (
    event: React.MouseEvent<HTMLButtonElement>,
    intent: AiIntent
  ) => {
    const form = event.currentTarget.form;

    if (form && !form.checkValidity()) {
      return;
    }

    if (!validateCasePrivacy(form)) {
      event.preventDefault();
      return;
    }

    setQueuedIntent(intent);
    setClickedAt(Date.now());
  };

  if (!enableAiGenerate && !enableAiActions) {
    return null;
  }

  return (
    <>
      <section className="case-ai-studio" aria-labelledby="case-ai-studio-title">
        <div className="case-ai-studio-heading">
          <span className="case-ai-studio-icon" aria-hidden="true">
            <Sparkle size={22} weight="fill" />
          </span>
          <div>
            <span className="case-ai-studio-label">Asistente editorial</span>
            <h3 id="case-ai-studio-title">IA generativa para el caso clínico</h3>
            <p>Reformula el contenido conservando el rigor médico y prepara su narrativa visual.</p>
          </div>
        </div>

        <div className="case-ai-studio-controls">
          <label className="case-ai-tone-field">
            <span>Tono editorial</span>
            <select name="aiTone" defaultValue="docente" className="ai-tone-select">
              <option value="docente">Docente</option>
              <option value="clinico">Clínico</option>
              <option value="sobrio">Sobrio</option>
              <option value="critico">Crítico</option>
              <option value="divulgativo">Divulgativo</option>
            </select>
          </label>

          <div className="case-ai-action-list" aria-label="Acciones de inteligencia artificial">
            {enableAiGenerate ? (
              <button
                className="button case-ai-primary-action"
                type="submit"
                name="intent"
                value="ai_generate"
                disabled={pending}
                onClick={(event) => prepareAiSubmit(event, "ai_generate")}
              >
                Generar con IA
              </button>
            ) : null}

            {enableAiActions ? (
              <>
                <button
                  className="button case-ai-primary-action"
                  type="submit"
                  name="intent"
                  value="ai_regenerate"
                  disabled={pending}
                  onClick={(event) => prepareAiSubmit(event, "ai_regenerate")}
                >
                  Regenerar
                </button>
                <button
                  className="button secondary"
                  type="submit"
                  name="intent"
                  value="ai_expand"
                  disabled={pending}
                  onClick={(event) => prepareAiSubmit(event, "ai_expand")}
                >
                  Expandir
                </button>
                <button
                  className="button secondary"
                  type="submit"
                  name="intent"
                  value="ai_shorten"
                  disabled={pending}
                  onClick={(event) => prepareAiSubmit(event, "ai_shorten")}
                >
                  Acortar
                </button>
                <button
                  className="button secondary"
                  type="submit"
                  name="intent"
                  value="ai_retone"
                  disabled={pending}
                  onClick={(event) => prepareAiSubmit(event, "ai_retone")}
                >
                  Cambiar tono
                </button>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {activeMessage ? (
        <div className="ai-wait-overlay" role="dialog" aria-modal="true">
          <div className="ai-wait-card" role="status" aria-live="polite">
            <div className="ai-wait-spinner" aria-hidden="true" />
            <span className="kicker">IA trabajando contigo</span>
            <h3>{activeMessage.title}</h3>
            <p>{activeMessage.body}</p>
            <small>El análisis editorial completo puede tomar unos minutos. No cierres esta ventana.</small>
          </div>
        </div>
      ) : null}
    </>
  );
}
