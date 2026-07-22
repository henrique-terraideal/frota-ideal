import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const { foto_url, veiculo_id } = body;

    if (!foto_url || !veiculo_id) {
      return Response.json({ error: 'Foto e veículo são obrigatórios' }, { status: 400 });
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

    // Busca o veículo
    const veiculo = await base44.asServiceRole.entities.Veiculo.get(veiculo_id);

    // Combina data e hora da infração em ISO
    let dataInfracaoISO = new Date().toISOString();
    if (resultado.data_infracao) {
      const [dia, mes, ano] = resultado.data_infracao.split("/");
      const hora = resultado.hora_infracao || "00:00";
      const [h, m] = hora.split(":");
      dataInfracaoISO = new Date(`${ano}-${mes}-${dia}T${h.padStart(2, "0")}:${m.padStart(2, "0")}:00-03:00`).toISOString();
    }

    // Cruza data/hora da infração com registros de uso para identificar o motorista
    let motoristaIdentificado = null;
    let motoristaNome = "";
    if (veiculo) {
      const registros = await base44.asServiceRole.entities.RegistroUso.filter({ veiculo_id: veiculo_id });
      // Busca o registro mais próximo da data/hora da infração (dentro de um intervalo de 2 horas)
      const dataInfracao = new Date(dataInfracaoISO);
      let melhorMatch = null;
      let menorDiff = Infinity;
      for (const reg of registros) {
        if (!reg.data_hora_inicio) continue;
        const diff = Math.abs(new Date(reg.data_hora_inicio).getTime() - dataInfracao.getTime());
        if (diff < menorDiff && diff < 2 * 60 * 60 * 1000) { // 2 horas
          menorDiff = diff;
          melhorMatch = reg;
        }
      }
      if (melhorMatch) {
        motoristaIdentificado = melhorMatch.motorista_id;
        motoristaNome = melhorMatch.motorista_nome || "";
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
      veiculo_id: veiculo_id,
      veiculo_nome: veiculo?.nome || "",
      motorista_identificado_id: motoristaIdentificado || "",
      motorista_identificado_nome: motoristaNome,
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
      titulo: `Multa — ${veiculo?.nome || "Veículo"} — R$ ${(resultado.valor || 0).toFixed(2)}`,
      tipo: "multa",
      veiculo_id: veiculo_id,
      veiculo_nome: veiculo?.nome || "",
      status: "aberto",
      responsavel_id: motoristaIdentificado || "",
      responsavel_nome: motoristaNome,
      descricao: `${resultado.descricao_infracao || "Infração"} em ${resultado.data_infracao || ""} às ${resultado.hora_infracao || ""}. Local: ${resultado.local_infracao || ""}. ${motoristaNome ? `Motorista identificado: ${motoristaNome}` : "Motorista não identificado"}.`,
      data_limite: dataVencimentoISO,
      referencia_id: multa.id,
      prioridade: "alta"
    });

    return Response.json({
      success: true,
      multa_id: multa.id,
      dados_extraidos: resultado,
      motorista_identificado: motoristaNome,
      motorista_id: motoristaIdentificado
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});