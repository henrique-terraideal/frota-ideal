import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { parseDataHoraBR } from "../../shared/frota-utils.ts";

Deno.serve(async (req) => {
  try {
    // Endpoint PÚBLICO — o ESP32 não suporta OAuth. Usa service role.
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { condutor, datahora, odometro, checklist } = body;

    if (!condutor) {
      return Response.json({ success: false, error: "Condutor não informado" }, { status: 400 });
    }

    // Identifica o motorista pelo nome (busca flexível)
    const motoristas = await base44.asServiceRole.entities.Motorista.filter({ ativo: true });
    const motorista = motoristas.find(
      (m) => m.nome.trim().toLowerCase() === String(condutor).trim().toLowerCase()
    );

    if (!motorista) {
      return Response.json({ success: false, error: `Motorista não encontrado: ${condutor}` }, { status: 404 });
    }

    // Busca veículo ativo (suporta múltiplos, mas pega o primeiro ativo se não houver seleção)
    const veiculos = await base44.asServiceRole.entities.Veiculo.filter({ status: "ativo" });
    const veiculo = veiculos[0];
    if (!veiculo) {
      return Response.json({ success: false, error: "Nenhum veículo ativo cadastrado" }, { status: 404 });
    }

    const dataHoraISO = parseDataHoraBR(datahora);
    const odometroNum = Number(odometro) || veiculo.odometro_atual || 0;

    // Processa checklist do ESP32 (campos: pneus_ok, limpeza_ok, anomalia, aviso_erro)
    const cl = checklist || {};
    const temAnomalia = cl.anomalia === true || cl.aviso_erro === true ||
      cl.pneus_ok === false || cl.limpeza_ok === false;

    // Cria o registro de uso
    const registro = await base44.asServiceRole.entities.RegistroUso.create({
      veiculo_id: veiculo.id,
      motorista_id: motorista.id,
      motorista_nome: motorista.nome,
      veiculo_nome: veiculo.nome,
      data_hora_inicio: dataHoraISO,
      odometro_registrado: odometroNum,
      origem: "computador_de_bordo",
      checklist_completo: true,
      tem_anomalia: temAnomalia,
      notas: temAnomalia ? "Anomalia reportada via Computador de Bordo" : "Registro via Computador de Bordo"
    });

    // Salva respostas do checklist como RespostaChecklist
    const checklistItems = await base44.asServiceRole.entities.ChecklistItem.filter({ ativo: true });
    const respostasCriar = [];
    for (const item of checklistItems) {
      let resposta = true;
      const perguntaLower = item.pergunta.toLowerCase();
      if (perguntaLower.includes("pneu")) resposta = cl.pneus_ok !== false;
      else if (perguntaLower.includes("limp")) resposta = cl.limpeza_ok !== false;
      else resposta = true; // demais perguntas assumem OK se não mapeadas

      respostasCriar.push({
        registro_uso_id: registro.id,
        checklist_item_id: item.id,
        pergunta_texto: item.pergunta,
        resposta: resposta,
        observacao: ""
      });
    }
    if (respostasCriar.length > 0) {
      await base44.asServiceRole.entities.RespostaChecklist.bulkCreate(respostasCriar);
    }

    // Atualiza odômetro do veículo se enviado e maior que o atual
    if (odometroNum > (veiculo.odometro_atual || 0)) {
      await base44.asServiceRole.entities.Veiculo.update(veiculo.id, {
        odometro_atual: odometroNum
      });
    }

    // A pendência de anomalia é criada automaticamente pelo workflow de entity-trigger.
    // Mas garantimos aqui também caso o workflow esteja inativo:
    if (temAnomalia) {
      const pendenciasExistentes = await base44.asServiceRole.entities.Pendencia.filter({
        referencia_id: registro.id,
        tipo: "anomalia"
      });
      if (pendenciasExistentes.length === 0) {
        await base44.asServiceRole.entities.Pendencia.create({
          titulo: `Anomalia reportada por ${motorista.nome}`,
          tipo: "anomalia",
          veiculo_id: veiculo.id,
          veiculo_nome: veiculo.nome,
          status: "aberto",
          descricao: `Anomalia detectada via Computador de Bordo em ${datahora}. Detalhes: ${JSON.stringify(cl)}`,
          referencia_id: registro.id,
          prioridade: "media"
        });
      }
    }

    return Response.json({ success: true, registro_id: registro.id, tem_anomalia: temAnomalia });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});