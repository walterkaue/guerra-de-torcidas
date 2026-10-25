import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { negado, temSegredo } from "../_shared/segredo.ts";

const corsHeaders = { 
  "Access-Control-Allow-Origin": "*", 
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" 
};

function extractTextFromGemini(iaData: any): string {
  if (iaData?.candidates?.[0]?.content?.parts?.[0]) {
    return iaData.candidates[0].content.parts[0].text;
  }
  return "";
}

function parseGeminiJson(rawText: string): any {
  let clean = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  try { return JSON.parse(clean); } catch (_) {}
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch (_) {}
  }
  throw new Error("Falha ao processar JSON da IA.");
}

// Função auxiliar que replica o loop de modelos do gerador de conteúdo
async function callGeminiWithActiveModels(
  apiKey: string, 
  activeModels: string[], 
  apiBase: string, 
  contents: any[], 
  tools?: any[]
): Promise<string> {
  let lastError = "";

  for (const model of activeModels) {
    try {
      const url = `${apiBase}/${model}:generateContent?key=${apiKey}`;
      const requestPayload: any = {
        contents,
        generationConfig: { temperature: 0.1 }
      };

      if (tools) {
        requestPayload.tools = tools;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload)
      });

      const data = await res.json().catch(() => null);
      const candidateText = extractTextFromGemini(data);

      if (candidateText && typeof candidateText === "string" && candidateText.trim().length > 0) {
        return candidateText;
      }

      lastError = data?.error ? `[${model}] ${data.error.message}` : `[${model}] Resposta vazia.`;
    } catch (err: any) {
      lastError = `[${model}] Falha de rede: ${err?.message}`;
    }
  }

  throw new Error(lastError || "Nenhum modelo ativo retornou conteúdo.");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Só o cron (com a secret key do projeto) chama esta função.
  if (!(await temSegredo(req))) return negado();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const apiKey = Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !apiKey) {
      return new Response(
        JSON.stringify({ error: "Variáveis de ambiente ausentes." }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Instancia o cliente com a chave de serviço
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body = await req.json().catch(() => ({}));
    const quantidade = body.quantidade || 5;

    const { data: pendentes, error: selectError } = await supabase
      .schema('staging_gt')
      .from('perguntas')
      .select('*')
      .eq('status', 'pendente_validacao')
      .limit(quantidade);

    if (selectError) {
      return new Response(
        JSON.stringify({ error: selectError.message }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pendentes || pendentes.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Nenhuma pergunta pendente." }), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // DESCOBERTA DINÂMICA DE MODELOS (Idêntica ao gerador de conteúdo)
    const apiBase = "https://generativelanguage.googleapis.com/v1beta/models";
    let activeModels: string[] = [];
    
    try {
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

    // Fallback idêntico ao gerador de conteúdo caso a listagem falhe
    if (activeModels.length === 0) {
      activeModels = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-2.5-pro"];
    }

    let aprovadas = 0;
    let reprovadas = 0;
    let mantidas = 0;
    const relatorio: any[] = [];

    for (const pergunta of pendentes) {
      let analise: any = null;
      let metodoUsado = "";
      let erroMotivo = "";
      const altCorretaTxt = pergunta[`alternativa_${pergunta.correta.toLowerCase()}`];

      // MÉTODO 1: Scraping Direto
      try {
        const fetchRes = await fetch(pergunta.fonte, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) });
        if (fetchRes.ok) {
          const html = await fetchRes.text();
          const limite = html.substring(0, 15000);
          const promptM1 = `Audite esta pergunta com base neste conteúdo: "${limite}". Pergunta: "${pergunta.texto}" | Resposta: "${altCorretaTxt}". Retorne JSON puro com {"aprovada": boolean, "motivo": "string"}`;
          
          const textoIA = await callGeminiWithActiveModels(
            apiKey, 
            activeModels, 
            apiBase, 
            [{ role: "user", parts: [{ text: promptM1 }] }]
          );
          
          if (textoIA) {
            analise = parseGeminiJson(textoIA);
            metodoUsado = "Scraping Direto";
          } else throw new Error("Retorno vazio da IA no M1.");
        } else throw new Error("Acesso bloqueado pelo site.");
      } catch (e: any) { erroMotivo = e.message; }

      // MÉTODO 2: Busca Google Nativa
      if (!analise) {
        try {
          const promptM2 = `Pesquise no Google para verificar este fato. Pergunta: "${pergunta.texto}" | Resposta: "${altCorretaTxt}". Retorne JSON puro com {"aprovada": boolean, "motivo": "string"}`;
          
          const textoIA = await callGeminiWithActiveModels(
            apiKey, 
            activeModels, 
            apiBase, 
            [{ role: "user", parts: [{ text: promptM2 }] }], 
            [{ googleSearch: {} }]
          );
          
          if (textoIA) {
            analise = parseGeminiJson(textoIA);
            metodoUsado = "Busca Google";
          } else throw new Error("Retorno vazio da IA no M2.");
        } catch (e: any) { erroMotivo = e.message; }
      }

      // MÉTODO 3: Conhecimento da IA (Zero-shot)
      if (!analise) {
        try {
          const promptM3 = `Use SEU CONHECIMENTO para auditar. Pergunta: "${pergunta.texto}" | Resposta: "${altCorretaTxt}". Retorne JSON puro com {"aprovada": boolean, "motivo": "string"}`;
          
          const textoIA = await callGeminiWithActiveModels(
            apiKey, 
            activeModels, 
            apiBase, 
            [{ role: "user", parts: [{ text: promptM3 }] }]
          );
          
          if (textoIA) {
            analise = parseGeminiJson(textoIA);
            metodoUsado = "Conhecimento IA";
          } else throw new Error("Falha total na IA.");
        } catch (e: any) { erroMotivo = e.message || "Todos os métodos falharam."; }
      }

      // ATUALIZAÇÃO NO SUPABASE
      if (analise && typeof analise.aprovada === "boolean") {
        const novoStatus = analise.aprovada ? "revisada" : "reprovada_rejeitada";
        await supabase.schema('staging_gt').from('perguntas').update({ status: novoStatus }).eq('id', pergunta.id);
        analise.aprovada ? aprovadas++ : reprovadas++;
        relatorio.push({ id: pergunta.id, metodo: metodoUsado, status: novoStatus, motivo: analise.motivo });
      } else {
        mantidas++;
        relatorio.push({ id: pergunta.id, metodo: "Nenhum", status: "mantida", motivo: erroMotivo });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processados: pendentes.length, aprovadas, reprovadas, mantidas, relatorio, activeModelsUsados: activeModels }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (globalError: any) {
    return new Response(
      JSON.stringify({ error: globalError.message || String(globalError) }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});