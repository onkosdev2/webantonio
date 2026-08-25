import { uploadGeneratedImageToR2 } from "@/lib/storage/r2";
import sharp from "sharp";

type CaseImageInput = {
  title: string;
  summary: string;
  body: string;
  tumorType: string;
  stage: string;
  biomarkers: string[];
  treatmentLine: string;
  treatmentPlan: string;
  evidenceLevel: string;
  tone: string;
  aspectRatio: ImageAspectRatio;
  promptOverride?: string;
  provider?: ImageProvider;
};

export type ImageAspectRatio = "16:9" | "4:3";
export type ImageProvider = "comfyui" | "nvidia" | "openai";

const NVIDIA_FLUX_URL =
  "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev";
const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2";
const COMFYUI_URL = process.env.COMFYUI_URL ?? "http://127.0.0.1:8188";
const COMFYUI_CHECKPOINT =
  process.env.COMFYUI_CHECKPOINT ?? "juggernautXL_v9.safetensors";

const IMAGE_SIZES: Record<ImageAspectRatio, { width: number; height: number }> = {
  "16:9": { width: 1344, height: 768 },
  "4:3": { width: 1280, height: 960 }
};

const LOCAL_IMAGE_SIZES: Record<ImageAspectRatio, { width: number; height: number }> = {
  "16:9": { width: 1024, height: 576 },
  "4:3": { width: 1024, height: 768 }
};

async function isNearBlackImage(bytes: Buffer) {
  const stats = await sharp(bytes).stats();
  const colorChannels = stats.channels.slice(0, 3);
  return colorChannels.length === 3 &&
    colorChannels.every((channel) => channel.max <= 3 && channel.mean <= 1);
}

function nvidiaErrorMessage(message?: string, status?: number) {
  const normalized = message?.toLowerCase() ?? "";
  if (status === 401 || status === 403) {
    return "NVIDIA rechazó la credencial. Revisa NVIDIA_API_KEY y reinicia el proyecto.";
  }
  if (status === 429 || normalized.includes("rate limit")) {
    return "NVIDIA está recibiendo demasiadas solicitudes. Espera un momento y vuelve a intentarlo.";
  }
  if (status === 422) {
    return "NVIDIA no aceptó la configuración visual. Prueba otro formato o simplifica la instrucción.";
  }
  return message || "NVIDIA FLUX no pudo generar la imagen.";
}

async function requestFluxImage(
  apiKey: string,
  prompt: string,
  aspectRatio: ImageAspectRatio,
  seed: number
) {
  const size = IMAGE_SIZES[aspectRatio];
  const response = await fetch(NVIDIA_FLUX_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prompt,
      mode: "base",
      image: null,
      cfg_scale: 4.5,
      width: size.width,
      height: size.height,
      samples: 1,
      seed,
      steps: 50
    }),
    signal: AbortSignal.timeout(180_000)
  });

  const payload = await response.json() as {
    artifacts?: Array<{
      base64?: string;
      mime_type?: string;
      finishReason?: string;
      finish_reason?: string;
    }>;
    message?: string;
    detail?: string | Array<{ msg?: string }>;
  };
  if (!response.ok) {
    const detail = Array.isArray(payload.detail)
      ? payload.detail.map((item) => item.msg).filter(Boolean).join(". ")
      : payload.detail;
    throw new Error(nvidiaErrorMessage(payload.message || detail, response.status));
  }

  const artifact = payload.artifacts?.find((item) => item.base64);
  if (!artifact?.base64) {
    throw new Error("NVIDIA devolvió una respuesta sin imagen.");
  }
  const finishReason = artifact.finishReason || artifact.finish_reason || "SUCCESS";
  if (finishReason !== "SUCCESS") {
    throw new Error(
      finishReason === "CONTENT_FILTERED"
        ? "NVIDIA filtró el prompt visual por seguridad."
        : `NVIDIA no completó la imagen (${finishReason}).`
    );
  }

  const result = {
    bytes: Buffer.from(artifact.base64, "base64"),
    contentType: artifact.mime_type || "image/jpeg"
  };
  if (await isNearBlackImage(result.bytes)) {
    throw new Error("NVIDIA devolvió una imagen vacía o completamente negra.");
  }
  return result;
}

function openAiErrorMessage(message?: string, status?: number) {
  const normalized = message?.toLowerCase() ?? "";
  if (status === 401 || status === 403) {
    return "OpenAI rechazó la credencial. Revisa OPENAI_API_KEY y reinicia el proyecto.";
  }
  if (status === 429 || normalized.includes("rate limit")) {
    return "OpenAI alcanzó el límite de uso o solicitudes. Revisa el crédito disponible e inténtalo nuevamente.";
  }
  return message || "OpenAI no pudo generar la imagen.";
}

async function requestOpenAiImage(
  apiKey: string,
  prompt: string,
  aspectRatio: ImageAspectRatio
) {
  const response = await fetch(OPENAI_IMAGES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_IMAGE_MODEL,
      prompt,
      size: "1536x1024",
      quality: "medium",
      output_format: "png"
    }),
    signal: AbortSignal.timeout(300_000)
  });

  const payload = await response.json() as {
    data?: Array<{ b64_json?: string; url?: string }>;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(openAiErrorMessage(payload.error?.message, response.status));
  }

  const generated = payload.data?.at(0);
  let sourceBytes: Buffer;
  if (generated?.b64_json) {
    sourceBytes = Buffer.from(generated.b64_json, "base64");
  } else if (generated?.url) {
    const imageResponse = await fetch(generated.url, {
      signal: AbortSignal.timeout(60_000)
    });
    if (!imageResponse.ok) {
      throw new Error("OpenAI generó la imagen, pero no pudo entregarla.");
    }
    sourceBytes = Buffer.from(await imageResponse.arrayBuffer());
  } else {
    throw new Error("OpenAI devolvió una respuesta sin imagen.");
  }

  const target = LOCAL_IMAGE_SIZES[aspectRatio];
  const bytes = await sharp(sourceBytes)
    .resize(target.width, target.height, {
      fit: "cover",
      position: "attention"
    })
    .png()
    .toBuffer();
  if (await isNearBlackImage(bytes)) {
    throw new Error("OpenAI devolvió una imagen vacía o completamente negra.");
  }
  return { bytes, contentType: "image/png" };
}

function createComfyWorkflow(
  prompt: string,
  aspectRatio: ImageAspectRatio,
  seed: number
) {
  const size = LOCAL_IMAGE_SIZES[aspectRatio];
  return {
    "3": {
      class_type: "KSampler",
      inputs: {
        seed,
        steps: 28,
        cfg: 5.5,
        sampler_name: "dpmpp_2m",
        scheduler: "karras",
        denoise: 1,
        model: ["4", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["5", 0]
      }
    },
    "4": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: COMFYUI_CHECKPOINT }
    },
    "5": {
      class_type: "EmptyLatentImage",
      inputs: { width: size.width, height: size.height, batch_size: 1 }
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: { text: prompt, clip: ["4", 1] }
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: "",
        clip: ["4", 1]
      }
    },
    "8": {
      class_type: "VAEDecode",
      inputs: { samples: ["3", 0], vae: ["4", 2] }
    },
    "9": {
      class_type: "SaveImage",
      inputs: {
        filename_prefix: "webantonio/case-image",
        images: ["8", 0]
      }
    }
  };
}

async function requestComfyImage(
  prompt: string,
  aspectRatio: ImageAspectRatio,
  seed: number
) {
  const enqueue = await fetch(`${COMFYUI_URL}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: `webantonio-${seed}`,
      prompt: createComfyWorkflow(prompt, aspectRatio, seed)
    }),
    signal: AbortSignal.timeout(15_000)
  });
  const queued = await enqueue.json() as {
    prompt_id?: string;
    error?: string;
  };
  if (!enqueue.ok || !queued.prompt_id) {
    throw new Error(
      queued.error ||
      "ComfyUI no aceptó el workflow. Comprueba que SDXL esté instalado."
    );
  }

  const deadline = Date.now() + 240_000;
  let output:
    | { filename: string; subfolder?: string; type?: string }
    | undefined;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    const historyResponse = await fetch(
      `${COMFYUI_URL}/history/${encodeURIComponent(queued.prompt_id)}`,
      { signal: AbortSignal.timeout(10_000) }
    );
    if (!historyResponse.ok) continue;
    const history = await historyResponse.json() as Record<
      string,
      {
        outputs?: Record<
          string,
          { images?: Array<{ filename: string; subfolder?: string; type?: string }> }
        >;
        status?: { status_str?: string; completed?: boolean };
      }
    >;
    const entry = history[queued.prompt_id];
    output = Object.values(entry?.outputs ?? {})
      .flatMap((node) => node.images ?? [])
      .at(0);
    if (output) break;
    if (entry?.status?.completed && !output) {
      throw new Error("ComfyUI terminó el workflow sin producir una imagen.");
    }
  }

  if (!output) {
    throw new Error("ComfyUI superó el tiempo máximo de generación.");
  }

  const query = new URLSearchParams({
    filename: output.filename,
    subfolder: output.subfolder ?? "",
    type: output.type ?? "output"
  });
  const imageResponse = await fetch(`${COMFYUI_URL}/view?${query}`, {
    signal: AbortSignal.timeout(30_000)
  });
  if (!imageResponse.ok) {
    throw new Error("ComfyUI generó la imagen, pero no pudo entregarla.");
  }

  const result = {
    bytes: Buffer.from(await imageResponse.arrayBuffer()),
    contentType: imageResponse.headers.get("content-type") || "image/png"
  };
  if (await isNearBlackImage(result.bytes)) {
    throw new Error("ComfyUI devolvió una imagen vacía o completamente negra.");
  }
  return result;
}

export async function generateCaseImages(input: CaseImageInput) {
  const configuredProvider = process.env.IMAGE_GENERATION_PROVIDER;
  const provider =
    input.provider ??
    (configuredProvider === "nvidia" || configuredProvider === "openai"
      ? configuredProvider
      : configuredProvider === "comfyui"
        ? "comfyui"
        : "openai");
  const nvidiaApiKey = process.env.NVIDIA_API_KEY;
  const openAiApiKey = process.env.OPENAI_API_KEY;
  if (provider === "nvidia" && !nvidiaApiKey) {
    throw new Error("NVIDIA_API_KEY no está configurada.");
  }
  if (provider === "openai" && !openAiApiKey) {
    throw new Error("OPENAI_API_KEY no está configurada.");
  }
  const prompt = input.promptOverride;
  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("La figura todavía no tiene un prompt aprobado.");
  }
  const seed = Date.now() % 2_147_483_647;
  const image = provider === "nvidia"
    ? await requestFluxImage(nvidiaApiKey!, prompt, input.aspectRatio, seed)
    : provider === "openai"
      ? await requestOpenAiImage(openAiApiKey!, prompt, input.aspectRatio)
      : await requestComfyImage(prompt, input.aspectRatio, seed);
  const uploaded = await uploadGeneratedImageToR2(
    image.bytes,
    `${input.title}-figura`,
    image.contentType
  );
  return [{
    ...uploaded,
    prompt,
    visualType: "editorial-plan",
    origin: provider,
    model:
      provider === "nvidia"
        ? "black-forest-labs/flux.1-dev"
        : provider === "openai"
          ? OPENAI_IMAGE_MODEL
          : "RunDiffusion/Juggernaut-XL-v9"
  }];
}
