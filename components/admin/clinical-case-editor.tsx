"use client";

import { useMemo, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import TurndownService from "turndown";
import { markdownToEditorHtml } from "@/lib/content/markdown-editor";
import {
  ArrowsOut, ArrowCounterClockwise, ArrowClockwise, ImageSquare, LinkSimple,
  ListBullets, ListNumbers, MagnifyingGlassPlus, Minus, PencilSimple, Plus,
  Quotes, Sparkle, Star, Table as TableIcon, TextAlignCenter, TextAlignLeft,
  TextAlignRight, TextB, TextItalic, TextStrikethrough, TextUnderline, Trash, X
} from "@phosphor-icons/react";

export type CaseMediaAsset = {
  id: string;
  title: string;
  altText: string | null;
  storagePath: string;
  isFeatured: boolean;
  prompt: string | null;
  origin: string;
  figureId: string | null;
};

export type CaseVisualFigure = {
  id: string;
  figureNumber: number;
  priority: number;
  title: string;
  category: string;
  purpose: string;
  educationalMessage: string;
  reason: string;
  score: number;
  optimizedPrompt: string | null;
  status: string;
  isFeatured: boolean;
};

export type CaseVisualPlan = {
  id: string;
  status: string;
  currentStage: string;
  qualityScore: number | null;
  error: string | null;
  qualityReview: {
    approved: boolean;
    recommendations: string[];
    missingFigures: string[];
  } | null;
  figures: CaseVisualFigure[];
};

const VISUAL_PIPELINE_STAGES = [
  ["privacy_validation", "Validando privacidad", "Comprobando que el caso pueda procesarse de forma segura."],
  ["medical_case_analyzer", "Analizando el caso", "Extrayendo diagnóstico, estadio, hallazgos, tratamiento y evolución."],
  ["disease_knowledge_retriever", "Consultando evidencia", "Recuperando el contexto médico relevante de la enfermedad."],
  ["clinical_figure_reasoner", "Seleccionando figuras", "Decidiendo qué imágenes aportan mayor valor docente."],
  ["figure_editorial_planner", "Ordenando la narrativa", "Priorizando figuras y eliminando redundancias."],
  ["prompt_engineering_specialist", "Redactando prompts", "Preparando una instrucción específica para cada figura."],
  ["medical_prompt_compliance", "Revisando seguridad", "Verificando exactitud, privacidad y lenguaje clínico."],
  ["editorial_quality_reviewer", "Cerrando revisión editorial", "Comprobando cobertura, diversidad y coherencia del conjunto."],
  ["complete", "Plan listo para generar", "Las figuras y sus prompts ya están preparados."]
] as const;

function ToolButton({ label, active, onClick, children }: {
  label: string; active?: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return <button type="button" className={`editor-tool${active ? " is-active" : ""}`} onClick={onClick} aria-label={label} title={label}>{children}</button>;
}

export function ClinicalCaseEditor({
  name,
  defaultValue,
  caseSlug,
  initialAssets = [],
  initialVisualPlan = null
}: {
  name: string;
  defaultValue: string;
  caseSlug?: string;
  initialAssets?: CaseMediaAsset[];
  initialVisualPlan?: CaseVisualPlan | null;
}) {
  const [assets, setAssets] = useState(initialAssets);
  const [visualPlan, setVisualPlan] = useState(initialVisualPlan);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "4:3">("16:9");
  const [imageProvider, setImageProvider] = useState<"comfyui" | "nvidia" | "openai">("openai");
  const [generatingFigureId, setGeneratingFigureId] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [refreshingPlan, setRefreshingPlan] = useState(false);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState<CaseMediaAsset | null>(null);
  const [editing, setEditing] = useState<CaseMediaAsset | null>(null);
  const [editingFigure, setEditingFigure] = useState<CaseVisualFigure | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [editAlt, setEditAlt] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [markdown, setMarkdown] = useState(defaultValue);
  const providerName =
    imageProvider === "openai"
      ? "OpenAI"
      : imageProvider === "nvidia"
        ? "NVIDIA NIM"
        : "Local";
  const turndown = useMemo(() => {
    const service = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });
    service.addRule("image", {
      filter: "img",
      replacement: (_, node) => {
        const image = node as HTMLImageElement;
        return `\n\n![${image.alt || "Imagen editorial"}](${image.src})\n\n`;
      }
    });
    return service;
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false }
      }),
      Image.configure({ allowBase64: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell
    ],
    content: markdownToEditorHtml(defaultValue),
    editorProps: { attributes: { class: "clinical-rich-editor", "aria-label": "Contenido del caso" } },
    onUpdate: ({ editor: current }) => setMarkdown(turndown.turndown(current.getHTML()))
  });

  const generateFigure = async (figure: CaseVisualFigure, promptOverride?: string) => {
    if (!caseSlug) return false;
    setGeneratingFigureId(figure.id);
    setError("");
    try {
      const response = await fetch(`/api/panel/casos/${encodeURIComponent(caseSlug)}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aspectRatio,
          figureId: figure.id,
          provider: imageProvider,
          ...(promptOverride?.trim() ? { promptOverride: promptOverride.trim() } : {})
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo generar la imagen.");
      const nextAssets = (data.assets as CaseMediaAsset[]).map((asset) => ({
        ...asset,
        figureId: asset.figureId ?? figure.id
      }));
      setAssets((current) => [...nextAssets, ...current]);
      setVisualPlan((current) => current ? {
        ...current,
        figures: current.figures.map((item) => item.id === figure.id
          ? { ...item, status: "GENERATED", optimizedPrompt: promptOverride?.trim() || item.optimizedPrompt }
          : item)
      } : current);
      setEditing(null);
      setEditingFigure(null);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo generar la imagen.");
      return false;
    } finally {
      setGeneratingFigureId(null);
    }
  };

  const generatePending = async () => {
    if (!visualPlan || visualPlan.status !== "READY") return;
    const pending = visualPlan.figures.filter((figure) =>
      !assets.some((asset) => asset.figureId === figure.id)
    );
    setGeneratingAll(true);
    for (const figure of pending) {
      const completed = await generateFigure(figure);
      if (!completed) break;
    }
    setGeneratingAll(false);
  };

  const refreshVisualPlan = async () => {
    if (!caseSlug) return;
    setRefreshingPlan(true);
    setError("");
    const endpoint = `/api/panel/casos/${encodeURIComponent(caseSlug)}/visual-plan`;
    const refreshStatus = async () => {
      const statusResponse = await fetch(endpoint, { cache: "no-store" });
      if (!statusResponse.ok) return;
      const statusData = await statusResponse.json();
      if (statusData.plan) setVisualPlan(statusData.plan);
    };
    const pollingId = window.setInterval(() => void refreshStatus(), 1500);
    try {
      const response = await fetch(endpoint, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo actualizar el plan visual.");
      setVisualPlan(data.plan);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar el plan visual.");
    } finally {
      window.clearInterval(pollingId);
      setRefreshingPlan(false);
    }
  };

  const remove = async (asset: CaseMediaAsset) => {
    if (!window.confirm("¿Eliminar esta imagen definitivamente?")) return;
    const response = await fetch(`/api/panel/media/${asset.id}`, { method: "DELETE" });
    if (response.ok) setAssets((current) => current.filter((item) => item.id !== asset.id));
  };

  const feature = async (asset: CaseMediaAsset) => {
    const response = await fetch(`/api/panel/media/${asset.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "feature" })
    });
    if (response.ok) setAssets((current) => current.map((item) => ({ ...item, isFeatured: item.id === asset.id })));
  };

  const saveMetadata = async () => {
    if (!editing) return;
    setError("");
    const response = await fetch(`/api/panel/media/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editing.title,
        altText: editAlt.trim() || editing.title
      })
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "No se pudieron guardar los metadatos.");
      return;
    }
    setAssets((current) =>
      current.map((asset) => asset.id === editing.id ? data.asset : asset)
    );
    setEditing(data.asset);
  };

  const insert = (asset: CaseMediaAsset) => {
    editor?.chain().focus().setImage({ src: asset.storagePath, alt: asset.altText || asset.title }).run();
  };

  const plannedFigureCount = visualPlan?.figures.length ?? 0;
  const generatedFigureCount = visualPlan?.figures.filter((figure) =>
    assets.some((asset) => asset.figureId === figure.id)
  ).length ?? 0;
  const pendingFigureCount = Math.max(0, plannedFigureCount - generatedFigureCount);
  const generatePlanLabel = pendingFigureCount === plannedFigureCount
    ? `Generar las ${plannedFigureCount} figuras del plan`
    : pendingFigureCount === 1
      ? "Generar la figura pendiente"
      : `Generar ${pendingFigureCount} figuras pendientes`;
  const activeStageIndex = Math.max(
    0,
    VISUAL_PIPELINE_STAGES.findIndex(([key]) => key === visualPlan?.currentStage)
  );
  const activeStage = VISUAL_PIPELINE_STAGES[activeStageIndex];
  const planHasAdvisories =
    visualPlan?.status === "READY" &&
    visualPlan.qualityReview &&
    !visualPlan.qualityReview.approved;

  return (
    <div className={`clinical-editor-workspace${caseSlug ? "" : " is-new"}`}>
      <section className={`visual-editor-panel${fullscreen ? " is-fullscreen" : ""}`}>
        <div className="editor-toolbar" aria-label="Herramientas de edición">
          <ToolButton label="Negrita" active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}><TextB /></ToolButton>
          <ToolButton label="Cursiva" active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}><TextItalic /></ToolButton>
          <ToolButton label="Subrayado" active={editor?.isActive("underline")} onClick={() => editor?.chain().focus().toggleUnderline().run()}><TextUnderline /></ToolButton>
          <ToolButton label="Tachado" active={editor?.isActive("strike")} onClick={() => editor?.chain().focus().toggleStrike().run()}><TextStrikethrough /></ToolButton>
          <span className="editor-tool-separator" />
          <ToolButton label="Título de sección" active={editor?.isActive("heading", { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><strong>H2</strong></ToolButton>
          <ToolButton label="Subtítulo" active={editor?.isActive("heading", { level: 3 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}><strong>H3</strong></ToolButton>
          <ToolButton label="Lista" active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}><ListBullets /></ToolButton>
          <ToolButton label="Lista numerada" active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListNumbers /></ToolButton>
          <ToolButton label="Cita clínica" active={editor?.isActive("blockquote")} onClick={() => editor?.chain().focus().toggleBlockquote().run()}><Quotes /></ToolButton>
          <ToolButton label="Separador" onClick={() => editor?.chain().focus().setHorizontalRule().run()}><Minus /></ToolButton>
          <ToolButton label="Enlace" onClick={() => {
            const href = window.prompt("Dirección del enlace");
            if (href) editor?.chain().focus().extendMarkRange("link").setLink({ href }).run();
          }}><LinkSimple /></ToolButton>
          <ToolButton label="Insertar tabla" onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon /></ToolButton>
          <span className="editor-tool-separator" />
          <ToolButton label="Alinear a la izquierda" active={editor?.isActive({ textAlign: "left" })} onClick={() => editor?.chain().focus().setTextAlign("left").run()}><TextAlignLeft /></ToolButton>
          <ToolButton label="Centrar" active={editor?.isActive({ textAlign: "center" })} onClick={() => editor?.chain().focus().setTextAlign("center").run()}><TextAlignCenter /></ToolButton>
          <ToolButton label="Alinear a la derecha" active={editor?.isActive({ textAlign: "right" })} onClick={() => editor?.chain().focus().setTextAlign("right").run()}><TextAlignRight /></ToolButton>
          <span className="editor-tool-spacer" />
          <ToolButton label="Deshacer" onClick={() => editor?.chain().focus().undo().run()}><ArrowCounterClockwise /></ToolButton>
          <ToolButton label="Rehacer" onClick={() => editor?.chain().focus().redo().run()}><ArrowClockwise /></ToolButton>
          <ToolButton label={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"} active={fullscreen} onClick={() => setFullscreen((current) => !current)}><ArrowsOut /></ToolButton>
        </div>
        <EditorContent editor={editor} />
        <footer className="editor-status">
          <span>{markdown.trim().split(/\s+/).filter(Boolean).length} palabras</span>
          <span>Las imágenes se insertan donde esté el cursor.</span>
        </footer>
        <textarea name={name} value={markdown} readOnly hidden />
      </section>

      {caseSlug ? (
        <aside className="case-media-rail case-visual-plan">
          <header>
            <div><span>Editor científico asistido</span><h3>Plan visual docente</h3></div>
            <ImageSquare size={24} aria-hidden="true" />
          </header>

          {visualPlan ? (
            <div className={`visual-plan-status is-${visualPlan.status.toLowerCase()}`}>
              <span>{visualPlan.status === "READY" ? `${planHasAdvisories ? "Listo con observaciones" : "Plan aprobado"} · ${plannedFigureCount} figuras` : visualPlan.status.replaceAll("_", " ")}</span>
              {visualPlan.qualityScore !== null ? <strong>{visualPlan.qualityScore}/100</strong> : null}
            </div>
          ) : null}
          {refreshingPlan ? (
            <div className="visual-plan-progress" role="status" aria-live="polite">
              <div>
                <span className="visual-plan-spinner" aria-hidden="true" />
                <strong>{activeStage[1]}</strong>
                <small>{Math.min(activeStageIndex + 1, 8)}/8</small>
              </div>
              <p>{activeStage[2]}</p>
              <span className="visual-plan-progress-track" aria-hidden="true">
                <span style={{ width: `${Math.min(100, Math.max(8, ((activeStageIndex + 1) / 8) * 100))}%` }} />
              </span>
              <small>El proceso suele tardar entre dos y cuatro minutos. Puedes seguir viendo cada etapa aquí.</small>
            </div>
          ) : null}
          {planHasAdvisories ? (
            <details className="visual-plan-advisories">
              <summary>Ver observaciones editoriales</summary>
              <p>El plan ya puede generar imágenes. Estas recomendaciones no lo bloquean:</p>
              <ul>
                {[...
                  (visualPlan.qualityReview?.missingFigures ?? []),
                  ...(visualPlan.qualityReview?.recommendations ?? [])
                ].slice(0, 4).map((recommendation) => (
                  <li key={recommendation}>{recommendation}</li>
                ))}
              </ul>
            </details>
          ) : null}
          <p className="case-media-intro">
            El agente decide entre tres y cinco figuras no redundantes para cada caso. Al generar el plan se creará una imagen diferente por cada figura seleccionada.
          </p>

          <fieldset className="case-media-provider">
            <legend>Modelo de generación</legend>
            <div>
              <label><input type="radio" name="case-image-provider" value="openai" checked={imageProvider === "openai"} onChange={() => setImageProvider("openai")} /><span><strong>OpenAI</strong><small>GPT Image 2 · principal</small></span></label>
              <label><input type="radio" name="case-image-provider" value="nvidia" checked={imageProvider === "nvidia"} onChange={() => setImageProvider("nvidia")} /><span><strong>NVIDIA NIM</strong><small>FLUX.1-dev</small></span></label>
              <label><input type="radio" name="case-image-provider" value="comfyui" checked={imageProvider === "comfyui"} onChange={() => setImageProvider("comfyui")} /><span><strong>Gestor local</strong><small>Juggernaut XL v9</small></span></label>
            </div>
          </fieldset>
          <fieldset className="case-media-format">
            <legend>Formato de imagen</legend>
            <div>{(["16:9", "4:3"] as const).map((format) => (
              <label key={format}><input type="radio" name="case-image-format" value={format} checked={aspectRatio === format} onChange={() => setAspectRatio(format)} /><span className={`format-preview format-${format.replace(":", "-")}`} aria-hidden="true" /><strong>{format}</strong></label>
            ))}</div>
          </fieldset>

          {visualPlan?.status === "READY" ? (
            <button className="button primary case-image-generate" type="button" disabled={generatingAll || Boolean(generatingFigureId) || pendingFigureCount === 0} onClick={generatePending}>
              <Sparkle size={18} />
              {generatingAll
                ? `Generando figura ${Math.min(generatedFigureCount + 1, plannedFigureCount)} de ${plannedFigureCount}…`
                : pendingFigureCount === 0
                  ? `${plannedFigureCount} figuras generadas`
                  : `${generatePlanLabel} · ${providerName}`}
            </button>
          ) : (
            <button className="button primary case-image-generate" type="button" disabled={refreshingPlan} onClick={refreshVisualPlan}>
              <Sparkle size={18} />{refreshingPlan ? "Construyendo plan editorial…" : visualPlan ? "Actualizar plan visual" : "Crear plan visual"}
            </button>
          )}
          {visualPlan?.error ? <p className="case-media-error" role="alert">{visualPlan.error}</p> : null}
          {error ? <p className="case-media-error" role="alert">{error}</p> : null}

          <div className="visual-figure-list">
            {visualPlan?.figures.map((figure) => {
              const figureAssets = assets.filter((asset) => asset.figureId === figure.id);
              const asset = figureAssets[0];
              const generating = generatingFigureId === figure.id;
              return (
                <article className="visual-figure-card" key={figure.id}>
                  <div className="visual-figure-heading">
                    <div><span>Figura {figure.figureNumber} · {figure.category}</span><h4>{figure.title}</h4></div>
                    <strong>{figure.score}</strong>
                  </div>
                  <p>{figure.purpose}</p>
                  <div className="visual-figure-meta"><span>Prioridad {figure.priority}</span>{figure.isFeatured ? <span><Star weight="fill" /> Portada</span> : null}</div>
                  {asset ? (
                    <button type="button" className="case-media-preview" onClick={() => setZoom(asset)}>
                      <img src={asset.storagePath} alt={asset.altText || asset.title} />
                      <span className="case-media-type">{figure.category}</span>
                      {asset.isFeatured ? <span className="case-media-featured"><Star weight="fill" /> Principal</span> : null}
                    </button>
                  ) : <div className="visual-figure-placeholder"><ImageSquare size={28} /><span>{generating ? "Generando imagen…" : "Lista para generar"}</span></div>}
                  <div className="case-media-actions">
                    <button type="button" disabled={generating || visualPlan.status !== "READY"} onClick={() => generateFigure(figure)} aria-label={`Generar ${figure.title}`} title="Generar una imagen"><Sparkle /></button>
                    {asset ? <button type="button" onClick={() => insert(asset)} aria-label="Insertar en el contenido" title="Insertar"><Plus /></button> : null}
                    {asset ? <button type="button" onClick={() => setZoom(asset)} aria-label="Ampliar imagen" title="Ampliar"><MagnifyingGlassPlus /></button> : null}
                    <button type="button" onClick={() => { setEditingFigure(figure); setEditing(asset ?? null); setEditPrompt(figure.optimizedPrompt || asset?.prompt || ""); setEditAlt(asset?.altText || figure.educationalMessage); }} aria-label="Editar figura y prompt" title="Editar"><PencilSimple /></button>
                    {asset ? <button type="button" onClick={() => feature(asset)} aria-label="Usar como imagen principal" title="Usar como principal"><Star /></button> : null}
                    {asset ? <button type="button" onClick={() => remove(asset)} aria-label="Eliminar imagen" title="Eliminar"><Trash /></button> : null}
                  </div>
                </article>
              );
            })}
            {!visualPlan?.figures.length && !refreshingPlan ? <div className="case-media-empty"><ImageSquare size={30} /><p>Genera el plan visual después de revisar y anonimizar el caso.</p></div> : null}
          </div>

          {assets.some((asset) => !asset.figureId) ? (
            <section className="legacy-media-section" aria-labelledby="legacy-gallery-title">
              <div className="legacy-media-heading">
                <span>Historial</span>
                <h4 id="legacy-gallery-title">Galería anterior</h4>
              </div>
              <p>Imágenes creadas antes del plan visual. Se conservan disponibles para el contenido y la portada.</p>
              <div className="case-media-grid">
                {assets.filter((asset) => !asset.figureId).map((asset) => (
                  <article className="case-media-card" key={asset.id}>
                    <button type="button" className="case-media-preview" onClick={() => setZoom(asset)}>
                      <img src={asset.storagePath} alt={asset.altText || asset.title} />
                      {asset.isFeatured ? <span className="case-media-featured"><Star weight="fill" /> Principal</span> : null}
                    </button>
                    <div className="case-media-actions is-legacy">
                      <button type="button" onClick={() => insert(asset)} aria-label="Insertar en el contenido" title="Insertar"><Plus /></button>
                      <button type="button" onClick={() => setZoom(asset)} aria-label="Ampliar imagen" title="Ampliar"><MagnifyingGlassPlus /></button>
                      <button type="button" onClick={() => feature(asset)} aria-label="Usar como imagen principal" title="Usar como principal"><Star /></button>
                      <button type="button" onClick={() => remove(asset)} aria-label="Eliminar imagen" title="Eliminar"><Trash /></button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      ) : null}

      {zoom ? <div className="media-lightbox" role="dialog" aria-modal="true" aria-label="Vista ampliada"><button type="button" onClick={() => setZoom(null)} aria-label="Cerrar"><X /></button><img src={zoom.storagePath} alt={zoom.altText || zoom.title} /></div> : null}
      {editingFigure ? (
        <div className="media-edit-sheet" role="dialog" aria-modal="true" aria-labelledby="edit-image-title">
          <div>
            <button className="media-edit-close" type="button" onClick={() => { setEditing(null); setEditingFigure(null); }} aria-label="Cerrar"><X /></button>
            <span>Figura {editingFigure.figureNumber} · {editingFigure.category}</span>
            <h3 id="edit-image-title">Editar prompt aprobado</h3>
            <p>{editingFigure.purpose}</p>
            {editing ? (
              <>
                <label><span>Texto alternativo</span><input value={editAlt} onChange={(event) => setEditAlt(event.target.value)} placeholder="Describe lo que aporta la imagen" /></label>
                <button type="button" className="button secondary" onClick={saveMetadata}>Guardar accesibilidad</button>
                <div className="media-edit-divider" />
              </>
            ) : null}
            <label htmlFor="edited-figure-prompt"><span>Prompt utilizado para generar la imagen</span></label>
            <textarea id="edited-figure-prompt" rows={10} value={editPrompt} onChange={(event) => setEditPrompt(event.target.value)} />
            <p className="image-prompt-meta">La nueva versión conservará la imagen anterior y actualizará el prompt de esta figura.</p>
            <button type="button" className="button primary" disabled={generatingFigureId === editingFigure.id || !editPrompt.trim()} onClick={() => generateFigure(editingFigure, editPrompt)}>
              {generatingFigureId === editingFigure.id ? "Generando versión…" : `Generar nueva versión con ${providerName}`}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
