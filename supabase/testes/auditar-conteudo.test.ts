import { describe, expect, it } from 'vitest';

import { extractTextFromGemini, parseGeminiJson } from '../functions/auditar-conteudo/auditoria';

describe('auditar-conteudo helpers', () => {
  it('extrai texto JSON da resposta da Gemini', () => {
    const payload = {
      candidates: [
        {
          content: {
            parts: [
              { text: '```json\n{"aprovada": true, "motivo": "Resposta correta."}\n```' },
            ],
          },
        },
      ],
    };

    expect(extractTextFromGemini(payload)).toContain('"aprovada": true');
    expect(parseGeminiJson(extractTextFromGemini(payload))).toEqual({
      aprovada: true,
      motivo: 'Resposta correta.',
    });
  });

  it('rejeita JSON inválido da IA', () => {
    expect(() => parseGeminiJson('{"aprovada": "sim"}')).toThrow(
      'booleano',
    );
  });
});
