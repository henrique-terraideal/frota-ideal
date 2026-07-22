import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const { foto_url, veiculo_id } = body;

    if (!foto_url || !veiculo_id) {
      return Response.json({ error: 'Foto e ativo são obrigatórios' }, { status: 400 });
    }

    // Usa IA com visão para extrair dados da multa
    const schema = {
      type: "object",
      properties: {
        data_infracao: { type: "string", description: "Data da infração em formato DD/MM/AAAA" },
        hora_infracao: { type: "string", description: "Hora da infração em formato HH:MM" },
        valor: { type: "number", description: "Valor da multa em reais (número)" },
        local_infracao: { type: "string", description: "Local onde ocorreu a infração" },
        numero_auto: { type: "string", description: "Número do auto de infração" },
        descricao_infracao: { type: "string", description: "Descrição/tipo da infração (ex: excesso de velocidade)" },
        pontos: { type: "number", description: "Pontos na carteira (3, 4, 5 ou 7)" },
        data_vencimento: { type: "string", description: "Data de vencimento para pagamento em DD/MM/AAAA" }
      }
    };

    const resultado = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Analise esta foto de notificação de multa de trânsito brasileira. Extraia com precisão: data da infração, hora da infração, valor da multa (em reais, apenas números), local da infração, número do auto de infração, descrição/tipo da infração, pontos na CNH e data de vencimento para pagamento. Se um campo não for legível, use string vazia ou 0.`,
      response_json_schema: schema,
      file_urls: [foto_url],
      model: "gemini_3_flash"
    });

    // Busca o ativo
    const ativo = await base44.asServiceRole.entities.Ativo.get(veiculo_id);

    // Combina data e hora da infração em ISO
    let dataInfracaoISO = new Date().toISOString();
    if (resultado.data_infracao) {
      const [dia, mes, ano] = resultado.data_infracao.split("/");
      const hora = resultado.hora_infracao || "00:00";
      const [h, m] = hora.split(":");
      dataInfracaoISO = new Date(`${ano}-${mes}-${dia}T${h.padStart(2, "0")}:${m.padStart(2, "0")}:00-03:00`).toISOString();
    }

    // Cruza data/hora da infração com registros de uso para identificar o operador
    let operadorIdentificado = null;
    let operadorNome = "";
    if (ativo) {
      const registros = await base44.asServiceRole.entities.RegistroUso.filter({ ativo_id: veiculo_id });
      const dataInfracao = new Date(dataInfracaoISO);
      let melhorMatch = null;
      let menorDiff = Infinity;
      for (const reg of registros) {
        if (!reg.data_hora_inicio) continue;
        const diff = Math.abs(new Date(reg.data_hora_inicio).getTime() - dataInfracao.getTime());
        if (diff < menorDiff && diff < 2 * 60 * 60 * 1000) {
          menorDiff = diff;
          melhorMatch = reg;
        }
      }
      if (melhorMatch) {
        operadorIdentificado = melhorMatch.operador_id;
        operadorNome = melhorMatch.operador_nome || "";
      }
    }

    // Formata data de vencimento
    let dataVencimentoISO = null;
    if (resultado.data_vencimento) {
      const [dia, mes, ano] = resultado.data_vencimento.split("/");
      if (dia && mes && ano) dataVencimentoISO = `${ano}-${mes}-${dia}`;
    }

    // Cria a multa
    const multa = await base44.asServiceRole.entities.Multa.create({
      ativo_id: veiculo_id,
      ativo_nome: ativo?.nome || "",
      operador_identificado_id: operadorIdentificado || "",
      operador_identificado_nome: operadorNome,
      data_infracao: dataInfracaoISO,
      local_infracao: resultado.local_infracao || "",
      descricao_infracao: resultado.descricao_infracao || "",
      valor: resultado.valor || 0,
      data_vencimento: dataVencimentoISO,
      status: "pendente",
      foto_url: foto_url,
      fonte: "foto_manual",
      numero_auto: resultado.numero_auto || "",
      pontos: resultado.pontos || 0
    });

    // Cria pendência no Kanban
    await base44.asServiceRole.entities.Pendencia.create({
      titulo: `Multa — ${ativo?.nome || "Ativo"} — R$ ${(resultado.valor || 0).toFixed(2)}`,
      tipo: "multa",
      ativo_id: veiculo_id,
      ativo_nome: ativo?.nome || "",
      status: "aberto",
      responsavel_id: operadorIdentificado || "",
      responsavel_nome: operadorNome,
      descricao: `${resultado.descricao_infracao || "Infração"} em ${resultado.data_infracao || ""} às ${resultado.hora_infracao || ""}. Local: ${resultado.local_infracao || ""}. ${operadorNome ? `Operador identificado: ${operadorNome}` : "Operador não identificado"}.`,
      data_limite: dataVencimentoISO,
      referencia_id: multa.id,
      prioridade: "alta"
    });

    return Response.json({
      success: true,
      multa_id: multa.id,
      dados_extraidos: resultado,
      motorista_identificado: operadorNome,
      operador_identificado: operadorNome,
      motorista_id: operadorIdentificado,
      operador_id: operadorIdentificado
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});