import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    // Endpoint PÚBLICO — o ESP32 faz GET passando ?device_id=BORDO-001
    const base44 = createClientFromRequest(req);

    const url = new URL(req.url);
    const deviceId = url.searchParams.get("device_id");

    if (!deviceId) {
      return Response.json({ error: "device_id não informado" }, { status: 400 });
    }

    // Identifica o ComputadorDeBordo pelo device_id
    const dispositivos = await base44.asServiceRole.entities.ComputadorDeBordo.filter({ device_id: deviceId });
    const dispositivo = dispositivos[0];

    if (!dispositivo) {
      return Response.json({ error: `Dispositivo não encontrado: ${deviceId}` }, { status: 404 });
    }

    if (!dispositivo.ativo) {
      return Response.json({ error: `Dispositivo inativo: ${deviceId}` }, { status: 400 });
    }

    // Busca o veículo vinculado
    const veiculo = await base44.asServiceRole.entities.Veiculo.get(dispositivo.veiculo_id);
    if (!veiculo) {
      return Response.json({ error: "Veículo vinculado não encontrado" }, { status: 404 });
    }

    // Busca as perguntas ativas deste veículo, ordenadas por ordem
    const itens = await base44.asServiceRole.entities.ChecklistItem.filter({ veiculo_id: veiculo.id, ativo: true });
    const perguntas = itens
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
      .map((item) => ({
        ordem: item.ordem || 1,
        id: item.id,
        texto: item.pergunta
      }));

    return Response.json({
      versao: veiculo.versao_checklist || 1,
      veiculo_id: veiculo.id,
      veiculo_nome: veiculo.nome,
      unidade_tempo_uso: veiculo.unidade_tempo_uso || "km",
      tempo_uso_atual: veiculo.odometro_atual || 0,
      data_aquisicao: veiculo.data_aquisicao || null,
      perguntas
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});