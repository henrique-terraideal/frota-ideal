import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { parseDataHoraBR } from "../../shared/frota-utils.ts";

Deno.serve(async (req) => {
  try {
    // Endpoint PÚBLICO — o ESP32 não suporta OAuth. Usa service role.
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { device_id, condutor_codigo, datahora, odometro, checklist } = body;

    // Validações
    if (!device_id) {
      return Response.json({ status: "erro", mensagem: "device_id não informado" }, { status: 400 });
    }
    if (!condutor_codigo) {
      return Response.json({ status: "erro", mensagem: "condutor_codigo não informado" }, { status: 400 });
    }

    // 1. Identifica o ComputadorDeBordo pelo device_id
    const dispositivos = await base44.asServiceRole.entities.ComputadorDeBordo.filter({ device_id });
    const dispositivo = dispositivos[0];
    if (!dispositivo) {
      return Response.json({ status: "erro", mensagem: `Dispositivo não encontrado: ${device_id}` }, { status: 400 });
    }
    if (!dispositivo.ativo) {
      return Response.json({ status: "erro", mensagem: `Dispositivo inativo: ${device_id}` }, { status: 400 });
    }

    // Busca o veículo vinculado
    const veiculo = await base44.asServiceRole.entities.Veiculo.get(dispositivo.veiculo_id);
    if (!veiculo) {
      return Response.json({ status: "erro", mensagem: "Veículo vinculado ao dispositivo não encontrado" }, { status: 400 });
    }

    // 2. Identifica o usuário (motorista) pelo condutor_codigo (codigo_bordo)
    const usuarios = await base44.asServiceRole.entities.User.list();
    const motorista = usuarios.find((u) => String(u.codigo_bordo) === String(condutor_codigo));
    if (!motorista) {
      return Response.json({ status: "erro", mensagem: `Motorista não encontrado com código: ${condutor_codigo}` }, { status: 400 });
    }

    const dataHoraISO = parseDataHoraBR(datahora);
    const odometroNum = Number(odometro) || 0;

    // Processa checklist — array de { pergunta_id, pergunta_texto, resposta }
    const respostas = Array.isArray(checklist) ? checklist : [];
    const anomalias = respostas.filter((r) => r.resposta === false);
    const temAnomalia = anomalias.length > 0;

    // 3. Cria o registro de uso
    const registro = await base44.asServiceRole.entities.RegistroUso.create({
      veiculo_id: veiculo.id,
      motorista_id: motorista.id,
      motorista_nome: motorista.full_name || motorista.email,
      veiculo_nome: veiculo.nome,
      data_hora_inicio: dataHoraISO,
      odometro_registrado: odometroNum,
      origem: "computador_de_bordo",
      checklist_completo: true,
      tem_anomalia: temAnomalia,
      notas: temAnomalia
        ? `Anomalia(s) reportada(s) via Computador de Bordo (${anomalias.length})`
        : "Registro via Computador de Bordo"
    });

    // 4. Cria registros em RespostaChecklist para cada pergunta
    const respostasCriar = respostas.map((r) => ({
      registro_uso_id: registro.id,
      checklist_item_id: r.pergunta_id || "",
      pergunta_texto: r.pergunta_texto || "",
      resposta: r.resposta !== false,
      observacao: r.observacao || ""
    }));
    if (respostasCriar.length > 0) {
      await base44.asServiceRole.entities.RespostaChecklist.bulkCreate(respostasCriar);
    }

    // 5. Cria Pendência para cada anomalia
    let pendenciasCriadas = 0;
    if (temAnomalia) {
      for (const anomalia of anomalias) {
        await base44.asServiceRole.entities.Pendencia.create({
          titulo: `Anomalia: ${anomalia.pergunta_texto || "Checklist"}`,
          tipo: "anomalia",
          veiculo_id: veiculo.id,
          veiculo_nome: veiculo.nome,
          status: "aberto",
          descricao: `Anomalia reportada por ${motorista.full_name || motorista.email} via Computador de Bordo em ${datahora}. Pergunta: "${anomalia.pergunta_texto || ""}"`,
          referencia_id: registro.id,
          prioridade: "media"
        });
        pendenciasCriadas++;
      }
    }

    // 6. Atualiza odômetro do veículo se enviado e maior que o atual
    if (odometroNum > (veiculo.odometro_atual || 0)) {
      await base44.asServiceRole.entities.Veiculo.update(veiculo.id, {
        odometro_atual: odometroNum
      });
    }

    // 7. Atualiza ultimo_contato do ComputadorDeBordo
    await base44.asServiceRole.entities.ComputadorDeBordo.update(dispositivo.id, {
      ultimo_contato: new Date().toISOString()
    });

    // 8. Retorna confirmação
    return Response.json({
      status: "ok",
      registro_id: registro.id,
      veiculo: veiculo.nome,
      condutor: motorista.full_name || motorista.email,
      anomalias: anomalias.length,
      pendencias_criadas: pendenciasCriadas
    });
  } catch (error) {
    return Response.json({ status: "erro", mensagem: error.message }, { status: 500 });
  }
});