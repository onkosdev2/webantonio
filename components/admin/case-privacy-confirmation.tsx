"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck, WarningCircle } from "@phosphor-icons/react";
import {
  findPersonalIdentifierRisks,
  personalIdentifierMessage
} from "@/lib/ai/privacy";

export const CASE_PRIVACY_MESSAGE =
  "Confirma que el caso está anonimizado antes de enviarlo a OpenAI o publicarlo.";

const PROTECTED_INTENTS = new Set([
  "ai_generate",
  "ai_regenerate",
  "ai_expand",
  "ai_shorten",
  "ai_retone",
  "publish"
]);

export function validateCasePrivacy(form: HTMLFormElement | null) {
  const checkbox = form?.elements.namedItem("anonymized");

  if (!(checkbox instanceof HTMLInputElement)) {
    return true;
  }

  if (!checkbox.checked) {
    checkbox.setCustomValidity(CASE_PRIVACY_MESSAGE);
    form?.dispatchEvent(
      new CustomEvent("case-privacy-error", { detail: CASE_PRIVACY_MESSAGE })
    );
    checkbox.scrollIntoView({ behavior: "smooth", block: "center" });
    checkbox.focus({ preventScroll: true });
    checkbox.reportValidity();
    checkbox.setCustomValidity("");
    return false;
  }

  const fields = ["title", "summary", "body", "treatmentPlan", "reviewNotes"];
  const text = fields
    .map((name) => {
      const field = form?.elements.namedItem(name);
      return field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement
        ? field.value
        : "";
    })
    .filter(Boolean)
    .join("\n\n");
  const risks = findPersonalIdentifierRisks(text);

  if (risks.length > 0) {
    const message = personalIdentifierMessage(risks);
    form?.dispatchEvent(new CustomEvent("case-privacy-error", { detail: message }));
    checkbox.scrollIntoView({ behavior: "smooth", block: "center" });
    checkbox.focus({ preventScroll: true });
    return false;
  }

  return true;
}

export function CasePrivacyConfirmation({
  defaultChecked
}: {
  defaultChecked: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;

    const showError = (event: Event) => {
      const message =
        event instanceof CustomEvent && typeof event.detail === "string"
          ? event.detail
          : CASE_PRIVACY_MESSAGE;
      setError(message);
    };
    const guardSubmission = (event: SubmitEvent) => {
      const submitter = event.submitter;
      const intent =
        submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement
          ? submitter.value
          : "";

      if (PROTECTED_INTENTS.has(intent) && !validateCasePrivacy(form)) {
        event.preventDefault();
      }
    };

    form.addEventListener("submit", guardSubmission, true);
    form.addEventListener("case-privacy-error", showError);

    return () => {
      form.removeEventListener("submit", guardSubmission, true);
      form.removeEventListener("case-privacy-error", showError);
    };
  }, []);

  const clearError = () => {
    inputRef.current?.setCustomValidity("");
    setError("");
  };

  return (
    <div className={`case-privacy${error ? " has-error" : ""}`}>
      <label className="case-checkbox" htmlFor="case-anonymized">
        <input
          ref={inputRef}
          id="case-anonymized"
          type="checkbox"
          name="anonymized"
          defaultChecked={defaultChecked}
          aria-describedby="case-anonymized-help case-anonymized-error"
          onChange={clearError}
        />
        <span>
          <ShieldCheck size={20} aria-hidden="true" />
          Confirmo que el caso fue anonimizado
        </span>
      </label>
      <p id="case-anonymized-help">
        Es obligatorio antes de enviar información a la IA o publicar el caso.
        Guardar un borrador no requiere esta confirmación.
      </p>
      {error ? (
        <p id="case-anonymized-error" className="case-privacy-error" role="alert">
          <WarningCircle size={18} aria-hidden="true" />
          {error}
        </p>
      ) : (
        <span id="case-anonymized-error" />
      )}
    </div>
  );
}
