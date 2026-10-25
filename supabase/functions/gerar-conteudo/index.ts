import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { negado, temSegredo } from "../_shared/segredo.ts";

const corsHeaders = { 
  "Access-Control-Allow-Origin": "*", 
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" 
};

const SYSTEM_PROMPT = `Você é o Agente Criador de Conteúdo do Guerra de Torcidas.
Sua função é pesquisar na internet fatos reais e históricos sobre clubes de futebol brasileiro e gerar questões do Quiz ou Lances do Jogo em formato JSON estrito e válido.

REGRA CRÍTICA E INVIOLÁVEL:
Sua resposta deve conter EXCLUSIVAMENTE o ARRAY ou OBJETO JSON final.
NUNCA inclua rascunhos, textos de raciocínio, comentários ou caracteres fora do JSON.

Para perguntas (Quiz), use as colunas exatas:
- "clube": nome do clube (ex: "Flamengo", "Vasco", "Palmeiras", "Corinthians")
- "degrau": nível ("facil", "media", "dificil", "craque")
- "tema": tema ("titulos", "fundacao", "estadios", "craques", "fatos_historicos")
- "texto": enunciado da pergunta
- "alternativa_a": texto da alternativa A
- "alternativa_b": texto da alternativa B
- "alternativa_c": texto da alternativa C
- "alternativa_d": texto da alternativa D
- "correta": ESTRITAMENTE APENAS UMA LETRA MAIÚSCULA: "A", "B", "C" ou "D"
- "fonte": OBRIGATORIAMENTE a URL exata e completa do artigo, notícia ou site onde você encontrou a informação durante a pesquisa (iniciando com http:// ou https://). É expressamente proibido usar apenas a página inicial (home).

Todos os itens gerados devem ter "status": "pendente_validacao".`;

function extractAndParseJson(rawText: string): any {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("Texto bruto retornado pela IA está vazio.");
  }
  let clean = rawText.trim();
  if (clean.startsWith("```")) {
    const lines = clean.split("\n");
    if (lines[0].startsWith("```")) lines.shift();
    if (lines.length > 0 && lines[lines.length - 1].trim().startsWith("```")) lines.pop();
    clean = lines.join("\n").trim();
  }
  try { return JSON.parse(clean); } catch (_) {}

  const lastOpenArray = clean.lastIndexOf("[");
  const lastCloseArray = clean.lastIndexOf("]");
  if (lastOpenArray !== -1 && lastCloseArray > lastOpenArray) {
    const candidate = clean.substring(lastOpenArray, lastCloseArray + 1);
    try { return JSON.parse(candidate); } catch (_) {}
  }

  const firstOpenArray = clean.indexOf("[");
  if (firstOpenArray !== -1 && lastCloseArray > firstOpenArray) {
    const candidate = clean.substring(firstOpenArray, lastCloseArray + 1);
    try { return JSON.parse(candidate); } catch (_) {}
  }

  const lastOpenObj = clean.lastIndexOf("{");
  const lastCloseObj = clean.lastIndexOf("}");
  if (lastOpenObj !== -1 && lastCloseObj > lastOpenObj) {
    const candidate = clean.substring(lastOpenObj, lastCloseObj + 1);
    try { return JSON.parse(candidate); } catch (_) {}
  }

  const firstOpenObj = clean.indexOf("{");
  if (firstOpenObj !== -1 && lastCloseObj > firstOpenObj) {
    const candidate = clean.substring(firstOpenObj, lastCloseObj + 1);
    try { return JSON.parse(candidate); } catch (_) {}
  }

  throw new Error("Não foi possível isolar uma estrutura JSON válida no texto da IA.");
}

function sanitizeCorreta(rawCorreta: any, altA: any, altB: any, altC: any, altD: any): string {
  if (!rawCorreta) return "A";
  const str = String(rawCorreta).trim();
  const lower = str.toLowerCase();
  
  const match = str.match(/[A-Da-d]/);
  if (match) return match[0].toUpperCase();
  return "A";
}

async function insertViaRest(
  supabaseUrl: string, 
  serviceKey: string, 
  table: string, 
  records: any[], 
  schema?: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const url = `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/${table}`;
    const headers: Record<string, string> = {
      "apikey": serviceKey,
      "Authorization": "Bearer " + serviceKey,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    };

    if (schema) {
      headers["Content-Profile"] = schema;
      headers["Accept-Profile"] = schema;
    }

    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(records) });
    const bodyData = await res.json().catch(() => null);

    if (res.ok) {
      return { success: true, data: (Array.isArray(bodyData) && bodyData.length > 0) ? bodyData : records };
    } else {
      return { success: false, error: bodyData?.message || ("HTTP " + res.status) };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Só o cron (com a secret key do projeto) chama esta função.
  if (!(await temSegredo(req))) return negado();

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!apiKey || !supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Variáveis de ambiente ausentes." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({ tipo: "perguntas", quantidade: 3 }));
    const isLances = body?.tipo === "lances";

    const apiBase = "https://generativelanguage.googleapis.com/v1beta/models";
    // Modelos atualizados com capacidade de pesquisa
	let activeModels: string[] = [];
    
    try {
      // 1. Consulta o Google para descobrir quais modelos sua chave tem acesso
      const listRes = await fetch(`${apiBase}?key=${apiKey}`);
      const listData = await listRes.json();

      if (listData?.models && Array.isArray(listData.models)) {
        activeModels = listData.models
          .filter((m: any) => 
            m?.supportedGenerationMethods?.includes("generateContent") && 
            m?.name?.includes("gemini")
          )
          .map((m: any) => m.name.replace("models/", ""));
      }
    } catch (err) {
      console.warn("Falha ao buscar modelos dinamicamente.");
    }

    // 2. Fallback de segurança caso a listagem falhe
    if (activeModels.length === 0) {
      activeModels = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-2.5-pro"];
    };

    const responseSchema = isLances ? {
      type: "ARRAY", items: {
        type: "OBJECT", properties: {
          clube: { type: "STRING" }, tipo: { type: "STRING" }, titulo: { type: "STRING" },
          ficha: { type: "STRING" }, competicao: { type: "STRING" }, fonte: { type: "STRING" }, status: { type: "STRING" }
        }, required: ["clube", "tipo", "titulo", "ficha", "fonte"]
      }
    } : {
      type: "ARRAY", items: {
        type: "OBJECT", properties: {
          clube: { type: "STRING" }, degrau: { type: "STRING" }, tema: { type: "STRING" },
          texto: { type: "STRING" }, alternativa_a: { type: "STRING" }, alternativa_b: { type: "STRING" },
          alternativa_c: { type: "STRING" }, alternativa_d: { type: "STRING" }, correta: { type: "STRING" },
          fonte: { type: "STRING" }, status: { type: "STRING" }
        }, required: ["clube", "degrau", "tema", "texto", "alternativa_a", "alternativa_b", "alternativa_c", "alternativa_d", "correta", "fonte"]
      }
    };

    let generatedText: string | null = null;
    let lastError = "";

    const userPrompt = `Pesquise na internet fatos históricos e precisos sobre clubes de futebol brasileiro e gere um JSON com ${body?.quantidade || 3} novos itens para ${body?.tipo || "perguntas"}.`;

    for (const model of activeModels) {
      try {
        const url = `${apiBase}/${model}:generateContent?key=${apiKey}`;
        
        // Corpo da requisição com a ferramenta de busca ativada
        const requestPayload = {
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          tools: [{ googleSearch: {} }], // Ativa a pesquisa web
          generationConfig: { 
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            temperature: 0.4 // Temperatura otimizada para pesquisa
          }
        };

        let res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload)
        });

        let data = await res.json().catch(() => null);

        // Fallback sem strict schema caso o modelo rejeite a combinação de tools + schema
        if (data?.error && String(data.error?.message || "").includes("schema")) {
          delete requestPayload.generationConfig.responseSchema;
          res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestPayload)
          });
          data = await res.json().catch(() => null);
        }

        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText && typeof candidateText === "string" && candidateText.trim().length > 0) {
          generatedText = candidateText;
          break;
        }

        lastError = data?.error ? `[${model}] ${data.error.message}` : `[${model}] Resposta vazia.`;
      } catch (err: any) {
        lastError = `[${model}] Falha de rede: ${err?.message}`;
      }
    }

    if (!generatedText) {
      return new Response(JSON.stringify({ error: "Nenhum modelo gerou conteúdo. Detalhes: " + lastError }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let generatedJson: any = null;
    try {
      generatedJson = extractAndParseJson(generatedText);
    } catch (parseErr: any) {
      return new Response(JSON.stringify({ error: "Falha ao interpretar JSON. IA gerou: " + generatedText }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let recordsToInsert = Array.isArray(generatedJson) ? generatedJson : [generatedJson];
    const now = Date.now();

    recordsToInsert = recordsToInsert.map((item: any, idx: number) => {
      const { ...rest } = item;
      if (!isLances) {
        return {
          ...rest,
          correta: sanitizeCorreta(item.correta, item.alternativa_a, item.alternativa_b, item.alternativa_c, item.alternativa_d),
          clube: String(item.clube || "geral"),
          id: item.id || ("Q_GEN_" + now + "_" + idx),
          status: "pendente_validacao"
        };
      } else {
        return { ...rest, id: item.id || ("lance-gen-" + now + "-" + idx), status: "pendente_validacao" };
      }
    });

    const table = isLances ? "lances" : "perguntas";
    // Só no staging_gt. Nunca grava direto nas tabelas do jogo (public).
    const insertRes = await insertViaRest(supabaseUrl, supabaseServiceKey, table, recordsToInsert, "staging_gt");

    if (!insertRes.success) throw new Error(insertRes.error);

    return new Response(
      JSON.stringify({ success: true, count: insertRes.data?.length || 0, data: insertRes.data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});