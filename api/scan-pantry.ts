// Person 4 — Pantry Vision & Recipe Endpoint (/api/scan-pantry)
// Powered by Groq Vision (`gsk_...`) or xAI Grok (`xai-...`) via GROK_API_KEY in .env.

interface ServerlessRequest {
  method?: string;
  body?: unknown;
}

interface ServerlessResponse {
  status: (code: number) => ServerlessResponse;
  json: (payload: unknown) => void;
}

interface NormalizedScanItem {
  name: string;
  quantity?: string;
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const VISION_TIMEOUT_MS = 25000;

const CACHED_DEMO_ITEMS: readonly NormalizedScanItem[] = [
  { name: 'Eggs' },
  { name: 'Rice' },
  { name: 'Bread' },
  { name: 'Onion' },
  { name: 'Tomato' },
  { name: 'Peanut butter' },
  { name: 'Spinach' },
  { name: 'Oats' },
];

function getServerEnv(key: string): string | undefined {
  const proc = (
    globalThis as { process?: { env?: Record<string, string | undefined> } }
  ).process;
  return proc?.env?.[key];
}

function estimateBase64Bytes(base64: string): number {
  const trimmed = base64.trim();
  const padding = trimmed.endsWith('==') ? 2 : trimmed.endsWith('=') ? 1 : 0;
  return Math.floor((trimmed.length * 3) / 4) - padding;
}

function cleanFoodLabel(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw
    .replace(/[^a-zA-Z0-9\s%-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length < 2 || cleaned.length > 44) return null;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}

function extractJsonText(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    return fenced[1].trim();
  }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

function sanitizeModelIngredients(parsed: unknown): NormalizedScanItem[] {
  const rec =
    parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : null;

  const list = rec
    ? Array.isArray(rec.ingredients)
      ? (rec.ingredients as unknown[])
      : Array.isArray(rec.items)
        ? (rec.items as unknown[])
        : []
    : Array.isArray(parsed)
      ? parsed
      : [];

  const seen = new Set<string>();
  const results: NormalizedScanItem[] = [];

  for (const item of list) {
    let candidateName: unknown = item;
    let candidateQuantity: string | undefined;

    if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      candidateName = obj.name ?? obj.ingredient ?? obj.item;
      if (typeof obj.quantity === 'string' && obj.quantity.trim().length > 0) {
        candidateQuantity = obj.quantity.trim().slice(0, 32);
      }
    }

    const label = cleanFoodLabel(candidateName);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    results.push(
      candidateQuantity
        ? { name: label, quantity: candidateQuantity }
        : { name: label }
    );

    if (results.length >= 25) break;
  }

  return results;
}

function summarizeUpstreamError(
  provider: string,
  status: number,
  bodyText: string
): string {
  try {
    const parsed = JSON.parse(bodyText) as Record<string, unknown>;
    const rawErr =
      typeof parsed.error === 'string'
        ? parsed.error
        : parsed.error &&
            typeof parsed.error === 'object' &&
            typeof (parsed.error as Record<string, unknown>).message === 'string'
          ? String((parsed.error as Record<string, unknown>).message)
          : typeof parsed.message === 'string'
            ? parsed.message
            : '';
    if (rawErr) {
      return `${provider} HTTP ${status}: ${rawErr.slice(0, 160)}`;
    }
  } catch {
    // Ignore JSON parse failure on error text
  }
  return `${provider} HTTP ${status}`;
}

function scoreGroqVisionLikelihood(modelId: string): number {
  const lower = modelId.toLowerCase();
  let score = 0;
  if (lower.includes('scout')) score += 25;
  if (lower.includes('maverick')) score += 22;
  if (lower.includes('llama-4')) score += 20;
  if (lower.includes('vision') || lower.includes('vl')) score += 18;
  if (lower.includes('qwen')) score += 12;
  if (lower.includes('kimi')) score += 10;
  if (lower.includes('gemma')) score += 8;
  return score;
}

function isNonChatModel(modelId: string): boolean {
  const lower = modelId.toLowerCase();
  return (
    lower.includes('whisper') ||
    lower.includes('guard') ||
    lower.includes('safeguard') ||
    lower.includes('tts') ||
    lower.includes('orpheus') ||
    lower.includes('playai') ||
    lower.includes('embed') ||
    lower.includes('allam')
  );
}

async function buildGroqModelCandidates(
  apiKey: string,
  rawCustomModel: string,
  signal: AbortSignal
): Promise<string[]> {
  const defaults = [
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'meta-llama/llama-4-maverick-17b-128e-instruct',
  ];

  const validCustom =
    rawCustomModel && !rawCustomModel.toLowerCase().startsWith('grok')
      ? rawCustomModel.trim()
      : '';

  try {
    const resp = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
      signal,
    });
    if (resp.ok) {
      const data = (await resp.json()) as {
        data?: Array<{ id?: string; active?: boolean }>;
      };
      const activeChatModels = (data.data ?? [])
        .filter(
          (m): m is { id: string; active?: boolean } =>
            typeof m.id === 'string' &&
            m.active !== false &&
            !isNonChatModel(m.id)
        )
        .map((m) => m.id);

      activeChatModels.sort(
        (a, b) => scoreGroqVisionLikelihood(b) - scoreGroqVisionLikelihood(a)
      );

      if (activeChatModels.length > 0) {
        return Array.from(
          new Set([
            ...(validCustom ? [validCustom] : []),
            ...activeChatModels,
          ])
        );
      }
    }
  } catch {
    // Fall back to known Groq Llama 4 multimodal models
  }

  return Array.from(
    new Set([...(validCustom ? [validCustom] : []), ...defaults])
  );
}

async function buildXaiModelCandidates(
  apiKey: string,
  rawCustomModel: string,
  signal: AbortSignal
): Promise<string[]> {
  const customSlug = rawCustomModel
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');

  const defaults = [
    'grok-4-1-fast-non-reasoning',
    'grok-4-fast-non-reasoning',
    'grok-4',
    'grok-2-vision-1212',
  ];

  let discovered: string[] = [];
  try {
    const resp = await fetch('https://api.x.ai/v1/language-models', {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
      signal,
    });
    if (resp.ok) {
      const data = (await resp.json()) as {
        models?: Array<{ id?: string; input_modalities?: string[] }>;
      };
      discovered = (data.models ?? [])
        .filter(
          (m): m is { id: string; input_modalities?: string[] } =>
            typeof m.id === 'string' &&
            Array.isArray(m.input_modalities) &&
            m.input_modalities.includes('image')
        )
        .map((m) => m.id);
    }
  } catch {
    // Ignore discovery failure
  }

  return Array.from(
    new Set([
      ...(customSlug ? [customSlug] : []),
      ...discovered,
      ...defaults,
    ])
  );
}

export default async function handler(
  req: ServerlessRequest,
  res: ServerlessResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    return;
  }

  let parsedBody: unknown = req.body;
  if (typeof parsedBody === 'string') {
    try {
      parsedBody = JSON.parse(parsedBody);
    } catch {
      res.status(400).json({ error: 'Invalid JSON request body.' });
      return;
    }
  }

  if (!parsedBody || typeof parsedBody !== 'object') {
    res.status(400).json({ error: 'Request body must be a JSON object.' });
    return;
  }

  const { imageBase64, mimeType } = parsedBody as Record<string, unknown>;

  if (typeof mimeType !== 'string' || !ALLOWED_MIME_TYPES.has(mimeType)) {
    res.status(415).json({
      error:
        'Unsupported image MIME type. Allowed: image/jpeg, image/png, image/webp.',
    });
    return;
  }

  if (typeof imageBase64 !== 'string' || imageBase64.trim().length === 0) {
    res.status(400).json({ error: 'Missing imageBase64 payload.' });
    return;
  }

  if (estimateBase64Bytes(imageBase64) > MAX_IMAGE_BYTES) {
    res.status(413).json({
      error: 'Uploaded image exceeds the 4 MB maximum size limit.',
    });
    return;
  }

  const apiKey = (
    getServerEnv('GROQ_API_KEY') ||
    getServerEnv('GROK_API_KEY') ||
    getServerEnv('XAI_API_KEY') ||
    ''
  ).trim();

  if (!apiKey) {
    res.status(200).json({
      source: 'cached',
      diagnostic: 'GROK_API_KEY is not set in .env.',
      ingredients: CACHED_DEMO_ITEMS,
    });
    return;
  }

  const rawCustomModel = (
    getServerEnv('GROQ_MODEL') ||
    getServerEnv('GROK_MODEL') ||
    getServerEnv('XAI_MODEL') ||
    ''
  ).trim();

  const promptText = [
    'You are a culinary vision assistant for university students.',
    'Look carefully at this photograph and identify EVERY visible food ingredient (also read any ingredient labels printed on the image if present).',
    'Then create one practical, delicious student recipe using ONLY those identified ingredients.',
    'Respond with ONLY valid JSON (no markdown code fences, no extra prose) in this exact shape:',
    '{"ingredients":[{"name":"Rice"},{"name":"Baby bok choy"}],',
    '"recipe":{"potionName":"Spooky RPG Potion Name","mealName":"Plain Dish Name","minutes":15,"packable":true,"sprite":"bowl","steps":["Step 1","Step 2","Step 3"]}}',
    'where sprite is one of: "toast", "cup", "bowl", "plate", "soup".',
  ].join(' ');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VISION_TIMEOUT_MS);

  try {
    const isGroqKey = apiKey.startsWith('gsk_');
    const providerLabel = isGroqKey ? 'Groq API' : 'Grok API';
    const endpoint = isGroqKey
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.x.ai/v1/chat/completions';

    const models = isGroqKey
      ? await buildGroqModelCandidates(apiKey, rawCustomModel, controller.signal)
      : await buildXaiModelCandidates(apiKey, rawCustomModel, controller.signal);

    const dataUri = `data:${mimeType};base64,${imageBase64}`;
    let lastDiagnostic = '';

    for (const model of models.slice(0, 6)) {
      const upstream = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.15,
          max_completion_tokens: 900,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: promptText },
                {
                  type: 'image_url',
                  image_url: { url: dataUri },
                },
              ],
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!upstream.ok) {
        const errBody = await upstream.text().catch(() => '');
        lastDiagnostic = summarizeUpstreamError(
          providerLabel,
          upstream.status,
          errBody
        );

        if (upstream.status === 401 || upstream.status === 429) {
          break;
        }
        if (
          upstream.status === 403 &&
          errBody.toLowerCase().includes('credit')
        ) {
          break;
        }
        continue;
      }

      const upstreamJson = (await upstream.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
      };

      const rawText = upstreamJson.choices?.[0]?.message?.content ?? '';
      if (!rawText) continue;

      let modelParsed: unknown = {};
      try {
        modelParsed = JSON.parse(extractJsonText(rawText));
      } catch {
        lastDiagnostic = `${providerLabel} (${model}) response was not valid JSON.`;
        continue;
      }

      const validated = sanitizeModelIngredients(modelParsed);
      if (validated.length === 0) continue;

      const rawRecipe =
        modelParsed && typeof modelParsed === 'object'
          ? (modelParsed as Record<string, unknown>).recipe
          : undefined;

      res.status(200).json({
        source: 'ai',
        model,
        ingredients: validated,
        recipe: rawRecipe,
      });
      return;
    }

    res.status(200).json({
      source: 'cached',
      ...(lastDiagnostic ? { diagnostic: lastDiagnostic } : {}),
      ingredients: CACHED_DEMO_ITEMS,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network timeout';
    res.status(200).json({
      source: 'cached',
      diagnostic: `Vision request failed (${msg}).`,
      ingredients: CACHED_DEMO_ITEMS,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
