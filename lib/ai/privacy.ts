export type PersonalIdentifierRisk = {
  kind: "name" | "document" | "medical_record" | "phone" | "email" | "birth_date";
  label: string;
};

const PERSONAL_IDENTIFIER_CHECKS: Array<{
  kind: PersonalIdentifierRisk["kind"];
  label: string;
  pattern: RegExp;
}> = [
  {
    kind: "name",
    label: "un nombre completo identificado",
    pattern:
      /\b(?:nombre(?:\s+completo|\s+del\s+paciente)?|apellidos\s+y\s+nombres)\s*[:#-]\s*[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3}\b/gi
  },
  {
    kind: "document",
    label: "un número de documento",
    pattern: /\b(?:DNI|documento(?:\s+de\s+identidad)?|pasaporte)\s*[:#-]?\s*[A-Z0-9-]{6,14}\b/gi
  },
  {
    kind: "medical_record",
    label: "un número de historia clínica",
    pattern: /\b(?:historia|expediente)\s+cl[ií]nic[oa]\s*[:#-]?\s*[A-Z0-9-]{4,18}\b/gi
  },
  {
    kind: "phone",
    label: "un teléfono",
    pattern: /\b(?:tel[eé]fono|celular|m[oó]vil)\s*[:#-]?\s*\+?\d[\d\s()-]{7,}\b/gi
  },
  {
    kind: "email",
    label: "un correo electrónico",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
  },
  {
    kind: "birth_date",
    label: "una fecha de nacimiento",
    pattern: /\b(?:fecha\s+de\s+nacimiento|naci[oó]\s+el)\s*[:#-]?\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/gi
  }
];

export function findPersonalIdentifierRisks(text: string): PersonalIdentifierRisk[] {
  return PERSONAL_IDENTIFIER_CHECKS.flatMap(({ kind, label, pattern }) => {
    pattern.lastIndex = 0;
    const matched = pattern.test(text);
    pattern.lastIndex = 0;
    return matched ? [{ kind, label }] : [];
  });
}

export function personalIdentifierMessage(risks: PersonalIdentifierRisk[]) {
  const labels = risks.map((risk) => risk.label);
  const readableList =
    labels.length > 1
      ? `${labels.slice(0, -1).join(", ")} y ${labels.at(-1)}`
      : labels[0];

  return `Revisa el caso antes de usar la IA: detectamos ${readableList}. Sustituye ese dato por una descripción anónima.`;
}
