import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Apenas admin pode duplicar
    let isAdmin = false;
    try {
      const user = await base44.auth.me();
      isAdmin = user?.role === "admin";
    } catch {
      // sem auth
    }
    if (!isAdmin) {
      return Response.json({ success: false, error: "Apenas administradores podem duplicar ativos" }, { status: 403 });
    }

    const body = await req.json();
    const { veiculo_origem_id, novo_nome, nova_placa } = body;

    if (!veiculo_origem_id) {
      return Response.json({ success: false, error: "veiculo_origem_id é obrigatório" }, { status: 400 });
    }
    if (!novo_nome || !novo_nome.trim()) {
      return Response.json({ success: false, error: "novo_nome é obrigatório" }, { status: 400 });
    }

    // 1. Carrega o ativo de origem
    const origem = await base44.entities.Ativo.get(veiculo_origem_id);
    if (!origem) {
      return Response.json({ success: false, error: "Ativo de origem não encontrado" }, { status: 404 });
    }

    // 2. Cria o novo ativo copiando os dados básicos (leitura de uso zerada)
    const novoAtivo = await base44.entities.Ativo.create({
      nome: novo_nome.trim(),
      tipo: origem.tipo,
      placa: nova_placa || "",
      renavam: origem.renavam || "",
      ano: origem.ano || null,
      modelo: origem.modelo || "",
      unidade_tempo_uso: origem.unidade_tempo_uso || "km",
      data_aquisicao: origem.data_aquisicao || "",
      odometro_atual: 0,
      odometro_proxima_revisao: origem.odometro_proxima_revisao || 10000,
      status: "ativo",
      foto_url: origem.foto_url || "",
      data_licenciamento: origem.data_licenciamento || "",
      data_ipva: origem.data_ipva || "",
      versao_checklist: 1,
      notas: origem.notas || ""
    });

    // 3. Copia o checklist
    const checklistOrigem = await base44.entities.ChecklistItem.filter({ ativo_id: veiculo_origem_id });
    if (checklistOrigem.length > 0) {
      await base44.entities.ChecklistItem.bulkCreate(
        checklistOrigem
          .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
          .map((item) => ({
            ativo_id: novoAtivo.id,
            pergunta: item.pergunta,
            ativo: item.ativo,
            ordem: item.ordem || 1,
            tipo_resposta: item.tipo_resposta || "sim_nao"
          }))
      );
    }

    // 4. Copia os planos de manutenção preventiva
    const planosOrigem = await base44.entities.PlanoManutencao.filter({ ativo_id: veiculo_origem_id });
    if (planosOrigem.length > 0) {
      await base44.entities.PlanoManutencao.bulkCreate(
        planosOrigem.map((plano) => ({
          ativo_id: novoAtivo.id,
          ativo_nome: novoAtivo.nome,
          titulo: plano.titulo,
          tipo_manutencao: plano.tipo_manutencao,
          ativo: plano.ativo,
          gatilho_uso: plano.gatilho_uso || null,
          gatilho_tempo_valor: plano.gatilho_tempo_valor || null,
          gatilho_tempo_unidade: plano.gatilho_tempo_unidade || null,
          ultima_execucao_leitura: 0,
          ultima_execucao_data: null,
          descricao: plano.descricao || null
        }))
      );
    }

    return Response.json({
      success: true,
      novo_veiculo_id: novoAtivo.id,
      novo_veiculo_nome: novoAtivo.nome,
      novo_ativo_id: novoAtivo.id,
      novo_ativo_nome: novoAtivo.nome,
      checklist_copiado: checklistOrigem.length,
      planos_copiados: planosOrigem.length
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});