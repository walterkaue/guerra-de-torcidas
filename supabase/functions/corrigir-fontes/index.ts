import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { negado, temSegredo } from "../_shared/segredo.ts";

serve(async (req) => {
  // Só o cron (com a secret key do projeto) chama esta função.
  if (!(await temSegredo(req))) return negado();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const apiKey = Deno.env.get("GEMINI_API_KEY") || '';

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: "Variaveis do Supabase ausentes." }), { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json().catch(() => ({}));
    const quantidade = body.quantidade || 5;

    // Leitura clássica do banco, como no auditor
    const { data: perguntas, error: selectError } = await supabase
      .schema('staging_gt')
      .from('perguntas')
      .select('*')
      .eq('status', 'revisada')
      .order('created_at', { ascending: false })
      .limit(200);

    if (selectError) {
      return new Response(JSON.stringify({ error: "Erro Supabase: " + selectError.message }), { status: 400 });
    }

    if (!perguntas || perguntas.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "Nenhuma pergunta encontrada." }), { status: 200 });
    }

    const alvos = perguntas.filter((p: any) => {
      if (!p.fonte) return false;
      const semProtocolo = p.fonte.replace(/^https?:\/\//, '');
      const partes = semProtocolo.split('/').filter(Boolean);
      const isRaiz = partes.length === 1;
      const isMarcada = p.fonte.includes('#sem-link');
      return isRaiz && !isMarcada;
    }).slice(0, quantidade);

    if (alvos.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "Nenhuma URL curta pendente de correção encontrada." }), { status: 200 });
    }

    const apiBase = "https://generativelanguage.googleapis.com/v1beta/models";
    let activeModels = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];
    
    try {
      const listRes = await fetch(`${apiBase}?key=${apiKey}`);
      if (listRes.ok) {
        const listData = await listRes.json();
        if (listData && listData.models && Array.isArray(listData.models)) {
          const dinamic = listData.models
            .filter((m: any) => m && m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent") && m.name && m.name.includes("gemini"))
            .map((m: any) => m.name.replace("models/", ""));
          if (dinamic.length > 0) activeModels = dinamic;
        }
      }
    } catch (err) {
      console.log("Falha listagem de IA.");
    }

    const relatorio: any[] = [];
    const atualizacoes: any[] = [];

    for (const pergunta of alvos) {
      const altCorretaTxt = pergunta[`alternativa_${pergunta.correta.toLowerCase()}`];
      
      const promptText = `
        Pesquise no Google pelo seguinte fato histórico de futebol e encontre uma fonte confiável (Wikipedia, GE, Placar, UOL, etc) que comprove a resposta.
        Pergunta: "${pergunta.texto}"
        Resposta Correta: "${altCorretaTxt}"

        Sua tarefa: Retorne APENAS a URL completa e direta da página que confirma a resposta.
        Regra Estrita: NÃO escreva nenhuma outra palavra, explicação ou formatação. Retorne APENAS o link começando com "http". Se não achar, retorne "FALHA".
      `;

      let urlEncontrada = "";
      let lastErrorMsg = "Nenhuma resposta";

      for (const model of activeModels) {
        try {
          const url = `${apiBase}/${model}:generateContent?key=${apiKey}`;
          const requestPayload: any = {
            contents: [{ role: "user", parts: [{ text: promptText }] }],
            tools: [{ googleSearch: {} }],
            generationConfig: { temperature: 0.1 }
          };

          const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestPayload) });
          const iaData = await res.json().catch(() => null);

          if (iaData && iaData.error) {
            lastErrorMsg = `[${model}] ${iaData.error.message || "Erro desconhecido IA"}`;
            continue;
          }

          // Acesso ultra-blindado às variáveis do Gemini (sem `?.`)
          const candidateText = (iaData && iaData.candidates && iaData.candidates[0] && iaData.candidates[0].content && iaData.candidates[0].content.parts && iaData.candidates[0].content.parts[0]) ? iaData.candidates[0].content.parts[0].text : null;
          
          if (candidateText) {
            const cleanText = candidateText.replace(/```/g, '').replace(/"/g, '').trim();
            if (cleanText.startsWith("http")) {
              urlEncontrada = cleanText.split('\n')[0].trim();
              break;
            }
          }

          // Fallback ultra-blindado aos metadados de busca do Google
          const chunks = (iaData && iaData.candidates && iaData.candidates[0] && iaData.candidates[0].groundingMetadata && iaData.candidates[0].groundingMetadata.groundingChunks) ? iaData.candidates[0].groundingMetadata.groundingChunks : [];
          
          if (chunks && chunks.length > 0) {
            const webChunk = chunks.find((c: any) => c && c.web && c.web.uri);
            if (webChunk) {
              urlEncontrada = webChunk.web.uri;
              break;
            }
          }

        } catch (err: any) {
          lastErrorMsg = `[${model}] Falha local: ${err.message || String(err)}`;
        }
      }

      let novaUrl = pergunta.fonte + "#sem-link";
      let sucesso = false;
      
      if (urlEncontrada && urlEncontrada.startsWith("http")) {
        novaUrl = urlEncontrada;
        sucesso = true;
      }

      atualizacoes.push({ id: pergunta.id, fonte: novaUrl });
      relatorio.push({ id: pergunta.id, url_original: pergunta.fonte, nova_url: novaUrl, encontrada: sucesso });
    }

    for (const update of atualizacoes) {
      await supabase.schema('staging_gt').from('perguntas').update({ fonte: update.fonte }).eq('id', update.id);
    }

    return new Response(
      JSON.stringify({ success: true, processados: alvos.length, relatorio }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (globalError: any) {
    return new Response(
      JSON.stringify({ error: "Erro na Edge Function: " + (globalError.message || String(globalError)) }), 
      { headers: { 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});