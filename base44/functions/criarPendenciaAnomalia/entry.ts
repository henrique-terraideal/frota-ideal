import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    // Chamada pelo workflow de entity-trigger quando RegistroUso é criado com tem_anomalia = true
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const { ativo_id, ativo_nome, operador_id, operador_nome, data_hora_inicio, registro_id, notas } = body;

    if (!ativo_id || !registro_id) {
      // Se não veio no body, tenta usar trigger data
      const triggerData = body.trigger?.data || {};
      if (!triggerData.ativo_id) {
        return Response.json({ success: false, error: "Dados insuficientes" }, { status: 400 });
      }
    }

    // Evita duplicidade
    const existentes = await base44.asServiceRole.entities.Pendencia.filter({
      referencia_id: registro_id,
      tipo: "anomalia"
    });
    if (existentes.length > 0) {
      return Response.json({ success: true, message: "Pendência já existe", pendencia_id: existentes[0].id });
    }

    const pendencia = await base44.asServiceRole.entities.Pendencia.create({
      titulo: `Anomalia reportada por ${operador_nome || "Operador"}`,
      tipo: "anomalia",
      ativo_id: ativo_id,
      ativo_nome: ativo_nome || "",
      status: "aberto",
      descricao: `Anomalia detectada no registro de uso de ${operador_nome || "operador"} em ${data_hora_inicio || ""}. ${notas || ""}`.trim(),
      referencia_id: registro_id,
      prioridade: "media"
    });

    return Response.json({ success: true, pendencia_id: pendencia.id });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});