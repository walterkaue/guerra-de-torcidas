export type AuditResult = {
  aprovada: boolean;
  motivo: string;
};

type GeminiTextPart = {
  text?: unknown;
};

type GeminiCandidate = {
  content?: {
    parts?: Array<GeminiTextPart | string | null | undefined>;
  } | null;
};

type GeminiResponse = {
  candidates?: GeminiCandidate[];
};

export function extractTextFromGemini(data: unknown): string {
  if (!data || typeof data !== 'object') {
    return '';
  }

  const response = data as GeminiResponse;
  const parts = response.candidates?.flatMap((candidate) => {
    const contentParts = candidate?.content?.parts ?? [];

    return contentParts
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }

        if (part && typeof part === 'object' && typeof part.text === 'string') {
          return part.text;
        }

        return '';
      })
      .filter((text): text is string => text.trim().length > 0);
  }) ?? [];

  return parts.join('\n').trim();
}

export function parseGeminiJson(rawText: string): AuditResult {
  const clean = rawText.replace(/```(?:json)?/gi, '').trim();

  if (!clean) {
    throw new Error('A resposta da IA está vazia');
  }

  let parsed: unknown;
  let candidate = clean;

  if (!candidate.startsWith('{')) {
    const match = candidate.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error('A resposta da IA não contém JSON válido');
    }

    candidate = match[0];
  }

  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new Error('A resposta da IA não contém JSON válido');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('A resposta da IA tem formato inválido');
  }

  const result = parsed as Record<string, unknown>;

  if (typeof result.aprovada !== 'boolean') {
    throw new Error('O campo "aprovada" da resposta da IA não é booleano');
  }

  return {
    aprovada: result.aprovada,
    motivo: typeof result.motivo === 'string' ? result.motivo : '',
  };
}
